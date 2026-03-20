import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  CAPABILITIES,
  DEFAULT_SUBJECT_ID,
  PRIVATE_VAULT,
  SUPPORTED_CONSTRAINT_TYPES,
  createSkillManifest,
} from './data.mjs';

const DEFAULT_DURATION_SECONDS = 1800;
const PERSISTED_STATE_VERSION = '0.1-draft';

const REQUESTED_CONTEXT_HINT_CAPABILITY_MAP = new Map([
  ['tone_guidance', 'communication_style.adapt_tone'],
  ['pacing', 'communication_style.adapt_tone'],
  ['rank_options', 'preferences.rank_options'],
  ['decision_style', 'preferences.rank_options'],
  ['favored_order', 'preferences.rank_options'],
  ['professional_background', 'profile.summarize_professional_background'],
  ['technical_depth', 'profile.summarize_professional_background'],
  ['collaboration_style', 'workflow.describe_collaboration_style'],
  ['team_preference', 'workflow.describe_collaboration_style'],
]);

export class HcpRuntimeError extends Error {
  constructor(status, code, message, details = {}, retryable = false) {
    super(message);
    this.name = 'HcpRuntimeError';
    this.status = status;
    this.code = code;
    this.retryable = retryable;
    this.details = details;
  }

  toResponse() {
    return {
      error: {
        code: this.code,
        message: this.message,
        retryable: this.retryable,
        details: this.details,
      },
    };
  }
}

export class LocalHcpRuntime {
  constructor(options = {}) {
    this.subjectId = options.subjectId ?? DEFAULT_SUBJECT_ID;
    this.capabilities = CAPABILITIES;
    this.capabilityMap = new Map(this.capabilities.map((capability) => [capability.id, capability]));
    this.grants = new Map();
    this.bindings = new Map();
    this.auditEvents = [];
    this.stateFilePath =
      typeof options.stateFilePath === 'string' && options.stateFilePath.trim().length > 0
        ? options.stateFilePath
        : undefined;

    this.#loadState();
  }

  listCapabilities() {
    return { capabilities: this.capabilities };
  }

  getSkillManifest(baseUrl) {
    return createSkillManifest(baseUrl);
  }

  requestAuthorization(input) {
    const normalized = this.#normalizeAuthorizationInput(input, { allowMissingDuration: false });
    this.#emitAuditEvent('authorization.requested', {
      requester_id: normalized.requester_id,
      purpose_id: normalized.purpose.id,
      capabilities: normalized.capabilities,
      result: 'pending',
    });

    const now = new Date();
    const expiresAt = new Date(now.getTime() + normalized.effective_duration_seconds * 1000);
    const grant = {
      id: this.#createId('grant'),
      subject_id: this.subjectId,
      requester_id: normalized.requester_id,
      requested_capabilities: [...normalized.capabilities],
      approved_capabilities: [...normalized.capabilities],
      purpose: normalized.purpose,
      constraints: normalized.constraints,
      issued_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      state: 'active',
      session_id: normalized.session_id,
    };

    this.grants.set(grant.id, grant);
    this.#emitAuditEvent('authorization.granted', {
      requester_id: grant.requester_id,
      grant_id: grant.id,
      purpose_id: grant.purpose.id,
      capabilities: grant.approved_capabilities,
      result: 'approved',
    });

    this.#persistState();
    return { grant };
  }

  getGrant(grantId) {
    const grant = this.grants.get(grantId);
    if (!grant) {
      throw new HcpRuntimeError(404, 'unknown_grant', 'The referenced grant does not exist.');
    }

    this.#refreshGrantState(grant);
    return { grant };
  }

  createBinding(input) {
    const payload = this.#requireObject(input, 'A runtime binding request body is required.');
    const grantId = this.#requireNonEmptyString(payload.grant_id, 'grant_id', 'invalid_request');
    const requesterId = this.#requireNonEmptyString(payload.requester_id, 'requester_id', 'requester_identity_invalid');
    const sessionId = this.#requireNonEmptyString(payload.session_id, 'session_id', 'invalid_request');
    const metadata =
      payload.metadata === undefined
        ? {}
        : this.#requireObject(payload.metadata, 'metadata must be an object when provided.');
    const grant = this.grants.get(grantId);

    if (!grant) {
      throw new HcpRuntimeError(404, 'unknown_grant', 'The referenced grant does not exist.');
    }

    this.#assertGrantUsable(grant, requesterId, sessionId, metadata);
    const binding = this.#createBindingFromGrant(grant, sessionId);
    this.#persistState();
    return {
      binding,
      context_view: this.#createContextView(binding, grant, payload.requested_context),
    };
  }

  releaseBinding(bindingId) {
    const binding = this.bindings.get(bindingId);
    if (!binding) {
      throw new HcpRuntimeError(404, 'unknown_binding', 'The referenced binding does not exist.');
    }

    if (binding.state !== 'active') {
      throw new HcpRuntimeError(409, 'binding_released', 'The referenced binding is no longer active.');
    }

    binding.state = 'released';
    binding.released_at = new Date().toISOString();
    this.#emitAuditEvent('runtime_binding.released', {
      requester_id: binding.requester_id,
      grant_id: binding.grant_id,
      binding_id: binding.id,
      purpose_id: binding.purpose_id,
      result: 'released',
    });
    this.#persistState();
  }

  revokeGrant(grantId, reason = 'user_withdrew_permission') {
    const grant = this.grants.get(grantId);
    if (!grant) {
      throw new HcpRuntimeError(404, 'unknown_grant', 'The referenced grant does not exist.');
    }

    if (grant.state !== 'revoked') {
      grant.state = 'revoked';
      grant.revoked_at = new Date().toISOString();
      grant.revocation_reason = reason;
      this.#emitAuditEvent('grant.revoked', {
        requester_id: grant.requester_id,
        grant_id: grant.id,
        purpose_id: grant.purpose.id,
        capabilities: grant.approved_capabilities,
        result: reason,
      });
    }

    for (const binding of this.bindings.values()) {
      if (binding.grant_id === grant.id && binding.state === 'active') {
        binding.state = 'revoked';
        binding.revoked_at = new Date().toISOString();
      }
    }

    this.#persistState();
  }

  listAuditEvents(filter = {}) {
    const events = this.auditEvents.filter((event) => {
      if (filter.grant_id && event.grant_id !== filter.grant_id) return false;
      if (filter.binding_id && event.binding_id !== filter.binding_id) return false;
      if (filter.requester_id && event.requester_id !== filter.requester_id) return false;
      if (filter.purpose_id && event.purpose_id !== filter.purpose_id) return false;
      if (filter.event_type && event.type !== filter.event_type) return false;
      if (filter.from && event.occurred_at < filter.from) return false;
      if (filter.to && event.occurred_at > filter.to) return false;
      return true;
    });

    return { events };
  }

  injectContext(input) {
    const authorization = this.requestAuthorization({
      ...input,
      requested_duration_seconds: input?.requested_duration_seconds ?? DEFAULT_DURATION_SECONDS,
    });
    const bindingResponse = this.createBinding({
      grant_id: authorization.grant.id,
      requester_id: authorization.grant.requester_id,
      session_id: authorization.grant.session_id ?? input?.session_id ?? this.#createId('session'),
      requested_context: input?.requested_context,
    });

    return {
      grant: authorization.grant,
      binding: bindingResponse.binding,
      context_view: bindingResponse.context_view,
    };
  }

  #normalizeAuthorizationInput(input, options) {
    const payload = this.#requireObject(input, 'An authorization request body is required.');
    const requester_id = this.#requireNonEmptyString(
      payload.requester_id,
      'requester_id',
      'requester_identity_invalid',
    );

    const purpose = this.#requirePurpose(payload.purpose);
    const capabilities = this.#requireCapabilities(payload.capabilities);
    const constraints = this.#requireConstraints(payload.constraints ?? []);
    const session_id = payload.session_id === undefined ? undefined : this.#requireNonEmptyString(payload.session_id, 'session_id', 'invalid_request');
    const requested_duration_seconds = payload.requested_duration_seconds ?? (options.allowMissingDuration ? DEFAULT_DURATION_SECONDS : undefined);

    if (!Number.isFinite(requested_duration_seconds) || requested_duration_seconds <= 0) {
      throw new HcpRuntimeError(400, 'invalid_request', 'requested_duration_seconds must be a positive number.');
    }

    const normalizedDurationSeconds = Math.ceil(requested_duration_seconds);
    const sessionOnly = this.#getConstraintValue(constraints, 'session_only');
    if (sessionOnly === true && session_id === undefined) {
      throw new HcpRuntimeError(400, 'invalid_request', 'session_id is required when session_only is true.');
    }

    return {
      requester_id,
      purpose,
      capabilities,
      constraints,
      session_id,
      requested_duration_seconds: normalizedDurationSeconds,
      effective_duration_seconds: this.#resolveEffectiveDurationSeconds(normalizedDurationSeconds, constraints),
    };
  }

  #createBindingFromGrant(grant, sessionId) {
    const now = new Date();
    const binding = {
      id: this.#createId('binding'),
      grant_id: grant.id,
      requester_id: grant.requester_id,
      purpose_id: grant.purpose.id,
      session_id: sessionId,
      context_view_id: this.#createId('view'),
      created_at: now.toISOString(),
      expires_at: grant.expires_at,
      state: 'active',
    };

    this.bindings.set(binding.id, binding);
    this.#emitAuditEvent('runtime_binding.created', {
      requester_id: binding.requester_id,
      grant_id: binding.grant_id,
      binding_id: binding.id,
      purpose_id: binding.purpose_id,
      capabilities: grant.approved_capabilities,
      result: 'active',
    });

    return binding;
  }

  #createContextView(binding, grant, requestedContext = []) {
    const content = {};
    const signals = {};

    for (const capabilityId of grant.approved_capabilities) {
      switch (capabilityId) {
        case 'communication_style.adapt_tone':
          content.tone_guidance = PRIVATE_VAULT.communication_style.tone_guidance;
          signals.pacing = PRIVATE_VAULT.communication_style.pacing;
          break;
        case 'preferences.rank_options':
          content.preference_strategy = PRIVATE_VAULT.preferences.decision_style;
          signals.favored_order = PRIVATE_VAULT.preferences.favored_order;
          break;
        case 'profile.summarize_professional_background':
          content.summary = PRIVATE_VAULT.profile.professional_summary;
          signals.technical_depth = PRIVATE_VAULT.profile.technical_depth;
          break;
        case 'workflow.describe_collaboration_style':
          content.collaboration_guidance = 'Collaborates best with fast feedback and explicit ownership.';
          signals.collaboration_style = PRIVATE_VAULT.workflow.collaboration_style;
          signals.team_preference = PRIVATE_VAULT.workflow.team_preference;
          break;
        default:
          break;
      }
    }

    const resolvedRequestedContext = this.#resolveRequestedContextHints(
      requestedContext,
      grant.approved_capabilities,
    );
    if (resolvedRequestedContext.length > 0) {
      signals.requested_context = resolvedRequestedContext;
    }

    if (Object.keys(signals).length > 0) {
      content.signals = signals;
    }

    const usageConstraints = this.#createUsageConstraints(grant.constraints, binding.session_id);
    if (Object.keys(usageConstraints).length > 0) {
      content.usage_constraints = usageConstraints;
    }

    const context_view = {
      id: binding.context_view_id,
      grant_id: grant.id,
      capabilities: grant.approved_capabilities,
      purpose_id: grant.purpose.id,
      content,
      provenance: {
        assertion_type: 'self',
        confidence: 'medium',
      },
      created_at: binding.created_at,
      expires_at: binding.expires_at,
      portable: false,
    };

    return context_view;
  }

  #resolveRequestedContextHints(requestedContext, approvedCapabilities) {
    const normalizedRequestedContext = this.#normalizeRequestedContextHints(requestedContext);
    if (normalizedRequestedContext.length === 0) {
      return [];
    }

    const approvedCapabilitySet = new Set(approvedCapabilities);
    return normalizedRequestedContext.filter((hint) => {
      const capabilityId = REQUESTED_CONTEXT_HINT_CAPABILITY_MAP.get(hint);
      return capabilityId !== undefined && approvedCapabilitySet.has(capabilityId);
    });
  }

  #normalizeRequestedContextHints(requestedContext) {
    if (!Array.isArray(requestedContext)) {
      return [];
    }

    return requestedContext
      .filter((entry) => typeof entry === 'string')
      .map((entry) => entry.trim())
      .filter((entry, index, collection) => entry.length > 0 && collection.indexOf(entry) === index);
  }

  #emitAuditEvent(type, partial) {
    const event = {
      id: this.#createId('evt'),
      type,
      subject_id: this.subjectId,
      requester_id: partial.requester_id ?? 'local.runtime',
      occurred_at: new Date().toISOString(),
      grant_id: partial.grant_id,
      binding_id: partial.binding_id,
      purpose_id: partial.purpose_id,
      capabilities: partial.capabilities,
      result: partial.result,
      details: partial.details ?? {},
    };

    this.auditEvents.push(event);
    return event;
  }

  #assertGrantUsable(grant, requesterId, sessionId, metadata) {
    this.#refreshGrantState(grant);

    if (grant.requester_id !== requesterId) {
      this.#emitPolicyViolation(grant, requesterId, 'requester_mismatch', {
        expected_requester_id: grant.requester_id,
        attempted_requester_id: requesterId,
      });
      throw new HcpRuntimeError(403, 'policy_violation', 'The requester does not match the approved grant.');
    }

    if (grant.state === 'revoked') {
      this.#emitAuditEvent('runtime_binding.use_after_revocation', {
        requester_id: requesterId,
        grant_id: grant.id,
        purpose_id: grant.purpose.id,
        capabilities: grant.approved_capabilities,
        result: 'denied',
        details: {
          session_id: sessionId,
        },
      });
      throw new HcpRuntimeError(410, 'grant_revoked', 'The referenced grant has been revoked.');
    }

    if (grant.state === 'expired') {
      this.#emitPolicyViolation(grant, requesterId, 'grant_expired', {
        session_id: sessionId,
      });
      throw new HcpRuntimeError(410, 'grant_expired', 'The referenced grant has expired.');
    }

    if (grant.state !== 'active') {
      this.#emitPolicyViolation(grant, requesterId, 'grant_not_active', {
        state: grant.state,
        session_id: sessionId,
      });
      throw new HcpRuntimeError(403, 'policy_violation', 'The referenced grant is not active.');
    }

    if (grant.session_id && grant.session_id !== sessionId) {
      this.#emitPolicyViolation(grant, requesterId, 'session_mismatch', {
        approved_session_id: grant.session_id,
        attempted_session_id: sessionId,
      });
      throw new HcpRuntimeError(403, 'policy_violation', 'The binding session does not match the approved grant.');
    }

    if (this.#getConstraintValue(grant.constraints, 'storage_allowed') === false && metadata.storage_intent === true) {
      this.#emitPolicyViolation(grant, requesterId, 'storage_disallowed', {
        session_id: sessionId,
      });
      throw new HcpRuntimeError(403, 'policy_violation', 'The approved grant does not allow storage of the context view.');
    }

    if (
      this.#getConstraintValue(grant.constraints, 'forwarding_allowed') === false &&
      metadata.forwarding_intent === true
    ) {
      this.#emitPolicyViolation(grant, requesterId, 'forwarding_disallowed', {
        session_id: sessionId,
      });
      throw new HcpRuntimeError(403, 'policy_violation', 'The approved grant does not allow forwarding the context view.');
    }
  }

  #refreshGrantState(grant) {
    let changed = false;

    if (grant.state === 'active' && new Date(grant.expires_at).getTime() <= Date.now()) {
      grant.state = 'expired';
      changed = true;
    }

    if (grant.state === 'expired') {
      for (const binding of this.bindings.values()) {
        if (binding.grant_id === grant.id && binding.state === 'active') {
          binding.state = 'expired';
          changed = true;
        }
      }
    }

    if (changed) {
      this.#persistState();
    }
  }

  #requirePurpose(value) {
    const purpose = this.#requireObject(value, 'A purpose object is required.', 'purpose_required');
    return {
      id: this.#requireNonEmptyString(purpose.id, 'purpose.id', 'purpose_required'),
      title: this.#requireNonEmptyString(purpose.title, 'purpose.title', 'purpose_required'),
      description: this.#requireNonEmptyString(purpose.description, 'purpose.description', 'purpose_required'),
    };
  }

  #requireCapabilities(value) {
    if (!Array.isArray(value) || value.length === 0) {
      throw new HcpRuntimeError(400, 'invalid_request', 'At least one capability must be requested.');
    }

    const capabilities = value.map((entry) => this.#requireNonEmptyString(entry, 'capabilities', 'unknown_capability'));
    for (const capabilityId of capabilities) {
      if (!this.capabilityMap.has(capabilityId)) {
        throw new HcpRuntimeError(404, 'unknown_capability', `Unknown capability: ${capabilityId}.`);
      }
    }

    return capabilities;
  }

  #requireConstraints(value) {
    if (!Array.isArray(value)) {
      throw new HcpRuntimeError(400, 'invalid_request', 'constraints must be an array when provided.');
    }

    const seenTypes = new Set();

    return value.map((constraint) => {
      const normalized = this.#requireObject(constraint, 'Constraint entries must be objects.');
      const type = this.#requireNonEmptyString(normalized.type, 'constraints.type', 'constraint_not_enforceable');
      if (!SUPPORTED_CONSTRAINT_TYPES.includes(type)) {
        throw new HcpRuntimeError(400, 'constraint_not_enforceable', `Unsupported constraint type: ${type}.`);
      }

      if (seenTypes.has(type)) {
        throw new HcpRuntimeError(400, 'invalid_request', `Duplicate constraint type: ${type}.`);
      }

      seenTypes.add(type);

      return {
        type,
        value: this.#normalizeConstraintValue(type, normalized.value),
        description: typeof normalized.description === 'string' ? normalized.description : undefined,
      };
    });
  }

  #normalizeConstraintValue(type, value) {
    switch (type) {
      case 'storage_allowed':
      case 'forwarding_allowed':
      case 'session_only':
        if (typeof value !== 'boolean') {
          throw new HcpRuntimeError(400, 'invalid_request', `${type} must be a boolean.`);
        }

        return value;
      case 'max_duration_seconds':
        if (!Number.isFinite(value) || value <= 0) {
          throw new HcpRuntimeError(400, 'invalid_request', 'max_duration_seconds must be a positive number.');
        }

        return Math.ceil(value);
      default:
        return value;
    }
  }

  #requireObject(value, message, code = 'invalid_request') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new HcpRuntimeError(400, code, message);
    }

    return value;
  }

  #requireNonEmptyString(value, field, code) {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new HcpRuntimeError(400, code, `${field} must be a non-empty string.`);
    }

    return value;
  }

  #createId(prefix) {
    return `${prefix}_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
  }

  #resolveEffectiveDurationSeconds(requestedDurationSeconds, constraints) {
    const maxDurationSeconds = this.#getConstraintValue(constraints, 'max_duration_seconds');
    if (typeof maxDurationSeconds !== 'number') {
      return requestedDurationSeconds;
    }

    return Math.min(requestedDurationSeconds, maxDurationSeconds);
  }

  #getConstraintValue(constraints, type) {
    return constraints.find((constraint) => constraint.type === type)?.value;
  }

  #createUsageConstraints(constraints, sessionId) {
    const usageConstraints = {};
    const storageAllowed = this.#getConstraintValue(constraints, 'storage_allowed');
    const forwardingAllowed = this.#getConstraintValue(constraints, 'forwarding_allowed');
    const sessionOnly = this.#getConstraintValue(constraints, 'session_only');
    const maxDurationSeconds = this.#getConstraintValue(constraints, 'max_duration_seconds');

    if (typeof storageAllowed === 'boolean') {
      usageConstraints.storage_allowed = storageAllowed;
    }

    if (typeof forwardingAllowed === 'boolean') {
      usageConstraints.forwarding_allowed = forwardingAllowed;
    }

    if (sessionOnly === true) {
      usageConstraints.session_only = true;
      usageConstraints.session_id = sessionId;
    }

    if (typeof maxDurationSeconds === 'number') {
      usageConstraints.max_duration_seconds = maxDurationSeconds;
    }

    return usageConstraints;
  }

  #emitPolicyViolation(grant, requesterId, result, details = {}) {
    this.#emitAuditEvent('policy.violation_detected', {
      requester_id: requesterId,
      grant_id: grant?.id,
      purpose_id: grant?.purpose?.id,
      capabilities: grant?.approved_capabilities,
      result,
      details,
    });
  }

  #loadState() {
    if (!this.stateFilePath) {
      return;
    }

    try {
      const raw = readFileSync(this.stateFilePath, 'utf8');
      if (raw.trim().length === 0) {
        return;
      }

      const persisted = JSON.parse(raw);
      if (persisted && typeof persisted === 'object') {
        this.subjectId = typeof persisted.subject_id === 'string' ? persisted.subject_id : this.subjectId;
        this.grants = new Map(this.#restoreEntries(persisted.grants));
        this.bindings = new Map(this.#restoreEntries(persisted.bindings));
        this.auditEvents = Array.isArray(persisted.audit_events) ? persisted.audit_events : [];
      }
    } catch (error) {
      if (error && typeof error === 'object' && error.code === 'ENOENT') {
        return;
      }

      throw new Error(`Failed to load persisted runtime state from ${this.stateFilePath}: ${error.message}`);
    }
  }

  #persistState() {
    if (!this.stateFilePath) {
      return;
    }

    mkdirSync(dirname(this.stateFilePath), { recursive: true });
    writeFileSync(
      this.stateFilePath,
      JSON.stringify(
        {
          version: PERSISTED_STATE_VERSION,
          subject_id: this.subjectId,
          grants: [...this.grants.values()],
          bindings: [...this.bindings.values()],
          audit_events: this.auditEvents,
        },
        null,
        2,
      ),
      'utf8',
    );
  }

  #restoreEntries(value) {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .filter((entry) => entry && typeof entry === 'object' && typeof entry.id === 'string')
      .map((entry) => [entry.id, entry]);
  }
}

