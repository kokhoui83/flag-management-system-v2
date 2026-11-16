import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises, RouterLinkStub } from '@vue/test-utils';
import { byTestId } from '../test-support';
import { createPinia, setActivePinia } from 'pinia';
import { api } from '../api/client';
import { useSessionStore } from '../stores/session';
import type { ProjectSummary } from '../api/types';
import MembersView from './MembersView.vue';

vi.mock('../api/client', () => ({
  api: { inviteMember: vi.fn(), listProjects: vi.fn() },
  ApiError: class ApiError extends Error {},
}));

const CHECKOUT: ProjectSummary = {
  id: 'proj-1',
  key: 'checkout',
  name: 'Checkout',
  environments: ['dev'],
  members: [{ user: 'dana', role: 'DEVELOPER' }],
};
const BILLING: ProjectSummary = {
  id: 'proj-2',
  key: 'billing',
  name: 'Billing',
  environments: ['dev'],
  members: [{ user: 'dana', role: 'PRODUCT_OWNER' }],
};

const dialogStub = {
  props: ['show', 'title'],
  template: '<section v-if="show" data-testid="dialog"><slot /></section>',
};

function mountMembers() {
  return mount(MembersView, {
    global: { stubs: { AppDialog: dialogStub, RouterLink: RouterLinkStub } },
  });
}

async function openInviteForm() {
  const wrapper = mountMembers();
  await wrapper.find('[data-testid="member-invite-open"]').trigger('click');
  return wrapper;
}

describe('MembersView (FR-57 member invites)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    for (const mock of Object.values(api)) vi.mocked(mock).mockReset();
    useSessionStore().$patch({
      authenticated: true,
      username: 'admin',
      globalRole: 'admin',
      isBootstrapAdmin: true,
      projects: [CHECKOUT, BILLING],
    });
    vi.mocked(api.listProjects).mockResolvedValue([CHECKOUT, BILLING]);
  });

  it('lists members with their role on each project', () => {
    const wrapper = mountMembers();

    const rows = wrapper.findAll('[data-testid="member-row"]');
    expect(rows).toHaveLength(1);
    expect(rows[0]!.text()).toContain('dana');
    expect(rows[0]!.text()).toContain('checkout:developer');
    expect(rows[0]!.text()).toContain('billing:product-owner');
  });

  it('invites a user with a global role and per-project roles, showing the password once', async () => {
    vi.mocked(api.inviteMember).mockResolvedValue({
      user: 'jane',
      role: 'developer',
      projects: [{ projectId: 'proj-1', role: 'developer' }],
      password: 'temp-Secret123',
    });
    const wrapper = await openInviteForm();

    await wrapper
      .find('[data-testid="member-username"] input')
      .setValue('jane');
    byTestId(wrapper, 'member-project-role-checkout').vm.$emit(
      'update:value',
      'developer',
    );
    await wrapper.find('form.invite-form').trigger('submit');
    await flushPromises();

    expect(api.inviteMember).toHaveBeenCalledWith({
      username: 'jane',
      role: 'developer',
      projects: [{ projectId: 'proj-1', role: 'developer' }],
    });
    expect(api.listProjects).toHaveBeenCalled();
    expect(wrapper.find('[data-testid="member-password"]').text()).toBe(
      'temp-Secret123',
    );

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'I have copied the password')!
      .trigger('click');
    expect(wrapper.find('[data-testid="member-password"]').exists()).toBe(
      false,
    );
  });

  it('requires a username and at least one project role', async () => {
    const wrapper = await openInviteForm();

    await wrapper.find('form.invite-form').trigger('submit');
    expect(wrapper.find('[data-testid="member-error"]').text()).toContain(
      'username is required',
    );

    await wrapper
      .find('[data-testid="member-username"] input')
      .setValue('jane');
    await wrapper.find('form.invite-form').trigger('submit');
    expect(wrapper.find('[data-testid="member-error"]').text()).toContain(
      'at least one project',
    );
    expect(api.inviteMember).not.toHaveBeenCalled();
  });

  it('reports an invite the API rejects', async () => {
    vi.mocked(api.inviteMember).mockRejectedValue(
      new Error('Admin capability required'),
    );
    const wrapper = await openInviteForm();
    await wrapper
      .find('[data-testid="member-username"] input')
      .setValue('jane');
    byTestId(wrapper, 'member-project-role-billing').vm.$emit(
      'update:value',
      'admin',
    );

    await wrapper.find('form.invite-form').trigger('submit');
    await flushPromises();

    expect(wrapper.find('[data-testid="member-error"]').text()).toContain(
      'Admin capability required',
    );
    expect(wrapper.find('[data-testid="member-password"]').exists()).toBe(
      false,
    );
  });

  it('never re-shows a previous one-time password when the dialog is reopened', async () => {
    vi.mocked(api.inviteMember).mockResolvedValue({
      user: 'jane',
      role: 'developer',
      projects: [{ projectId: 'proj-1', role: 'developer' }],
      password: 'temp-Secret123',
    });
    const wrapper = await openInviteForm();
    await wrapper
      .find('[data-testid="member-username"] input')
      .setValue('jane');
    byTestId(wrapper, 'member-project-role-checkout').vm.$emit(
      'update:value',
      'developer',
    );
    await wrapper.find('form.invite-form').trigger('submit');
    await flushPromises();
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'I have copied the password')!
      .trigger('click');

    await wrapper.find('[data-testid="member-invite-open"]').trigger('click');

    expect(wrapper.find('[data-testid="member-password"]').exists()).toBe(
      false,
    );
    expect(
      (
        wrapper.find('[data-testid="member-username"] input')
          .element as HTMLInputElement
      ).value,
    ).toBe('');
  });
});
