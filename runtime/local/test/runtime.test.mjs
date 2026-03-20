import assert from 'node:assert/strict';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { createServer } from '../src/server.mjs';
import { LocalHcpRuntime } from '../src/runtime.mjs';

async function withServer(run, options = {}) {
  const server = createServer(options);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    await run(baseUrl);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
}

async function postJson(baseUrl, path, payload) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  const body = text.length > 0 ? JSON.parse(text) : undefined;
  return { response, body };
}

function createAuthorizationRequest(overrides = {}) {
  return {
    requester_id: 'demo.agent',
    capabilities: ['profile.summarize_professional_background'],
    purpose: {
      id: 'candidate_screening',
      title: 'Candidate Screening',
      description: 'Summarize relevant context for the current workflow.',
    },
    requested_duration_seconds: 30,
    ...overrides,
  };
}

async function withTempStateFile(run) {
  const stateFilePath = join(
    process.cwd(),
    `runtime-state-${Date.now()}-${Math.random().toString(16).slice(2)}.json`,
  );
  try {
    await run(stateFilePath);
  } finally {
    await rm(stateFilePath, { force: true });
  }
}

const tests = [
  {
    name: 'skill manifest exposes dedicated release and revoke schema refs',
    run: async () => {
      await withServer(async (baseUrl) => {
        const response = await fetch(`${baseUrl}/.well-known/hcp-skills.json`);
        assert.equal(response.status, 200);

        const manifest = await response.json();
        const releaseSkill = manifest.skills.find((skill) => skill.name === 'hcp.bindings.release');
        const revokeSkill = manifest.skills.find((skill) => skill.name === 'hcp.grants.revoke');

        assert.equal(releaseSkill.input_schema_ref, 'spec/hcp-skills.schema.json#/$defs/releaseBindingInput');
        assert.equal(releaseSkill.output_schema_ref, 'spec/hcp-skills.schema.json#/$defs/noContentOutput');
        assert.equal(revokeSkill.input_schema_ref, 'spec/hcp-skills.schema.json#/$defs/revokeGrantInput');
        assert.equal(revokeSkill.output_schema_ref, 'spec/hcp-skills.schema.json#/$defs/noContentOutput');
      });
    },
  },
  {
    name: 'fractional requested_duration_seconds rounds up instead of expiring immediately',
    run: async () => {
      await withServer(async (baseUrl) => {
        const { response, body } = await postJson(
          baseUrl,
          '/authorizations',
          createAuthorizationRequest({ requested_duration_seconds: 0.5 }),
        );

        assert.equal(response.status, 201);
        const issuedAt = Date.parse(body.grant.issued_at);
        const expiresAt = Date.parse(body.grant.expires_at);

        assert.equal(body.grant.state, 'active');
        assert.ok(expiresAt > issuedAt);
        assert.ok(expiresAt - issuedAt >= 1000);
      });
    },
  },
  {
    name: 'inject_context only echoes requested_context hints that map to approved capabilities',
    run: async () => {
      await withServer(async (baseUrl) => {
        const { response, body } = await postJson(baseUrl, '/skills/hcp.inject_context', {
          requester_id: 'demo.agent',
          capabilities: ['workflow.describe_collaboration_style'],
          purpose: {
            id: 'team_sync',
            title: 'Team Sync',
            description: 'Summarize collaboration preferences for the active session.',
          },
          requested_context: ['collaboration_style', 'technical_depth', 'unknown_hint', 'collaboration_style'],
          requested_duration_seconds: 30,
          session_id: 'sess_demo_01',
        });

        assert.equal(response.status, 201);
        assert.deepEqual(body.context_view.content.signals.requested_context, ['collaboration_style']);
        assert.equal(body.context_view.content.signals.technical_depth, undefined);
        assert.equal(body.context_view.content.signals.collaboration_style, 'direct_and_iterative');
      });
    },
  },
  {
    name: 'max_duration_seconds constraint narrows the granted duration',
    run: async () => {
      await withServer(async (baseUrl) => {
        const { response, body } = await postJson(
          baseUrl,
          '/authorizations',
          createAuthorizationRequest({
            requested_duration_seconds: 60,
            constraints: [
              {
                type: 'max_duration_seconds',
                value: 5,
              },
            ],
          }),
        );

        assert.equal(response.status, 201);
        const issuedAt = Date.parse(body.grant.issued_at);
        const expiresAt = Date.parse(body.grant.expires_at);

        assert.ok(expiresAt > issuedAt);
        assert.ok(expiresAt - issuedAt <= 5000);
      });
    },
  },
  {
    name: 'session_only constraint requires a session id on authorization',
    run: async () => {
      await withServer(async (baseUrl) => {
        const { response, body } = await postJson(
          baseUrl,
          '/authorizations',
          createAuthorizationRequest({
            constraints: [
              {
                type: 'session_only',
                value: true,
              },
            ],
            session_id: undefined,
          }),
        );

        assert.equal(response.status, 400);
        assert.equal(body.error.code, 'invalid_request');
      });
    },
  },
  {
    name: 'binding creation fails when the binding session does not match the granted session',
    run: async () => {
      await withServer(async (baseUrl) => {
        const { body: authorizationBody } = await postJson(
          baseUrl,
          '/authorizations',
          createAuthorizationRequest({
            session_id: 'sess_expected',
            constraints: [
              {
                type: 'session_only',
                value: true,
              },
            ],
          }),
        );

        const { response, body } = await postJson(baseUrl, '/bindings', {
          grant_id: authorizationBody.grant.id,
          requester_id: authorizationBody.grant.requester_id,
          session_id: 'sess_other',
        });

        assert.equal(response.status, 403);
        assert.equal(body.error.code, 'policy_violation');

        const auditResponse = await fetch(
          `${baseUrl}/audit-events?grant_id=${encodeURIComponent(authorizationBody.grant.id)}&event_type=policy.violation_detected`,
        );
        const auditBody = await auditResponse.json();
        assert.equal(auditBody.events.at(-1).result, 'session_mismatch');
      });
    },
  },
  {
    name: 'binding creation fails when storage is disallowed and the caller declares storage intent',
    run: async () => {
      await withServer(async (baseUrl) => {
        const { body: authorizationBody } = await postJson(
          baseUrl,
          '/authorizations',
          createAuthorizationRequest({
            session_id: 'sess_storage_01',
            constraints: [
              {
                type: 'storage_allowed',
                value: false,
              },
            ],
          }),
        );

        const { response, body } = await postJson(baseUrl, '/bindings', {
          grant_id: authorizationBody.grant.id,
          requester_id: authorizationBody.grant.requester_id,
          session_id: 'sess_storage_01',
          metadata: {
            storage_intent: true,
          },
        });

        assert.equal(response.status, 403);
        assert.equal(body.error.code, 'policy_violation');
      });
    },
  },
  {
    name: 'GET /grants/:id rejects extra path segments',
    run: async () => {
      await withServer(async (baseUrl) => {
        const { body } = await postJson(baseUrl, '/authorizations', createAuthorizationRequest());
        const response = await fetch(`${baseUrl}/grants/${body.grant.id}/extra`);

        assert.equal(response.status, 404);

        const errorBody = await response.json();
        assert.equal(errorBody.error.code, 'invalid_request');
      });
    },
  },
  {
    name: 'runtime state persists grants bindings and audit events when a state file is configured',
    run: async () => {
      await withTempStateFile(async (stateFilePath) => {
        const runtimeA = new LocalHcpRuntime({ stateFilePath });
        const authorization = runtimeA.requestAuthorization(
          createAuthorizationRequest({
            session_id: 'sess_persisted_01',
            constraints: [
              {
                type: 'session_only',
                value: true,
              },
            ],
          }),
        );
        const bindingResponse = runtimeA.createBinding({
          grant_id: authorization.grant.id,
          requester_id: authorization.grant.requester_id,
          session_id: 'sess_persisted_01',
        });

        const runtimeB = new LocalHcpRuntime({ stateFilePath });
        const reloadedGrant = runtimeB.getGrant(authorization.grant.id);

        assert.equal(reloadedGrant.grant.id, authorization.grant.id);
        assert.equal(runtimeB.bindings.get(bindingResponse.binding.id).state, 'active');
        assert.ok(runtimeB.listAuditEvents({ grant_id: authorization.grant.id }).events.length >= 2);
      });
    },
  },
  {
    name: 'request bodies larger than the configured limit are rejected',
    run: async () => {
      await withServer(async (baseUrl) => {
        const response = await fetch(`${baseUrl}/authorizations`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify({ padding: 'x'.repeat(1024 * 1024) }),
        });

        assert.equal(response.status, 413);
        const body = await response.json();
        assert.equal(body.error.code, 'invalid_request');
      });
    },
  },
];

let failures = 0;
for (const entry of tests) {
  try {
    await entry.run();
    console.log(`PASS ${entry.name}`);
  } catch (error) {
    failures += 1;
    console.error(`FAIL ${entry.name}`);
    console.error(error);
  }
}

if (failures > 0) {
  process.exitCode = 1;
} else {
  console.log(`PASS ${tests.length} tests`);
}
