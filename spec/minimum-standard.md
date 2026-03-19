# HCP Minimum Standard

Status: Draft

## 1. Purpose

This document defines the minimum requirements an implementation MUST satisfy in
order to claim compatibility with Human Context Protocol (HCP).

The minimum standard is intentionally narrow. It defines the protocol floor, not
a product maturity ceiling.

## 2. Compatibility Statement

An implementation MAY claim "HCP-compatible" only if it satisfies every
requirement in Section 3.

If an implementation omits a required behavior, weakens a required boundary, or
replaces a required user control with provider control, it MUST NOT claim HCP
compatibility.

## 3. Required Capabilities

### 3.1 User-Controlled Grants

The implementation MUST ensure that grant approval and revocation remain under
user control or user-authorized local policy control.

### 3.2 Explicit Capability Authorization

The implementation MUST authorize explicit capabilities rather than bulk access
to raw personal context.

### 3.3 Purpose-Bound Requests

Every authorization request MUST include a declared purpose that is visible to
the user and recorded in the resulting decision.

### 3.4 Time-Bounded Grants

Every approved grant MUST include an issuance time and expiration time.
Permanent grants are not part of the minimum standard.

### 3.5 Revocation Support

The implementation MUST support grant revocation after approval and MUST deny
future use once revocation has occurred.

### 3.6 Runtime-Scoped Context Binding

The implementation MUST expose context through runtime-scoped bindings or an
equivalent mechanism that does not require general raw context export.

### 3.7 No Mandatory Raw Context Export

The implementation MUST NOT require exporting the user's raw context store in
order to interoperate with applications.

### 3.8 Audit Event Generation

The implementation MUST generate audit events for the minimum lifecycle defined
in the core model and interaction flow specifications.

### 3.9 Protocol/Product Separation

The implementation MUST preserve a clear distinction between protocol guarantees
and product-specific features, business logic, or convenience behavior.

### 3.10 No Hidden Centralization Requirement

The implementation MUST NOT depend on mandatory centralized custody, mandatory
provider identity, or hidden commercial control assumptions.

### 3.11 Skill and Tool Boundary Preservation

If the implementation exposes a tool, function, or skill adapter for agent
frameworks, that surface MUST preserve HCP boundaries by requesting scoped
context injection rather than direct access to raw backing stores.

## 4. Testable Conformance Checks

An implementation SHOULD be evaluated against at least the following checks:

1. It can deny a request for an unknown capability.
2. It can approve a request with narrower scope than requested.
3. It emits a grant record containing purpose, constraints, and expiry.
4. It can bind runtime context only while the grant is active.
5. It rejects binding after expiry.
6. It rejects binding after revocation.
7. It emits audit events for request, approval or denial, binding, release, and revocation.
8. It does not require handing over a raw context database to the requester.
9. It can enforce or fail closed on unsupported constraints.
10. It can explain the approved capability scope in user-visible terms.
11. If it exposes a skill or tool surface, that surface does not require direct reads of the user's memory store or vector database.

## 5. Non-Requirements

The minimum standard does not require:

- a cloud deployment model
- a local-only deployment model
- a specific identity provider
- a specific cryptographic scheme
- a complete ontology of all human context domains
- a graphical user interface

## 6. Compatibility Claims

Compatibility claims SHOULD specify:

- implementation name and version
- supported transport surfaces
- supported constraint types
- known limitations

Claims MUST NOT imply that HCP certifies overall product ethics, security, or
trustworthiness beyond the boundary guarantees defined here.


