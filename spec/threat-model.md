# HCP Threat Model

Status: Draft

## 1. Purpose

This document defines the minimal threat model for Human Context Protocol (HCP).
It identifies the assets HCP protects, the relevant threat actors, the primary
attack paths, and the required defensive posture for compatible implementations.

## 2. Protected Assets

HCP is primarily concerned with protecting:

- the user's personal context from raw extraction
- the user's authority over grants and revocation
- the bounded meaning of capabilities
- the integrity of runtime-only context exposure
- the audit trail for authorization and misuse events

## 3. Trust Boundaries

The protocol assumes distinct boundaries between:

- the user-controlled context vault or policy authority
- the HCP runtime or authorization layer
- the requesting application, agent, or tool
- any downstream tools or sub-agents invoked by that requester

Security decisions MUST be evaluated across these boundaries, not only within a
single process.

## 4. Threat Actors

Relevant threat actors include:

- curious applications that over-collect context for convenience
- careless developers who cache or forward context outside approved scope
- adversarial applications that disguise extraction as normal usage
- prompt-injected or compromised agents that attempt scope expansion
- downstream tools or sub-agents that receive context without authorization
- operators who attempt to weaken audit or revocation semantics

## 5. Primary Threats

### 5.1 Raw Context Extraction

Threat:
An application attempts to obtain full or reconstructable user context instead
of a bounded purpose-specific view.

Required mitigation:

- authorize capabilities, not bulk memory access
- expose `ContextView` objects, not raw vault export APIs
- deny requests whose semantics imply broad extraction
- integrations MUST NOT treat direct file reads, vector-store queries, or equivalent backing-store operations as the normal interoperability surface

### 5.2 Over-Broad Capability Design

Threat:
A capability name is vague enough to hide broad access behind a friendly label.

Required mitigation:

- capability definitions MUST be narrow and human-readable
- risk level and user-facing explanation MUST be discoverable
- implementations SHOULD reject capabilities that cannot be explained clearly

### 5.3 Unauthorized Retention

Threat:
A requester stores runtime context after the session ends or after expiration.

Required mitigation:

- storage MUST be disallowed by default
- grants MUST support explicit `storage_allowed` constraints
- policy violations SHOULD be auditable

### 5.4 Downstream Leakage

Threat:
Authorized context is forwarded to tools, sub-agents, or services not covered by
the grant.

Required mitigation:

- forwarding MUST be disallowed by default
- grants SHOULD support allowed/blocked tool constraints
- implementations SHOULD bind context to requester and session identity

### 5.5 Purpose Drift

Threat:
A requester uses context for a different task than the declared purpose.

Required mitigation:

- every request MUST declare a purpose
- purpose MUST be recorded in grants and audit events
- bindings SHOULD be rejected when execution purpose does not match the grant

### 5.6 Long-Lived or Over-Reusable Grants

Threat:
An authorization remains active long enough to become de facto permanent access.

Required mitigation:

- grants MUST be time-bounded
- renewals MUST create new grants
- session-only and duration constraints SHOULD be available

### 5.7 Revocation Bypass

Threat:
An application continues using context after the user revokes the grant.

Required mitigation:

- active bindings MUST be invalidated as quickly as possible
- future binding attempts MUST fail immediately after revocation
- post-revocation use attempts SHOULD be recorded

### 5.8 Audit Suppression

Threat:
Important events are omitted or altered so misuse cannot be investigated.

Required mitigation:

- minimum audit events MUST be generated
- audit logs SHOULD be append-only for normal operations
- applications MUST NOT control whether core authorization events are logged

### 5.9 Deceptive Authorization UX

Threat:
The requester frames a dangerous request in a way that obscures actual scope.

Required mitigation:

- capabilities MUST be human-readable
- purpose MUST be user-visible
- approved scope MUST be inspectable before activation

## 6. Design Assumptions

HCP assumes:

- applications may be curious, careless, or adversarial
- models may summarize, persist, transform, or leak context unexpectedly
- sub-agents and tools increase the chance of accidental or deliberate scope expansion
- convenience pressure will push implementers toward broader permissions unless the protocol resists it

## 7. Required Defensive Posture

Compatible implementations MUST prefer:

- least privilege over convenience
- runtime-only exposure over data handoff
- short-lived grants over durable access
- explicit constraints over inferred trust
- fail-closed behavior over best-effort authorization
- auditable state changes over implicit transitions

## 8. Out of Scope

This threat model does not claim to solve:

- endpoint compromise on the user's machine
- universal prevention of model memorization
- perfect detection of all covert exfiltration channels
- global identity verification
- truthfulness of user-supplied context

These risks remain important, but they are not fully eliminated by the protocol.

## 9. Residual Risk Statement

HCP reduces the attack surface of personal context use by narrowing what can be
requested, when it can be used, and how it can be revoked. It does not make
requesters trustworthy by default. Compatible implementations should therefore
layer additional controls such as sandboxing, local policy enforcement, and
developer-facing warnings where appropriate.

