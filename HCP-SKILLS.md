# HCP Skills Profile

## Purpose

This document defines a minimal HCP-compatible skill and tool profile for
OpenClaw-like products and other agent ecosystems that integrate through
tool-calling rather than direct protocol clients.

The goal is simple:

**HCP should be compatible with an agent's capability model, not its storage layout.**

## Core Position

An HCP integration MUST NOT be defined as:

- access to `memory/*.md`
- access to a vector database such as `sqlite-vec`
- access to raw retrieval indexes

An HCP integration SHOULD be defined as:

- capability discovery
- purpose-bound context injection
- runtime-scoped context use
- release and revocation hooks

The consuming agent asks for context to be injected for a declared purpose.
The local authority decides what to assemble and expose.

## Roles

In an OpenClaw-like architecture:

- the local OpenClaw runtime acts as the `Context Authority`
- local memories, markdown notes, and vector indexes are the `Private Context Vault`
- the third-party agent or application is the `Context Consumer`

The consumer does not directly read the vault.

## Required Rules

Any HCP-compatible skill profile MUST preserve the following rules:

1. The consumer requests scoped context, not raw memory access.
2. Every request declares a purpose.
3. Any ergonomic request hints MUST be resolved to explicit approved capabilities before injection.
4. The returned payload MUST be a derived context view, not a general vault export.
5. Returned context MUST remain time-bounded, revocable, and auditable.
6. Storage format remains an implementation detail of the local authority.

## Recommended Minimal Skill Set

The smallest useful profile is:

- `hcp.capabilities.list`
- `hcp.inject_context`
- `hcp.bindings.release`
- `hcp.grants.revoke`

An implementation MAY collapse authorization and runtime binding into
`hcp.inject_context` for developer convenience, provided the underlying HCP
grant, binding, audit, and revocation semantics still exist.

## Recommended Skill: `hcp.inject_context`

### Input

```json
{
  "requester_id": "demo.recruiting.agent",
  "purpose": {
    "id": "candidate_screening",
    "title": "Candidate Screening",
    "description": "Summarize relevant professional context for the current hiring workflow."
  },
  "requested_context": [
    "professional_background",
    "collaboration_style",
    "technical_depth"
  ],
  "capabilities": [
    "profile.summarize_professional_background",
    "workflow.describe_collaboration_style"
  ],
  "constraints": [
    {
      "type": "storage_allowed",
      "value": false
    }
  ],
  "session_id": "sess_demo_01"
}
```

Notes:

- `capabilities` is the canonical HCP authorization surface.
- `requested_context` is an optional ergonomic hint for product integrations.
- If both are present, the implementation MUST authorize against explicit capabilities.

### Output

```json
{
  "grant": {
    "id": "grant_01JX9SKILL1",
    "state": "active",
    "expires_at": "2026-03-19T10:20:00Z"
  },
  "binding": {
    "id": "binding_01JX9SKILL2",
    "state": "active",
    "expires_at": "2026-03-19T10:20:00Z"
  },
  "context_view": {
    "id": "view_01JX9SKILL3",
    "purpose_id": "candidate_screening",
    "content": {
      "summary": "The user has repeatedly worked on applied AI systems and collaborates best in small, fast-moving teams.",
      "signals": {
        "technical_depth": "high",
        "collaboration_style": "direct_and_iterative"
      }
    },
    "provenance": {
      "assertion_type": "self",
      "confidence": "medium"
    },
    "expires_at": "2026-03-19T10:20:00Z",
    "portable": false
  }
}
```

## OpenClaw Integration Guidance

For OpenClaw-like systems, the local runtime MAY:

- search local markdown memories
- query local vector indexes
- summarize or rank recalled items
- attach provenance metadata

These steps are part of local context assembly.
They are not the interoperability contract.

The interoperability contract is the skill surface above.

## Discovery and Recognition

`HCP-SKILLS.md` is useful as a human-readable integration contract, but it is
not sufficient for automatic product discovery on its own.

For machine recognition, implementations SHOULD eventually expose an equivalent
machine-readable manifest such as `/.well-known/hcp-skills.json` or a local
runtime discovery endpoint.

That future manifest should at minimum declare:

- supported skill names
- input schema references
- output schema references
- supported transport surfaces
- supported constraint types
- implementation version

## Design Goal

HCP-compatible products should let outside agents say:

`inject the minimum context needed for this purpose`

not:

`give me your memory store`
