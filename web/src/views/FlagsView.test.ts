import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { byTestId } from '../test-support';
import { createPinia, setActivePinia } from 'pinia';
import { NPopconfirm } from 'naive-ui';
import { api } from '../api/client';
import type { ObservedEnvironmentStatus } from '../api/types';
import { useFlagsStore } from '../stores/flags';
import { useSessionStore } from '../stores/session';
import FlagsView from './FlagsView.vue';

const push = vi.fn();
vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { projectId: 'proj-1' }, name: 'flags' }),
  useRouter: () => ({ push }),
}));

const dialogStub = {
  props: ['show', 'title'],
  template: '<section v-if="show" data-testid="dialog"><slot /></section>',
};

function mountFlags() {
  return mount(FlagsView, { global: { stubs: { AppDialog: dialogStub } } });
}

vi.mock('../api/client', () => ({
  api: {
    listFlags: vi.fn(),
    listProjects: vi.fn(),
    createEnvironment: vi.fn(),
    createFlag: vi.fn(),
    getFlag: vi.fn(),
    listObserved: vi.fn(),
    putDefinition: vi.fn(),
    copyDefinition: vi.fn(),
  },
  ApiError: class ApiError extends Error {},
}));

const PROJECT_ID = 'proj-1';

describe('FlagsView (FR-41 flag list)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    for (const mock of Object.values(api)) vi.mocked(mock).mockReset();
    push.mockReset();
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
          environments: ['staging'],
          members: [],
        },
      ],
      selectedProjectId: PROJECT_ID,
    });
    const flags = useFlagsStore();
    flags.$patch({
      projectId: PROJECT_ID,
      flags: [],
      detail: null,
      detailKey: null,
      observed: {},
    });
  });

  it('does not render the empty state while the flag list is loading', () => {
    vi.mocked(api.listFlags).mockResolvedValue({ flags: [] });

    const wrapper = mountFlags();

    expect(wrapper.find('[data-testid="flags-empty"]').exists()).toBe(false);
  });

  it('renders the empty state after the initial load settles with no flags', async () => {
    vi.mocked(api.listFlags).mockResolvedValue({ flags: [] });

    const wrapper = mountFlags();
    await flushPromises();

    expect(wrapper.find('[data-testid="flags-empty"]').exists()).toBe(true);
  });

  it('shows a load failure with a retry instead of an empty list', async () => {
    vi.mocked(api.listFlags).mockRejectedValueOnce(
      new Error('No access to this project'),
    );
    const wrapper = mountFlags();
    await flushPromises();
    expect(wrapper.text()).toContain('No access to this project');
    expect(wrapper.find('[data-testid="flags-empty"]').exists()).toBe(false);

    vi.mocked(api.listFlags).mockResolvedValue({ flags: [] });
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Retry')!
      .trigger('click');
    await flushPromises();

    expect(wrapper.find('[data-testid="flags-empty"]').exists()).toBe(true);
  });

  const ALPHA = {
    key: 'alpha',
    description: 'first flag',
    version: 4,
    createdAt: '2026-11-07T00:00:00.000Z',
    updatedAt: '2026-11-07T00:00:00.000Z',
    environments: { staging: { enabled: true, variantType: 'boolean' } },
  };

  function signInAs(
    globalRole: string,
    assignments: Array<{ projectId: string; role: string }>,
    environments = ['staging'],
  ): void {
    useSessionStore().$patch({
      globalRole,
      isBootstrapAdmin: false,
      assignments,
      projects: [
        {
          id: PROJECT_ID,
          key: 'acme',
          name: 'Acme',
          environments,
          members: [],
        },
      ],
    });
  }

  it('lists per-environment state and marks environments without a definition (FR-41 / FR-7)', async () => {
    signInAs(
      'developer',
      [{ projectId: PROJECT_ID, role: 'developer' }],
      ['staging', 'prod'],
    );
    vi.mocked(api.listFlags).mockResolvedValue({ flags: [ALPHA] });
    vi.mocked(api.listObserved).mockResolvedValue({
      key: 'alpha',
      observed: {},
    });

    const wrapper = mountFlags();
    await flushPromises();

    expect(wrapper.find('[data-testid="flag-key"]').text()).toBe('alpha');
    expect(wrapper.find('[data-testid="flag-version"]').text()).toBe('v4');
    expect(wrapper.find('[data-testid="flag-env-staging"]').text()).toBe('ON');
    expect(wrapper.find('[data-testid="flag-env-prod"]').text()).toBe(
      'Not configured',
    );
  });

  it('shows the sync badge from the observed status without opening the flag (FR-47)', async () => {
    signInAs('developer', [{ projectId: PROJECT_ID, role: 'developer' }]);
    vi.mocked(api.listFlags).mockResolvedValue({ flags: [ALPHA] });
    vi.mocked(api.listObserved).mockResolvedValue({
      key: 'alpha',
      observed: {
        staging: { version: 3, enabled: true, variantType: 'boolean' },
      },
    });

    const wrapper = mountFlags();
    await flushPromises();

    expect(wrapper.find('[data-testid="sync-badge-alpha"]').text()).toBe(
      'Stale · staging v3 ≠ v4',
    );
    expect(
      wrapper.find('[data-env="staging"] [data-testid="env-health"]').text(),
    ).toBe('Stale · 1 flag');
  });

  it('lets a developer add an environment to the project (FR-55 / FR-58)', async () => {
    signInAs('developer', [{ projectId: PROJECT_ID, role: 'developer' }]);
    vi.mocked(api.listFlags).mockResolvedValue({ flags: [] });
    vi.mocked(api.createEnvironment).mockResolvedValue({
      projectId: PROJECT_ID,
      env: 'qa',
    });
    vi.mocked(api.listProjects).mockResolvedValue([
      {
        id: PROJECT_ID,
        key: 'acme',
        name: 'Acme',
        environments: ['staging', 'qa'],
        members: [],
      },
    ]);
    const wrapper = mountFlags();
    await flushPromises();

    await wrapper.find('[data-testid="environment-name"] input').setValue('qa');
    await wrapper.find('form.env-form').trigger('submit');
    await flushPromises();

    expect(api.createEnvironment).toHaveBeenCalledWith(PROJECT_ID, 'qa');
    expect(
      wrapper.find('[data-testid="project-environments"]').text(),
    ).toContain('qa');
  });

  it('rejects an invalid environment name before calling the API', async () => {
    signInAs('developer', [{ projectId: PROJECT_ID, role: 'developer' }]);
    vi.mocked(api.listFlags).mockResolvedValue({ flags: [] });
    const wrapper = mountFlags();
    await flushPromises();

    await wrapper
      .find('[data-testid="environment-name"] input')
      .setValue('QA!');
    await wrapper.find('form.env-form').trigger('submit');
    await flushPromises();

    expect(api.createEnvironment).not.toHaveBeenCalled();
    expect(wrapper.find('[data-testid="environment-error"]').exists()).toBe(
      true,
    );
  });

  it('surfaces a duplicate environment conflict (409)', async () => {
    signInAs('developer', [{ projectId: PROJECT_ID, role: 'developer' }]);
    vi.mocked(api.listFlags).mockResolvedValue({ flags: [] });
    vi.mocked(api.createEnvironment).mockRejectedValue(
      new Error("Environment 'qa' already exists in this project"),
    );
    const wrapper = mountFlags();
    await flushPromises();

    await wrapper.find('[data-testid="environment-name"] input').setValue('qa');
    await wrapper.find('form.env-form').trigger('submit');
    await flushPromises();

    expect(wrapper.find('[data-testid="environment-error"]').text()).toContain(
      'already exists',
    );
  });

  it('offers a product owner neither flag nor environment creation (FR-59)', async () => {
    signInAs('product-owner', [
      { projectId: PROJECT_ID, role: 'product-owner' },
    ]);
    vi.mocked(api.listFlags).mockResolvedValue({ flags: [ALPHA] });
    vi.mocked(api.listObserved).mockResolvedValue({
      key: 'alpha',
      observed: {},
    });

    const wrapper = mountFlags();
    await flushPromises();

    expect(wrapper.find('form.env-form').exists()).toBe(false);
    expect(wrapper.find('[data-testid="flag-new"]').exists()).toBe(false);
    expect(wrapper.text()).toContain(
      'Creating flags requires the admin or developer role.',
    );
    // …but the kill switch stays available: the state pill is a toggle (FR-59).
    expect(wrapper.find('[data-testid="flag-toggle"]').exists()).toBe(true);
  });

  const DEVELOPER = [{ projectId: PROJECT_ID, role: 'developer' }];

  it('summarises each environment: enabled count, missing definitions and health', async () => {
    signInAs('developer', DEVELOPER, ['staging', 'prod']);
    vi.mocked(api.listFlags).mockResolvedValue({
      flags: [ALPHA, { ...ALPHA, key: 'beta', environments: {} }],
    });
    const alphaObserved: Record<string, ObservedEnvironmentStatus> = {
      staging: { version: 4, enabled: true, variantType: 'boolean' },
    };
    vi.mocked(api.listObserved).mockImplementation(async (_project, key) => ({
      key,
      observed: key === 'alpha' ? alphaObserved : {},
    }));

    const wrapper = mountFlags();
    await flushPromises();

    const staging = wrapper.find('[data-env="staging"]');
    expect(staging.find('[data-testid="env-enabled-count"]').text()).toBe(
      '1 of 2 enabled',
    );
    expect(staging.text()).toContain('1 not configured');
    expect(staging.find('[data-testid="env-health"]').text()).toBe('Synced');
    expect(
      wrapper.find('[data-env="prod"] [data-testid="env-health"]').text(),
    ).toBe('Nothing to sync');
  });

  it('filters the list by search text and by enabled state', async () => {
    signInAs('developer', DEVELOPER, ['staging']);
    vi.mocked(api.listFlags).mockResolvedValue({
      flags: [
        ALPHA,
        {
          ...ALPHA,
          key: 'beta',
          description: 'pricing rollout',
          environments: { staging: { enabled: false, variantType: 'boolean' } },
        },
      ],
    });
    vi.mocked(api.listObserved).mockResolvedValue({
      key: 'alpha',
      observed: {},
    });
    const wrapper = mountFlags();
    await flushPromises();
    const keys = () =>
      wrapper.findAll('[data-testid="flag-key"]').map((cell) => cell.text());

    await wrapper.find('[data-testid="flag-search"] input').setValue('pricing');
    expect(keys()).toEqual(['beta']);

    await wrapper.find('[data-testid="flag-search"] input').setValue('');
    byTestId(wrapper, 'flag-filter').vm.$emit('update:value', 'staging');
    await flushPromises();
    expect(keys()).toEqual(['alpha']);

    await wrapper.find('[data-testid="flag-search"] input').setValue('zzz');
    expect(wrapper.text()).toContain('No flag matches these filters');
  });

  it('toggles a flag from the list after confirmation (kill switch)', async () => {
    signInAs('developer', DEVELOPER);
    vi.mocked(api.listFlags).mockResolvedValue({ flags: [ALPHA] });
    vi.mocked(api.listObserved).mockResolvedValue({
      key: 'alpha',
      observed: {},
    });
    vi.mocked(api.getFlag).mockResolvedValue({
      ...ALPHA,
      definitions: {
        staging: {
          enabled: true,
          variants: { on: true, off: false },
          defaultVariant: 'off',
          rules: [],
          updatedAt: ALPHA.updatedAt,
        },
      },
    });
    vi.mocked(api.putDefinition).mockResolvedValue({
      flagKey: 'alpha',
      env: 'staging',
      version: 5,
    });
    const wrapper = mountFlags();
    await flushPromises();
    expect(api.putDefinition).not.toHaveBeenCalled();

    wrapper.findComponent(NPopconfirm).vm.$emit('positive-click');
    await flushPromises();

    expect(api.putDefinition).toHaveBeenCalledWith(
      PROJECT_ID,
      'alpha',
      'staging',
      {
        enabled: false,
        variants: { on: true, off: false },
        defaultVariant: 'off',
        rules: [],
      },
    );
  });

  it('reports a toggle the API rejects', async () => {
    signInAs('developer', DEVELOPER);
    vi.mocked(api.listFlags).mockResolvedValue({ flags: [ALPHA] });
    vi.mocked(api.listObserved).mockResolvedValue({
      key: 'alpha',
      observed: {},
    });
    vi.mocked(api.getFlag).mockRejectedValue(
      new Error('No access to this project'),
    );
    const wrapper = mountFlags();
    await flushPromises();

    wrapper.findComponent(NPopconfirm).vm.$emit('positive-click');
    await flushPromises();

    expect(wrapper.find('[data-testid="toggle-error"]').text()).toContain(
      'No access to this project',
    );
  });

  describe('create flag drawer', () => {
    async function openDrawer() {
      signInAs('developer', DEVELOPER);
      vi.mocked(api.listFlags).mockResolvedValue({ flags: [] });
      const wrapper = mountFlags();
      await flushPromises();
      await wrapper.find('[data-testid="flag-new"]').trigger('click');
      return wrapper;
    }

    it('previews a key from the name and creates the flag, then opens its editor', async () => {
      const wrapper = await openDrawer();
      vi.mocked(api.createFlag).mockResolvedValue({
        ...ALPHA,
        key: 'new-payment-flow',
      });

      await wrapper
        .find('[data-testid="flag-name-input"] input')
        .setValue('New payment flow');
      expect(
        (
          wrapper.find('[data-testid="flag-key-input"] input')
            .element as HTMLInputElement
        ).value,
      ).toBe('new-payment-flow');
      await wrapper
        .find('[data-testid="flag-description-input"] textarea')
        .setValue('Checkout redesign');
      await wrapper.find('[data-testid="dialog"] form').trigger('submit');
      await flushPromises();

      expect(api.createFlag).toHaveBeenCalledWith(
        PROJECT_ID,
        'new-payment-flow',
        'Checkout redesign',
      );
      expect(push).toHaveBeenCalledWith(
        `/projects/${PROJECT_ID}/flags/new-payment-flow`,
      );
    });

    it('keeps a key the user edited when the name changes', async () => {
      const wrapper = await openDrawer();

      await wrapper
        .find('[data-testid="flag-key-input"] input')
        .setValue('custom-key');
      await wrapper
        .find('[data-testid="flag-name-input"] input')
        .setValue('Other name');

      expect(
        (
          wrapper.find('[data-testid="flag-key-input"] input')
            .element as HTMLInputElement
        ).value,
      ).toBe('custom-key');
    });

    it('rejects an invalid key with the shared validator before calling the API', async () => {
      const wrapper = await openDrawer();

      await wrapper
        .find('[data-testid="flag-key-input"] input')
        .setValue('9bad!');
      await wrapper.find('[data-testid="dialog"] form').trigger('submit');
      await flushPromises();

      expect(api.createFlag).not.toHaveBeenCalled();
      expect(wrapper.find('[data-testid="create-problems"]').exists()).toBe(
        true,
      );
    });

    it('keeps the drawer open on a duplicate key (409)', async () => {
      const wrapper = await openDrawer();
      vi.mocked(api.createFlag).mockRejectedValue(
        new Error("Flag 'alpha' already exists"),
      );

      await wrapper
        .find('[data-testid="flag-key-input"] input')
        .setValue('alpha');
      await wrapper.find('[data-testid="dialog"] form').trigger('submit');
      await flushPromises();

      expect(wrapper.find('[data-testid="create-problems"]').text()).toContain(
        'already exists',
      );
      expect(push).not.toHaveBeenCalled();
    });
  });
});
