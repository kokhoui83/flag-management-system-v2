import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { byTestId } from '../test-support';
import { createPinia, setActivePinia } from 'pinia';
import { api } from '../api/client';
import { useSessionStore } from '../stores/session';
import type { FlagDetail, FlagSummary } from '../api/types';
import PlaygroundView from './PlaygroundView.vue';

vi.mock('../api/client', () => ({
  api: { listFlags: vi.fn(), getFlag: vi.fn(), evaluate: vi.fn() },
  ApiError: class ApiError extends Error {},
}));

function summary(key: string): FlagSummary {
  return {
    key,
    description: '',
    version: 4,
    createdAt: '2026-11-07T00:00:00.000Z',
    updatedAt: '2026-11-07T00:00:00.000Z',
    environments: {},
  };
}

const ROLLOUT_DETAIL: FlagDetail = {
  ...summary('rollout'),
  definitions: {
    dev: {
      enabled: true,
      variants: { on: true, off: false },
      defaultVariant: 'off',
      rules: [
        {
          type: 'percentage',
          splits: [
            { variant: 'on', weight: 50 },
            { variant: 'off', weight: 50 },
          ],
        },
      ],
      updatedAt: '2026-11-07T00:00:00.000Z',
    },
  },
};

async function mountPlayground() {
  const wrapper = mount(PlaygroundView);
  await flushPromises();
  return wrapper;
}

async function pick(
  wrapper: Awaited<ReturnType<typeof mountPlayground>>,
  testId: string,
  value: string,
): Promise<void> {
  byTestId(wrapper, testId).vm.$emit('update:value', value);
  await flushPromises();
}

function optionsOf(
  wrapper: Awaited<ReturnType<typeof mountPlayground>>,
  testId: string,
): string[] {
  const options = byTestId(wrapper, testId).props('options') as Array<{
    value: string;
  }>;
  return options.map((option) => option.value);
}

describe('PlaygroundView (FR-44 evaluate playground)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    for (const mock of Object.values(api)) vi.mocked(mock).mockReset();
    useSessionStore().$patch({
      authenticated: true,
      username: 'dev',
      globalRole: 'developer',
      projects: [
        {
          id: 'proj-1',
          key: 'acme',
          name: 'Acme',
          environments: ['dev', 'prod'],
          members: [],
        },
        {
          id: 'proj-2',
          key: 'billing',
          name: 'Billing',
          environments: ['qa'],
          members: [],
        },
      ],
      selectedProjectId: 'proj-1',
    });
    vi.mocked(api.listFlags).mockImplementation(async (projectId) => ({
      flags:
        projectId === 'proj-1' ? [summary('rollout')] : [summary('invoice')],
    }));
    vi.mocked(api.getFlag).mockResolvedValue(ROLLOUT_DETAIL);
  });

  it('loads the flags of the selected project on its own', async () => {
    const wrapper = await mountPlayground();

    expect(api.listFlags).toHaveBeenCalledWith('proj-1');
    expect(optionsOf(wrapper, 'playground-flag')).toEqual(['rollout']);
    expect(optionsOf(wrapper, 'playground-env')).toEqual(['dev', 'prod']);
  });

  it('reloads flags and environments when the project changes', async () => {
    const wrapper = await mountPlayground();

    await pick(wrapper, 'playground-project', 'billing');

    expect(api.listFlags).toHaveBeenCalledWith('proj-2');
    expect(optionsOf(wrapper, 'playground-flag')).toEqual(['invoice']);
    expect(optionsOf(wrapper, 'playground-env')).toEqual(['qa']);
  });

  it('requires a targeting key for a flag with a percentage rule (FR-19)', async () => {
    const wrapper = await mountPlayground();
    await pick(wrapper, 'playground-flag', 'rollout');
    expect(api.getFlag).toHaveBeenCalledWith('proj-1', 'rollout');

    await wrapper.find('form.playground-form').trigger('submit');
    await flushPromises();

    expect(api.evaluate).not.toHaveBeenCalled();
    expect(wrapper.find('[data-testid="playground-error"]').text()).toContain(
      'targeting key is required',
    );
  });

  it('evaluates and shows value, variant, reason and flag version', async () => {
    vi.mocked(api.evaluate).mockResolvedValue({
      value: true,
      variant: 'on',
      reason: 'SPLIT',
      flagVersion: 4,
    });
    const wrapper = await mountPlayground();
    await pick(wrapper, 'playground-flag', 'rollout');
    await wrapper
      .find('[data-testid="playground-targeting-key"] input')
      .setValue('user-42');
    await wrapper
      .find('[data-testid="playground-context"] textarea')
      .setValue('{"plan":"pro"}');

    await wrapper.find('form.playground-form').trigger('submit');
    await flushPromises();

    expect(api.evaluate).toHaveBeenCalledWith({
      projectKey: 'acme',
      flagKey: 'rollout',
      environment: 'dev',
      targetingKey: 'user-42',
      context: { plan: 'pro' },
    });
    expect(wrapper.find('[data-testid="result-value"]').text()).toBe('true');
    expect(wrapper.find('[data-testid="result-variant"]').text()).toBe('on');
    expect(wrapper.find('[data-testid="result-reason"]').text()).toBe('SPLIT');
    expect(wrapper.find('[data-testid="result-version"]').text()).toBe('4');
  });

  it('says so when the flag has no definition in the chosen environment', async () => {
    const wrapper = await mountPlayground();
    await pick(wrapper, 'playground-flag', 'rollout');

    await pick(wrapper, 'playground-env', 'prod');

    expect(wrapper.find('[data-testid="playground-missing"]').exists()).toBe(
      true,
    );
  });

  it('rejects context that is not a JSON object', async () => {
    const wrapper = await mountPlayground();
    await pick(wrapper, 'playground-flag', 'rollout');
    await wrapper
      .find('[data-testid="playground-targeting-key"] input')
      .setValue('user-42');
    await wrapper
      .find('[data-testid="playground-context"] textarea')
      .setValue('[1, 2]');

    await wrapper.find('form.playground-form').trigger('submit');
    await flushPromises();

    expect(api.evaluate).not.toHaveBeenCalled();
    expect(wrapper.find('[data-testid="playground-error"]').text()).toContain(
      'must be an object',
    );
  });
});
