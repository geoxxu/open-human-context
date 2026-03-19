# Local Runtime

Minimal local-first reference runtime for HCP.

Current scope:

- local HTTP endpoints aligned to `spec/transport.md`
- in-memory grants, bindings, and audit log
- composite `hcp.inject_context` endpoint for tool-calling environments
- machine-readable skill manifest at `/.well-known/hcp-skills.json`

This runtime is intentionally small and resets state on process restart.

## Start

```bash
cd runtime/local
npm start
```

Default address:

- `http://127.0.0.1:4318`

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
- unsupported constraint types fail closed
- context views are derived summaries and signals, not raw vault export
