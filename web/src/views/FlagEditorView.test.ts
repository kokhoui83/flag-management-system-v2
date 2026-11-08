import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import {
  NAlert,
  NButton,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NPageHeader,
  NSelect,
  NSwitch,
  NTabs,
  NTabPane,
  NTag,
  NText,
} from 'naive-ui';
import { useFlagsStore } from '../stores/flags';
import { useSessionStore } from '../stores/session';
import { api } from '../api/client';
import type { FlagDefinition, FlagDetail } from '../api/types';
import FlagEditorView from './FlagEditorView.vue';

vi.mock('vue-router', () => ({
  useRoute: () => ({
    params: { projectId: 'proj-1', flagKey: 'new-thing' },
    name: 'flag',
  }),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('../api/client', () => ({
  api: {
    getFlag: vi.fn(),
    listObserved: vi.fn(),
    createFlag: vi.fn(),
    putDefinition: vi.fn(),
    copyDefinition: vi.fn(),
  },
  ApiError: class ApiError extends Error {},
}));

const PROJECT_ID = 'proj-1';
const FLAG_KEY = 'new-thing';

const STAGING_DEFINITION: FlagDefinition = {
  enabled: false,
  variants: { on: true, off: false },
  defaultVariant: 'off',
  rules: [],
  updatedAt: '2026-11-07T00:00:00.000Z',
};

const DETAIL: FlagDetail = {
  key: FLAG_KEY,
  description: 'uf6',
  version: 2,
  createdAt: '2026-11-07T00:00:00.000Z',
  updatedAt: '2026-11-07T00:00:00.000Z',
  definitions: { staging: STAGING_DEFINITION },
};

describe('FlagEditorView (FR-41/FR-59 flag editor env tabs + toggle)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.mocked(api.getFlag).mockReset();
    vi.mocked(api.listObserved).mockReset();
    const session = useSessionStore();
    session.$patch({
      token: 'tok',
      username: 'admin',
      globalRole: 'admin',
      isBootstrapAdmin: true,
      assignments: [],
      projects: [
        {
          id: PROJECT_ID,
          key: 'acme',
          name: 'Acme',
          environments: ['staging', 'prod'],
          members: [],
        },
      ],
      selectedProjectId: PROJECT_ID,
    });
    const flags = useFlagsStore();
    flags.projectId = PROJECT_ID;
    flags.flags = [];
    flags.detail = DETAIL;
    flags.detailKey = FLAG_KEY;
    flags.observed = {};
  });

  it('starts the editor from the stored definition of the initial environment', async () => {
    vi.mocked(api.getFlag).mockResolvedValue(DETAIL);
    vi.mocked(api.listObserved).mockResolvedValue({
      key: FLAG_KEY,
      observed: {},
    });

    const wrapper = mount(FlagEditorView, {
      global: {
        components: {
          NAlert,
          NButton,
          NForm,
          NFormItem,
          NInput,
          NInputNumber,
          NPageHeader,
          NSelect,
          NSwitch,
          NTabs,
          NTabPane,
          NTag,
          NText,
        },
      } as never,
    });
    await flushPromises();

    expect(wrapper.findComponent(NSwitch).props('value')).toBe(false);
  });

  it('resets to a pristine definition when switching to an environment without a stored definition', async () => {
    vi.mocked(api.getFlag).mockResolvedValue(DETAIL);
    vi.mocked(api.listObserved).mockResolvedValue({
      key: FLAG_KEY,
      observed: {},
    });

    const wrapper = mount(FlagEditorView, {
      global: {
        components: {
          NAlert,
          NButton,
          NForm,
          NFormItem,
          NInput,
          NInputNumber,
          NPageHeader,
          NSelect,
          NSwitch,
          NTabs,
          NTabPane,
          NTag,
          NText,
        },
      } as never,
    });
    await flushPromises();
    expect(wrapper.findComponent(NSwitch).props('value')).toBe(false);

    const prodTab = wrapper
      .findAll('.n-tabs-tab')
      .find((tab) => tab.text().includes('prod'));
    expect(prodTab).toBeTruthy();
    await prodTab!.trigger('click');
    await flushPromises();

    // Env `prod` has no stored definition → editor must start from a pristine definition
    // (enabled on) instead of retaining the previous environment's state.
    expect(wrapper.findComponent(NSwitch).props('value')).toBe(true);
  });
});
