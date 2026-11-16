import { defineStore } from 'pinia';
import { api } from '../api/client';
import {
  effectiveCapability,
  normalizeRole,
  type EffectiveRole,
} from '@fms/shared';
import type { ProjectSummary } from '../api/types';
import { orderEnvironments } from '../format';

/** Per-project assignment of the caller (FR-54: global role + per-project membership). */
export interface ProjectAssignment {
  projectId: string;
  role: string;
}

/** What the caller may do on one project — the project-scoped rows of the capability matrix. */
export interface ProjectCapabilities {
  role: EffectiveRole | null;
  canView: boolean;
  canToggle: boolean;
  canEditDefinitions: boolean;
  canCreateFlags: boolean;
  canCreateEnvironments: boolean;
  canDeleteFlags: boolean;
}

/** Project-scoped capability matrix (FR-54/FR-58/FR-59, docs/01-requirements.md §4.9.1). */
export function projectCapabilities(
  role: EffectiveRole | null,
): ProjectCapabilities {
  const canEdit = role === 'admin' || role === 'developer';
  return {
    role,
    canView: role !== null,
    canToggle: role !== null,
    canEditDefinitions: canEdit,
    canCreateFlags: canEdit,
    canCreateEnvironments: canEdit,
    canDeleteFlags: role === 'admin',
  };
}

export const useSessionStore = defineStore('session', {
  state: () => ({
    /** The server accepted the session cookie (the JS-invisible `fms_token`, FR-40). */
    authenticated: false,
    /** One `/auth/session` probe per page load decides whether a cookie session exists. */
    restoreAttempted: false,
    username: null as string | null,
    globalRole: null as string | null,
    isBootstrapAdmin: false,
    assignments: [] as ProjectAssignment[],
    projects: [] as ProjectSummary[],
    selectedProjectId: null as string | null,
  }),
  getters: {
    isAuthenticated: (state): boolean => state.authenticated,
    /** Global admin capability: projects, members, API keys, audit (capability matrix). */
    isAdmin: (state): boolean =>
      state.isBootstrapAdmin || normalizeRole(state.globalRole) === 'admin',
    capabilitiesFor:
      (state) =>
      (projectId: string): ProjectCapabilities =>
        projectCapabilities(
          effectiveRoleFor(state.globalRole, state.assignments, projectId),
        ),
  },
  actions: {
    /** Login → session identity + project directory (FR-40/FR-53). Returns false on failure. */
    async login(username: string, password: string): Promise<boolean> {
      try {
        await api.login(username, password);
        await this.loadIdentity();
        return true;
      } catch {
        this.clear();
        return false;
      }
    },
    /**
     * Re-establish the session from the cookie after a page reload (FR-40). Any failure of the
     * probe means there is no usable session, so the caller stays signed out and sees the login.
     */
    async restore(): Promise<void> {
      if (this.restoreAttempted) return;
      this.restoreAttempted = true;
      try {
        await this.loadIdentity();
      } catch {
        this.clear();
      }
    },
    async loadIdentity(): Promise<void> {
      const identity = await api.session();
      this.username = identity.username;
      this.globalRole = identity.globalRole;
      this.isBootstrapAdmin = identity.isBootstrapAdmin;
      this.assignments = identity.assignments;
      await this.loadProjects();
      this.authenticated = true;
      this.restoreAttempted = true;
    },
    /** Clear the session (FR-40). Local state is dropped even if the server call fails. */
    async logout(): Promise<void> {
      try {
        await api.logout();
      } finally {
        this.clear();
      }
    },
    clear(): void {
      this.authenticated = false;
      this.username = null;
      this.globalRole = null;
      this.isBootstrapAdmin = false;
      this.assignments = [];
      this.projects = [];
      this.selectedProjectId = null;
    },
    /** Load the projects visible to the caller; keep the current selection when still valid. */
    async loadProjects(): Promise<void> {
      this.projects = (await api.listProjects()).map((project) => ({
        ...project,
        environments: orderEnvironments(project.environments),
      }));
      const stillVisible = this.projects.some(
        (project) => project.id === this.selectedProjectId,
      );
      if (!stillVisible) {
        this.selectedProjectId = this.projects[0]?.id ?? null;
      }
    },
    setSelectedProject(projectId: string): void {
      this.selectedProjectId = projectId;
    },
    /** Add an environment to a project (FR-55/FR-58) and refresh the project directory. */
    async createEnvironment(projectId: string, env: string): Promise<void> {
      await api.createEnvironment(projectId, env);
      await this.loadProjects();
    },
  },
});

/** Effective per-project capability of the caller (FR-54 union of global + membership). */
export function effectiveRoleFor(
  globalRole: string | null,
  assignments: ProjectAssignment[],
  projectId: string,
): EffectiveRole | null {
  const membership = assignments.find(
    (assignment) => assignment.projectId === projectId,
  );
  return effectiveCapability(globalRole, membership?.role ?? null);
}
