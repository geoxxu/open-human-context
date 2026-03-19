# Human Context Protocol (HCP) 
### An Open Framework for Personal Context Sovereignty in the Age of AI

---

## Overview

AI systems are becoming increasingly capable.

Yet their understanding of *who a person is* remains fragmented, opaque, and owned by platforms rather than individuals.

Personal context — relationships, expression style, preferences, history, and lived experience — is scattered across applications, accounts, and services that users do not truly control.

**This project explores a different future.**

(See `MANIFESTO.md` for details.)

---

## What This Project Is

**Human Context Protocol (HCP)** is an open framework that defines:

- How personal context can be represented *without exposing raw data*
- How AI agents can be authorized to operate within that context
- How context can be injected at runtime without being extracted or retained
- How users can revoke access at any time

HCP aims to interoperate with local memory systems such as OpenClaw by
standardizing a capability and skill surface, not a storage layout. A local
`memory/` folder, vector index, or SQLite database remains an implementation
detail behind a user-controlled context authority.

This project focuses on **interfaces, permissions, and boundaries** — not applications.

---

## What This Project Is NOT

To avoid misunderstanding, we are explicit:

- ❌ **Not a data collection platform**  
  We do not host, aggregate, or monetize user data.

- ❌ **Not an AI agent or application**  
  We do not provide chatbots, assistants, or social features.

- ❌ **Not a user profiling system**  
  We do not define personality, identity, or conclusions about users.

- ❌ **Not a cloud service**  
  Reference implementations are local-first and user-owned.

---

## Core Design Principles

### 1. Local-First Ownership
Personal context is stored where the user controls it.

### 2. Capability-Based Authorization
Applications are granted *abilities*, not memory access.

### 3. Runtime Context Injection
Context is bound during execution — never exported as raw data.

### 4. Explicit Scope & Revocability
Every authorization is:
- scoped
- time-bound
- purpose-specific
- revocable

### 5. Application Neutrality
This framework does not favor any model, vendor, or ecosystem.

---

## High-Level Architecture
[ User-Owned Context Vault ]
↑
Permission & Scope Control
↑
Runtime Context Injection
↑
[ AI Agents / Applications ]


Applications may *act with context*,  
but may not *possess context*.

---

## Project Modules (Initial Scope)

- **Context Schema Interfaces**  
  Abstract representations for relationships, interaction patterns, expression styles, and preference signals.

- **Authorization & Scope Model**  
  Declarative permission boundaries for context usage.

- **Context Injection Interface**  
  Runtime-only binding mechanisms for AI agents.

- **Skill / Tool Compatibility Profile**  
  A thin adapter profile for OpenClaw-like products and tool-calling agent
  ecosystems that need to request scoped context injection without reading raw
  memory stores.

- **Local Reference Implementation (Optional)**  
  Demonstrates encrypted, local storage — not a required standard.

---

## Relationship to Extraction Tools

GUI agents, automation tools, or extraction systems may be used *by the user* to populate their own vault.

This project does **not** mandate or depend on any extraction method.

The user controls:
- what is included
- when it is updated
- when it is deleted

Third-party agents do **not** get direct interoperability rights to those
stores. They should request scoped context injection from a local authority
instead.

---

## Who This Is For

- AI agent builders who want ethical, user-aligned context access  
- Researchers exploring human–AI agency boundaries  
- Developers interested in local-first, privacy-preserving AI systems  
- Anyone who believes identity should not be owned by platforms  

---

## Long-Term Vision

In the future, applications will not claim:
> “We understand you better than anyone.”

Instead, they will ask:
> “May we operate within your context — under your terms?”

This project exists to make that future possible.

---

## License & Governance

This project is open source and community-governed.

No central authority owns personal context.
No contributor gains privileged access.
No commercial usage may override user control.

(See `LICENSE` and `GOVERNANCE.md` for details.)

---

## Final Note

This repository does not attempt to move fast.

It attempts to move **correctly**.

Some infrastructure should not be optimized for speed —  
because once it exists, it shapes everything built on top of it.

---

**Personal Context Sovereignty is not a feature.**  
**It is a boundary.**
