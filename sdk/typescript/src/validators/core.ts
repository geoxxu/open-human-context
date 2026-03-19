import type {
  AuditEvent,
  ContextView,
  Grant,
  PolicyConstraint,
  Purpose,
  RuntimeBinding,
} from '../types/core.js';
import type {
  AuditEventListResponse,
  AuthorizationDecisionResponse,
  CapabilityDiscoveryResponse,
  HcpError,
  HcpErrorResponse,
  InjectContextResponse,
  RuntimeBindingResponse,
} from '../types/transport.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isString);
}

export function isPurpose(value: unknown): value is Purpose {
  if (!isRecord(value)) {
    return false;
  }

  return isString(value.id) && isString(value.title) && isString(value.description);
}

export function isPolicyConstraint(value: unknown): value is PolicyConstraint {
  if (!isRecord(value)) {
    return false;
  }

  return isString(value.type) && 'value' in value;
}

export function isGrant(value: unknown): value is Grant {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.id) &&
    isString(value.subject_id) &&
    isString(value.requester_id) &&
    isStringArray(value.requested_capabilities) &&
    isStringArray(value.approved_capabilities) &&
    isPurpose(value.purpose) &&
    Array.isArray(value.constraints) &&
    value.constraints.every(isPolicyConstraint) &&
    isString(value.issued_at) &&
    isString(value.expires_at) &&
    isString(value.state)
  );
}

export function isContextView(value: unknown): value is ContextView {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.id) &&
    isString(value.grant_id) &&
    isStringArray(value.capabilities) &&
    isString(value.purpose_id) &&
    isRecord(value.content) &&
    isString(value.created_at) &&
    isString(value.expires_at) &&
    isBoolean(value.portable)
  );
}

export function isRuntimeBinding(value: unknown): value is RuntimeBinding {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.id) &&
    isString(value.grant_id) &&
    isString(value.requester_id) &&
    isString(value.purpose_id) &&
    isString(value.session_id) &&
    isString(value.context_view_id) &&
    isString(value.created_at) &&
    isString(value.expires_at) &&
    isString(value.state)
  );
}

export function isAuditEvent(value: unknown): value is AuditEvent {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.id) &&
    isString(value.type) &&
    isString(value.subject_id) &&
    isString(value.requester_id) &&
    isString(value.occurred_at)
  );
}

export function isCapabilityDiscoveryResponse(value: unknown): value is CapabilityDiscoveryResponse {
  if (!isRecord(value) || !Array.isArray(value.capabilities)) {
    return false;
  }

  return value.capabilities.every(isRecord);
}

export function isAuthorizationDecisionResponse(value: unknown): value is AuthorizationDecisionResponse {
  return isRecord(value) && isGrant(value.grant);
}

export function isRuntimeBindingResponse(value: unknown): value is RuntimeBindingResponse {
  return isRecord(value) && isRuntimeBinding(value.binding) && isContextView(value.context_view);
}

export function isInjectContextResponse(value: unknown): value is InjectContextResponse {
  return isRecord(value) && isGrant(value.grant) && isRuntimeBindingResponse(value);
}

export function isAuditEventListResponse(value: unknown): value is AuditEventListResponse {
  return isRecord(value) && Array.isArray(value.events) && value.events.every(isAuditEvent);
}

export function isHcpError(value: unknown): value is HcpError {
  if (!isRecord(value)) {
    return false;
  }

  return isString(value.code) && isString(value.message) && isBoolean(value.retryable);
}

export function isHcpErrorResponse(value: unknown): value is HcpErrorResponse {
  return isRecord(value) && isHcpError(value.error);
}

export function assertGrant(value: unknown): Grant {
  if (!isGrant(value)) {
    throw new TypeError('Expected a valid HCP Grant object.');
  }

  return value;
}

export function assertRuntimeBinding(value: unknown): RuntimeBinding {
  if (!isRuntimeBinding(value)) {
    throw new TypeError('Expected a valid HCP RuntimeBinding object.');
  }

  return value;
}

export function assertContextView(value: unknown): ContextView {
  if (!isContextView(value)) {
    throw new TypeError('Expected a valid HCP ContextView object.');
  }

  return value;
}
