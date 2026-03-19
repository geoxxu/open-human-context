# PLAN

## Human Context Protocol (HCP)
### A minimal execution plan for turning principles into a usable protocol

---

## 1. Current Stage

HCP currently defines a clear philosophy, boundary, and governance model.

The next step is not to build a large product.
The next step is to define a minimal, auditable, implementable protocol surface.

This plan intentionally favors:
- simplicity over feature breadth
- explicit boundaries over convenience
- local-first reference implementations over hosted systems
- protocol correctness before ecosystem expansion

The project should remain small until the core abstraction is stable.

---

## 2. Development Strategy

HCP should be developed in the following order:

1. Define the protocol specification documents
2. Define the minimal object model
3. Define the minimal interaction flows
4. Define the skill and tool compatibility profile for agent ecosystems
5. Define the threat model and minimum compliance standard
6. Implement the TypeScript SDK
7. Implement the Python SDK
8. Implement a local runtime and reference vault
9. Expand integrations only after the core model proves stable

This order is intentional.

If SDKs or framework integrations are built before the protocol boundaries are stable,
the implementation will accidentally define the protocol.
HCP should avoid that.

---

## 3. Scope of the First Usable Version

The first usable version of HCP should remain intentionally narrow.

### In scope
- Capability-based authorization
- Runtime-only context binding
- Explicit grant scope
- Time-bounded access
- Purpose-bound usage
- Revocation support
- Audit events
- Skill and tool adapters that preserve HCP boundaries
- Local-first reference runtime
- SDKs for TS and Python

### Out of scope
- Cloud-hosted personal context services
- Social or consumer-facing applications
- Centralized identity systems
- Bulk export of raw context data
- Direct compatibility with any vendor-specific memory folder or vector database layout
- Long-term agent-owned memory replication
- Deep framework-specific lock-in
- Rich ontology design beyond minimal interoperable context domains

The goal of the first version is not completeness.
The goal is a small, coherent, secure protocol core.

---

## 4. Core Deliverables

The first milestone should produce the following documents and components:

### Specifications
- `spec/core-model.md`
- `spec/interaction-flows.md`
- `spec/threat-model.md`
- `spec/minimum-standard.md`
- `spec/transport.md`
- `HCP-SKILLS.md`

### SDKs
- `sdk/typescript/`
- `sdk/python/`

### Reference implementation
- `runtime/local/`

### Examples
- minimal authorization example
- minimal context binding example
- minimal revocation example
- minimal audit log example

---

## 5. Minimal Protocol Model

HCP should define a deliberately small vocabulary.

### 5.1 ContextDomain
A high-level category of personal context.

Examples:
- `profile`
- `preferences`
- `communication_style`
- `relationships`
- `workflow`
- `memory_policy`

A ContextDomain is not raw data.
It is a namespace for capability requests and runtime views.

### 5.2 Capability
A narrow permission to use a bounded kind of context behavior.

Examples:
- `communication_style.adapt_tone`
- `preferences.rank_options`
- `workflow.apply_known_patterns`
- `relationships.use_relationship_labels`

Capabilities must be:
- explicit
- human-readable
- machine-readable
- revocable
- independently grantable

Applications should request capabilities, not access to a full memory store.

### 5.3 Purpose
A declared reason for requesting a capability.

Examples:
- `draft_email`
- `schedule_planning`
- `meeting_preparation`
- `task_prioritization`

Purpose should be attached to every authorization request.
Purpose should be visible to the user.
Purpose should be recorded in audit events.

### 5.4 Grant
A user-approved authorization record.

A Grant should include at minimum:
- grant id
- subject
- requesting application or agent
- requested capabilities
- approved capabilities
- purpose
- issue time
- expiration time
- constraints
- revocation state

### 5.5 PolicyConstraint
A machine-readable limitation placed on a Grant.

Examples:
- valid for one session only
- valid for 30 minutes
- no storage allowed
- no downstream forwarding
- no use outside the declared purpose
- no use with specific tools or sub-agents

### 5.6 RuntimeBinding
A temporary binding between a running task and an approved context view.

A RuntimeBinding should:
- exist only for the active run/session
- reference a valid Grant
- produce a bounded context view
- expire automatically
- become invalid when revoked

### 5.7 ContextView
The runtime-resolved output actually exposed to the application.

A ContextView should be:
- minimal
- purpose-aware
- capability-scoped
- non-portable by default
- derived from user-owned context without exposing the full vault
- suitable for delivery through a skill or tool adapter without revealing storage internals

A ContextView is the main boundary object of HCP.

### 5.8 RevocationEvent
A machine-readable event that invalidates a Grant or RuntimeBinding.

### 5.9 AuditEvent
A record that documents authorization or usage activity.

At minimum, audit events should cover:
- authorization requested
- authorization granted
- authorization denied
- runtime binding created
- runtime binding released
- grant revoked
- attempted use after revocation
- policy violation detected

---

## 6. Minimal Interaction Flows

The protocol should define a small set of normative flows.

### 6.1 Capability Discovery
An application asks what capabilities exist and how they are described.

Output should include:
- capability id
- description
- domain
- expected user-facing explanation
- risk level
- whether user approval is always required

### 6.2 Authorization Request
An application requests one or more capabilities for a specific purpose.

The request must include:
- requester identity
- capabilities
- purpose
- requested duration
- optional constraints
- optional session id

The user or user-controlled vault may:
- approve
- deny
- narrow scope
- shorten duration
- attach further constraints

### 6.3 Runtime Binding
A running task binds to an approved Grant.

The runtime should resolve a bounded ContextView instead of returning raw context storage.

### 6.4 Use Within Execution
The application uses the ContextView only within the current run.

By default:
- storage is disallowed unless explicitly permitted
- re-sharing is disallowed unless explicitly permitted
- reuse outside the declared purpose is disallowed

### 6.5 Release
The RuntimeBinding is released automatically at the end of the run or on timeout.

### 6.6 Revocation
The user may revoke the Grant at any time.

Revocation should:
- invalidate future bindings immediately
- invalidate active bindings as quickly as possible
- emit a revocation event
- make subsequent use attempts fail clearly

### 6.7 Audit
Every important authorization and runtime event should be auditable.

---

## 7. Threat Model

HCP should explicitly document what it is defending against.

### 7.1 Primary threats
- raw context extraction disguised as normal API usage
- broad permissions hidden behind vague capability names
- unauthorized retention of runtime context
- downstream tool or sub-agent leakage
- prompt injection causing out-of-scope access
- silent reuse of context for a different purpose
- grants that are too long-lived or too broad
- deceptive authorization UX
- audit bypass
- framework adapters that weaken revocation guarantees

### 7.2 Design assumptions
- applications may be curious, careless, or adversarial
- models may leak, transform, summarize, or persist information unexpectedly
- sub-agents and tools increase the risk of scope expansion
- convenience pressure will push toward over-broad permissions unless prevented by design

### 7.3 Required defensive posture
The protocol should prefer:
- least privilege
- narrow capability naming
- short-lived grants
- explicit purpose binding
- runtime-only exposure
- auditable events
- revocation-first design
- restrictive defaults

---

## 8. Minimum Standard for HCP Compatibility

Before declaring an implementation “HCP-compatible”, the project should define a minimum standard.

An implementation should not be considered compatible unless it provides all of the following:

1. User-owned control over grants
2. Explicit capability-based authorization
3. Purpose-bound requests
4. Time-bounded grants
5. Revocation support
6. Runtime-scoped context binding
7. No mandatory raw context export
8. Audit event generation
9. Clear separation between protocol and product behavior
10. No hidden commercial or centralized control assumptions

This minimum standard should stay small and testable.

---

## 9. Specification Workstreams

### Phase 1 — Core specification documents
Goal:
Define the protocol before building developer tooling.

Deliverables:
- `spec/core-model.md`
- `spec/interaction-flows.md`
- `spec/threat-model.md`
- `spec/minimum-standard.md`

Exit criteria:
- the main nouns and lifecycle states are stable
- the main flows are written down
- minimum compatibility requirements are explicit

### Phase 2 — Minimal transport and API surface
Goal:
Define how local systems talk to HCP components.

Deliverables:
- `spec/transport.md`
- `HCP-SKILLS.md`
- request/response examples
- event schema draft
- error model draft
- a draft machine-readable skill manifest shape for future automation

Recommended initial transports:
- local HTTP
- CLI
- embeddable library interface
- skill or tool-calling adapter profile

Exit criteria:
- a minimal local implementation is possible without guessing protocol behavior

---

## 10. TypeScript SDK

The TypeScript SDK should be the first implementation layer.

### Why TypeScript first
- strong fit for agent runtimes and local developer tools
- broad ecosystem reach
- good developer ergonomics for protocol iteration

### Responsibilities
The TS SDK should help developers:
- discover capabilities
- request authorization
- validate grant constraints
- create runtime bindings
- react to revocation
- emit or consume audit events

### Non-goals
The TS SDK should not:
- expose bulk raw context export
- encourage persistent local caching of context views
- hide purpose or scope from the calling application
- encode framework-specific assumptions into the core API

### Suggested package areas
- capability client
- authorization client
- runtime binding client
- audit client
- shared types and validators

Exit criteria:
- a minimal sample app can request a grant, bind runtime context, handle revocation, and release the binding cleanly

---

## 11. Python SDK

The Python SDK should follow the TS SDK closely.

### Why Python second
- strong fit for research workflows, orchestration stacks, and agent tooling
- easier adoption across AI engineering environments

### Design rule
The Python SDK should mirror the TS SDK conceptually.
It should not invent a separate model.

### Responsibilities
- preserve the same core nouns
- preserve the same lifecycle semantics
- provide examples for local agents and scripted workflows

Exit criteria:
- a minimal Python example reproduces the TS flow with equivalent semantics

---

## 12. Local Runtime

A local runtime should be implemented only after the spec and SDK layers are coherent.

### Purpose of the local runtime
The local runtime is a reference implementation.
It is not the protocol itself.

It should demonstrate:
- local authorization handling
- local grant storage
- runtime context resolution
- binding lifecycle management
- revocation handling
- audit event generation

### Design constraints
- local-first
- minimal dependencies
- easy to inspect
- easy to replace
- no hidden cloud dependency
- no requirement for centralized services

### Components
A minimal local runtime may include:
- a local vault
- a grant manager
- a runtime binder
- an audit logger
- a small developer-facing local API or CLI

Exit criteria:
- one local demo flow works end-to-end
- the code remains small enough to audit easily

---

## 13. Framework Integrations

Framework integrations should come later.

HCP should not optimize early for any single framework.

The first integration principle is:
**define a stable contract before building adapters.**

### Near-term policy
Before the core protocol is stable, integrations should remain:
- experimental
- adapter-based
- non-normative

### Candidate integration surfaces
When the core is ready, adapters may be built for:
- agent runtimes
- tool-calling frameworks
- multi-agent orchestration systems
- local desktop agent containers

### OpenClaw and similar frameworks
Framework-specific integrations should be treated as downstream adapters.

Compatibility should target the HCP capability and skill model, not any
vendor-specific storage format.

They should consume HCP through:
- capability discovery
- authorization requests
- runtime binding
- skill or tool calls that request injected context
- revocation hooks
- audit sinks

They MAY assemble context from local markdown memories, vector stores, or other
private vault implementations.

They should not:
- require direct access to `memory/*.md`, vector databases, or other storage internals
- redefine raw memory read APIs as the interoperability surface
- redefine the protocol itself

---

## 14. Simplicity Rules

To keep the project coherent in its early stage, the following rules should apply:

1. Prefer a smaller model over a more expressive model
2. Prefer human-readable capability names over abstract meta-systems
3. Prefer explicit restrictions over smart defaults
4. Prefer local-first transport before distributed coordination
5. Prefer one clear flow over many optional flows
6. Prefer normative boundaries over convenience APIs
7. Do not add ecosystem integrations before the core lifecycle is stable

---

## 15. Immediate Next Actions

The immediate next actions should be:

1. Create the `spec/` directory
2. Write `spec/core-model.md`
3. Write `spec/interaction-flows.md`
4. Write `spec/threat-model.md`
5. Write `spec/minimum-standard.md`
6. Write `spec/transport.md`
7. Write `HCP-SKILLS.md`
8. Review for internal consistency
9. Build the TypeScript SDK against the written spec
10. Build the Python SDK to match the TS semantics
11. Implement a minimal local runtime
12. Add example flows including a tool-calling adapter
13. Only then discuss broader framework integration

---

## 16. Success Criteria for the First Milestone

The first milestone is successful if:

- HCP has a clear minimal vocabulary
- HCP has clear request / grant / bind / revoke / audit flows
- HCP has an explicit threat model
- HCP has a minimum compatibility standard
- the TS SDK works against that model
- the Python SDK mirrors the same semantics
- a local runtime proves the model is implementable
- the repository remains small, auditable, and principle-aligned

---

## Final Note

HCP should remain intentionally small until its core guarantees are hard to misuse.

The purpose of this phase is not rapid adoption.

The purpose of this phase is to establish a protocol boundary that is simple enough to implement,
strong enough to defend user sovereignty,
and narrow enough to remain trustworthy.
