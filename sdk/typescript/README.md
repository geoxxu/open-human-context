# TypeScript SDK

Draft TypeScript SDK for HCP.

Current scope:

- shared protocol types
- transport request and response types
- skill manifest types
- runtime validators and assertions
- a minimal local HTTP client aligned to `spec/transport.md`

This package is intentionally small while the protocol surface is still settling.

## Example Flow

See `examples/local-runtime-flow.ts` for a typed end-to-end example that:

- discovers capabilities
- requests a purpose-bound grant with explicit constraints
- creates a runtime binding
- reads the returned context view
- releases the binding
- inspects audit events

The example targets the local runtime at `http://127.0.0.1:4318` by default and
can be pointed elsewhere with `HCP_BASE_URL`.

## Runnable Demo

Run the full demo with:

```bash
cd sdk/typescript
npm run demo
```

This command:

- builds the SDK and example into `dist/`
- starts a temporary local HCP runtime in-process
- runs the end-to-end authorization and binding flow
- prints the returned context view and audit events
- shuts the runtime down and removes the demo state file
