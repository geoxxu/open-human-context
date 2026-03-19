# HCP Core Model

Status: Draft

## 1. Purpose

This document defines the minimal object model for Human Context Protocol (HCP).
It specifies the core nouns, state transitions, and invariants required for an
implementation to expose personal context without exposing raw context storage.

The model is intentionally small. Implementations may add internal details, but
they must not weaken the boundary rules defined here.

## 2. Design Goals

The core model exists to ensure that HCP implementations:

- authorize capabilities instead of raw data access
- bind context only during runtime execution
- preserve explicit purpose and time boundaries
- support immediate revocation
- emit auditable lifecycle events

## 3. Conventions

The key words "MUST", "MUST NOT", "SHOULD", "SHOULD NOT", and "MAY" in this
document are to be interpreted as described in RFC 2119.

Unless otherwise stated:

- timestamps MUST be RFC 3339 / ISO 8601 strings in UTC
- identifiers MUST be stable strings unique within the issuing implementation
- object examples are illustrative and not exhaustive

## 4. Core Entities

### 4.1 ContextDomain

A `ContextDomain` is a high-level namespace for a bounded class of human context.
It does not represent raw storage and MUST NOT imply unrestricted access to all
underlying context in that domain.

Required fields:

- `id`: stable domain identifier, for example `profile`
- `title`: human-readable name
- `description`: plain-language description of what the domain covers

Optional fields:

- `stability`: implementation-defined maturity marker such as `stable` or `experimental`

Rules:

- domain identifiers SHOULD be short and human-readable
- domains MUST be usable as prefixes for capability names

Example:

```json
{
  "id": "communication_style",
  "title": "Communication Style",
  "description": "Patterns that help an application adapt tone, format, and pacing."
}
```

### 4.2 CapabilityDefinition

A `CapabilityDefinition` describes a narrow permission that an application may
request. Capabilities are the primary unit of authorization in HCP.

Required fields:

- `id`: globally meaningful capability identifier, for example `communication_style.adapt_tone`
- `domain`: owning `ContextDomain.id`
- `title`: human-readable name
- `description`: plain-language description of allowed behavior
- `risk_level`: one of `low`, `medium`, `high`
- `requires_explicit_approval`: boolean

Optional fields:

- `examples`: short examples of permitted use
- `forbidden_examples`: short examples of non-permitted use

Rules:

- a capability MUST describe behavior, not a bulk data export path
- a capability MUST be independently grantable and revocable
- a capability MUST be narrow enough for a user to understand during approval
- a capability identifier SHOULD follow `<domain>.<action>` naming

Example:

```json
{
  "id": "preferences.rank_options",
  "domain": "preferences",
  "title": "Rank Options",
  "description": "Use known preferences to rank choices presented in the current task.",
  "risk_level": "medium",
  "requires_explicit_approval": true
}
```

### 4.3 Purpose

A `Purpose` is a declared reason for requesting one or more capabilities.

Required fields:

- `id`: stable purpose identifier, for example `draft_email`
- `title`: human-readable label
- `description`: user-visible explanation of why context is needed

Rules:

- every authorization request MUST include exactly one declared purpose
- purpose identifiers SHOULD be task-oriented and human-readable
- an implementation MUST record the declared purpose in grant and audit records

Example:

```json
{
  "id": "meeting_preparation",
  "title": "Meeting Preparation",
  "description": "Prepare an agenda and reminders tailored to the user's work style."
}
```

### 4.4 PolicyConstraint

A `PolicyConstraint` is a machine-readable limitation attached to a grant or
runtime binding.

Required fields:

- `type`: constraint type identifier
- `value`: type-specific value

Optional fields:

- `description`: user-visible explanation

Recommended initial constraint types:

- `session_only`: binding valid only for the referenced session
- `max_duration_seconds`: upper runtime duration
- `storage_allowed`: boolean
- `forwarding_allowed`: boolean
- `allowed_tools`: list of tool identifiers
- `blocked_tools`: list of tool identifiers
- `max_bindings`: integer

Rules:

- constraints MUST be additive restrictions, never privilege expansion
- unknown constraint types MUST be rejected or ignored safely according to local policy
- if a constraint cannot be enforced, the implementation MUST fail closed

Example:

```json
{
  "type": "storage_allowed",
  "value": false,
  "description": "The application may not store derived context outside the active run."
}
```

### 4.5 Grant

A `Grant` is a user-approved authorization record.

Required fields:

- `id`: grant identifier
- `subject_id`: identifier of the user or user-controlled principal
- `requester_id`: identifier of the requesting application, agent, or tool
- `requested_capabilities`: list of capability identifiers originally requested
- `approved_capabilities`: list of capability identifiers actually approved
- `purpose`: `Purpose`
- `constraints`: list of `PolicyConstraint`
- `issued_at`: timestamp
- `expires_at`: timestamp
- `state`: one of `requested`, `active`, `expired`, `revoked`, `denied`

Optional fields:

- `session_id`: requester-provided session reference
- `decision_reason`: optional explanation for narrowing or denial
- `revoked_at`: timestamp
- `revocation_reason`: optional explanation

Rules:

- `approved_capabilities` MUST be a subset of `requested_capabilities`
- an `active` grant MUST have `expires_at` later than `issued_at`
- a `revoked` grant MUST record `revoked_at`
- a `denied` grant MUST have an empty `approved_capabilities` list
- a grant MUST be user-controlled or controlled by user-authorized policy

Example:

```json
{
  "id": "grant_01JX8Y4B4F",
  "subject_id": "user_123",
  "requester_id": "app.mail.assistant",
  "requested_capabilities": [
    "communication_style.adapt_tone",
    "relationships.use_relationship_labels"
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
    },
    {
      "type": "max_duration_seconds",
      "value": 1800
    }
  ],
  "issued_at": "2026-03-19T10:00:00Z",
  "expires_at": "2026-03-19T10:30:00Z",
  "state": "active"
}
```

### 4.6 RuntimeBinding

A `RuntimeBinding` is a temporary association between a live execution context
and an approved grant.

Required fields:

- `id`: binding identifier
- `grant_id`: referenced `Grant.id`
- `requester_id`: binding consumer identity
- `purpose_id`: referenced `Purpose.id`
- `session_id`: active runtime or session reference
- `context_view_id`: identifier of the produced `ContextView`
- `created_at`: timestamp
- `expires_at`: timestamp
- `state`: one of `active`, `released`, `expired`, `revoked`

Optional fields:

- `released_at`: timestamp
- `revoked_at`: timestamp

Rules:

- a binding MUST reference a currently valid and active grant at creation time
- a binding MUST NOT outlive the grant it depends on
- a binding MUST become invalid when the underlying grant is revoked
- a binding SHOULD be specific to a single execution or session

### 4.7 ContextView

A `ContextView` is the runtime-resolved object exposed to an application. It is
the primary boundary object of HCP.

Required fields:

- `id`: context view identifier
- `grant_id`: referenced `Grant.id`
- `capabilities`: capabilities used to derive the view
- `purpose_id`: declared purpose
- `content`: implementation-defined derived payload
- `created_at`: timestamp
- `expires_at`: timestamp
- `portable`: boolean, default `false`

Rules:

- the `content` field MUST contain only the minimum information needed for the declared purpose
- a context view MUST be capability-scoped and purpose-aware
- a context view MUST NOT be treated as a raw export of the user's vault
- `portable` MUST be `false` unless an explicit grant constraint allows portability

Example:

```json
{
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
```

### 4.8 RevocationEvent

A `RevocationEvent` records invalidation of a grant or binding.

Required fields:

- `id`: event identifier
- `target_type`: `grant` or `runtime_binding`
- `target_id`: referenced object identifier
- `reason`: short machine-readable or human-readable reason
- `occurred_at`: timestamp

Rules:

- revocation events MUST be durable enough to enforce future denial decisions
- implementations SHOULD propagate grant revocation to active bindings immediately

### 4.9 AuditEvent

An `AuditEvent` records authorization or runtime lifecycle activity.

Required fields:

- `id`: event identifier
- `type`: event type
- `subject_id`: user or subject identifier
- `requester_id`: application, agent, or tool identifier
- `occurred_at`: timestamp

Optional fields:

- `grant_id`
- `binding_id`
- `purpose_id`
- `capabilities`
- `result`
- `details`

Required event types:

- `authorization.requested`
- `authorization.granted`
- `authorization.denied`
- `runtime_binding.created`
- `runtime_binding.released`
- `grant.revoked`
- `runtime_binding.use_after_revocation`
- `policy.violation_detected`

Rules:

- audit events MUST be append-only from the perspective of normal application use
- audit events SHOULD be queryable by grant, binding, requester, and time
- audit events MUST NOT require raw context payload storage

## 5. Lifecycle Rules

### 5.1 Grant Lifecycle

Expected state progression:

- requested -> active
- requested -> denied
- active -> expired
- active -> revoked

Rules:

- an expired or revoked grant MUST NOT be reactivated
- renewal MUST create a new grant record

### 5.2 Runtime Binding Lifecycle

Expected state progression:

- created -> active
- active -> released
- active -> expired
- active -> revoked

Rules:

- once released, expired, or revoked, the binding MUST reject further use
- a binding MAY be released automatically on session termination or timeout

## 6. Invariants

An implementation claiming HCP compatibility MUST preserve these invariants:

1. No access without a grant.
2. No runtime binding without a valid grant.
3. No continued use after revocation.
4. No capability use outside the declared purpose.
5. No mandatory raw context export in the core protocol.
6. No silent expansion from requested capabilities to broader effective access.

## 7. Serialization Guidance

HCP does not require a single canonical storage format for internal persistence.
However, any external protocol surface SHOULD serialize these core entities in a
JSON-compatible shape so that local HTTP, CLI, and SDK layers can align.

## 8. Out of Scope

This document does not define:

- the underlying vault storage format
- a global identity system
- ontology completeness for all possible human context domains
- cloud deployment requirements

