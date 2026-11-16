import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { NTag } from 'naive-ui';
import SyncHealthBadge from './SyncHealthBadge.vue';
import type { ObservedEnvironmentStatus } from '../api/types';

function observedEnv(
  version: number,
  enabled = true,
): ObservedEnvironmentStatus {
  return { version, enabled, variantType: 'boolean' };
}

describe('SyncHealthBadge (FR-47 / FR-52)', () => {
  it('renders the healthy badge when every observed env matches the stored version', () => {
    const wrapper = mount(SyncHealthBadge, {
      props: {
        flagKey: 'billing',
        flagVersion: 3,
        observed: { dev: observedEnv(3) },
      },
      global: { components: { NTag } },
    });

    expect(wrapper.text()).toContain('Synced v');
  });

  it('renders a stale badge when an environment observed a newer version', () => {
    const wrapper = mount(SyncHealthBadge, {
      props: {
        flagKey: 'billing',
        flagVersion: 2,
        observed: { dev: observedEnv(3) },
      },
      global: { components: { NTag } },
    });

    expect(wrapper.text()).toContain('Stale · dev v3 ≠ v2');
  });

  it('renders the healthy badge when no env has been observed yet', () => {
    const wrapper = mount(SyncHealthBadge, {
      props: { flagKey: 'billing', flagVersion: 1, observed: {} },
      global: { components: { NTag } } as never,
    });

    expect(wrapper.text()).toContain('Synced v');
  });

  it('reports an unknown state — never synced — when flagd has not been observed', () => {
    const wrapper = mount(SyncHealthBadge, {
      props: { flagKey: 'billing', flagVersion: 1, observed: null },
      global: { components: { NTag } } as never,
    });

    expect(wrapper.text()).toContain('Sync unknown');
    expect(wrapper.text()).not.toContain('Synced');
  });

  it('names the observed and stored versions of a stale environment', () => {
    const wrapper = mount(SyncHealthBadge, {
      props: {
        flagKey: 'billing',
        flagVersion: 9,
        observed: { dev: observedEnv(9), prod: observedEnv(8) },
      },
      global: { components: { NTag } } as never,
    });

    expect(wrapper.text()).toContain('Stale · prod v8 ≠ v9');
    expect(
      wrapper.find('[data-testid="sync-badge-billing"]').attributes('title'),
    ).toBe('prod: flagd serves v8, stored v9');
  });

  it('reports flagd as unavailable when the probe failed, whatever was observed before', () => {
    const wrapper = mount(SyncHealthBadge, {
      props: {
        flagKey: 'billing',
        flagVersion: 3,
        observed: { dev: observedEnv(3) },
        unavailable: true,
      },
    });

    expect(wrapper.text()).toContain('Sync unavailable');
    expect(
      wrapper
        .find('[data-testid="sync-badge-billing"]')
        .attributes('data-sync-state'),
    ).toBe('unavailable');
  });

  it('is stale, not synced, when flagd does not serve the flag yet', () => {
    const wrapper = mount(SyncHealthBadge, {
      props: {
        flagKey: 'billing',
        flagVersion: 2,
        observed: {
          dev: { version: null, enabled: false, variantType: 'boolean' },
        },
      },
    });

    expect(wrapper.text()).toContain('Stale · dev not served ≠ v2');
    expect(
      wrapper.find('[data-testid="sync-badge-billing"]').attributes('title'),
    ).toBe('dev: flagd does not serve this flag yet, stored v2');
  });
});
