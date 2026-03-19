Human Context Protocol – Provenance & Integrity
-----------------------------------------------

### Purpose

HCP defines **how human context can be used**, not how it is judged to be “true”.

This document specifies how **provenance, integrity, and trust signals** are represented in HCP without enforcing centralized verification or identity systems.

* * *

Core Principles
---------------

### 1\. Context Is User-Owned, Not Objective Truth

*   All context originates from the user.
    
*   HCP does **not** guarantee factual accuracy.
    
*   HCP provides **signals of origin and modification**, not claims of correctness.
    

> Provenance ≠ Truth  
> Provenance = “where did this come from, and how did it change”

* * *

### 2\. Provenance Is Metadata, Not Enforcement

HCP supports optional provenance metadata such as:

*   Source type (self-asserted, agent-derived, third-party attested)
    
*   Timestamp of creation and last modification
    
*   Transformation history (summarized)
    
*   Optional cryptographic hashes
    

HCP **does not enforce**:

*   Mandatory verification
    
*   Centralized identity checks
    
*   Global reputation scores
    

* * *

### 3\. Attestations Are Separate From Context

*   Context data and attestations are distinct objects.
    
*   Attestations may be issued by:
    

*   Humans
    
*   Agents
    
*   Organizations
    

*   Attestations reference context **by hash or pointer**, never by raw content.
    

Attestations can be:

*   Added
    
*   Revoked
    
*   Expired
    

* * *

### 4\. Incentives and Decisions Belong to Consumers

Any service or agent consuming HCP context is responsible for:

*   Evaluating provenance signals
    
*   Applying risk tolerance
    
*   Defining acceptance criteria
    

HCP does not prevent:

*   Users from modifying their own context
    
*   Services from rejecting self-asserted data

* * *

Context Injection Output
------------------------

When HCP delivers a derived context view to a consuming agent, the output may
include provenance metadata alongside the injected payload.

Typical fields include:

*   assertion type
    
*   last modified time
    
*   confidence or trust label
    
*   summarized transformation history

This metadata helps a consumer evaluate suitability for the declared purpose
without requiring access to raw memories or backing storage.
    
* * *

Design Goal
-----------

HCP enables **context portability with transparency**, not trust automation.

Trust remains a **local decision**, informed by provenance—not dictated by protocol.
