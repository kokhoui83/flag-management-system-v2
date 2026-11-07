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

    expect(wrapper.text()).toContain('sync: ok');
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

    expect(wrapper.text()).toContain('sync: stale (dev)');
  });

  it('renders the healthy badge when no env has been observed yet', () => {
    const wrapper = mount(SyncHealthBadge, {
      props: { flagKey: 'billing', flagVersion: 1, observed: {} },
      global: { components: { NTag } } as never,
    });

    expect(wrapper.text()).toContain('sync: ok');
  });
});
