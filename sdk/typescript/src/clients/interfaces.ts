import type { HcpSkillManifest } from '../types/manifest.js';
import type {
  AuditEventListResponse,
  AuthorizationDecisionResponse,
  AuthorizationRequestInput,
  CapabilityDiscoveryResponse,
  InjectContextInput,
  InjectContextResponse,
  RevocationRequestInput,
  RuntimeBindingRequestInput,
  RuntimeBindingResponse,
} from '../types/transport.js';

export interface AuditEventFilter {
  grant_id?: string;
  binding_id?: string;
  requester_id?: string;
  purpose_id?: string;
  event_type?: string;
  from?: string;
  to?: string;
}

export interface CapabilityClient {
  listCapabilities(): Promise<CapabilityDiscoveryResponse>;
}

export interface AuthorizationClient {
  requestAuthorization(input: AuthorizationRequestInput): Promise<AuthorizationDecisionResponse>;
  getGrant(grantId: string): Promise<AuthorizationDecisionResponse>;
  revokeGrant(grantId: string, input: RevocationRequestInput): Promise<void>;
}

export interface RuntimeBindingClient {
  createBinding(input: RuntimeBindingRequestInput): Promise<RuntimeBindingResponse>;
  releaseBinding(bindingId: string): Promise<void>;
}

export interface AuditClient {
  listAuditEvents(filter?: AuditEventFilter): Promise<AuditEventListResponse>;
}

export interface SkillManifestClient {
  getSkillManifest(): Promise<HcpSkillManifest>;
}

export interface SkillAdapterClient {
  injectContext?(input: InjectContextInput): Promise<InjectContextResponse>;
}

export interface HcpClient
  extends CapabilityClient,
    AuthorizationClient,
    RuntimeBindingClient,
    AuditClient,
    SkillManifestClient,
    SkillAdapterClient {}
