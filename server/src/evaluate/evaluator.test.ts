import { describe, it, expect, afterEach } from 'vitest';
import {
  OpenFeature,
  InMemoryProvider,
  ServerProviderStatus,
} from '@openfeature/server-sdk';
import { OpenFeatureFlagEvaluator, observedFlagVersion } from './evaluator';
import { FlagdProviderRegistry } from './providers';
import { LatencyTracker, LATENCY_WARMUP_CALLS } from './latency';

/** Local, loosely-typed view of the OpenFeature server API surface used by the evaluator. */
interface OpenFeatureLike {
  setProvider: (domain: string, provider: unknown) => unknown;
  setProviderAndWait: (domain: string, provider?: unknown) => Promise<unknown>;
  clearProviders: () => Promise<unknown>;
  getProviderStatus: (domain: string) => ServerProviderStatus;
}

const openFeature = OpenFeature as unknown as OpenFeatureLike;

describe('OpenFeatureFlagEvaluator (FR-21..FR-25, FR-24)', () => {
  afterEach(async () => {
    await openFeature.clearProviders();
  });

  it('throws the 503 unavailable problem when the flagd provider is not ready', async () => {
    const evaluator = new OpenFeatureFlagEvaluator({
      openFeature: () => OpenFeature,
      registry: new FlagdProviderRegistry({ openFeature: () => OpenFeature }),
    });
    await expect(
      evaluator.resolve({
        flagSetId: 'checkout:staging',
        flagKey: 'new-checkout',
        enabled: true,
        variants: { on: true, off: false },
        defaultVariant: 'off',
        variantType: 'boolean',
        version: 2,
      }),
    ).rejects.toThrow();
  });

  it('returns DISABLED with a null value when the flag is disabled (FR-10)', async () => {
    const registry = new FlagdProviderRegistry({
      openFeature: () => OpenFeature,
    });
    const provider = new InMemoryProvider({
      'new-checkout': {
        variants: { on: true, off: false },
        defaultVariant: 'off',
        disabled: false,
      },
    });
    openFeature.setProvider('checkout:staging', provider);
    await openFeature.setProviderAndWait('checkout:staging');
    const evaluator = new OpenFeatureFlagEvaluator({
      openFeature: () => OpenFeature,
      registry,
    });
    const result = await evaluator.resolve({
      flagSetId: 'checkout:staging',
      flagKey: 'new-checkout',
      enabled: false,
      variants: { on: true, off: false },
      defaultVariant: 'off',
      variantType: 'boolean',
      version: 3,
    });
    expect(result).toEqual({
      value: null,
      variant: null,
      reason: 'DISABLED',
      flagVersion: 3,
    });
  });

  it('returns DISABLED without a provider round-trip when the flagd provider is not ready (FR-10 precedes FR-24)', async () => {
    const evaluator = new OpenFeatureFlagEvaluator({
      openFeature: () => OpenFeature,
      registry: new FlagdProviderRegistry({ openFeature: () => OpenFeature }),
    });
    const result = await evaluator.resolve({
      flagSetId: 'checkout:staging',
      flagKey: 'new-checkout',
      enabled: false,
      variants: { on: true, off: false },
      defaultVariant: 'off',
      variantType: 'boolean',
      version: 3,
    });
    expect(result).toEqual({
      value: null,
      variant: null,
      reason: 'DISABLED',
      flagVersion: 3,
    });
  });

  it('resolves a boolean flag through the OpenFeature layer when the provider is READY', async () => {
    const registry = new FlagdProviderRegistry({
      openFeature: () => OpenFeature,
    });
    const provider = new InMemoryProvider({
      'new-checkout': {
        variants: { on: true, off: false },
        defaultVariant: 'off',
        disabled: false,
      },
    });
    openFeature.setProvider('checkout:staging', provider);
    await openFeature.setProviderAndWait('checkout:staging');
    const evaluator = new OpenFeatureFlagEvaluator({
      openFeature: () => OpenFeature,
      registry,
    });

    const result = await evaluator.resolve({
      flagSetId: 'checkout:staging',
      flagKey: 'new-checkout',
      enabled: true,
      variants: { on: true, off: false },
      defaultVariant: 'off',
      variantType: 'boolean',
      version: 2,
    });
    expect(result.value).toBe(false);
    expect(result.variant).toBe('off');
    expect(result.reason).toBeDefined();
    expect(result.flagVersion).toBe(2);
  });

  it('records evaluation latency samples through the injected tracker after the warm-up window (NFR-1)', async () => {
    const tracker = new LatencyTracker();
    const registry = new FlagdProviderRegistry({
      openFeature: () => OpenFeature,
    });
    const provider = new InMemoryProvider({
      'new-checkout': {
        variants: { on: true, off: false },
        defaultVariant: 'off',
        disabled: false,
      },
    });
    openFeature.setProvider('checkout:staging', provider);
    await openFeature.setProviderAndWait('checkout:staging');
    const evaluator = new OpenFeatureFlagEvaluator({
      openFeature: () => OpenFeature,
      registry,
      latency: tracker,
    });

    const input = {
      flagSetId: 'checkout:staging',
      flagKey: 'new-checkout',
      enabled: true,
      variants: { on: true, off: false },
      defaultVariant: 'off',
      variantType: 'boolean' as const,
      version: 2,
    };

    for (let i = 0; i < LATENCY_WARMUP_CALLS; i += 1) {
      await evaluator.resolve(input);
    }
    await evaluator.resolve(input);
    expect(tracker.getSampleCount()).toBe(1);
  });
});

describe('OpenFeatureFlagEvaluator.observe (FR-47 — what flagd itself serves)', () => {
  afterEach(async () => {
    await openFeature.clearProviders();
  });

  const observation = {
    flagSetId: 'checkout:staging',
    flagKey: 'new-checkout',
    variants: { on: true, off: false },
    defaultVariant: 'off',
    variantType: 'boolean' as const,
  };

  /** Provider double answering like flagd: a resolution plus the flag-set metadata. */
  function providerServing(details: Record<string, unknown>) {
    return {
      metadata: { name: 'fake-flagd' },
      runsOn: 'server',
      resolveBooleanEvaluation: async () => details,
      resolveStringEvaluation: async () => details,
      resolveNumberEvaluation: async () => details,
      resolveObjectEvaluation: async () => details,
    };
  }

  async function evaluatorWith(provider: unknown) {
    const registry = new FlagdProviderRegistry({ openFeature: () => OpenFeature });
    openFeature.setProvider('checkout:staging', provider);
    await openFeature.setProviderAndWait('checkout:staging');
    return new OpenFeatureFlagEvaluator({ openFeature: () => OpenFeature, registry });
  }

  it('reports the version and enabled state flagd serves', async () => {
    const evaluator = await evaluatorWith(
      providerServing({ value: true, variant: 'on', reason: 'STATIC', flagMetadata: { version: 8 } }),
    );

    expect(await evaluator.observe(observation)).toEqual({ version: 8, enabled: true });
  });

  it('reports a flag flagd serves as disabled, with the version flagd holds', async () => {
    const evaluator = await evaluatorWith(
      providerServing({ value: false, reason: 'DISABLED', flagMetadata: { version: 3 } }),
    );

    expect(await evaluator.observe(observation)).toEqual({ version: 3, enabled: false });
  });

  it('reports no version — never the stored one — when flagd does not serve the flag', async () => {
    const evaluator = await evaluatorWith(
      providerServing({ value: false, reason: 'ERROR', errorCode: 'FLAG_NOT_FOUND', flagMetadata: {} }),
    );

    expect(await evaluator.observe(observation)).toEqual({ version: null, enabled: false });
  });

  it('fails with the 503 unavailable problem when the provider is not ready', async () => {
    const evaluator = new OpenFeatureFlagEvaluator({
      openFeature: () => OpenFeature,
      registry: new FlagdProviderRegistry({ openFeature: () => OpenFeature }),
    });

    await expect(evaluator.observe(observation)).rejects.toMatchObject({ status: 503 });
  });
});

describe('observedFlagVersion (FR-47 — flagd-observed flag version)', () => {
  it('reads the version from the flagd-compiled flag metadata', () => {
    expect(
      observedFlagVersion(
        { value: false, reason: 'STATIC', flagMetadata: { version: 8 } },
        3,
      ),
    ).toBe(8);
  });

  it('falls back to the stored flag version when the provider reported no version', () => {
    expect(observedFlagVersion({ value: false, reason: 'STATIC' }, 3)).toBe(3);
  });
});
