import { OpenFeature, ServerProviderEvents, type Logger } from '@openfeature/server-sdk';
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

export class FlagdProviderRegistry {
  private readonly states = new Map<string, ProviderRuntimeState>();
  private readonly listeners = new Set<FlagdEventListener>();
  private readonly openFeature: () => typeof OpenFeature;

  constructor(deps: { openFeature?: () => typeof OpenFeature; logger?: Logger } = {}) {
    this.openFeature = deps.openFeature ?? (() => OpenFeature);
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
  getOrCreate(flagSetId: string): Promise<void> {
    if (!this.states.has(flagSetId)) {
      void this.states.set(flagSetId, 'NOT_READY');
    }
    return Promise.resolve();
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
