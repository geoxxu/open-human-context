import { HttpHcpClient } from '../src/index.js';

declare const process:
  | {
      env?: Record<string, string | undefined>;
      exitCode?: number;
    }
  | undefined;

export interface LocalRuntimeFlowOptions {
  baseUrl?: string;
  sessionId?: string;
  log?: Pick<typeof console, 'log' | 'error'>;
}

export async function runLocalRuntimeFlow(options: LocalRuntimeFlowOptions = {}) {
  const baseUrl = options.baseUrl ?? process?.env?.HCP_BASE_URL ?? 'http://127.0.0.1:4318';
  const sessionId = options.sessionId ?? 'sess_demo_hiring_01';
  const log = options.log ?? console;
  const client = new HttpHcpClient({ baseUrl });

  const capabilities = await client.listCapabilities();
  log.log('Capabilities:', capabilities.capabilities.map((capability) => capability.id).join(', '));

  const authorization = await client.requestAuthorization({
    requester_id: 'demo.recruiting.agent',
    capabilities: [
      'profile.summarize_professional_background',
      'workflow.describe_collaboration_style',
    ],
    purpose: {
      id: 'candidate_screening',
      title: 'Candidate Screening',
      description: 'Summarize relevant context for the current hiring workflow.',
    },
    requested_duration_seconds: 300,
    constraints: [
      {
        type: 'storage_allowed',
        value: false,
      },
      {
        type: 'forwarding_allowed',
        value: false,
      },
      {
        type: 'session_only',
        value: true,
      },
      {
        type: 'max_duration_seconds',
        value: 120,
      },
    ],
    session_id: sessionId,
  });

  log.log('Granted until:', authorization.grant.expires_at);

  const binding = await client.createBinding({
    grant_id: authorization.grant.id,
    requester_id: authorization.grant.requester_id,
    session_id: authorization.grant.session_id ?? sessionId,
    metadata: {
      storage_intent: false,
      forwarding_intent: false,
    },
  });

  log.log(
    'Context view:',
    JSON.stringify(
      {
        binding_id: binding.binding.id,
        context_view_id: binding.context_view.id,
        summary: binding.context_view.content.summary,
        usage_constraints: binding.context_view.content.usage_constraints,
      },
      null,
      2,
    ),
  );

  await client.releaseBinding(binding.binding.id);

  const audit = await client.listAuditEvents({
    grant_id: authorization.grant.id,
  });

  log.log('Audit events:', audit.events.map((event) => event.type).join(', '));

  return {
    capabilities,
    authorization,
    binding,
    audit,
  };
}
