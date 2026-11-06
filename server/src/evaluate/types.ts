import type { ResolutionReason } from '@openfeature/server-sdk';
import type { VariantType, VariantValue } from '@fms/shared';

/**
 * Runtime state of one (project, environment) flagd provider (architecture §7,
 * roadmap M3). Mirrors the OpenFeature server provider status vocabulary but is owned
 * by the FMS evaluate layer so `readyz` and the SSE stream read one source of truth.
 */
export type ProviderRuntimeState = 'NOT_READY' | 'READY' | 'STALE' | 'ERROR';

/**
 * Evaluate a single flag for one (project, environment) flag set (FR-21..FR-25).
 *
 * `flagSetId` is the project-namespaced flag set ID per the OQ-6 resolution (ADR-0004):
 * `<projectKey>:<env>`. The evaluator resolves through the OpenFeature layer bound to
 * that flag set (flagd provider selector); FMS itself never evaluates flags.
 */
export interface FlagEvaluationInput {
  flagSetId: string;
  flagKey: string;
  enabled: boolean;
  variants: Record<string, VariantValue>;
  defaultVariant: string;
  variantType: VariantType;
  /** Stored flag-level version (FR-5); the observed flagd version rides along on the result. */
  version: number;
  targetingKey?: string;
  context?: Record<string, unknown>;
}

export interface FlagEvaluationResult {
  value: boolean | number | string | null;
  variant: string | null;
  reason: ResolutionReason;
  /** Flagd-observed version for the flag (FR-47); falls back to the stored version. */
  flagVersion: number;
}
