/**
 * Dashboard API client (docs/04-api.md). Calls the same-origin `/api/v1` surface with the
 * session cookie attached automatically (`credentials: 'same-origin'`); the management API
 * accepts either the `fms_token` cookie or a Bearer token. No API logic lives here — only
 * transport + error normalization into the RFC 9457 problem document.
 */

import type {
  ApiKeyCreated,
  ApiKeyRecord,
  AuditPage,
  CopyResult,
  DefinitionPutResult,
  EvaluationResult,
  FlagDetail,
  FlagSummary,
  LoginResponse,
  ObservedResponse,
  ProblemDetails,
  ProjectSummary,
} from './types';

export class ApiError extends Error {
  readonly status: number;
  readonly problem?: ProblemDetails;

  constructor(status: number, problem?: ProblemDetails) {
    super(problem?.detail ?? `Request failed with status ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.problem = problem;
  }
}

const BASE_PATH = '/api/v1';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_PATH}${path}`, {
    credentials: 'same-origin',
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  if (response.status === 204) {
    return undefined as T;
  }
  const body = (await response.json().catch(() => null)) as
    (ProblemDetails & T) | null;
  if (!response.ok) {
    throw new ApiError(response.status, body ?? undefined);
  }
  return body as T;
}

export const api = {
  async login(username: string, password: string): Promise<LoginResponse> {
    const body = await request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    return body;
  },

  async logout(): Promise<void> {
    await request<void>('/auth/logout', { method: 'POST' });
  },

  async session(): Promise<{
    username: string;
    globalRole: string | null;
    isBootstrapAdmin: boolean;
    assignments: Array<{ projectId: string; role: string }>;
  }> {
    return request('/auth/session');
  },

  async listProjects(): Promise<ProjectSummary[]> {
    const body = await request<{ projects: ProjectSummary[] }>('/projects');
    return body.projects;
  },

  async createProject(key: string, name: string): Promise<ProjectSummary> {
    const body = await request<ProjectSummary>('/projects', {
      method: 'POST',
      body: JSON.stringify({ key, name }),
    });
    return body;
  },

  async listFlags(projectId: string): Promise<{ flags: FlagSummary[] }> {
    return request(`/projects/${projectId}/flags`);
  },

  async createFlag(
    projectId: string,
    key: string,
    description: string,
  ): Promise<FlagSummary> {
    const body = await request<FlagSummary>(`/projects/${projectId}/flags`, {
      method: 'POST',
      body: JSON.stringify({ key, description }),
    });
    return body;
  },

  async getFlag(projectId: string, key: string): Promise<FlagDetail> {
    return request(`/projects/${projectId}/flags/${key}`);
  },

  async updateFlagDescription(
    projectId: string,
    key: string,
    description: string,
  ): Promise<FlagDetail> {
    const body = await request<FlagDetail>(
      `/projects/${projectId}/flags/${key}`,
      {
        method: 'PUT',
        body: JSON.stringify({ description }),
      },
    );
    return body;
  },

  async deleteFlag(projectId: string, key: string): Promise<void> {
    return request<void>(`/projects/${projectId}/flags/${key}`, {
      method: 'DELETE',
    });
  },

  async putDefinition(
    projectId: string,
    key: string,
    env: string,
    definition: {
      enabled: boolean;
      variants: Record<string, boolean | number | string>;
      defaultVariant: string;
      rules: unknown;
    },
  ): Promise<DefinitionPutResult> {
    return request(`/projects/${projectId}/flags/${key}/definitions/${env}`, {
      method: 'PUT',
      body: JSON.stringify({
        enabled: definition.enabled,
        variants: definition.variants,
        defaultVariant: definition.defaultVariant,
        rules: definition.rules,
      }),
    });
  },

  async copyDefinition(
    projectId: string,
    key: string,
    env: string,
    fromEnv: string,
  ): Promise<CopyResult> {
    return request(
      `/projects/${projectId}/flags/${key}/definitions/${env}/copy`,
      {
        method: 'POST',
        body: JSON.stringify({ fromEnv }),
      },
    );
  },

  async listObserved(
    projectId: string,
    key: string,
  ): Promise<ObservedResponse> {
    return request(`/projects/${projectId}/flags/${key}/observed`);
  },

  async evaluate(input: {
    projectKey: string;
    flagKey: string;
    environment: string;
    targetingKey?: string;
    context?: Record<string, unknown>;
  }): Promise<EvaluationResult> {
    return request<EvaluationResult>('/evaluate', {
      method: 'POST',
      body: JSON.stringify({
        projectKey: input.projectKey,
        flagKey: input.flagKey,
        environment: input.environment,
        ...(input.targetingKey !== undefined
          ? { targetingKey: input.targetingKey }
          : {}),
        ...(input.context !== undefined ? { context: input.context } : {}),
      }),
    });
  },

  async listApiKeys(): Promise<{ keys: ApiKeyRecord[] }> {
    return request<{ keys: ApiKeyRecord[] }>('/api-keys');
  },

  async createApiKey(name: string, scope: string): Promise<ApiKeyCreated> {
    const body = await request<ApiKeyCreated>('/api-keys', {
      method: 'POST',
      body: JSON.stringify({ name, scope }),
    });
    return body;
  },

  async revokeApiKey(id: string): Promise<void> {
    return request<void>(`/api-keys/${id}`, { method: 'DELETE' });
  },

  async listAudit(query: {
    limit?: number;
    before?: string | null;
    action?: string | null;
    entity?: string | null;
    actor?: string | null;
  }): Promise<AuditPage> {
    const params = new URLSearchParams();
    if (query.limit) params.set('limit', String(query.limit));
    if (query.before) params.set('before', query.before);
    if (query.action) params.set('action', query.action);
    if (query.entity) params.set('entity', query.entity);
    if (query.actor) params.set('actor', query.actor);
    const queryString = params.toString();
    return request<AuditPage>(`/audit${queryString ? `?${queryString}` : ''}`);
  },
};
