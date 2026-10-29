# ADR-0008 — Flag change events: OpenFeature events + FMS SSE relay

**Status:** Accepted

## Context

Client applications need to react to flag changes (invalidate local caches, log, re-evaluate).
Two mechanisms exist or could exist: (a) OpenFeature's standard event system — the flagd
provider emits `PROVIDER_CONFIGURATION_CHANGED` when flagd applies a new model; (b) an
FMS-native stream for consumers that want FMS as the event source (tooling, dashboard live
updates). A naive (b) — fire the event on DB commit — is up to one sync interval *ahead* of
what flagd actually serves: the event would announce a change that is not yet reflected in
evaluation.

## Decision

Both layers:

1. **Standard path**: document + e2e-test that client apps subscribe to
   `PROVIDER_CONFIGURATION_CHANGED` on their flagd provider (FR-50; latency bounded by one
   sync interval, FR-29). Zero new FMS surface.
2. **FMS SSE**: `GET /api/v1/events` (FR-51), authenticated with an `evaluate`-scoped key or
   a session, optional `?envs=` filter. Events:
   - `flag-changed` — `{"env", "flagKey", "version", "at"}`
   - `provider-ready` / `provider-error` — per-env provider state transitions
   - **Timing semantics**: FMS queues `{flagKey, version, at, auditId}` per environment on
     each committed change; when that environment's provider (already kept per env by
     ADR-0004) emits `PROVIDER_CONFIGURATION_CHANGED`, the queue is drained and events are
     emitted. The event therefore means **"flagd in env is now serving flagKey at version ≥
     N"** — true the moment it is sent, no early window. Several changes coalesced into one
     poll drain as several events; a provider event with an empty queue (e.g. flagd restart
     re-sync) is logged only.
   - Keepalive comment every 15 s; **no replay** in v1 (reconnect = re-subscribe; clients
     reconcile by re-fetching state).
3. **Dashboard** (FR-52) subscribes to the same endpoint via `EventSource` (session cookie)
   for live updates of the flag list and the sync-health badge; API-key consumers use a
   standard SSE client with a Bearer header.

Per-flag payloads (not a document version) because the flagd model has no document-level
version — version is per-flag metadata (FR-5) and the per-flag unit is also strictly more
useful to subscribers.

## Consequences

- + Clients get a standard, zero-FMS-dependency notification path (OpenFeature events) and
  an optional FMS-sourced stream with exact "evaluation changed" semantics.
- + One endpoint serves both the dashboard (live updates) and programmatic tooling.
- + Implementation is small: FMS already keeps per-env provider instances; the broadcaster
  is a per-env queue + SSE fanout.
- − SSE clients must handle reconnect-without-replay (documented; the gap is bridged by
  re-fetching state).
- − One more authenticated surface (mitigated: reuses the existing scope model —
  `evaluate` + session).
