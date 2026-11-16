import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { api } from '../api/client';
import { useFlagsStore } from './flags';
import type { FlagDetail, FlagSummary } from '../api/types';

vi.mock('../api/client', () => ({
  api: {
    listFlags: vi.fn(),
    getFlag: vi.fn(),
    listObserved: vi.fn(),
    putDefinition: vi.fn(),
    copyDefinition: vi.fn(),
    deleteFlag: vi.fn(),
    createFlag: vi.fn(),
  },
  ApiError: class ApiError extends Error {},
}));

const PROJECT_ID = 'proj-1';

function summary(key: string, version: number): FlagSummary {
  return {
    key,
    description: '',
    version,
    createdAt: '2026-11-07T00:00:00.000Z',
    updatedAt: '2026-11-07T00:00:00.000Z',
    environments: { dev: { enabled: true, variantType: 'boolean' } },
  };
}

function detail(version: number, envs: string[]): FlagDetail {
  return {
    key: 'alpha',
    description: '',
    version,
    createdAt: '2026-11-07T00:00:00.000Z',
    updatedAt: '2026-11-07T00:00:00.000Z',
    definitions: Object.fromEntries(
      envs.map((env) => [
        env,
        {
          enabled: true,
          variants: { on: true, off: false },
          defaultVariant: 'off',
          rules: [],
          updatedAt: '2026-11-07T00:00:00.000Z',
        },
      ]),
    ),
  };
}

const DEFINITION = {
  enabled: true,
  variants: { on: true, off: false },
  defaultVariant: 'off',
  rules: [],
};

/** Minimal EventSource double: records listeners so tests can fire server events. */
class FakeEventSource {
  static instances: FakeEventSource[] = [];
  readonly listeners = new Map<string, () => void>();
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  closed = false;
  constructor(readonly url: string) {
    FakeEventSource.instances.push(this);
  }
  addEventListener(name: string, listener: () => void): void {
    this.listeners.set(name, listener);
  }
  close(): void {
    this.closed = true;
  }
}

describe('flags store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    for (const mock of Object.values(api)) vi.mocked(mock).mockReset();
    FakeEventSource.instances = [];
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('observed status for the flag list (FR-47)', () => {
    it('loads the flagd-observed status of every listed flag', async () => {
      vi.mocked(api.listFlags).mockResolvedValue({
        flags: [summary('alpha', 2), summary('beta', 5)],
      });
      vi.mocked(api.listObserved).mockImplementation(async (_project, key) => ({
        key,
        observed: {
          dev: { version: 2, enabled: true, variantType: 'boolean' },
        },
      }));
      const store = useFlagsStore();

      await store.setActiveProject(PROJECT_ID);

      expect(api.listObserved).toHaveBeenCalledWith(PROJECT_ID, 'alpha');
      expect(api.listObserved).toHaveBeenCalledWith(PROJECT_ID, 'beta');
      expect(store.observed.alpha?.dev?.version).toBe(2);
      expect(store.observed.beta?.dev?.version).toBe(2);
    });

    it('marks a flag as unobserved when the probe fails instead of reporting it synced', async () => {
      vi.mocked(api.listFlags).mockResolvedValue({
        flags: [summary('alpha', 2)],
      });
      vi.mocked(api.listObserved).mockRejectedValue(new Error('flagd down'));
      const store = useFlagsStore();

      await store.setActiveProject(PROJECT_ID);

      expect(store.observed.alpha).toBeUndefined();
      expect(store.observedFailed.alpha).toBe(true);
      expect(store.flags).toHaveLength(1);
    });
  });

  describe('settling after a change (FR-47)', () => {
    const stale = {
      key: 'alpha',
      observed: { dev: { version: 1, enabled: true, variantType: 'boolean' } },
    };
    const synced = {
      key: 'alpha',
      observed: { dev: { version: 2, enabled: true, variantType: 'boolean' } },
    };

    it('re-probes a stale flag until flagd serves the stored version, then stops', async () => {
      vi.useFakeTimers();
      vi.mocked(api.listFlags).mockResolvedValue({
        flags: [summary('alpha', 2)],
      });
      vi.mocked(api.listObserved)
        .mockResolvedValueOnce(stale)
        .mockResolvedValueOnce(stale)
        .mockResolvedValue(synced);
      const store = useFlagsStore();

      await store.setActiveProject(PROJECT_ID);
      expect(store.observed.alpha?.dev?.version).toBe(1);

      await vi.advanceTimersByTimeAsync(60_000);

      expect(store.observed.alpha?.dev?.version).toBe(2);
      expect(api.listObserved).toHaveBeenCalledTimes(3);
      vi.useRealTimers();
    });

    it('gives up after a bounded number of probes when flagd stays behind', async () => {
      vi.useFakeTimers();
      vi.mocked(api.listFlags).mockResolvedValue({
        flags: [summary('alpha', 2)],
      });
      vi.mocked(api.listObserved).mockResolvedValue(stale);
      const store = useFlagsStore();

      await store.setActiveProject(PROJECT_ID);
      await vi.advanceTimersByTimeAsync(600_000);

      expect(store.observed.alpha?.dev?.version).toBe(1);
      expect(vi.mocked(api.listObserved).mock.calls.length).toBeLessThanOrEqual(
        5,
      );
      vi.useRealTimers();
    });

    it('does not re-probe flags that are already synced', async () => {
      vi.useFakeTimers();
      vi.mocked(api.listFlags).mockResolvedValue({
        flags: [summary('alpha', 2)],
      });
      vi.mocked(api.listObserved).mockResolvedValue(synced);
      const store = useFlagsStore();

      await store.setActiveProject(PROJECT_ID);
      await vi.advanceTimersByTimeAsync(60_000);

      expect(api.listObserved).toHaveBeenCalledTimes(1);
      vi.useRealTimers();
    });
  });

  describe('saveDefinition', () => {
    it('creates a definition in an environment that had none (FR-7)', async () => {
      vi.mocked(api.putDefinition).mockResolvedValue({
        flagKey: 'alpha',
        env: 'prod',
        version: 3,
      });
      vi.mocked(api.getFlag).mockResolvedValue(detail(3, ['dev', 'prod']));
      vi.mocked(api.listFlags).mockResolvedValue({
        flags: [summary('alpha', 3)],
      });
      vi.mocked(api.listObserved).mockResolvedValue({
        key: 'alpha',
        observed: {},
      });
      const store = useFlagsStore();
      store.$patch({ projectId: PROJECT_ID, detailKey: 'alpha' });
      store.detail = detail(2, ['dev']);

      const version = await store.saveDefinition('alpha', 'prod', DEFINITION);

      expect(version).toBe(3);
      expect(api.putDefinition).toHaveBeenCalledWith(
        PROJECT_ID,
        'alpha',
        'prod',
        DEFINITION,
      );
      expect(store.detail?.definitions.prod).toBeDefined();
      expect(store.detail?.version).toBe(3);
    });

    it('rejects an invalid definition before calling the API (FR-14)', async () => {
      const store = useFlagsStore();
      store.$patch({ projectId: PROJECT_ID });
      store.detail = detail(2, ['dev']);

      await expect(
        store.saveDefinition('alpha', 'dev', {
          ...DEFINITION,
          defaultVariant: 'maybe',
        }),
      ).rejects.toThrow();
      expect(api.putDefinition).not.toHaveBeenCalled();
    });
  });

  describe('setEnabled (kill switch from the list, FR-59)', () => {
    it('flips enabled and sends every other stored field unchanged', async () => {
      const stored = detail(2, ['dev']);
      stored.definitions.dev!.rules = [
        { type: 'attribute', conditions: [], variant: 'on' },
      ];
      vi.mocked(api.getFlag).mockResolvedValue(stored);
      vi.mocked(api.putDefinition).mockResolvedValue({
        flagKey: 'alpha',
        env: 'dev',
        version: 3,
      });
      vi.mocked(api.listFlags).mockResolvedValue({
        flags: [summary('alpha', 3)],
      });
      vi.mocked(api.listObserved).mockResolvedValue({
        key: 'alpha',
        observed: {
          dev: { version: 3, enabled: false, variantType: 'boolean' },
        },
      });
      const store = useFlagsStore();
      store.$patch({ projectId: PROJECT_ID, flags: [summary('alpha', 2)] });

      const version = await store.setEnabled('alpha', 'dev', false);

      expect(version).toBe(3);
      expect(api.putDefinition).toHaveBeenCalledWith(
        PROJECT_ID,
        'alpha',
        'dev',
        {
          enabled: false,
          variants: { on: true, off: false },
          defaultVariant: 'off',
          rules: [{ type: 'attribute', conditions: [], variant: 'on' }],
        },
      );
      expect(store.flags[0]?.version).toBe(3);
    });

    it('refuses to toggle an environment that has no definition', async () => {
      vi.mocked(api.getFlag).mockResolvedValue(detail(2, ['dev']));
      const store = useFlagsStore();
      store.$patch({ projectId: PROJECT_ID });

      await expect(store.setEnabled('alpha', 'prod', true)).rejects.toThrow(
        "no definition in 'prod'",
      );
      expect(api.putDefinition).not.toHaveBeenCalled();
    });
  });

  describe('createFlag', () => {
    it('creates the flag and reloads the list', async () => {
      vi.mocked(api.createFlag).mockResolvedValue(summary('beta', 1));
      vi.mocked(api.listFlags).mockResolvedValue({
        flags: [summary('beta', 1)],
      });
      const store = useFlagsStore();
      store.$patch({ projectId: PROJECT_ID });

      await store.createFlag('beta', 'second flag');

      expect(api.createFlag).toHaveBeenCalledWith(
        PROJECT_ID,
        'beta',
        'second flag',
      );
      expect(store.flags.map((flag) => flag.key)).toEqual(['beta']);
    });
  });

  describe('deleteFlag', () => {
    it('deletes the flag and drops it from the list and the open detail', async () => {
      vi.mocked(api.deleteFlag).mockResolvedValue(undefined);
      const store = useFlagsStore();
      store.$patch({
        projectId: PROJECT_ID,
        flags: [summary('alpha', 2), summary('beta', 1)],
        detailKey: 'alpha',
      });
      store.detail = detail(2, ['dev']);

      await store.deleteFlag('alpha');

      expect(api.deleteFlag).toHaveBeenCalledWith(PROJECT_ID, 'alpha');
      expect(store.flags.map((flag) => flag.key)).toEqual(['beta']);
      expect(store.detail).toBeNull();
    });
  });

  describe('live events (FR-52)', () => {
    it('reports the connection state of the change stream', () => {
      vi.stubGlobal('EventSource', FakeEventSource);
      const store = useFlagsStore();

      store.connectEvents();
      const source = FakeEventSource.instances[0]!;
      expect(source.url).toBe('/api/v1/events');
      expect(store.liveState).toBe('connecting');

      source.onopen?.();
      expect(store.liveState).toBe('live');

      source.onerror?.();
      expect(store.liveState).toBe('disconnected');
    });

    it('opens a single stream and closes it on disconnect', () => {
      vi.stubGlobal('EventSource', FakeEventSource);
      const store = useFlagsStore();

      store.connectEvents();
      store.connectEvents();
      expect(FakeEventSource.instances).toHaveLength(1);

      store.disconnectEvents();
      expect(FakeEventSource.instances[0]!.closed).toBe(true);
      expect(store.liveState).toBe('disconnected');
    });

    it('refreshes the flag list and its observed status on flag-changed', async () => {
      vi.stubGlobal('EventSource', FakeEventSource);
      vi.mocked(api.listFlags).mockResolvedValue({
        flags: [summary('alpha', 3)],
      });
      vi.mocked(api.listObserved).mockResolvedValue({
        key: 'alpha',
        observed: {
          dev: { version: 3, enabled: true, variantType: 'boolean' },
        },
      });
      const store = useFlagsStore();
      store.$patch({ projectId: PROJECT_ID, flags: [summary('alpha', 2)] });
      store.connectEvents();

      FakeEventSource.instances[0]!.listeners.get('flag-changed')?.();
      await vi.waitFor(() => expect(store.observed.alpha).toBeDefined());

      expect(store.flags[0]?.version).toBe(3);
      expect(store.observed.alpha?.dev?.version).toBe(3);
    });

    it('refreshes observed status for the listed flags on provider-ready', async () => {
      vi.stubGlobal('EventSource', FakeEventSource);
      vi.mocked(api.listObserved).mockResolvedValue({
        key: 'alpha',
        observed: {
          dev: { version: 2, enabled: true, variantType: 'boolean' },
        },
      });
      const store = useFlagsStore();
      store.$patch({ projectId: PROJECT_ID, flags: [summary('alpha', 2)] });
      store.connectEvents();

      FakeEventSource.instances[0]!.listeners.get('provider-ready')?.();
      await vi.waitFor(() => expect(store.observed.alpha).toBeDefined());

      expect(api.listFlags).not.toHaveBeenCalled();
    });
  });
});
