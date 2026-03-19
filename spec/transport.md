# HCP Transport

Status: Draft

## 1. Purpose

This document defines a minimal transport and API surface for Human Context
Protocol (HCP) implementations. The goal is to let local systems interoperate
without guessing request shapes, response shapes, event semantics, or errors.

This specification is intentionally local-first. It defines the protocol surface
needed for a reference runtime, SDKs, and examples. It does not require a hosted
service model.

## 2. Transport Principles

An HCP implementation:

- MUST preserve the semantics defined in the core model and interaction flows
- MUST fail closed when authorization state cannot be verified
- SHOULD expose JSON-compatible request and response objects
- MAY support multiple transport surfaces that map to the same core semantics

Recommended initial transport surfaces:

- local HTTP
- CLI
- embeddable library interface

## 3. Canonical Operation Set

The minimal operation set is:

- capability discovery
- authorization request
- grant retrieval
- runtime binding creation
- runtime binding release
- grant revocation
- audit event listing
- optional composite context injection for tool-calling environments
- optional skill manifest discovery

## 4. Canonical Message Shapes

### 4.1 Capability Discovery Response

```json
{
  "capabilities": [
    {
      "id": "communication_style.adapt_tone",
      "domain": "communication_style",
      "title": "Adapt Tone",
      "description": "Use tone guidance for the active task.",
      "risk_level": "medium",
      "requires_explicit_approval": true
    }
  ]
}
```

### 4.2 Authorization Request

```json
{
  "requester_id": "app.mail.assistant",
  "capabilities": [
    "communication_style.adapt_tone"
  ],
  "purpose": {
    "id": "draft_email",
    "title": "Draft Email",
    "description": "Draft a reply in the user's preferred tone."
  },
  "requested_duration_seconds": 1800,
  "constraints": [
    {
      "type": "storage_allowed",
      "value": false
    }
  ],
  "session_id": "sess_123"
}
```

### 4.3 Authorization Decision Response

```json
{
  "grant": {
    "id": "grant_01JX8Y4B4F",
    "subject_id": "user_123",
    "requester_id": "app.mail.assistant",
    "requested_capabilities": [
      "communication_style.adapt_tone"
    ],
    "approved_capabilities": [
      "communication_style.adapt_tone"
    ],
    "purpose": {
      "id": "draft_email",
      "title": "Draft Email",
      "description": "Draft a reply in the user's preferred tone."
    },
    "constraints": [
      {
        "type": "storage_allowed",
        "value": false
      }
    ],
    "issued_at": "2026-03-19T10:00:00Z",
    "expires_at": "2026-03-19T10:30:00Z",
    "state": "active"
  }
}
```

### 4.4 Runtime Binding Request

```json
{
  "grant_id": "grant_01JX8Y4B4F",
  "requester_id": "app.mail.assistant",
  "session_id": "sess_123"
}
```

### 4.5 Runtime Binding Response

```json
{
  "binding": {
    "id": "binding_01JX8Y8FAN",
    "grant_id": "grant_01JX8Y4B4F",
    "requester_id": "app.mail.assistant",
    "purpose_id": "draft_email",
    "session_id": "sess_123",
    "context_view_id": "view_01JX8Y7FW2",
    "created_at": "2026-03-19T10:03:00Z",
    "expires_at": "2026-03-19T10:30:00Z",
    "state": "active"
  },
  "context_view": {
    "id": "view_01JX8Y7FW2",
    "grant_id": "grant_01JX8Y4B4F",
    "capabilities": [
      "communication_style.adapt_tone"
    ],
    "purpose_id": "draft_email",
    "content": {
      "tone_guidance": "Prefer warm, concise, and direct phrasing."
    },
    "created_at": "2026-03-19T10:03:00Z",
    "expires_at": "2026-03-19T10:30:00Z",
    "portable": false
  }
}
```

### 4.6 Revocation Request

```json
{
  "reason": "user_withdrew_permission"
}
```

### 4.7 Audit Event List Response

```json
{
  "events": [
    {
      "id": "evt_01",
      "type": "authorization.granted",
      "subject_id": "user_123",
      "requester_id": "app.mail.assistant",
      "grant_id": "grant_01JX8Y4B4F",
      "purpose_id": "draft_email",
      "capabilities": [
        "communication_style.adapt_tone"
      ],
      "occurred_at": "2026-03-19T10:00:00Z"
    }
  ]
}
```

## 5. Local HTTP Mapping

One valid local HTTP mapping is:

- `GET /capabilities`
- `POST /authorizations`
- `GET /grants/{grant_id}`
- `POST /bindings`
- `POST /bindings/{binding_id}/release`
- `POST /grants/{grant_id}/revoke`
- `GET /audit-events`
- `GET /.well-known/hcp-skills.json`

Rules:

- HTTP status codes SHOULD reflect success or failure class
- response bodies SHOULD use the canonical message shapes above
- implementations MUST NOT treat HTTP as the only valid transport

Recommended status mapping:

- `200 OK`: retrieval success
- `201 Created`: new grant or binding created
- `400 Bad Request`: malformed request
- `401 Unauthorized`: requester identity missing or invalid
- `403 Forbidden`: denied by policy or out-of-scope action
- `404 Not Found`: unknown capability, grant, or binding reference
- `409 Conflict`: state conflict such as already released
- `410 Gone`: expired or revoked object

## 6. CLI Mapping

One valid CLI surface is:

- `hcp capabilities list`
- `hcp auth request --file request.json`
- `hcp grants get <grant-id>`
- `hcp bindings create --file request.json`
- `hcp bindings release <binding-id>`
- `hcp grants revoke <grant-id>`
- `hcp audit list`
- `hcp skills manifest`

Rules:

- CLI output SHOULD be JSON by default for machine use
- human-friendly formatting MAY be offered as an option

## 7. Embeddable Library Mapping

An embeddable library interface SHOULD expose functions equivalent to:

- `listCapabilities()`
- `requestAuthorization(input)`
- `getGrant(grantId)`
- `createBinding(input)`
- `releaseBinding(bindingId)`
- `revokeGrant(grantId, reason)`
- `listAuditEvents(filter)`
- `getSkillManifest()`

SDKs MAY present idiomatic naming while preserving the same semantics.

## 8. Skill / Tool Mapping

One valid tool-calling profile is:

- `hcp.capabilities.list`
- `hcp.inject_context`
- `hcp.bindings.release`
- `hcp.grants.revoke`

Rules:

- `hcp.inject_context` MAY be a composite convenience operation that performs authorization and runtime binding behind a single tool call
- composite skill execution MUST still create auditable grant and binding records with normal expiry and revocation behavior
- skill adapters MUST NOT expose raw memory-query primitives such as direct markdown reads, vector-store queries, or equivalent backing-store operations as the interoperability surface
- skill adapters MAY accept product-facing hints such as `requested_context`, but they MUST resolve them to explicit approved capabilities before context is injected
- skill responses SHOULD return canonical HCP objects or a shape directly mappable to them

Example `hcp.inject_context` request:

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

Example response:

```json
{
  "grant": {
    "id": "grant_01JX9SKILL1",
    "subject_id": "user_123",
    "requester_id": "demo.recruiting.agent",
    "requested_capabilities": [
      "profile.summarize_professional_background",
      "workflow.describe_collaboration_style"
    ],
    "approved_capabilities": [
      "profile.summarize_professional_background",
      "workflow.describe_collaboration_style"
    ],
    "purpose": {
      "id": "candidate_screening",
      "title": "Candidate Screening",
      "description": "Summarize relevant professional context for the current hiring workflow."
    },
    "constraints": [
      {
        "type": "storage_allowed",
        "value": false
      }
    ],
    "issued_at": "2026-03-19T10:00:00Z",
    "expires_at": "2026-03-19T10:20:00Z",
    "state": "active"
  },
  "binding": {
    "id": "binding_01JX9SKILL2",
    "grant_id": "grant_01JX9SKILL1",
    "requester_id": "demo.recruiting.agent",
    "purpose_id": "candidate_screening",
    "session_id": "sess_demo_01",
    "context_view_id": "view_01JX9SKILL3",
    "created_at": "2026-03-19T10:01:00Z",
    "expires_at": "2026-03-19T10:20:00Z",
    "state": "active"
  },
  "context_view": {
    "id": "view_01JX9SKILL3",
    "grant_id": "grant_01JX9SKILL1",
    "capabilities": [
      "profile.summarize_professional_background",
      "workflow.describe_collaboration_style"
    ],
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
    "created_at": "2026-03-19T10:01:00Z",
    "expires_at": "2026-03-19T10:20:00Z",
    "portable": false
  }
}
```

Manifest discovery for automatic tool recognition SHOULD align with
`spec/skill-manifest.md` and MAY be exposed through `/.well-known/hcp-skills.json`.

## 9. Event Schema

All emitted audit events SHOULD share a common envelope:

```json
{
  "id": "evt_01",
  "type": "authorization.requested",
  "subject_id": "user_123",
  "requester_id": "app.mail.assistant",
  "occurred_at": "2026-03-19T09:59:58Z",
  "grant_id": null,
  "binding_id": null,
  "purpose_id": "draft_email",
  "capabilities": [
    "communication_style.adapt_tone"
  ],
  "result": "pending",
  "details": {}
}
```

## 10. Error Model

Transport surfaces SHOULD map failures to a shared error shape:

```json
{
  "error": {
    "code": "grant_revoked",
    "message": "The referenced grant has been revoked.",
    "retryable": false,
    "details": {}
  }
}
```

Recommended error codes:

- `invalid_request`
- `unknown_capability`
- `unknown_grant`
- `unknown_binding`
- `requester_identity_invalid`
- `purpose_required`
- `grant_expired`
- `grant_revoked`
- `binding_released`
- `constraint_not_enforceable`
- `policy_violation`

## 11. Transport Neutrality

This document standardizes behavior, not hosting architecture. Implementations
may expose the canonical operation set through one or more transport surfaces,
provided the core semantics and safety boundaries remain unchanged.






