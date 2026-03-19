import type {
  AuditEvent,
  CapabilityDefinition,
  ContextView,
  Grant,
  PolicyConstraint,
  Purpose,
  RuntimeBinding,
} from './core.js';

export interface CapabilityDiscoveryResponse {
  capabilities: CapabilityDefinition[];
}

export interface AuthorizationRequestInput {
  requester_id: string;
  capabilities: string[];
  purpose: Purpose;
  requested_duration_seconds: number;
  constraints?: PolicyConstraint[];
  session_id?: string;
  user_visible_reason?: string;
}

export interface AuthorizationDecisionResponse {
  grant: Grant;
}

export interface RuntimeBindingRequestInput {
  grant_id: string;
  requester_id: string;
  session_id: string;
  metadata?: Record<string, unknown>;
}

export interface RuntimeBindingResponse {
  binding: RuntimeBinding;
  context_view: ContextView;
}

export interface RevocationRequestInput {
  reason: string;
}

export interface AuditEventListResponse {
  events: AuditEvent[];
}

export interface InjectContextInput extends AuthorizationRequestInput {
  requested_context?: string[];
}

export interface InjectContextResponse extends RuntimeBindingResponse {
  grant: Grant;
}

export interface HcpError {
  code: string;
  message: string;
  retryable: boolean;
  details?: Record<string, unknown>;
}

export interface HcpErrorResponse {
  error: HcpError;
}
