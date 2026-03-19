export type TransportMode = 'http' | 'cli' | 'library' | 'tool';

export interface HcpImplementationDescriptor {
  name: string;
  version: string;
  deployment_model: string;
  authority_role: string;
  vendor?: string;
  runtime_name?: string;
}

export interface TransportSurfaceDescriptor {
  type: TransportMode;
  description: string;
  base_url?: string;
  well_known_path?: string;
  command_prefix?: string;
  library_ref?: string;
}

export type CanonicalOperation =
  | 'capability_discovery'
  | 'authorization_request'
  | 'grant_retrieval'
  | 'runtime_binding_create'
  | 'runtime_binding_release'
  | 'grant_revocation'
  | 'audit_event_list'
  | 'context_injection';

export interface HcpSkillDescriptor {
  name: `hcp.${string}`;
  title: string;
  description: string;
  input_schema_ref: string;
  output_schema_ref: string;
  transport_modes: TransportMode[];
  requires_authorization: boolean;
  composite: boolean;
  maps_to_operations: CanonicalOperation[];
  accepted_hints?: string[];
  supported_constraints?: string[];
  examples_ref?: string;
}

export interface HcpSkillManifest {
  manifest_version: string;
  hcp_version: string;
  implementation: HcpImplementationDescriptor;
  documentation_ref?: string;
  security_contact?: string;
  notes?: string;
  transport_surfaces: TransportSurfaceDescriptor[];
  supported_constraints: string[];
  skills: HcpSkillDescriptor[];
}
