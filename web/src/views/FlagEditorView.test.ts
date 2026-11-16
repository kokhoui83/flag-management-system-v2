import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { byTestId } from '../test-support';
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

const push = vi.fn();
vi.mock('vue-router', () => ({
  useRoute: () => ({
    params: { projectId: 'proj-1', flagKey: 'new-thing' },
    name: 'flag',
  }),
  useRouter: () => ({ push }),
}));

vi.mock('../api/client', () => ({
  api: {
    getFlag: vi.fn(),
    listFlags: vi.fn(),
    listObserved: vi.fn(),
    deleteFlag: vi.fn(),
    updateFlagDescription: vi.fn(),
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
    for (const mock of Object.values(api)) vi.mocked(mock).mockReset();
    push.mockReset();
    vi.mocked(api.listFlags).mockResolvedValue({ flags: [] });
    const session = useSessionStore();
    session.$patch({
      authenticated: true,
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

  async function mountEditor(detail: FlagDetail = DETAIL) {
    vi.mocked(api.getFlag).mockResolvedValue(detail);
    vi.mocked(api.listObserved).mockResolvedValue({
      key: FLAG_KEY,
      observed: {},
    });
    const wrapper = mount(FlagEditorView);
    await flushPromises();
    return wrapper;
  }

  async function openTab(
    wrapper: Awaited<ReturnType<typeof mountEditor>>,
    envName: string,
  ): Promise<void> {
    await wrapper
      .findAll('.n-tabs-tab')
      .find((tab) => tab.text().includes(envName))!
      .trigger('click');
    await flushPromises();
  }

  function signInAs(role: string): void {
    useSessionStore().$patch({
      globalRole: role,
      isBootstrapAdmin: false,
      assignments: [{ projectId: PROJECT_ID, role }],
    });
  }

  it('creates the definition of an environment that had none (FR-7)', async () => {
    const wrapper = await mountEditor();
    await openTab(wrapper, 'prod');
    expect(wrapper.find('[data-testid="definition-missing"]').exists()).toBe(
      true,
    );
    vi.mocked(api.putDefinition).mockResolvedValue({
      flagKey: FLAG_KEY,
      env: 'prod',
      version: 3,
    });
    vi.mocked(api.getFlag).mockResolvedValue({
      ...DETAIL,
      version: 3,
      definitions: {
        staging: STAGING_DEFINITION,
        prod: { ...STAGING_DEFINITION, enabled: true },
      },
    });

    await wrapper.find('form.editor-form').trigger('submit');
    await flushPromises();

    expect(api.putDefinition).toHaveBeenCalledWith(
      PROJECT_ID,
      FLAG_KEY,
      'prod',
      {
        enabled: true,
        variants: { on: true, off: false },
        defaultVariant: 'off',
        rules: [],
      },
    );
    expect(wrapper.find('[data-testid="editor-saved"]').text()).toContain(
      'v2 → v3',
    );
    expect(wrapper.find('[data-testid="definition-missing"]').exists()).toBe(
      false,
    );
  });

  it('saves added variants and rules through the editor (FR-42)', async () => {
    const wrapper = await mountEditor();
    vi.mocked(api.putDefinition).mockResolvedValue({
      flagKey: FLAG_KEY,
      env: 'staging',
      version: 3,
    });

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Add variant')!
      .trigger('click');
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Add percentage rule')!
      .trigger('click');
    await wrapper.find('form.editor-form').trigger('submit');
    await flushPromises();

    expect(api.putDefinition).toHaveBeenCalledWith(
      PROJECT_ID,
      FLAG_KEY,
      'staging',
      {
        enabled: false,
        variants: { on: true, off: false, 'variant-3': false },
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
      },
    );
  });

  it('lists every validation problem at once and does not call the API (FR-14)', async () => {
    const wrapper = await mountEditor({
      ...DETAIL,
      definitions: {
        staging: {
          ...STAGING_DEFINITION,
          defaultVariant: 'maybe',
          rules: [{ type: 'attribute', conditions: [], variant: 'nope' }],
        },
      },
    });

    await wrapper.find('form.editor-form').trigger('submit');
    await flushPromises();

    const listed = wrapper
      .findAll('[data-testid="validation-problems"] li')
      .map((item) => item.text());
    expect(listed.length).toBeGreaterThanOrEqual(2);
    expect(listed.some((text) => text.startsWith('/defaultVariant'))).toBe(
      true,
    );
    expect(listed.some((text) => text.startsWith('/rules/0'))).toBe(true);
    expect(api.putDefinition).not.toHaveBeenCalled();
  });

  describe('product owner (FR-59)', () => {
    it('may toggle an existing definition while every other control is read-only', async () => {
      signInAs('PRODUCT_OWNER');
      const wrapper = await mountEditor();

      expect(wrapper.find('[data-testid="read-only-note"]').exists()).toBe(
        true,
      );
      expect(byTestId(wrapper, 'definition-enabled').props('disabled')).toBe(
        false,
      );
      expect(byTestId(wrapper, 'default-variant').props('disabled')).toBe(true);
      expect(wrapper.find('[data-testid="copy-submit"]').exists()).toBe(false);
      expect(wrapper.find('[data-testid="flag-delete"]').exists()).toBe(false);
      expect(byTestId(wrapper, 'flag-description').props('disabled')).toBe(
        true,
      );
    });

    it('cannot create a definition in an environment without one', async () => {
      signInAs('product-owner');
      const wrapper = await mountEditor();

      await openTab(wrapper, 'prod');

      expect(byTestId(wrapper, 'definition-enabled').props('disabled')).toBe(
        true,
      );
      expect(
        wrapper.find('[data-testid="definition-save"]').attributes('disabled'),
      ).toBeDefined();
      expect(
        wrapper.find('[data-testid="definition-missing"]').text(),
      ).toContain('an admin or developer must create it');
    });
  });

  it('offers copy to a developer but flag deletion only to an admin', async () => {
    signInAs('developer');
    const wrapper = await mountEditor();

    expect(wrapper.find('[data-testid="copy-submit"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="flag-delete"]').exists()).toBe(false);
  });

  it('lets a project-scoped admin delete the flag', async () => {
    useSessionStore().$patch({
      globalRole: 'developer',
      isBootstrapAdmin: false,
      assignments: [{ projectId: PROJECT_ID, role: 'ADMIN' }],
    });
    const wrapper = await mountEditor();

    expect(wrapper.find('[data-testid="flag-delete"]').exists()).toBe(true);
  });

  it('keeps unsaved edits and warns when the flag changes on the server', async () => {
    const wrapper = await mountEditor();
    byTestId(wrapper, 'definition-enabled').vm.$emit('update:value', true);
    await flushPromises();

    useFlagsStore().detail = {
      ...DETAIL,
      version: 3,
      definitions: {
        staging: { ...STAGING_DEFINITION, defaultVariant: 'on' },
      },
    };
    await flushPromises();

    expect(wrapper.find('[data-testid="server-changed"]').exists()).toBe(true);
    expect(wrapper.findComponent(NSwitch).props('value')).toBe(true);
  });

  it('saves an edited description (admin/developer)', async () => {
    const wrapper = await mountEditor();
    vi.mocked(api.updateFlagDescription).mockResolvedValue({
      ...DETAIL,
      description: 'kill switch',
    });

    await wrapper
      .find('[data-testid="flag-description"] textarea')
      .setValue('kill switch');
    await wrapper
      .find('[data-testid="flag-description-save"]')
      .trigger('click');
    await flushPromises();

    expect(api.updateFlagDescription).toHaveBeenCalledWith(
      PROJECT_ID,
      FLAG_KEY,
      'kill switch',
    );
  });

  it('discards unsaved edits back to the stored definition', async () => {
    const wrapper = await mountEditor();
    const discard = wrapper.find('[data-testid="definition-discard"]');
    expect(discard.attributes('disabled')).toBeDefined();

    byTestId(wrapper, 'definition-enabled').vm.$emit('update:value', true);
    await flushPromises();
    expect(wrapper.findComponent(NSwitch).props('value')).toBe(true);

    await discard.trigger('click');

    expect(wrapper.findComponent(NSwitch).props('value')).toBe(false);
    expect(api.putDefinition).not.toHaveBeenCalled();
  });

  it('shows a load failure instead of an empty editor', async () => {
    useFlagsStore().$patch({ detail: null, detailKey: null });
    vi.mocked(api.getFlag).mockRejectedValue(
      new Error("Flag 'new-thing' not found"),
    );
    vi.mocked(api.listObserved).mockResolvedValue({
      key: FLAG_KEY,
      observed: {},
    });

    const wrapper = mount(FlagEditorView);
    await flushPromises();

    expect(wrapper.text()).toContain("Flag 'new-thing' not found");
    expect(wrapper.find('form.editor-form').exists()).toBe(false);
  });
});
