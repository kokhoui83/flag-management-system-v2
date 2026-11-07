import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { nextTick } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { NAlert, NButton, NCard, NForm, NFormItem, NInput } from 'naive-ui';
import { api, ApiError } from '../api/client';
import { useSessionStore } from '../stores/session';
import LoginView from './LoginView.vue';

vi.mock('../api/client', () => ({
  api: {
    login: vi.fn(),
    logout: vi.fn(),
    listProjects: vi.fn().mockResolvedValue({ projects: [] }),
    session: vi.fn().mockResolvedValue({
      username: 'admin',
      globalRole: 'admin',
      isBootstrapAdmin: true,
      assignments: [],
    }),
  },
  ApiError: class ApiError extends Error {
    readonly status: number;
    constructor(status: number) {
      super('auth failed');
      this.name = 'ApiError';
      this.status = status;
    }
  },
}));

describe('LoginView (FR-40 / FR-53 session bootstrap)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.mocked(api.login).mockReset();
  });

  it('submits credentials and enters the dashboard on success', async () => {
    vi.mocked(api.login).mockResolvedValue({
      token: 'tok-123',
      expiresAt: '2026-11-07T15:00:00.000Z',
    });
    const wrapper = mount(LoginView, {
      global: {
        components: { NAlert, NButton, NCard, NForm, NFormItem, NInput },
      } as never,
    });

    const inputs = wrapper.findAll('input');
    await inputs[0]!.setValue('admin');
    await inputs[1]!.setValue('dev-insecure-password');
    await wrapper.find('[data-testid="login-submit"]').trigger('click');
    await flushPromises();

    expect(api.login).toHaveBeenCalledWith('admin', 'dev-insecure-password');
    const session = useSessionStore();
    expect(session.isAuthenticated).toBe(true);
  });

  it('shows an error and stays unauthenticated on bad credentials', async () => {
    vi.mocked(api.login).mockRejectedValue(new ApiError(401));

    const wrapper = mount(LoginView, {
      global: {
        components: { NAlert, NButton, NCard, NForm, NFormItem, NInput },
      } as never,
    });

    const inputs = wrapper.findAll('input');
    await inputs[0]!.setValue('admin');
    await inputs[1]!.setValue('wrong');
    await wrapper.find('[data-testid="login-submit"]').trigger('click');
    await flushPromises();
    await nextTick();
    const alert = wrapper.find('.n-alert');
    expect(alert.exists()).toBe(true);
    expect(alert.attributes('message')).toBe('Invalid username or password');
    expect(useSessionStore().isAuthenticated).toBe(false);
  });
});
