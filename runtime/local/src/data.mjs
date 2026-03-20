export const DEFAULT_SUBJECT_ID = 'user_123';

export const CAPABILITIES = [
  {
    id: 'communication_style.adapt_tone',
    domain: 'communication_style',
    title: 'Adapt Tone',
    description: 'Use tone guidance for the active task.',
    risk_level: 'medium',
    requires_explicit_approval: true,
  },
  {
    id: 'preferences.rank_options',
    domain: 'preferences',
    title: 'Rank Options',
    description: 'Use known preferences to rank choices for the current task.',
    risk_level: 'medium',
    requires_explicit_approval: true,
  },
  {
    id: 'profile.summarize_professional_background',
    domain: 'profile',
    title: 'Summarize Professional Background',
    description: 'Summarize professional context relevant to the active workflow.',
    risk_level: 'medium',
    requires_explicit_approval: true,
  },
  {
    id: 'workflow.describe_collaboration_style',
    domain: 'workflow',
    title: 'Describe Collaboration Style',
    description: 'Describe collaboration preferences relevant to the current task.',
    risk_level: 'low',
    requires_explicit_approval: true,
  },
];

export const SUPPORTED_CONSTRAINT_TYPES = [
  'storage_allowed',
  'forwarding_allowed',
  'max_duration_seconds',
  'session_only',
];

export const PRIVATE_VAULT = {
  communication_style: {
    tone_guidance: 'Prefer warm, concise, and direct phrasing.',
    pacing: 'short_and_structured',
  },
  preferences: {
    decision_style: 'ranked_options',
    favored_order: ['clear tradeoffs', 'small steps', 'explicit ownership'],
  },
  profile: {
    professional_summary:
      'The user has repeatedly worked on applied AI systems and values practical, auditable architectures.',
    technical_depth: 'high',
  },
  workflow: {
    collaboration_style: 'direct_and_iterative',
    team_preference: 'small_fast_moving_teams',
  },
};

export function createSkillManifest(baseUrl) {
  return {
    manifest_version: '0.1-draft',
    hcp_version: '0.1-draft',
    implementation: {
      name: 'hcp-local-runtime',
      version: '0.1.0-draft',
      deployment_model: 'local-first',
      authority_role: 'context_authority',
      runtime_name: 'reference-http-runtime',
    },
    documentation_ref: './HCP-SKILLS.md',
    transport_surfaces: [
      {
        type: 'http',
        description: 'Local HTTP runtime API',
        base_url: baseUrl,
        well_known_path: '/.well-known/hcp-skills.json',
      },
      {
        type: 'tool',
        description: 'Tool-calling adapter profile for agent runtimes',
      },
    ],
    supported_constraints: SUPPORTED_CONSTRAINT_TYPES,
    skills: [
      {
        name: 'hcp.capabilities.list',
        title: 'List Capabilities',
        description: 'Discover capability definitions available to the requester.',
        input_schema_ref: 'spec/hcp-skills.schema.json#/$defs/listCapabilitiesInput',
        output_schema_ref: 'spec/hcp-skills.schema.json#/$defs/listCapabilitiesOutput',
        transport_modes: ['http', 'tool'],
        requires_authorization: false,
        composite: false,
        maps_to_operations: ['capability_discovery'],
      },
      {
        name: 'hcp.inject_context',
        title: 'Inject Context',
        description: 'Authorize and bind purpose-scoped context for the active run.',
        input_schema_ref: 'spec/hcp-skills.schema.json#/$defs/injectContextInput',
        output_schema_ref: 'spec/hcp-skills.schema.json#/$defs/injectContextOutput',
        transport_modes: ['tool'],
        requires_authorization: true,
        composite: true,
        maps_to_operations: ['authorization_request', 'runtime_binding_create'],
        accepted_hints: ['requested_context'],
        supported_constraints: SUPPORTED_CONSTRAINT_TYPES,
      },
      {
        name: 'hcp.bindings.release',
        title: 'Release Binding',
        description: 'Release a runtime binding when work is complete.',
        input_schema_ref: 'spec/hcp-skills.schema.json#/$defs/releaseBindingInput',
        output_schema_ref: 'spec/hcp-skills.schema.json#/$defs/noContentOutput',
        transport_modes: ['tool'],
        requires_authorization: true,
        composite: false,
        maps_to_operations: ['runtime_binding_release'],
      },
      {
        name: 'hcp.grants.revoke',
        title: 'Revoke Grant',
        description: 'Revoke a previously approved grant.',
        input_schema_ref: 'spec/hcp-skills.schema.json#/$defs/revokeGrantInput',
        output_schema_ref: 'spec/hcp-skills.schema.json#/$defs/noContentOutput',
        transport_modes: ['tool'],
        requires_authorization: true,
        composite: false,
        maps_to_operations: ['grant_revocation'],
      },
    ],
  };
}
