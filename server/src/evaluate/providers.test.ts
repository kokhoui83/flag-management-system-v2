import { describe, it, expect, afterEach } from 'vitest';
import { OpenFeature, InMemoryProvider, ServerProviderStatus, ServerProviderEvents } from '@openfeature/server-sdk';
import { FlagdProviderRegistry } from './providers';

/** Local, loosely-typed view of the OpenFeature server API surface used by the registry. */
interface OpenFeatureLike {
  setProvider: (domain: string, provider: unknown) => unknown;
  setProviderAndWait: (domain: string, provider?: unknown) => Promise<unknown>;
  clearProviders: () => Promise<unknown>;
  getProviderStatus: (domain: string) => ServerProviderStatus;
}

const openFeature = OpenFeature as unknown as OpenFeatureLike;

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

  it('materializes flag sets lazily and keeps their state', async () => {
    const registry = new FlagdProviderRegistry({ openFeature: () => OpenFeature });
    await registry.getOrCreate('billing:prod');
    expect(registry.getState('billing:prod')).toBe('NOT_READY');
  });
});
