import type {
  HcpImplementationDescriptor,
  HcpSkillDescriptor,
  HcpSkillManifest,
  TransportSurfaceDescriptor,
} from '../types/manifest.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isString);
}

export function isImplementationDescriptor(value: unknown): value is HcpImplementationDescriptor {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.name) &&
    isString(value.version) &&
    isString(value.deployment_model) &&
    isString(value.authority_role)
  );
}

export function isTransportSurfaceDescriptor(value: unknown): value is TransportSurfaceDescriptor {
  if (!isRecord(value)) {
    return false;
  }

  return isString(value.type) && isString(value.description);
}

export function isSkillDescriptor(value: unknown): value is HcpSkillDescriptor {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.name) &&
    value.name.startsWith('hcp.') &&
    isString(value.title) &&
    isString(value.description) &&
    isString(value.input_schema_ref) &&
    isString(value.output_schema_ref) &&
    isStringArray(value.transport_modes) &&
    typeof value.requires_authorization === 'boolean' &&
    typeof value.composite === 'boolean' &&
    isStringArray(value.maps_to_operations)
  );
}

export function isSkillManifest(value: unknown): value is HcpSkillManifest {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.manifest_version) &&
    isString(value.hcp_version) &&
    isImplementationDescriptor(value.implementation) &&
    Array.isArray(value.transport_surfaces) &&
    value.transport_surfaces.every(isTransportSurfaceDescriptor) &&
    isStringArray(value.supported_constraints) &&
    Array.isArray(value.skills) &&
    value.skills.every(isSkillDescriptor)
  );
}

export function assertSkillManifest(value: unknown): HcpSkillManifest {
  if (!isSkillManifest(value)) {
    throw new TypeError('Expected a valid HCP Skill Manifest.');
  }

  return value;
}
