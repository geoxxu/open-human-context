# HCP Interaction Flows

Status: Draft

## 1. Purpose

This document defines the minimal normative interaction flows for Human Context
Protocol (HCP). These flows describe how applications discover capabilities,
request authorization, bind runtime context, use it within execution boundaries,
release it, and react to revocation.

## 2. Shared Rules

All flows in this document inherit the following requirements:

- the requester MUST identify itself in a stable way within the local trust boundary
- capabilities MUST be requested explicitly
- a declared purpose MUST be provided on every authorization request
- grants MUST be time-bounded
- every significant decision or lifecycle transition MUST emit an audit event
- implementations MUST fail closed when authorization state cannot be determined

## 3. Flow 1: Capability Discovery

### 3.1 Goal

Allow an application to discover supported capabilities before making an
authorization request.

### 3.2 Request

The requester asks the HCP runtime or vault:

- what capability identifiers exist
- what each capability means
- whether explicit approval is always required
- any risk level or user-facing explanation

### 3.3 Response

The response SHOULD include for each capability:

- `id`
- `domain`
- `title`
- `description`
- `risk_level`
- `requires_explicit_approval`

### 3.4 Rules

- discovery MUST NOT create authorization
- discovery SHOULD NOT expose raw user context
- discovery MAY be cached briefly by the requester

## 4. Flow 2: Authorization Request

### 4.1 Goal

Allow a requester to ask for one or more capabilities for a declared purpose.

### 4.2 Required Request Inputs

- `requester_id`
- `capabilities`
- `purpose`
- `requested_duration_seconds`

Optional inputs:

- `constraints`
- `session_id`
- `user_visible_reason`

### 4.3 Decision Outcomes

The user or user-controlled policy engine MAY:

- approve the request as submitted
- deny the request
- narrow the capability set
- shorten the duration
- add stricter constraints

### 4.4 Output

If approved, the implementation returns a `Grant`.
If denied, the implementation returns a denial response that is audit-recorded.

### 4.5 Rules

- approval MUST be based on explicit requested capabilities, not hidden inferred access
- approved capabilities MUST be a subset of requested capabilities
- duration MUST be bounded and MUST NOT be infinite in the core protocol
- denial SHOULD return a clear reason when local policy permits

## 5. Flow 3: Runtime Binding

### 5.1 Goal

Bind an active execution to an approved grant and derive a bounded context view.

### 5.2 Inputs

- `grant_id`
- `requester_id`
- `session_id`
- optional execution metadata needed for policy checks

### 5.3 Processing

Before creating a binding, the implementation MUST verify:

- the grant exists
- the grant is `active`
- the grant is not expired
- the requester matches the grant
- the purpose matches the intended execution
- all enforceable constraints can be honored

### 5.4 Output

On success, the implementation creates:

- a `RuntimeBinding`
- a `ContextView`

### 5.5 Rules

- the context view MUST be derived for the declared purpose, not as a general export
- the binding MUST expire automatically no later than the underlying grant expiry
- a failed binding attempt SHOULD emit an audit event when local policy considers it significant

## 6. Flow 4: Use Within Execution

### 6.1 Goal

Allow the requester to use the context view only within the approved runtime.

### 6.2 Default Restrictions

Unless explicitly permitted by grant constraints:

- storage is disallowed
- downstream forwarding is disallowed
- reuse for a different purpose is disallowed
- reuse in a different session is disallowed

### 6.3 Rules

- every use of the bound context MUST remain within the approved capability scope
- if a requester attempts to exceed scope, the implementation MUST deny the action when enforceable
- attempted out-of-scope use SHOULD produce a `policy.violation_detected` audit event

## 7. Flow 5: Release

### 7.1 Goal

Release a binding and terminate the runtime access path when execution ends.

### 7.2 Triggers

A release MAY occur due to:

- normal task completion
- explicit requester release
- timeout
- session termination

### 7.3 Rules

- release MUST invalidate further use of the binding
- release SHOULD happen automatically when the session ends
- release MUST emit `runtime_binding.released`

## 8. Flow 6: Revocation

### 8.1 Goal

Allow the user to revoke an existing grant at any time.

### 8.2 Processing

When revocation occurs, the implementation MUST:

- mark the grant as revoked
- emit a `grant.revoked` audit event
- invalidate future binding attempts immediately

For active bindings, the implementation MUST:

- revoke or disable them as quickly as possible
- reject subsequent use attempts clearly

### 8.3 Rules

- revocation MUST take precedence over convenience or best-effort continuation
- a revoked grant MUST NOT continue to authorize existing or future sessions
- post-revocation use attempts SHOULD emit `runtime_binding.use_after_revocation`

## 9. Flow 7: Audit

### 9.1 Goal

Create a durable record of important authorization and runtime activity.

### 9.2 Minimum Audit Coverage

Implementations MUST record at least:

- authorization requested
- authorization granted
- authorization denied
- runtime binding created
- runtime binding released
- grant revoked
- attempted use after revocation
- policy violation detected

### 9.3 Rules

- audit records MUST be attributable to subject and requester
- audit records MUST NOT require raw context payloads
- audit records SHOULD be queryable for incident analysis

## 10. Failure Conditions

An implementation MUST reject or fail closed when:

- a capability is unknown
- a requester identity cannot be resolved
- the purpose is missing
- the grant is expired or revoked
- required constraints cannot be enforced
- runtime state needed to verify authorization is unavailable

## 11. Reference Sequence

The intended minimal flow is:

1. Discover capabilities.
2. Request authorization for explicit capabilities and purpose.
3. Receive approved or denied decision.
4. If approved, create runtime binding.
5. Use derived context view within the live execution only.
6. Release binding on completion or timeout.
7. Revoke at any time if the user withdraws permission.

