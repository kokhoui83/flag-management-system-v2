import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { api, ApiError } from '../api/client';
import { projectCapabilities, useSessionStore } from './session';

vi.mock('../api/client', () => ({
  api: {
    login: vi.fn(),
    logout: vi.fn(),
    session: vi.fn(),
    listProjects: vi.fn(),
    createEnvironment: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    readonly status: number;
    constructor(status: number) {
      super('request failed');
      this.name = 'ApiError';
      this.status = status;
    }
  },
}));

const DEVELOPER_IDENTITY = {
  username: 'dev-1',
  globalRole: 'developer',
  isBootstrapAdmin: false,
  assignments: [{ projectId: 'proj-1', role: 'developer' }],
};

const PROJECT = {
  id: 'proj-1',
  key: 'acme',
  name: 'Acme',
  environments: ['dev'],
  members: [],
};

describe('session store (FR-40 / FR-53)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.mocked(api.session).mockReset();
    vi.mocked(api.listProjects).mockReset();
    vi.mocked(api.logout).mockReset();
    vi.mocked(api.createEnvironment).mockReset();
  });

  describe('restore', () => {
    it('restores an existing cookie session after a page reload', async () => {
      vi.mocked(api.session).mockResolvedValue(DEVELOPER_IDENTITY);
      vi.mocked(api.listProjects).mockResolvedValue([PROJECT]);
      const session = useSessionStore();

      await session.restore();

      expect(session.isAuthenticated).toBe(true);
      expect(session.username).toBe('dev-1');
      expect(session.projects).toEqual([PROJECT]);
    });

    it('stays signed out when no session cookie is accepted', async () => {
      vi.mocked(api.session).mockRejectedValue(new ApiError(401));
      const session = useSessionStore();

      await session.restore();

      expect(session.isAuthenticated).toBe(false);
      expect(session.username).toBeNull();
    });

    it('asks the server only once per page load', async () => {
      vi.mocked(api.session).mockRejectedValue(new ApiError(401));
      const session = useSessionStore();

      await session.restore();
      await session.restore();

      expect(api.session).toHaveBeenCalledTimes(1);
    });
  });

  it('recognises an invited global admin whose role is stored upper-case', () => {
    const session = useSessionStore();
    session.$patch({ authenticated: true, globalRole: 'ADMIN' });

    expect(session.isAdmin).toBe(true);
  });

  it('lists project environments in promotion order', async () => {
    vi.mocked(api.listProjects).mockResolvedValue([
      { ...PROJECT, environments: ['prod', 'qa', 'staging', 'dev'] },
    ]);
    const session = useSessionStore();

    await session.loadProjects();

    expect(session.projects[0]?.environments).toEqual([
      'dev',
      'staging',
      'prod',
      'qa',
    ]);
  });

  describe('logout', () => {
    it('clears the identity and the project directory', async () => {
      vi.mocked(api.session).mockResolvedValue(DEVELOPER_IDENTITY);
      vi.mocked(api.listProjects).mockResolvedValue([PROJECT]);
      vi.mocked(api.logout).mockResolvedValue(undefined);
      const session = useSessionStore();
      await session.restore();

      await session.logout();

      expect(session.isAuthenticated).toBe(false);
      expect(session.projects).toEqual([]);
      expect(session.assignments).toEqual([]);
    });
  });

  describe('createEnvironment', () => {
    it('creates the environment and reloads the project directory (FR-55)', async () => {
      vi.mocked(api.createEnvironment).mockResolvedValue({
        projectId: 'proj-1',
        env: 'qa',
      });
      vi.mocked(api.listProjects).mockResolvedValue([
        { ...PROJECT, environments: ['dev', 'qa'] },
      ]);
      const session = useSessionStore();

      await session.createEnvironment('proj-1', 'qa');

      expect(api.createEnvironment).toHaveBeenCalledWith('proj-1', 'qa');
      expect(session.projects[0]?.environments).toEqual(['dev', 'qa']);
    });
  });
});

describe('projectCapabilities (capability matrix, FR-54 / FR-58 / FR-59)', () => {
  it('grants a project admin every project-scoped capability', () => {
    expect(projectCapabilities('admin')).toEqual({
      role: 'admin',
      canView: true,
      canToggle: true,
      canEditDefinitions: true,
      canCreateFlags: true,
      canCreateEnvironments: true,
      canDeleteFlags: true,
    });
  });

  it('lets a developer do everything except delete flags', () => {
    const capabilities = projectCapabilities('developer');

    expect(capabilities.canEditDefinitions).toBe(true);
    expect(capabilities.canCreateFlags).toBe(true);
    expect(capabilities.canCreateEnvironments).toBe(true);
    expect(capabilities.canDeleteFlags).toBe(false);
  });

  it('limits a product owner to viewing and toggling', () => {
    const capabilities = projectCapabilities('product-owner');

    expect(capabilities.canView).toBe(true);
    expect(capabilities.canToggle).toBe(true);
    expect(capabilities.canEditDefinitions).toBe(false);
    expect(capabilities.canCreateFlags).toBe(false);
    expect(capabilities.canCreateEnvironments).toBe(false);
    expect(capabilities.canDeleteFlags).toBe(false);
  });

  it('grants nothing without a role on the project', () => {
    const capabilities = projectCapabilities(null);

    expect(capabilities.canView).toBe(false);
    expect(capabilities.canToggle).toBe(false);
  });

  it('resolves the union of global role and project membership per project', () => {
    setActivePinia(createPinia());
    const session = useSessionStore();
    session.$patch({
      authenticated: true,
      globalRole: 'product-owner',
      assignments: [{ projectId: 'proj-1', role: 'admin' }],
    });

    expect(session.capabilitiesFor('proj-1').canDeleteFlags).toBe(true);
    expect(session.capabilitiesFor('proj-2').canView).toBe(false);
  });
});
