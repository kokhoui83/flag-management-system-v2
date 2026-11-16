import { markRaw } from 'vue';
import { defineStore } from 'pinia';
import { api } from '../api/client';
import { validateDefinition, type FlagDefinitionInput } from '@fms/shared';
import type {
  FlagDetail,
  FlagSummary,
  ObservedEnvironmentStatus,
} from '../api/types';

/** Connection state of the `GET /api/v1/events` change stream (FR-52). */
export type LiveState = 'idle' | 'connecting' | 'live' | 'disconnected';

/** Thrown by `saveDefinition` when the shared pre-submit validation finds problems (FR-14). */
export class DefinitionValidationError extends Error {
  readonly problems: Array<{ pointer: string; message: string }>;

  constructor(problems: Array<{ pointer: string; message: string }>) {
    super(problems.map((problem) => problem.message).join('; '));
    this.name = 'DefinitionValidationError';
    this.problems = problems;
  }
}

/**
 * Follow-up probe delays after a change. flagd polls its sources, so right after a save it
 * still serves the previous version; the live stream announces the change once flagd applies
 * it, and these few bounded probes cover the acting client if that event is missed.
 */
const SETTLE_DELAYS_MS = [1000, 2000, 4000, 8000];

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withoutKey<T>(
  record: Record<string, T>,
  key: string,
): Record<string, T> {
  return Object.fromEntries(
    Object.entries(record).filter(([candidate]) => candidate !== key),
  );
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
    /**
     * flag key → per-environment flagd-observed status (FR-47). A flag without an entry has
     * not been observed (probe pending or failed) and must not be presented as synced.
     */
    observed: {} as Record<string, Record<string, ObservedEnvironmentStatus>>,
    /** Flags whose last probe failed (flagd unreachable): shown as unavailable, not synced. */
    observedFailed: {} as Record<string, true>,
    liveState: 'idle' as LiveState,
    eventSource: null as EventSource | null,
  }),
  getters: {
    selectedFlagKey: (state): string | null => state.detailKey,
  },
  actions: {
    async setActiveProject(projectId: string): Promise<void> {
      if (this.projectId !== projectId) {
        this.flags = [];
        this.observed = {};
        this.observedFailed = {};
        this.detail = null;
        this.detailKey = null;
      }
      this.projectId = projectId;
      await this.loadFlags(projectId);
      await this.refreshObservedForList();
    },
    /** flagd serves the stored version of the flag in every environment that has a definition. */
    isSynced(key: string): boolean {
      const flag = this.flags.find((candidate) => candidate.key === key);
      const observed = this.observed[key];
      if (!flag || !observed) return false;
      return Object.keys(flag.environments).every(
        (env) => observed[env]?.version === flag.version,
      );
    },
    /**
     * Bounded follow-up probes for listed flags flagd does not serve yet: a few retries with
     * growing delays, stopping as soon as everything is synced or the project changes.
     */
    async settleObserved(): Promise<void> {
      const projectId = this.projectId;
      for (const delay of SETTLE_DELAYS_MS) {
        const pending = this.flags.filter((flag) => !this.isSynced(flag.key));
        if (pending.length === 0) return;
        await wait(delay);
        if (this.projectId !== projectId) return;
        await Promise.all(
          pending.map((flag) => this.refreshObserved(flag.key)),
        );
      }
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
      await this.refreshObserved(key);
    },
    /**
     * Probe the flagd-observed status of one flag. A failed probe (flagd unreachable, flag
     * gone) clears the entry: the badge then reports "unknown" rather than a stale success.
     */
    async refreshObserved(key: string): Promise<void> {
      const projectId = this.projectId;
      if (!projectId) return;
      try {
        const { observed } = await api.listObserved(projectId, key);
        this.observed = { ...this.observed, [key]: observed };
        this.observedFailed = withoutKey(this.observedFailed, key);
      } catch {
        this.observed = withoutKey(this.observed, key);
        this.observedFailed = { ...this.observedFailed, [key]: true };
      }
    },
    /** Probe every listed flag so list badges work without opening each flag (FR-47). */
    async refreshObservedForList(): Promise<void> {
      await Promise.all(
        this.flags.map((flag) => this.refreshObserved(flag.key)),
      );
      void this.settleObserved();
    },
    /**
     * Full-replace definition put with the shared pre-submit validation (FR-14 all-at-once).
     * Works for environments with and without a stored definition (FR-7). Returns the new
     * flag version.
     */
    async saveDefinition(
      key: string,
      env: string,
      definition: FlagDefinitionInput,
    ): Promise<number> {
      const projectId = this.projectId;
      if (!projectId) throw new Error('No active project');
      const problems = validateDefinition(definition);
      if (problems.length > 0) throw new DefinitionValidationError(problems);
      const result = await api.putDefinition(projectId, key, env, {
        enabled: definition.enabled,
        variants: definition.variants,
        defaultVariant: definition.defaultVariant,
        rules: definition.rules,
      });
      await this.reloadAfterChange(key);
      return result.version;
    },
    /** Copy a definition from another environment into the target (FR-9). */
    async copy(key: string, env: string, fromEnv: string): Promise<number> {
      const projectId = this.projectId;
      if (!projectId) throw new Error('No active project');
      const result = await api.copyDefinition(projectId, key, env, fromEnv);
      await this.reloadAfterChange(key);
      return result.version;
    },
    async reloadAfterChange(key: string): Promise<void> {
      const projectId = this.projectId;
      if (!projectId) return;
      this.detailKey = key;
      this.detail = await api.getFlag(projectId, key);
      await this.loadFlags(projectId);
      await this.refreshObserved(key);
      void this.settleObserved();
    },
    /** Create a flag in the active project; its environments start without definitions (FR-7). */
    async createFlag(key: string, description: string): Promise<void> {
      const projectId = this.projectId;
      if (!projectId) throw new Error('No active project');
      await api.createFlag(projectId, key, description);
      await this.loadFlags(projectId);
    },
    /**
     * Flip `enabled` of an existing definition and leave every other field as stored — the
     * kill-switch path from the flag list, allowed for every project role (FR-59).
     */
    async setEnabled(
      key: string,
      env: string,
      enabled: boolean,
    ): Promise<number> {
      const projectId = this.projectId;
      if (!projectId) throw new Error('No active project');
      const stored = (await api.getFlag(projectId, key)).definitions[env];
      if (!stored) {
        throw new Error(`Flag '${key}' has no definition in '${env}' yet`);
      }
      const result = await api.putDefinition(projectId, key, env, {
        enabled,
        variants: stored.variants,
        defaultVariant: stored.defaultVariant,
        rules: stored.rules,
      });
      await this.loadFlags(projectId);
      if (this.detailKey === key) {
        this.detail = await api.getFlag(projectId, key);
      }
      await this.refreshObserved(key);
      void this.settleObserved();
      return result.version;
    },
    /** Update the flag description (admin/developer capability). */
    async updateDescription(key: string, description: string): Promise<void> {
      const projectId = this.projectId;
      if (!projectId) throw new Error('No active project');
      await api.updateFlagDescription(projectId, key, description);
      await this.reloadAfterChange(key);
    },
    /** Delete a flag (project-scoped admin capability) and drop it from local state. */
    async deleteFlag(key: string): Promise<void> {
      const projectId = this.projectId;
      if (!projectId) throw new Error('No active project');
      await api.deleteFlag(projectId, key);
      this.flags = this.flags.filter((flag) => flag.key !== key);
      this.observed = withoutKey(this.observed, key);
      this.observedFailed = withoutKey(this.observedFailed, key);
      if (this.detailKey === key) {
        this.detail = null;
        this.detailKey = null;
      }
    },
    /** Subscribe once to the SSE change stream; refresh local state on change events (FR-52). */
    connectEvents(): void {
      if (this.eventSource || typeof EventSource === 'undefined') return;
      const source = new EventSource('/api/v1/events');
      this.liveState = 'connecting';
      source.onopen = () => {
        this.liveState = 'live';
      };
      // EventSource reconnects on its own; until it does, the stream is not live.
      source.onerror = () => {
        this.liveState = 'disconnected';
      };
      source.addEventListener('flag-changed', () => {
        void this.onFlagChanged();
      });
      source.addEventListener('provider-ready', () => {
        void this.onProviderReady();
      });
      source.addEventListener('provider-error', () => {
        void this.onProviderReady();
      });
      this.eventSource = markRaw(source);
    },
    disconnectEvents(): void {
      this.eventSource?.close();
      this.eventSource = null;
      this.liveState = 'disconnected';
    },
    async onFlagChanged(): Promise<void> {
      if (!this.projectId) return;
      const key = this.detailKey;
      await this.loadFlags(this.projectId);
      if (key && this.flags.some((flag) => flag.key === key)) {
        this.detail = await api.getFlag(this.projectId, key);
      } else if (key) {
        // The open flag disappeared (deleted) — drop the stale detail.
        this.detail = null;
        this.detailKey = null;
      }
      await this.refreshObservedForList();
    },
    /** Provider state changed (ready or error): re-probe what flagd actually serves. */
    async onProviderReady(): Promise<void> {
      if (!this.projectId) return;
      await this.refreshObservedForList();
    },
  },
});
