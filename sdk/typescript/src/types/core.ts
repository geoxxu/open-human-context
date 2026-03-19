export type Timestamp = string;
export type Identifier = string;

export type RiskLevel = 'low' | 'medium' | 'high';
export type GrantState = 'requested' | 'active' | 'expired' | 'revoked' | 'denied';
export type RuntimeBindingState = 'active' | 'released' | 'expired' | 'revoked';
export type RevocationTargetType = 'grant' | 'runtime_binding';

export type AuditEventType =
  | 'authorization.requested'
  | 'authorization.granted'
  | 'authorization.denied'
  | 'runtime_binding.created'
  | 'runtime_binding.released'
  | 'grant.revoked'
  | 'runtime_binding.use_after_revocation'
  | 'policy.violation_detected';

export interface ContextDomain {
  id: Identifier;
  title: string;
  description: string;
  stability?: string;
}

export interface CapabilityDefinition {
  id: Identifier;
  domain: ContextDomain['id'];
  title: string;
  description: string;
  risk_level: RiskLevel;
  requires_explicit_approval: boolean;
  examples?: string[];
  forbidden_examples?: string[];
}

export interface Purpose {
  id: Identifier;
  title: string;
  description: string;
}

export interface PolicyConstraint {
  type: string;
  value: unknown;
  description?: string;
}

export interface Grant {
  id: Identifier;
  subject_id: Identifier;
  requester_id: Identifier;
  requested_capabilities: Identifier[];
  approved_capabilities: Identifier[];
  purpose: Purpose;
  constraints: PolicyConstraint[];
  issued_at: Timestamp;
  expires_at: Timestamp;
  state: GrantState;
  session_id?: Identifier;
  decision_reason?: string;
  revoked_at?: Timestamp;
  revocation_reason?: string;
}

export interface ContextView {
  id: Identifier;
  grant_id: Grant['id'];
  capabilities: Identifier[];
  purpose_id: Purpose['id'];
  content: Record<string, unknown>;
  provenance?: Record<string, unknown>;
  created_at: Timestamp;
  expires_at: Timestamp;
  portable: boolean;
}

export interface RuntimeBinding {
  id: Identifier;
  grant_id: Grant['id'];
  requester_id: Identifier;
  purpose_id: Purpose['id'];
  session_id: Identifier;
  context_view_id: ContextView['id'];
  created_at: Timestamp;
  expires_at: Timestamp;
  state: RuntimeBindingState;
  released_at?: Timestamp;
  revoked_at?: Timestamp;
}

export interface RevocationEvent {
  id: Identifier;
  target_type: RevocationTargetType;
  target_id: Identifier;
  reason: string;
  occurred_at: Timestamp;
}

export interface AuditEvent {
  id: Identifier;
  type: AuditEventType;
  subject_id: Identifier;
  requester_id: Identifier;
  occurred_at: Timestamp;
  grant_id?: Grant['id'];
  binding_id?: RuntimeBinding['id'];
  purpose_id?: Purpose['id'];
  capabilities?: Identifier[];
  result?: string;
  details?: Record<string, unknown>;
}
