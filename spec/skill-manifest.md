# HCP Skill Manifest

Status: Draft

## 1. Purpose

This document defines a minimal machine-readable manifest shape for HCP skill
and tool integrations. It is intended for automatic discovery in agent
ecosystems that integrate through tool-calling rather than a direct SDK or raw
transport client.

The manifest is discovery metadata. It does not replace the core HCP model,
grant lifecycle, or transport semantics.

## 2. Design Goals

The manifest exists to let a consumer discover:

- which HCP-compatible skills are exposed
- which transport surfaces are available
- which constraints are supported
- where the input and output schemas are defined
- which implementation version is being described

The manifest MUST NOT redefine HCP as raw access to storage internals.

## 3. Recommended Discovery Locations

Implementations SHOULD expose the manifest through at least one of:

- `/.well-known/hcp-skills.json`
- a local runtime discovery endpoint
- a local file path documented by the implementation

If multiple locations are exposed, they SHOULD describe the same current skill
surface.

## 4. Top-Level Manifest Shape

The manifest SHOULD be a JSON object with the following top-level fields:

- `manifest_version`: version of the manifest format
- `hcp_version`: targeted HCP spec version or draft identifier
- `implementation`: metadata about the local authority exposing the skills
- `transport_surfaces`: available transports for this implementation
- `supported_constraints`: list of constraint type identifiers
- `skills`: list of exposed HCP-compatible skills

Optional top-level fields:

- `documentation_ref`: human-readable documentation path or URL
- `security_contact`: operator contact for security reports
- `notes`: implementation-defined notes

## 5. Implementation Object

The `implementation` object SHOULD include:

- `name`: implementation name
- `version`: implementation version
- `deployment_model`: short label such as `local-first`
- `authority_role`: short label such as `context_authority`

Optional fields:

- `vendor`
- `runtime_name`

## 6. Transport Surface Object

Each item in `transport_surfaces` SHOULD include:

- `type`: one of `http`, `cli`, `library`, `tool`
- `description`: short human-readable description

Optional fields:

- `base_url`: for local HTTP exposure
- `well_known_path`: for discovery endpoints
- `command_prefix`: for CLI exposure
- `library_ref`: package or module identifier

Rules:

- a transport surface entry MUST describe how to reach the implementation, not
  how to read private storage internals

## 7. Skill Entry Object

Each item in `skills` SHOULD include:

- `name`: stable skill name such as `hcp.inject_context`
- `title`: short human-readable label
- `description`: plain-language description
- `input_schema_ref`: path, URL, or local identifier for the input schema
- `output_schema_ref`: path, URL, or local identifier for the output schema
- `transport_modes`: list of transport types that can invoke the skill
- `requires_authorization`: boolean
- `composite`: boolean indicating whether the skill wraps multiple canonical HCP operations
- `maps_to_operations`: list of canonical HCP operations

Optional fields:

- `accepted_hints`: product-facing hint fields such as `requested_context`
- `supported_constraints`
- `examples_ref`

Rules:

- `name` MUST identify an HCP-compatible skill surface, not a raw storage
  primitive
- `maps_to_operations` SHOULD use the canonical operation names from
  `spec/transport.md`
- if `composite` is `true`, the implementation MUST still preserve the normal
  HCP grant, binding, audit, expiry, and revocation semantics

## 8. Prohibited Manifest Semantics

An implementation MUST NOT use the manifest to advertise the following as the
HCP interoperability surface:

- direct reads of `memory/*.md`
- direct vector-store queries
- direct retrieval index access
- any operation whose primary meaning is raw vault export

Private storage and retrieval mechanisms MAY exist behind the local authority,
but they are not the HCP-compatible contract.

## 9. Example Manifest

```json
{
  "manifest_version": "0.1-draft",
  "hcp_version": "0.1-draft",
  "implementation": {
    "name": "openclaw-local-hcp",
    "version": "0.1.0",
    "deployment_model": "local-first",
    "authority_role": "context_authority"
  },
  "documentation_ref": "./HCP-SKILLS.md",
  "transport_surfaces": [
    {
      "type": "http",
      "description": "Local HTTP runtime API",
      "base_url": "http://127.0.0.1:4318",
      "well_known_path": "/.well-known/hcp-skills.json"
    },
    {
      "type": "tool",
      "description": "Tool-calling adapter profile for agent runtimes"
    }
  ],
  "supported_constraints": [
    "storage_allowed",
    "forwarding_allowed",
    "max_duration_seconds",
    "session_only"
  ],
  "skills": [
    {
      "name": "hcp.capabilities.list",
      "title": "List Capabilities",
      "description": "Discover capability definitions available to the requester.",
      "input_schema_ref": "#/$defs/listCapabilitiesInput",
      "output_schema_ref": "#/$defs/listCapabilitiesOutput",
      "transport_modes": [
        "http",
        "tool"
      ],
      "requires_authorization": false,
      "composite": false,
      "maps_to_operations": [
        "capability_discovery"
      ]
    },
    {
      "name": "hcp.inject_context",
      "title": "Inject Context",
      "description": "Authorize and bind purpose-scoped context for the active run.",
      "input_schema_ref": "#/$defs/injectContextInput",
      "output_schema_ref": "#/$defs/injectContextOutput",
      "transport_modes": [
        "tool"
      ],
      "requires_authorization": true,
      "composite": true,
      "maps_to_operations": [
        "authorization_request",
        "runtime_binding_create"
      ],
      "accepted_hints": [
        "requested_context"
      ],
      "supported_constraints": [
        "storage_allowed",
        "max_duration_seconds",
        "session_only"
      ]
    }
  ]
}
```

## 10. Versioning Guidance

Implementations SHOULD version the manifest format independently from their own
runtime version so discovery clients can distinguish:

- changes to the manifest shape
- changes to the implementation
- changes to the targeted HCP draft version

## 11. Relationship to Human-Readable Docs

`HCP-SKILLS.md` remains the human-readable integration profile.
This manifest exists so tools and runtimes can discover equivalent information
without scraping prose.
