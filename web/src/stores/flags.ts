import { defineStore } from 'pinia';
import { api } from '../api/client';
import { validateDefinition, type FlagRule } from '@fms/shared';
import type {
  FlagDefinition,
  FlagDetail,
  FlagSummary,
  ObservedEnvironmentStatus,
} from '../api/types';

/** Live SSE change event shape (FR-51 / ADR-0008). */
export interface FlagChangeEvent {
  projectKey: string;
  env: string;
  flagSetId: string;
  flagKey: string;
  version: number;
  at: string;
}

/**
 * Flag state of the dashboard (FR-41/FR-42/FR-47/FR-52): per-project flag list, the open
 * flag's detail, the flagd-observed version per environment, and the `GET /api/v1/events`
 * subscription that refreshes on `flag-changed` / `provider-ready`.
 */
export const useFlagsStore = defineStore('flags', {
  state: () => ({
    projectId: null as string | null,
    flags: [] as FlagSummary[],
    detail: null as FlagDetail | null,
    detailKey: null as string | null,
    /** flag key → per-environment flagd-observed status (FR-47). */
    observed: {} as Record<string, Record<string, ObservedEnvironmentStatus>>,
  }),
  getters: {
    selectedFlagKey: (state): string | null => state.detailKey,
  },
  actions: {
    async setActiveProject(projectId: string): Promise<void> {
      this.projectId = projectId;
      await this.loadFlags(projectId);
    },
    async loadFlags(projectId?: string): Promise<void> {
      const target = projectId ?? this.projectId;
      if (!target) return;
      this.projectId = target;
      this.flags = (await api.listFlags(target)).flags;
    },
    /** Load one flag's full detail + flagd-observed state for its environments (FR-41/FR-47). */
    async openFlag(key: string): Promise<void> {
      const projectId = this.projectId;
      if (!projectId) return;
      this.detailKey = key;
      this.detail = await api.getFlag(projectId, key);
      this.observed = {
        ...this.observed,
        [key]: (await api.listObserved(projectId, key)).observed,
      };
    },
    async refreshObserved(key: string): Promise<void> {
      const projectId = this.projectId;
      if (!projectId) return;
      this.observed = {
        ...this.observed,
        [key]: (await api.listObserved(projectId, key)).observed,
      };
    },
    /** Full-replace definition put with local pre-submit validation (FR-14 all-at-once). Returns the new flag version. */
    async saveDefinition(
      key: string,
      env: string,
      definition: {
        enabled: boolean;
        variants: Record<string, boolean | number | string>;
        defaultVariant: string;
        rules: FlagRule[];
      },
    ): Promise<number> {
      const detail = this.detail;
      if (!detail) throw new Error('No flag detail loaded');
      const problems = validateDefinition(definition);
      if (problems.length > 0) {
        throw new Error(problems.map((problem) => problem.message).join('; '));
      }
      const result = await api.putDefinition(this.projectId!, key, env, {
        enabled: definition.enabled,
        variants: definition.variants,
        defaultVariant: definition.defaultVariant,
        rules: definition.rules,
      });
      const stored = detail.definitions[env];
      if (!stored)
        throw new Error(`Flag definition for env '${env}' not found`);
      const nextDefinitions: Record<string, FlagDefinition> = {
        ...detail.definitions,
      };
      nextDefinitions[env] = {
        ...stored,
        enabled: definition.enabled,
        updatedAt: new Date().toISOString(),
      };
      this.detail = {
        ...detail,
        version: result.version,
        definitions: nextDefinitions,
      };
      return result.version;
    },
    /** Toggle enablement via the full-replace definition put (FR-42/FR-59). Returns the new flag version. */
    async toggle(
      key: string,
      env: string,
      enabled: boolean,
    ): Promise<number | null> {
      const detail = this.detail;
      const definition = detail?.definitions[env];
      if (!detail || !definition) return null;
      const result = await this.saveDefinition(key, env, {
        enabled,
        variants: definition.variants,
        defaultVariant: definition.defaultVariant,
        rules: definition.rules as FlagRule[],
      });
      return result;
    },
    /** Copy a definition from another environment into the target (FR-9). */
    async copy(key: string, env: string, fromEnv: string): Promise<unknown> {
      return api.copyDefinition(this.projectId!, key, env, fromEnv);
    },
    /** Subscribe to the SSE change stream and refresh local flag state on `flag-changed` (FR-52). */
    connectEvents(): EventSource | null {
      if (typeof EventSource === 'undefined') return null;
      const source = new EventSource('/api/v1/events');
      source.addEventListener('flag-changed', () => {
        void this.onFlagChanged();
      });
      source.addEventListener('provider-ready', () => {
        void this.onProviderReady();
      });
      source.addEventListener('provider-error', () => {
        void this.onProviderError();
      });
      return source;
    },
    disconnectEvents(source: EventSource | null): void {
      source?.close();
    },
    async onFlagChanged(): Promise<void> {
      const key = this.detailKey;
      await this.loadFlags(this.projectId ?? undefined);
      if (key && this.flags.some((flag) => flag.key === key)) {
        await this.openFlag(key);
      } else if (key) {
        // The open flag disappeared (deleted) — drop the stale detail.
        this.detail = null;
        this.detailKey = null;
      }
    },
    async onProviderReady(): Promise<void> {
      const key = this.detailKey;
      if (key) {
        await this.refreshObserved(key);
      }
    },
    async onProviderError(): Promise<void> {
      // Provider errors surface through the sync-health badge / readyz; no local mutation.
    },
  },
});
