import type { HcpClient, AuditEventFilter } from '../clients/interfaces.js';
import type { HcpSkillManifest } from '../types/manifest.js';
import type {
  AuditEventListResponse,
  AuthorizationDecisionResponse,
  AuthorizationRequestInput,
  HcpErrorResponse,
  InjectContextInput,
  InjectContextResponse,
  RevocationRequestInput,
  RuntimeBindingRequestInput,
  RuntimeBindingResponse,
  CapabilityDiscoveryResponse,
} from '../types/transport.js';
import { isHcpErrorResponse } from '../validators/core.js';
import { assertSkillManifest } from '../validators/manifest.js';

export interface HttpHcpClientOptions {
  baseUrl: string;
  fetch?: typeof fetch;
  headers?: HeadersInit;
  skillManifestPath?: string;
  injectContextPath?: string;
}

export class HcpHttpError extends Error {
  readonly status: number;
  readonly error?: HcpErrorResponse['error'];

  constructor(status: number, message: string, error?: HcpErrorResponse['error']) {
    super(message);
    this.name = 'HcpHttpError';
    this.status = status;
    this.error = error;
  }
}

export class HttpHcpClient implements HcpClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly headers?: HeadersInit;
  private readonly skillManifestPath: string;
  private readonly injectContextPath: string;

  constructor(options: HttpHcpClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.fetchImpl = options.fetch ?? fetch;
    this.headers = options.headers;
    this.skillManifestPath = options.skillManifestPath ?? '/.well-known/hcp-skills.json';
    this.injectContextPath = options.injectContextPath ?? '/skills/hcp.inject_context';
  }

  async listCapabilities(): Promise<CapabilityDiscoveryResponse> {
    return this.requestJson<CapabilityDiscoveryResponse>('/capabilities');
  }

  async requestAuthorization(input: AuthorizationRequestInput): Promise<AuthorizationDecisionResponse> {
    return this.requestJson<AuthorizationDecisionResponse>('/authorizations', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async getGrant(grantId: string): Promise<AuthorizationDecisionResponse> {
    return this.requestJson<AuthorizationDecisionResponse>(`/grants/${encodeURIComponent(grantId)}`);
  }

  async revokeGrant(grantId: string, input: RevocationRequestInput): Promise<void> {
    await this.requestJson<void>(`/grants/${encodeURIComponent(grantId)}/revoke`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async createBinding(input: RuntimeBindingRequestInput): Promise<RuntimeBindingResponse> {
    return this.requestJson<RuntimeBindingResponse>('/bindings', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async releaseBinding(bindingId: string): Promise<void> {
    await this.requestJson<void>(`/bindings/${encodeURIComponent(bindingId)}/release`, {
      method: 'POST',
    });
  }

  async listAuditEvents(filter?: AuditEventFilter): Promise<AuditEventListResponse> {
    const query = new URLSearchParams();

    if (filter) {
      for (const [key, value] of Object.entries(filter)) {
        if (value !== undefined) {
          query.set(key, value);
        }
      }
    }

    const queryString = query.toString();
    const suffix = queryString.length > 0 ? `?${queryString}` : '';
    return this.requestJson<AuditEventListResponse>(`/audit-events${suffix}`);
  }

  async getSkillManifest(): Promise<HcpSkillManifest> {
    const payload = await this.requestJson<unknown>(this.skillManifestPath);
    return assertSkillManifest(payload);
  }

  async injectContext(input: InjectContextInput): Promise<InjectContextResponse> {
    return this.requestJson<InjectContextResponse>(this.injectContextPath, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  private async requestJson<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        'content-type': 'application/json',
        ...this.headers,
        ...(init.headers ?? {}),
      },
    });

    if (response.status === 204) {
      return undefined as T;
    }

    const text = await response.text();
    const payload = text.length > 0 ? safeJsonParse(text) : undefined;

    if (!response.ok) {
      const error = isHcpErrorResponse(payload) ? payload.error : undefined;
      throw new HcpHttpError(response.status, error?.message ?? response.statusText, error);
    }

    return payload as T;
  }
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}


