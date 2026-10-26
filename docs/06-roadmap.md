# 06 — Roadmap

Milestones are ordered so each one leaves the system in a runnable, tested state. Every
milestone is TDD-shaped per [05-testing.md](05-testing.md): the behavior specs for a milestone
are written (failing) before its implementation. Acceptance criteria reference
[01-requirements.md](01-requirements.md) (`FR-n`, `NFR-n`).

> Scope note: M1–M5 deliver v1 as specified. Items marked *v1.1* are explicitly deferred and
> do not block "done".

---

## M0 — Skeleton & tooling

**Goal:** empty-but-alive project: types build, tests run, flagd runs locally.

- Repo tooling: TypeScript (strict, ESM), vitest, ESLint+Prettier, `npm run dev` (tsx
  watch), `typecheck`, `test`, `test:e2e`, `lint`.
- `docker-compose.yml` with flagd (pinned image tag), `flagd/config.yaml` (3 HTTP sources
  pointing at `http://localhost:3000/api/v1/sync/<env>`, `authHeader` placeholder, `interval: 5`).
- Fastify app with `/healthz`; `/readyz` returning `503 {"status":"not_ready"}` until
  provider wiring exists (M3) — declared not-ready by default in M0.
- `config.ts` env parsing with defaults (architecture §9).
- Empty SQLite init (WAL) + schema migration runner with `schema.sql` applied.

**Acceptance**
- [ ] `npm test` green (config parsing + health route tests, TDD).
- [ ] `docker compose up -d` starts flagd; `docker compose down` clean.
- [ ] App boots, `/healthz` 200, shuts down cleanly on SIGTERM.
- [ ] Docs: this roadmap updated; README "Getting started" reflects M0 reality.

---

## M1 — Flags & definitions core (system of record)

**Goal:** flags/definitions CRUD + versioning + audit, fully tested without flagd.

- Domain: flag key validation (FR-1), definition validation all-at-once (FR-10–FR-18),
  rule model per [03-data-model.md §2](03-data-model.md).
- Store: `flags`, `flag_definitions`, `audit_logs`, `api_keys` (schema per
  [03-data-model.md §1](03-data-model.md)); transactions for mutation + audit (FR-39).
- Routes: auth (login/logout, JWT, cookie — FR-30/FR-31), flags CRUD (FR-2–FR-5),
  definition `PUT` (FR-14), `copy` (FR-9), audit read (FR-38).
- API keys: create/list/revoke, hashing, scopes (FR-32–FR-34).
- OpenAPI document published at `/api/v1/openapi.json` (decide glue library vs. hand-maintained;
  document the choice in the M1 wrap-up note).
- Audit actions per [03-data-model.md §5](03-data-model.md).

**Acceptance**
- [ ] All [05-testing.md §2.1, §2.4, §2.5](05-testing.md) scenarios green (written first).
- [ ] Version bump semantics verified: create=1, per-env update +1, idempotent put no-op
      (FR-5).
- [ ] `npm test` + `typecheck` + `lint` green; no Docker required.

---

## M2 — Model compilation & sync endpoint

**Goal:** FMS becomes a valid flagd HTTP source (with no client consuming it yet).

- `domain/flagd-model.ts`: compiler per [03-data-model.md §3](03-data-model.md) —
  JSONLogic emission, op mapping, `fractional` (no bucketing expr), nested `if` chains,
  flag-level `metadata.version`, set-level `metadata.flagSetId`.
- Stable serialization + ETag (state-hash, `generatedAt` excluded) (FR-26/FR-28).
- `GET /api/v1/sync/:env` with `sync` scope + `If-None-Match` → `304` (FR-26/FR-27).
- Vendor the official flagd JSON schema into `test/fixtures/schema/` + refresh script;
  contract tests validate every emitted document (NFR-9).
- Golden-file tests for the compiler (fixtures committed).

**Acceptance**
- [ ] All [05-testing.md §2.2](05-testing.md) scenarios green.
- [ ] Manual: with flagd from M0 pointed at the endpoint, `curl` of a flagd evaluation
      (HTTP on 8013) returns the expected variant for a hand-created flag (smoke, not a
      committed test until M3).
- [ ] 304 behavior verified against flagd's actual polling (logs/metrics or curl replay).

---

## M3 — Evaluation path (OpenFeature + flagd)

**Goal:** `/api/v1/evaluate` works end-to-end against real flagd; readiness reflects
provider state.

- `FlagEvaluator` interface + OpenFeature implementation (per-env `FlagdProvider` registry,
  `selector: "flagSetId=<env>"`, gRPC `rpc` mode) (FR-21/FR-25, architecture §2.1/§4).
- Provider state tracking → `readyz` (architecture §7); 503 policy (FR-24).
- `POST /api/v1/evaluate` (typed dispatch from stored variant type; `flagVersion` from flag
  metadata) (FR-22/FR-23).
- E2E harness: vitest + compose (flagd), ready-wait helper, deterministic scenarios per
  [05-testing.md §2.3](05-testing.md) (stickiness, propagation, 304, flagd-down 503,
  flagd-restart recovery).
- Seed: on first boot with an empty DB, log the `SYNC_KEY` once (architecture §9) so the
  operator can wire `flagd/config.yaml`.

**Acceptance**
- [ ] All [05-testing.md §2.3](05-testing.md) E2E scenarios green via `npm run test:e2e`.
- [ ] NFR-1 latency: local `/evaluate` p99 < 25 ms measured in E2E (1,000 calls, logged).
- [ ] `readyz` transitions observed: READY → (flagd stopped) ERROR → (flagd restarted) READY.

---

## M4 — Dashboard

**Goal:** the full operator surface in the browser (FR-40–FR-47).

- Static SPA (vanilla TS, hash router) served from the API; cookie auth; login view.
- Flag list (per-env status, version); flag editor: env tabs, enable toggle, variant table
  (name/value/type), default variant, ordered rule editor (attribute conditions + percentage
  splits; add/remove/reorder), all-at-once error display (FR-14 UX).
- Copy-from-env control (FR-9 UX).
- Evaluate playground: flag + env picker, targetingKey (required for flags with a percentage
  rule — FR-19 UX), context JSON editor, result display incl. reason + `flagVersion`
  (FR-44).
- API keys view (create shows plaintext once; revoke) (FR-45).
- Audit view (pagination, filters, before/after diff) (FR-46).
- Sync health badge per env: stored version vs. observed `flagVersion` (FR-47).

**Acceptance**
- [ ] Every FR-40–FR-47 exercisable in the UI; manual checklist committed to the M4 note.
- [ ] No dashboard JS beyond rendering/fetch; pure logic (local pre-validation, diff view)
      unit-tested where it exists.
- [ ] Lighthouse-free sanity: loads < 100 KB static (no framework) — recorded in M4 note.

---

## M5 — Hardening & documentation

**Goal:** v1 is operationally trustworthy and documented.

- Structured logging polish (request ids, actor, audit correlation) (NFR-7).
- Body size limits, error hygiene pass (no stack leaks), production-mode guardrails
  (refuse insecure defaults, architecture §6).
- Runbook: backup/restore (SQLite), key rotation, flagd upgrade procedure (coordinated
  provider bump — fractional hashing ADR note), compose file walkthrough.
- Client integration guide (OpenFeature SDK + flagd provider, per-env selector, browser
  proxy pattern) in `docs/client-integration.md` (FR-25 documentation).
- `docker-compose.yml` final form (pinned image, healthcheck, env-driven sync key).
- Full docs pass: requirements/architecture/api/data-model remain accurate; open questions
  resolved or re-scoped (01 §7).

**Acceptance**
- [ ] `npm test` + `npm run test:e2e` green; `typecheck`/`lint` green.
- [ ] Runbook steps executed once on a clean machine (documented evidence in M5 note).
- [ ] All `FR-n`/`NFR-n` marked with a pointer to the test(s) proving them (audit trail in
      the M5 wrap-up).

---

## Deferred (v1.1 candidates)

- Optimistic locking (`If-Match` on flag version) for concurrent edits.
- "Advanced JSONLogic" escape hatch for power users (OQ-4).
- Scheduled rollouts via `$flagd.timestamp` (OQ-3).
- Container image for the management API; TLS guidance; Postgres backend (OQ-5).
- Browser-side evaluation pattern hardening (OQ-2).
- Rate limiting + Prometheus wiring of flagd metrics.
