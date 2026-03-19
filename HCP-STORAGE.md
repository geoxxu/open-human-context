Human Context Protocol – Storage Neutrality
-------------------------------------------

### Purpose

HCP does not define **where** human context is stored.  
It defines **how storage must behave** to preserve user sovereignty.

* * *

Core Principle: Storage Neutrality
----------------------------------

> HCP mandates control, not custody.

Any storage system—local, cloud, or hybrid—can be HCP-compatible if it respects the following constraints.

* * *

Required Storage Properties
---------------------------

### 1\. User Sovereignty

*   The user is the ultimate authority over their context.
    
*   Storage providers act only as custodians.
    
*   Users must be able to:
    

*   Export
    
*   Migrate
    
*   Delete their context
    

* * *

### 2\. Encryption by User Authority

*   Context must be encryptable using user-controlled keys.
    
*   Storage providers must not be required to interpret context semantics.
    
*   Plaintext access by storage providers is not assumed.
    

* * *

### 3\. Separation of Storage and Authorization

*   Storage systems store data.
    
*   Authorization occurs at the **context injection layer**, not the storage layer.
    
*   Access is granted via scoped, revocable capabilities.

*   Third-party agents must not require direct access to backing stores such as
    markdown memory folders, vector databases, or internal retrieval indexes in
    order to interoperate with HCP.
    

* * *

### 4\. Replaceability

*   No storage implementation may be assumed as permanent.
    
*   Context formats must remain portable across storage providers.
    
*   HCP compatibility must not depend on a specific vendor or infrastructure.
    

* * *

What HCP Does NOT Require
-------------------------

*   Mandatory local storage
    
*   Mandatory cloud storage
    
*   On-chain storage of context
    
*   A default hosting provider

*   Compatibility with any specific storage schema, folder layout, or vector database

* * *

Storage as an Implementation Detail
-----------------------------------

An HCP-compatible runtime may assemble context from:

*   local markdown memories
    
*   semantic recall indexes such as `sqlite-vec`
    
*   encrypted structured stores
    
*   hybrid retrieval pipelines

These are part of a **local context assembly layer**, not part of the protocol
surface exposed to consuming agents.

In an OpenClaw-like architecture:

*   the local agent acts as the context authority
    
*   the memory folder and vector store remain private vault internals
    
*   external agents request scoped context injection rather than raw reads
    

* * *

Optional Public Infrastructure
------------------------------

HCP may interoperate with public systems for:

*   Key registries
    
*   Attestation references
    
*   Revocation signals
    

Such systems must **not** store raw context.

* * *

Design Goal
-----------

HCP ensures that **human context is never locked to a place**,  
only temporarily held under the user’s authority.
