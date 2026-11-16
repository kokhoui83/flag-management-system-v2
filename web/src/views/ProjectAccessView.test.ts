import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { byTestId } from '../test-support';
import { api } from '../api/client';
import { useSessionStore } from '../stores/session';
import ProjectAccessView from './ProjectAccessView.vue';

const push = vi.fn();
vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { projectId: 'proj-1' }, name: 'project-access' }),
  useRouter: () => ({ push }),
}));

vi.mock('../api/client', () => ({
  api: { listMembers: vi.fn(), inviteMember: vi.fn() },
  ApiError: class ApiError extends Error {},
}));

const dialogStub = {
  props: ['show', 'title'],
  template: '<section v-if="show" data-testid="dialog"><slot /></section>',
};

async function mountAccess() {
  const wrapper = mount(ProjectAccessView, {
    global: { stubs: { AppDialog: dialogStub } },
  });
  await flushPromises();
  return wrapper;
}

describe('ProjectAccessView (FR-54 / FR-57 per-project roles)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    for (const mock of Object.values(api)) vi.mocked(mock).mockReset();
    useSessionStore().$patch({
      authenticated: true,
      username: 'admin',
      globalRole: 'admin',
      isBootstrapAdmin: true,
      projects: [
        {
          id: 'proj-1',
          key: 'checkout',
          name: 'Checkout Web',
          environments: ['dev'],
          members: [],
        },
      ],
    });
  });

  it('lists the members of the project with their role on it', async () => {
    vi.mocked(api.listMembers).mockResolvedValue([
      { user: 'dana', role: 'DEVELOPER' },
      { user: 'pat', role: 'PRODUCT_OWNER' },
    ]);

    const wrapper = await mountAccess();

    expect(api.listMembers).toHaveBeenCalledWith('proj-1');
    expect(wrapper.text()).toContain('Checkout Web · access');
    expect(
      wrapper.findAll('[data-testid="access-row"]').map((row) => row.text()),
    ).toEqual(['danadeveloper', 'patproduct-owner']);
  });

  it('explains the access policy and that global admins always have access', async () => {
    vi.mocked(api.listMembers).mockResolvedValue([]);

    const wrapper = await mountAccess();

    expect(wrapper.text()).toContain('Restricted by default');
    expect(wrapper.find('[data-testid="access-empty"]').text()).toContain(
      'Global admins always have access',
    );
  });

  it('adds a member through the invite with this project pre-selected, then reloads', async () => {
    vi.mocked(api.listMembers).mockResolvedValue([]);
    vi.mocked(api.inviteMember).mockResolvedValue({
      user: 'jane',
      role: 'developer',
      projects: [{ projectId: 'proj-1', role: 'developer' }],
      password: 'temp-Secret123',
    });
    const wrapper = await mountAccess();

    await wrapper.find('[data-testid="access-add-member"]').trigger('click');
    expect(
      byTestId(wrapper, 'member-project-role-checkout').props('value'),
    ).toBe('developer');
    await wrapper
      .find('[data-testid="member-username"] input')
      .setValue('jane');
    vi.mocked(api.listMembers).mockResolvedValue([
      { user: 'jane', role: 'DEVELOPER' },
    ]);
    await wrapper.find('form.invite-form').trigger('submit');
    await flushPromises();

    expect(api.inviteMember).toHaveBeenCalledWith({
      username: 'jane',
      role: 'developer',
      projects: [{ projectId: 'proj-1', role: 'developer' }],
    });
    expect(wrapper.find('[data-testid="member-password"]').text()).toBe(
      'temp-Secret123',
    );
    expect(wrapper.find('[data-testid="access-row"]').text()).toContain('jane');
  });

  it('reports a load failure with a retry', async () => {
    vi.mocked(api.listMembers).mockRejectedValue(
      new Error('Admin capability required'),
    );

    const wrapper = await mountAccess();

    expect(wrapper.text()).toContain('Admin capability required');
    expect(wrapper.find('[data-testid="access-empty"]').exists()).toBe(false);
  });
});
