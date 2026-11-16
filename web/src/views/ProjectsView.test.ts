import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { api } from '../api/client';
import { useSessionStore } from '../stores/session';
import type { ProjectSummary } from '../api/types';
import ProjectsView from './ProjectsView.vue';

const push = vi.fn();
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }));

vi.mock('../api/client', () => ({
  api: { createProject: vi.fn(), listProjects: vi.fn() },
  ApiError: class ApiError extends Error {},
}));

function project(key: string, name: string): ProjectSummary {
  return {
    id: `id-${key}`,
    key,
    name,
    environments: ['dev', 'staging', 'prod'],
    members: [],
  };
}

const dialogStub = {
  props: ['show', 'title'],
  template: '<section v-if="show" data-testid="dialog"><slot /></section>',
};

function mountProjects() {
  return mount(ProjectsView, { global: { stubs: { AppDialog: dialogStub } } });
}

function signIn(admin: boolean, projects: ProjectSummary[]): void {
  useSessionStore().$patch({
    authenticated: true,
    username: admin ? 'admin' : 'dev',
    globalRole: admin ? 'admin' : 'developer',
    isBootstrapAdmin: admin,
    assignments: admin
      ? []
      : projects.map((entry) => ({ projectId: entry.id, role: 'developer' })),
    projects,
  });
}

describe('ProjectsView (FR-53 / FR-55 project directory)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    push.mockReset();
    for (const mock of Object.values(api)) vi.mocked(mock).mockReset();
  });

  it("shows each project with its key, environments and the caller's role", () => {
    signIn(false, [project('checkout', 'Checkout Web')]);

    const card = mountProjects().find('[data-project="checkout"]');

    expect(card.text()).toContain('Checkout Web');
    expect(card.text()).toContain('checkout');
    for (const env of ['dev', 'staging', 'prod'])
      expect(card.text()).toContain(env);
    expect(card.find('[data-testid="project-role"]').text()).toBe('developer');
  });

  it('filters projects by name or key and reports the count', async () => {
    signIn(true, [
      project('checkout', 'Checkout Web'),
      project('mobile', 'Mobile App'),
    ]);
    const wrapper = mountProjects();
    expect(wrapper.find('[data-testid="project-count"]').text()).toBe(
      '2 projects',
    );

    await wrapper.find('[data-testid="project-search"] input').setValue('mob');

    expect(wrapper.findAll('.project-card')).toHaveLength(1);
    expect(wrapper.find('[data-testid="project-count"]').text()).toBe(
      '1 of 2 projects',
    );

    await wrapper.find('[data-testid="project-search"] input').setValue('zzz');
    expect(wrapper.text()).toContain('No project matches “zzz”');
  });

  it('explains the empty directory per role', () => {
    signIn(false, []);
    expect(mountProjects().text()).toContain(
      'Ask an admin to assign you to a project.',
    );

    signIn(true, []);
    expect(mountProjects().text()).toContain('Create your first project');
  });

  it('offers project creation and access management to admins only (FR-54)', () => {
    signIn(false, [project('checkout', 'Checkout Web')]);
    const wrapper = mountProjects();

    expect(wrapper.find('[data-testid="project-new"]').exists()).toBe(false);
    expect(wrapper.text()).toContain(
      'Creating projects requires the admin role.',
    );
    expect(wrapper.text()).not.toContain('Access');
  });

  it('creates a project from the dialog and reloads the directory', async () => {
    signIn(true, []);
    vi.mocked(api.createProject).mockResolvedValue(
      project('billing', 'Billing'),
    );
    vi.mocked(api.listProjects).mockResolvedValue([
      project('billing', 'Billing'),
    ]);
    const wrapper = mountProjects();

    await wrapper.find('[data-testid="project-new"]').trigger('click');
    await wrapper
      .find('[data-testid="project-name"] input')
      .setValue('Billing');
    await wrapper.find('[data-testid="project-key"] input').setValue('billing');
    await wrapper.find('[data-testid="dialog"] form').trigger('submit');
    await flushPromises();

    expect(api.createProject).toHaveBeenCalledWith('billing', 'Billing');
    expect(wrapper.find('[data-testid="dialog"]').exists()).toBe(false);
    expect(wrapper.find('[data-project="billing"]').exists()).toBe(true);
  });

  it('keeps the dialog open and shows a duplicate conflict (409)', async () => {
    signIn(true, []);
    vi.mocked(api.createProject).mockRejectedValue(
      new Error("Project 'Billing' already exists"),
    );
    const wrapper = mountProjects();

    await wrapper.find('[data-testid="project-new"]').trigger('click');
    await wrapper
      .find('[data-testid="project-name"] input')
      .setValue('Billing');
    await wrapper.find('[data-testid="project-key"] input').setValue('billing');
    await wrapper.find('[data-testid="dialog"] form').trigger('submit');
    await flushPromises();

    expect(wrapper.find('[data-testid="dialog"]').text()).toContain(
      'already exists',
    );
  });
});
