import {
  OpenFeature,
  type EvaluationContext,
  type Logger,
  type ResolutionDetails,
} from '@openfeature/server-sdk';
import { performance } from 'node:perf_hooks';
import { unavailableError } from '../http/problem';
import { LatencyTracker } from './latency';
import type {
  FlagEvaluationInput,
  FlagEvaluationResult,
  ProviderRuntimeState,
} from './types';
import type { FlagdProviderRegistry } from './providers';

/**
 * Flag evaluation use case (roadmap M3; FR-19..FR-25, architecture §2.1/§7). Resolves one
 * flag for one (project, environment) flag set through the OpenFeature layer; the FMS API
 * never evaluates flags itself (FR-21).
 */
export interface FlagEvaluator {
  resolve(input: FlagEvaluationInput): Promise<FlagEvaluationResult>;
}

/**
 * Flagd-observed version of a resolution (FR-47): the version field of the flag metadata the
 * flagd provider compiled from the flag-set document, falling back to the stored flag version
 * when the provider did not report one (e.g. before the first sync).
 */
export function observedFlagVersion(
  details: ResolutionDetails<boolean | number | string>,
  fallback: number,
): number {
  const raw = details.flagMetadata?.version;
  const version = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(version) && version > 0 ? version : fallback;
}

/**
 * Evaluates flags through the OpenFeature server SDK bound to the per-flag-set
 * `FlagdProvider` (flagd gRPC; ADR-0004/0008). The provider is expected to be READY
 * (registry state) before a resolution is attempted; otherwise the call fails with the
 * 503 `unavailable` problem (FR-24 — never a defaulted value).
 */
export class OpenFeatureFlagEvaluator implements FlagEvaluator {
  private readonly openFeature: () => typeof OpenFeature;
  private readonly registry: FlagdProviderRegistry;
  private readonly logger?: Logger;
  private readonly latency: LatencyTracker;

  constructor(deps: {
    openFeature?: () => typeof OpenFeature;
    registry: FlagdProviderRegistry;
    logger?: Logger;
    latency?: LatencyTracker;
  }) {
    this.openFeature = deps.openFeature ?? (() => OpenFeature);
    this.registry = deps.registry;
    this.logger = deps.logger;
    this.latency = deps.latency ?? new LatencyTracker();
  }

  async resolve(input: FlagEvaluationInput): Promise<FlagEvaluationResult> {
    if (!input.enabled) {
      // FR-10: disabled → OpenFeature DISABLED, no value — no provider round-trip is needed,
      // so this short-circuits before the provider-readiness gate (FR-24 only governs evaluations
      // that would actually hit the provider).
      return {
        value: null,
        variant: null,
        reason: 'DISABLED',
        flagVersion: input.version,
      };
    }
    const state: ProviderRuntimeState = this.registry.getState(input.flagSetId);
    if (state !== 'READY') {
      this.logger?.error?.(
        `flag evaluation skipped: provider ${input.flagSetId} state=${state}`,
      );
      throw unavailableError(
        `Flagd provider '${input.flagSetId}' is not ready`,
      );
    }
    const startedAt = performance.now();
    const details = await this.resolveViaOpenFeature(input);
    // NFR-1: measure the flag evaluation latency and feed the sample into the warm-up/protocol tracker.
    this.latency.record(performance.now() - startedAt);
    const flagVersion = observedFlagVersion(details, input.version);
    return {
      value: details.value,
      variant: details.variant ?? input.defaultVariant,
      reason: details.reason ?? 'DEFAULT',
      flagVersion,
    };
  }

  private async resolveViaOpenFeature(
    input: FlagEvaluationInput,
  ): Promise<ResolutionDetails<boolean | number | string>> {
    const client = this.openFeature().getClient(input.flagSetId);
    const context: EvaluationContext = {
      ...(input.context ?? {}),
      ...(input.targetingKey ? { targetingKey: input.targetingKey } : {}),
    };
    const options = {};
    switch (input.variantType) {
      case 'boolean': {
        const defaultValue = Boolean(input.variants[input.defaultVariant]);
        const details = await client.getBooleanDetails(
          input.flagKey,
          defaultValue,
          context,
          options,
        );
        return details;
      }
      case 'string': {
        const defaultValue = String(input.variants[input.defaultVariant]);
        const details = await client.getStringDetails(
          input.flagKey,
          defaultValue,
          context,
          options,
        );
        return details;
      }
      case 'number': {
        const defaultValue = Number(input.variants[input.defaultVariant]);
        const details = await client.getNumberDetails(
          input.flagKey,
          defaultValue,
          context,
          options,
        );
        return details;
      }
    }
    throw new Error(`Unsupported variant type: ${String(input.variantType)}`);
  }
}
