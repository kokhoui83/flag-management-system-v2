/**
 * Dashboard API types mirroring the management API JSON contract
 * (docs/04-api.md). Dates travel as ISO-8601 strings in JSON; rule payloads are the
 * canonical shapes from `@fms/shared`.
 */

export interface ValidationProblem {
  pointer: string;
  message: string;
}

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  errors?: ValidationProblem[];
}

export interface LoginResponse {
  token: string;
  expiresAt: string;
}

export interface MemberAssignment {
  user: string;
  role: string;
}

export interface ProjectSummary {
  id: string;
  key: string;
  name: string;
  environments: string[];
  members: MemberAssignment[];
}

export interface FlagEnvironmentStatus {
  enabled: boolean;
  variantType: string;
}

export interface FlagSummary {
  key: string;
  description: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  environments: Record<string, FlagEnvironmentStatus>;
}

export interface FlagDefinition {
  enabled: boolean;
  variants: Record<string, boolean | number | string>;
  defaultVariant: string;
  rules: unknown;
  updatedAt: string;
}

export interface FlagDetail {
  key: string;
  description: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  definitions: Record<string, FlagDefinition>;
}

export interface ObservedEnvironmentStatus {
  version: number;
  enabled: boolean;
  variantType: string;
}

export interface ObservedResponse {
  key: string;
  observed: Record<string, ObservedEnvironmentStatus>;
}

export interface EvaluationResult {
  value: boolean | number | string | null;
  variant: string | null;
  reason: string;
  flagVersion: number;
}

export interface ApiKeyRecord {
  id: string;
  name: string;
  prefix: string;
  scope: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

export interface ApiKeyCreated {
  id: string;
  name: string;
  scope: string;
  key: string;
  createdAt: string;
}

export interface AuditEntry {
  id: string;
  createdAt: string;
  actorType: string;
  actorName: string;
  action: string;
  entity: string;
  entityId: string;
  env: string | null;
  before: unknown;
  after: unknown;
}

export interface AuditPage {
  entries: AuditEntry[];
  nextBefore: string | null;
}

export interface DefinitionPutResult {
  flagKey: string;
  env: string;
  version: number;
}

export interface CopyResult {
  flagKey: string;
  env: string;
  version: number;
}

export interface CreateEnvironmentResult {
  projectId: string;
  env: string;
}
