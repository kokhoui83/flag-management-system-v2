import { describe, it, expect, afterEach, vi } from 'vitest';
import { OpenFeature, InMemoryProvider, ServerProviderStatus, ServerProviderEvents } from '@openfeature/server-sdk';
import { FlagdProviderRegistry } from './providers';

/** Local, loosely-typed view of the OpenFeature server API surface used by the registry. */
interface OpenFeatureLike {
  setProvider: (domain: string, provider: unknown) => unknown;
  setProviderAndWait: (domain: string, provider?: unknown) => Promise<unknown>;
  clearProviders: () => Promise<unknown>;
  getProviderStatus: (domain: string) => ServerProviderStatus;
  addHandler: (eventType: string, handler: (details: unknown) => void) => void;
}

const openFeature = OpenFeature as unknown as OpenFeatureLike;

/** Minimal stand-in for the OpenFeature server API so the registry can be tested without a live flagd. */
function fakeOpenFeature(): OpenFeatureLike {
  return {
    setProvider: vi.fn(),
    setProviderAndWait: vi.fn().mockResolvedValue(undefined),
    clearProviders: vi.fn().mockResolvedValue(undefined),
    getProviderStatus: vi.fn().mockReturnValue(ServerProviderStatus.NOT_READY),
    addHandler: vi.fn(),
  };
}

describe('FlagdProviderRegistry (OpenFeature-backed, ADR-0004/0008)', () => {
  afterEach(async () => {
    await openFeature.clearProviders();
  });

  it('reports NOT_READY for an unknown flag set before the provider becomes ready', () => {
    const registry = new FlagdProviderRegistry({ openFeature: () => OpenFeature });
    expect(registry.getState('checkout:staging')).toBe('NOT_READY');
  });

  it('tracks the provider state of a registered flag set and fans out events', async () => {
    const registry = new FlagdProviderRegistry({ openFeature: () => OpenFeature });
    const events: Array<{ type: string; flagSetId: string }> = [];
    const unsubscribe = registry.onEvent((event) => events.push(event));

    const provider = new InMemoryProvider({
      'new-checkout': { variants: { on: true, off: false }, defaultVariant: 'off', disabled: false },
    });
    openFeature.setProvider('checkout:staging', provider);
    await openFeature.setProviderAndWait('checkout:staging');
    expect(openFeature.getProviderStatus('checkout:staging')).toBe(ServerProviderStatus.READY);
    expect(registry.getState('checkout:staging')).toBe('READY');

    // The SDK folds provider events into the registry state; a configuration change is forwarded.
    provider.events.emit(ServerProviderEvents.ConfigurationChanged, { domain: 'checkout:staging' });

    expect(events.some((event) => event.type === 'provider-configuration-changed' && event.flagSetId === 'checkout:staging')).toBe(true);
    unsubscribe();
  });

  it('registers a flagd provider bound to the flag set and stays NOT_READY until it reports ready', async () => {
    const fake = fakeOpenFeature();
    const registry = new FlagdProviderRegistry({ openFeature: () => fake as unknown as typeof OpenFeature, flagd: { host: 'flagd.internal', port: 8013 } });
    await registry.getOrCreate('billing:prod');
    expect(fake.setProvider).toHaveBeenCalledTimes(1);
    expect(fake.setProvider).toHaveBeenCalledWith('billing:prod', expect.anything());
    expect(registry.getState('billing:prod')).toBe('NOT_READY');
  });

  it('does not re-register a flag set that is already materialized', async () => {
    const fake = fakeOpenFeature();
    const registry = new FlagdProviderRegistry({ openFeature: () => fake as unknown as typeof OpenFeature, flagd: { host: 'flagd.internal', port: 8013 } });
    await registry.getOrCreate('billing:prod');
    await registry.getOrCreate('billing:prod');
    expect(fake.setProvider).toHaveBeenCalledTimes(1);
  });

  it('closes registered providers on registry close', async () => {
    const fake = fakeOpenFeature();
    const registry = new FlagdProviderRegistry({ openFeature: () => fake as unknown as typeof OpenFeature, flagd: { host: 'flagd.internal', port: 8013 } });
    await registry.close();
    expect(fake.clearProviders).toHaveBeenCalledTimes(1);
  });
});
