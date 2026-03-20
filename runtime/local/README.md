# Local Runtime

Minimal local-first reference runtime for HCP.

Current scope:

- local HTTP endpoints aligned to `spec/transport.md`
- local file-backed grants, bindings, and audit log when started through `npm start`
- composite `hcp.inject_context` endpoint for tool-calling environments
- machine-readable skill manifest at `/.well-known/hcp-skills.json`
- constraint enforcement for session binding, duration limits, storage intent, and forwarding intent

This runtime is intentionally small. The CLI entrypoint persists state to
`runtime/local/.data/runtime-state.json` by default so grants and audit history
survive a restart. In-process test helpers can still run fully in memory.

## Start

```bash
cd runtime/local
npm start
```

Run the local regression tests:

```bash
cd runtime/local
npm test
```

Default address:

- `http://127.0.0.1:4318`

Default state file:

- `runtime/local/.data/runtime-state.json`

Override with:

- `HCP_STATE_FILE=/path/to/runtime-state.json`

## Implemented Endpoints

- `GET /capabilities`
- `POST /authorizations`
- `GET /grants/:grantId`
- `POST /bindings`
- `POST /bindings/:bindingId/release`
- `POST /grants/:grantId/revoke`
- `GET /audit-events`
- `GET /.well-known/hcp-skills.json`
- `POST /skills/hcp.inject_context`

## Notes

- authorization is local and auto-approves known capabilities in this reference implementation
- unsupported or duplicate constraint types fail closed
- `session_only` requires an authorization session id and binds runtime use to that session
- `max_duration_seconds` narrows the effective grant lifetime when shorter than the requested duration
- `storage_allowed: false` and `forwarding_allowed: false` are enforced during binding creation when callers declare intent in binding metadata
- context views surface `usage_constraints` metadata and remain derived summaries and signals, not raw vault export
- the TypeScript end-to-end example lives at `sdk/typescript/examples/local-runtime-flow.ts`

