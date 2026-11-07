import { defineStore } from 'pinia';
import { api, ApiError } from '../api/client';
import { effectiveCapability, type EffectiveRole } from '@fms/shared';
import type { ProjectSummary } from '../api/types';

/** Per-project assignment of the caller (FR-54: global role + per-project membership). */
export interface ProjectAssignment {
  projectId: string;
  role: string;
}

export const useSessionStore = defineStore('session', {
  state: () => ({
    token: null as string | null,
    username: null as string | null,
    globalRole: null as string | null,
    isBootstrapAdmin: false,
    assignments: [] as ProjectAssignment[],
    projects: [] as ProjectSummary[],
    selectedProjectId: null as string | null,
  }),
  getters: {
    isAuthenticated: (state): boolean => state.token !== null,
    isAdmin: (state): boolean =>
      state.isBootstrapAdmin || state.globalRole === 'admin',
  },
  actions: {
    /** Login → session identity + project directory (FR-40/FR-53). Returns false on bad credentials. */
    async login(username: string, password: string): Promise<boolean> {
      try {
        const response = await api.login(username, password);
        this.token = response.token;
        this.username = username;
        const identity = await api.session();
        this.username = identity.username;
        this.globalRole = identity.globalRole;
        this.isBootstrapAdmin = identity.isBootstrapAdmin;
        this.assignments = identity.assignments;
        await this.loadProjects();
        return true;
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          this.token = null;
        }
        return false;
      }
    },
    /** Clear the session (FR-31/FR-40) and drop the selected project. */
    async logout(): Promise<void> {
      try {
        await api.logout();
      } finally {
        this.token = null;
        this.username = null;
        this.globalRole = null;
        this.isBootstrapAdmin = false;
        this.assignments = [];
        this.selectedProjectId = null;
      }
    },
    /** Load the projects visible to the caller; keep the current selection when still valid. */
    async loadProjects(): Promise<void> {
      this.projects = await api.listProjects();
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
