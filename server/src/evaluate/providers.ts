import { OpenFeature, ServerProviderEvents, type Logger } from '@openfeature/server-sdk';
import { FlagdProvider } from '@openfeature/flagd-provider';
import type { ProviderRuntimeState } from './types';

/**
 * Per-(project, environment) flagd provider registry (architecture §2.1, ADR-0004/0008;
 * roadmap M3). One OpenFeature provider is bound per flag-set ID (`<projectKey>:<env>`)
 * with the flagd selector `flagSetId=<projectKey>:<env>`; the registry tracks the runtime
 * state of each flag set and fans state transitions out to listeners (the SSE stream,
 * `readyz`).
 */
export type FlagdProviderEvent =
  | { type: 'provider-ready'; flagSetId: string }
  | { type: 'provider-error'; flagSetId: string }
  | { type: 'provider-stale'; flagSetId: string }
  | { type: 'provider-configuration-changed'; flagSetId: string };

export type FlagdEventListener = (event: FlagdProviderEvent) => void;

function stateForEvent(eventType: string): ProviderRuntimeState | null {
  switch (eventType) {
    case 'PROVIDER_READY':
      return 'READY';
    case 'PROVIDER_ERROR':
      return 'ERROR';
    case 'PROVIDER_STALE':
      return 'STALE';
    default:
      // PROVIDER_CONFIGURATION_CHANGED carries no terminal state; subscribers (the
      // change-event broadcaster) act on it directly.
      return null;
  }
}

function eventTypeOf(eventType: string): FlagdProviderEvent['type'] {
  switch (eventType) {
    case 'PROVIDER_READY':
      return 'provider-ready';
    case 'PROVIDER_ERROR':
      return 'provider-error';
    case 'PROVIDER_STALE':
      return 'provider-stale';
    case 'PROVIDER_CONFIGURATION_CHANGED':
      return 'provider-configuration-changed';
    default:
      return 'provider-configuration-changed';
  }
}

/** Derives the flag-set ID an OpenFeature provider event belongs to (ADR-0004 naming). */
function flagSetIdOf(details: { domain?: string; clientName?: string } | undefined): string | undefined {
  const flagSetId = details?.domain ?? details?.clientName;
  return typeof flagSetId === 'string' && flagSetId.length > 0 ? flagSetId : undefined;
}

/**
 * Connection inputs of the flagd provider behind one (project, environment) flag set
 * (ADR-0004/0008). Defaults mirror the FMS operator configuration (`FLAGD_*`); tests inject
 * their own values.
 */
export interface FlagdProviderBinding {
  host?: string;
  port?: number;
  resolverType?: 'rpc' | 'in-process';
}

export class FlagdProviderRegistry {
  private readonly states = new Map<string, ProviderRuntimeState>();
  private readonly listeners = new Set<FlagdEventListener>();
  private readonly openFeature: () => typeof OpenFeature;
  private readonly materialized = new Set<string>();
  private readonly flagd: FlagdProviderBinding;

  constructor(deps: { openFeature?: () => typeof OpenFeature; logger?: Logger; flagd?: FlagdProviderBinding } = {}) {
    this.openFeature = deps.openFeature ?? (() => OpenFeature);
    this.flagd = deps.flagd ?? {};
    void this.openFeature().addHandler(ServerProviderEvents.Ready, async (details) => {
      this.handleEvent('PROVIDER_READY', details);
    });
    void this.openFeature().addHandler(ServerProviderEvents.Error, async (details) => {
      this.handleEvent('PROVIDER_ERROR', details);
    });
    void this.openFeature().addHandler(ServerProviderEvents.Stale, async (details) => {
      this.handleEvent('PROVIDER_STALE', details);
    });
    void this.openFeature().addHandler(ServerProviderEvents.ConfigurationChanged, async (details) => {
      const flagSetId = flagSetIdOf(details);
      if (!flagSetId) {
        return;
      }
      this.emit({ type: 'provider-configuration-changed', flagSetId });
    });
  }

  getState(flagSetId: string): ProviderRuntimeState {
    return this.states.get(flagSetId) ?? 'NOT_READY';
  }

  getStates(): Record<string, ProviderRuntimeState> {
    const states: Record<string, ProviderRuntimeState> = {};
    for (const [flagSetId, state] of this.states) {
      states[flagSetId] = state;
    }
    return states;
  }

  /** Materializes the flag-set provider binding; starts in the NOT_READY state until the provider reports READY (FR-24). */
  async getOrCreate(flagSetId: string): Promise<void> {
    if (this.materialized.has(flagSetId)) {
      return;
    }
    this.materialized.add(flagSetId);
    // One flagd provider per flag set: bound through the OpenFeature domain of the
    // `<projectKey>:<env>` flag set ID and scoped with the flagd selector
    // (`flagSetId=<projectKey>:<env>`, ADR-0004). Without this registration no provider
    // ever reports READY, so `/readyz` stays not_ready and evaluation returns 503.
    const provider = new FlagdProvider({
      host: this.flagd.host ?? 'localhost',
      port: this.flagd.port ?? 8013,
      resolverType: this.flagd.resolverType ?? 'rpc',
      selector: `flagSetId=${flagSetId}`,
    });
    // Fire-and-forget: the SDK folds lifecycle events into the provider state, so readiness
    // surfaces through the registry event handlers instead of blocking the caller on the dial.
    this.openFeature().setProvider(flagSetId, provider);
  }

  onEvent(listener: FlagdEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async close(): Promise<void> {
    this.listeners.clear();
    return Promise.resolve();
  }

  private handleEvent(eventType: string, details: { domain?: string; clientName?: string } | undefined): void {
    const flagSetId = flagSetIdOf(details);
    const state = flagSetId ? stateForEvent(eventType) : null;
    if (!flagSetId || !state) {
      return;
    }
    this.states.set(flagSetId, state);
    for (const listener of [...this.listeners]) {
      listener({ type: eventTypeOf(eventType), flagSetId });
    }
  }

  private emit(event: FlagdProviderEvent): void {
    for (const listener of [...this.listeners]) {
      listener(event);
    }
  }
}
