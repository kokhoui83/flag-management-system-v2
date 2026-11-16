import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises, RouterLinkStub } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { api } from '../api/client';
import { useFlagsStore } from '../stores/flags';
import { useSessionStore } from '../stores/session';
import AppShell from './AppShell.vue';

const push = vi.fn();
const route = {
  name: 'projects' as string,
  fullPath: '/projects',
  params: {} as Record<string, string>,
};
vi.mock('vue-router', () => ({
  useRouter: () => ({ push }),
  useRoute: () => route,
}));

vi.mock('../api/client', () => ({
  api: { logout: vi.fn() },
  ApiError: class ApiError extends Error {},
}));

function mountShell() {
  return mount(AppShell, {
    global: { stubs: { RouterLink: RouterLinkStub } },
    slots: { default: '<p>page</p>' },
  });
}

function signIn(globalRole: string, isBootstrapAdmin = false): void {
  useSessionStore().$patch({
    authenticated: true,
    username: 'pat',
    globalRole,
    isBootstrapAdmin,
  });
}

function navLabels(wrapper: ReturnType<typeof mountShell>): string[] {
  return wrapper.findAllComponents(RouterLinkStub).map((link) => link.text());
}

describe('AppShell (navigation, logout, live stream)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    push.mockReset();
    vi.mocked(api.logout).mockReset();
    route.name = 'projects';
    route.fullPath = '/projects';
    route.params = {};
  });

  it('offers the admin-only surfaces to a global admin', () => {
    signIn('admin', true);

    expect(navLabels(mountShell())).toEqual([
      'Projects',
      'Playground',
      'API keys',
      'Audit log',
      'Members',
      'Roles & permissions',
      'User guide',
    ]);
  });

  it('hides the admin-only surfaces from a developer (FR-54)', () => {
    signIn('DEVELOPER');

    const wrapper = mountShell();

    expect(navLabels(wrapper)).toEqual([
      'Projects',
      'Playground',
      'User guide',
    ]);
    const identity = wrapper.find('[data-testid="session-user"]').text();
    expect(identity).toContain('pat');
    expect(identity).toContain('developer');
  });

  it('signs out, closes the live stream and returns to the login view (FR-40)', async () => {
    signIn('admin', true);
    vi.mocked(api.logout).mockResolvedValue(undefined);
    const flags = useFlagsStore();
    const disconnect = vi.spyOn(flags, 'disconnectEvents');
    const wrapper = mountShell();

    await wrapper.find('[data-testid="logout"]').trigger('click');
    await flushPromises();

    expect(api.logout).toHaveBeenCalled();
    expect(disconnect).toHaveBeenCalled();
    expect(useSessionStore().isAuthenticated).toBe(false);
    expect(push).toHaveBeenCalledWith('/login');
  });

  it('starts the live change stream while the shell is shown (FR-52)', () => {
    signIn('admin', true);
    const flags = useFlagsStore();
    const connect = vi.spyOn(flags, 'connectEvents').mockImplementation(() => {
      flags.liveState = 'live';
    });

    const wrapper = mountShell();

    expect(connect).toHaveBeenCalled();
    return wrapper.vm.$nextTick().then(() => {
      expect(wrapper.find('[data-testid="live-pill"]').text()).toContain(
        'Live',
      );
    });
  });

  it('shows where the user is as a breadcrumb: project and flag', () => {
    signIn('admin', true);
    useSessionStore().$patch({
      projects: [
        {
          id: 'p1',
          key: 'checkout',
          name: 'Checkout Web',
          environments: [],
          members: [],
        },
      ],
    });
    route.name = 'flag-editor';
    route.fullPath = '/projects/p1/flags/new-payment-flow';
    route.params = { projectId: 'p1', flagKey: 'new-payment-flow' };

    const wrapper = mountShell();

    const crumbs = wrapper
      .findAll('nav[aria-label="Breadcrumb"] li')
      .map((item) => item.text());
    expect(crumbs).toEqual(['Projects', 'Checkout Web', 'new-payment-flow']);
    expect(
      wrapper.find('nav[aria-label="Breadcrumb"] [aria-current="page"]').text(),
    ).toBe('new-payment-flow');
  });

  it('opens the navigation as an off-canvas menu and closes it again', async () => {
    signIn('admin', true);
    const wrapper = mountShell();
    const toggle = wrapper.find('[data-testid="rail-toggle"]');
    expect(toggle.attributes('aria-expanded')).toBe('false');

    await toggle.trigger('click');
    expect(toggle.attributes('aria-expanded')).toBe('true');
    expect(wrapper.find('#app-rail').classes()).toContain('app-rail--open');

    await wrapper.find('[data-testid="rail-backdrop"]').trigger('click');
    expect(wrapper.find('#app-rail').classes()).not.toContain('app-rail--open');
  });

  it('closes the off-canvas menu on Escape, wherever the focus is', async () => {
    signIn('admin', true);
    const wrapper = mountShell();
    await wrapper.find('[data-testid="rail-toggle"]').trigger('click');
    expect(wrapper.find('#app-rail').classes()).toContain('app-rail--open');

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await wrapper.vm.$nextTick();

    expect(wrapper.find('#app-rail').classes()).not.toContain('app-rail--open');
  });
});
