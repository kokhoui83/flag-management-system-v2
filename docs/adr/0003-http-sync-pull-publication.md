# ADR-0003 — HTTP sync (pull) as the publication mechanism

**Status:** Accepted

## Context

flagd must receive flag models from FMS. flagd supports: HTTP sync (polling), gRPC sync
(push, requires implementing flagd's sync gRPC service), file sync (shared volume), and
cloud storage sources (S3/GCS/…). Requirements: no shared filesystem (composable,
docker-compose only), no proprietary gRPC service implementation in a v1 Node project,
cheap steady-state operation, authenticated.

## Decision

FMS acts as an **HTTP sync source**: flagd polls `GET /api/v1/sync/:env` (one source per
environment) using flagd's `http` provider with `interval` (default 5 s) and `authHeader`
(carrying a dedicated `sync`-scoped API key).

FMS endpoints:

- serialize the model byte-stably per state (FR-28) and set a strong `ETag`
  (`"fms-" + sha256` of the state-derived body, `generatedAt` excluded);
- answer `If-None-Match` with `304 Not Modified` — steady-state polls transfer no body
  (flagd sends `If-None-Match` automatically);
- emit the full model whenever state changes (next poll ≤ `interval` after the change,
  FR-29).

## Consequences

- + Dead simple: plain GET/JSON; no gRPC codegen, no push infrastructure, trivially
  observable (HTTP logs), trivially testable (curl).
- + Works unchanged if the API ever runs in a container — flagd just points at it.
- + Authenticated with the existing API-key mechanism (FR-27); no new credential surface.
- − At-most-`interval` staleness (≤ 5 s default). Acceptable for feature flags; kill-switch
  latency is bounded and documented (FR-29).
- − Push (gRPC sync) remains the upgrade path for sub-second propagation; the sync endpoint
  contract is unchanged if/when we add it (flagd supports multiple sources per instance).
