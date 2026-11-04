# 06 — Roadmap

Milestones are ordered so each one leaves the system in a runnable, tested state. Every
milestone is TDD-shaped per [05-testing.md](05-testing.md): the behavior specs for a milestone
are written (failing) before its implementation. Acceptance criteria reference
[01-requirements.md](01-requirements.md) (`FR-n`, `NFR-n`).

> Scope note: M1–M5 deliver v1 as specified. Items marked *v1.1* are explicitly deferred and
> do not block "done".

Requirement coverage by milestone (details in [01-requirements.md](01-requirements.md)):

| Milestone | Functional requirements | Non-functional requirements |
| --- | --- | --- |
| M0 | — (tooling) | NFR-6 (portability baseline), NFR-7 (health endpoints), NFR-8 (test seams) |
| M1 | FR-1–FR-20, FR-30–FR-39, FR-53–FR-59 (API; partial — see M1 follow-up) | NFR-5 (password/key hashing), NFR-8 |
| M2 | FR-26–FR-29 | NFR-1 (sync latency), NFR-9 |
| M3 | FR-21–FR-25, FR-50–FR-51 | NFR-1 (evaluate latency), NFR-3, NFR-7 (readiness) |
| M4 | FR-40–FR-47, FR-52, FR-53–FR-59 (UI) | NFR-7 (sync-health badge) |
| M5 | FR-25 (client guide) | NFR-1–NFR-9 verification, NFR-9 (OpenAPI completeness) |

---

## M0 — Skeleton & tooling

**Goal:** empty-but-alive project: types build, tests run, flagd runs locally.

- Repo tooling: npm workspaces (`server`, `web`, `shared`); TypeScript (strict, ESM),
  vitest, ESLint+Prettier, `npm run dev` (tsx watch), `typecheck`, `test`,
  `test:integration`, `test:e2e`, `lint`, `build:web`, `dev:web`.
- `docker-compose.yml` with flagd (pinned image tag) + mariadb (pinned `mariadb:11.8`, named
  volume, `healthcheck.sh --connect` healthcheck, localhost-only 3306), `flagd/config.yaml`
  (HTTP sources pointing at `http://host.docker.internal:3000/api/v1/sync/…`, development
  `authHeader` placeholder, `interval: 5`). The source layout (one per env vs. one per
  project+env) and the sync URL shape are provisional at M0 and settle with OQ-6 before M2
  (see the M2 prerequisite).
- Fastify app with `/healthz`; `/readyz` returning `503 {"status":"not_ready"}` until
  provider wiring exists (M3) — declared not-ready by default in M0.
- `config.ts` env parsing with defaults (architecture §9), incl. `DATABASE_URL`.
- Prisma client (`DATABASE_URL`) + `prisma migrate deploy` applied at boot; the initial
  migration creates the schema via Prisma
  (`prisma/migrations/<timestamp>_init/migration.sql`, [03-data-model.md §1](03-data-model.md)).
- `web/` scaffolded (Vite + Vue 3 + TS + Naive UI + vue-router hash mode + Pinia) with a
  placeholder view; `npm run build:web` produces `web/dist` served at `/`; `npm run dev:web`
  runs the dev server with an `/api` proxy.

**Acceptance**
- [x] `npm test` green (config parsing + health route tests, TDD).
- [x] `docker compose up -d` starts flagd + mariadb (mariadb healthcheck green; flagd starts
      via `start --config` and serves gRPC on 8013); `docker compose down` clean. (mariadb
      healthcheck green verified; flagd re-verified 2026-11-04 once the management API serves
      the sync source in M2.)
- [x] App boots, `/healthz` 200, shuts down cleanly on SIGTERM.
- [x] Docs: this roadmap updated; README "Getting started" reflects M0 reality.

---

## M1 — Flags & definitions core (system of record)

**Goal:** flags/definitions CRUD + versioning + audit, fully tested without flagd.

**Status:** baseline complete (2026-11-03); the capability-matrix and audit-actor items in the
M1 follow-up below are still open, so M1 is not fully closed.

- Domain: flag key validation (FR-1), definition validation all-at-once (FR-10–FR-18),
  rule model per [03-data-model.md §2](03-data-model.md), plus the §1 invariants
  (project name/key uniqueness FR-55, per-project flag-key uniqueness FR-56, per-project
  env validation, effective permission union FR-54, version bumping).
- Store (async, Prisma over the compose MariaDB): `flags`, `flag_definitions`, `audit_logs`,
  `api_keys`, `users`, `projects`, `project_environments`, `project_memberships` (schema per
  [03-data-model.md §1](03-data-model.md)); per-connection transactions for mutation + audit
  (FR-39); store tests on testcontainers.
- Routes: auth (login/logout, JWT, cookie — FR-30/FR-31), projects — create/list,
  per-project environments, member invite + list ([04-api.md §13](04-api.md); FR-55, FR-57,
  FR-58), project-scoped flag routes ([04-api.md §14](04-api.md); FR-56): flags CRUD
  (FR-2–FR-5), definition `PUT` (FR-14), `copy` (FR-9), audit read (FR-38). The definition
  `PUT` is also the toggle path; a product-owner update is accepted only when `enabled` is
  the sole change (FR-59).
- Multi-user auth: bootstrap admin from env (FR-30); invited users stored in `users` with a
  one-time temporary password (argon2id hash only, FR-57); sessions resolve to the
  capability level of role + project assignment (FR-53/FR-54); operations on unassigned
  projects fail with 403 (FR-58/FR-59).
- API keys: create/list/revoke, hashing, scopes (FR-32–FR-34).
- OpenAPI document published at `/api/v1/openapi.json` (decide glue library vs. hand-maintained;
  document the choice in the M1 wrap-up note).
- Audit actions per [03-data-model.md §5](03-data-model.md).

**Acceptance**
- [x] Baseline M1 scenarios in [05-testing.md §2.1, §2.4, §2.5](05-testing.md) green (written
      first): validation (§2.1); auth/audit/API-key/revocation/invite (§2.4, excluding the
      capability-matrix scenarios below and the sync-/events-scope scenarios that land in
      M2/M3); project/flag/definition/audit surface (§2.5, excluding the
      sync/ETag/admin-sync/memo scenarios that land in M2). The baseline API-level
      [§2.6](05-testing.md) scenarios (invite flow, project-scoped flag create/toggle,
      environment create + 409, 409 duplicate project) are green; the UI-level §2.6
      assertions land in M4. (Flagd-facing scenarios — sync
      `GET /api/v1/sync/:projectKey/:env` FR-26/FR-27, events SSE FR-51, evaluate
      FR-21–FR-25 — are M2/M3 scope and land with those endpoints.)
- [ ] Capability-matrix scenarios in [05-testing.md §2.4](05-testing.md) green
      (product-owner `enabled`-only toggle, developer blocked from admin-only surfaces,
      effective permissions as the global+project union, mixed per-project roles) — pending
      the M1 follow-up items below.
- [x] Version bump semantics verified: create=1, any-environment definition update +1 on the
      single flag-level version, idempotent put no-op (FR-5).
- [x] `npm test` + `typecheck` + `lint` green (unit tier, no Docker);
      `npm run test:integration` green against testcontainers MariaDB.

### M1 wrap-up (2026-11-03)

- OpenAPI: hand-maintained `server/openapi.json` (no codegen/glue library) served at
  `GET /api/v1/openapi.json`; the hand-maintained choice is documented here per the M1 acceptance.
- TDD evidence for the milestone: unit tier green (`@fms/server` 17 tests, `@fms/shared` 19),
  integration tier green (`server/test/m1.integration.test.ts`, 5 scenarios against
  testcontainers MariaDB), `typecheck` + `lint` green; version-bump semantics verified in the
  integration run.

### M1 follow-up (2026-11-04 alignment review)

The 2026-11-04 cross-document review found API-level gaps between the implemented M1 routes and
the FR-54/FR-58/FR-59 capability matrix and invite contract. The baseline is done, but these
items keep the capability-matrix acceptance open:

- [ ] Enforce the product-owner capability matrix (FR-59): the current flag-create,
      description-update, definition `PUT`/`copy`, and environment-create routes accept any
      project member. Product owners must be limited to `enabled`-only definition updates;
      everything else is `403`. Add the guards + API tests.
- [ ] Record the authenticated actor (not a hardcoded `admin`) on the
      `project.environment.create` audit entry (FR-36).
- [ ] Compute effective permissions as the union of the global role and project membership
      (FR-54); the current guard uses the membership role unless the global role is `admin`,
      and flag deletion checks only the global admin/manage key (so a project admin cannot
      delete).
- [ ] Support per-project membership roles in the invite API (FR-54/FR-57): the current
      contract accepts one `role` for all `projectIds`, so mixed-role users cannot be created.
      Implement the `projects: [{ projectId, role }]` contract and the mixed-role tests.

---

## M2 — Model compilation & sync endpoint

**Goal:** FMS becomes a valid flagd HTTP source (with no client consuming it yet).

**Prerequisite:** resolve OQ-6 (project-namespaced flag-set IDs, e.g. `<projectKey>:<env>`)
and update ADR-0004 *before* M2 work lands — the sync URL shape, the flagd config source
layout (M0's provisional `flagd/config.yaml`), set-level `flagSetId`, and provider
selectors all follow the resolution.

- `domain/flagd-model.ts`: compiler per [03-data-model.md §3](03-data-model.md) —
  JSONLogic emission, op mapping, `fractional` (no bucketing expr), nested `if` chains,
  flag-level `metadata.version`, set-level `metadata.flagSetId` (per the OQ-6 resolution).
- Stable serialization + quoted strong ETag (state-hash, `generatedAt` excluded); honor
  standard `If-None-Match` list, weak-comparison, and wildcard semantics (FR-26/FR-28).
- Sync endpoint (route shape per the OQ-6 resolution; e.g. `GET /api/v1/sync/…`) with
  `sync` API-key scope or project-authorized admin session + `If-None-Match` → `304`
  (FR-26/FR-27).
- Sync model memoization: per (project, env) `{ version, body, etag, variantTypes }`
  compiled once per state change, invalidated after commit for definition create/update/copy and
  for all environments when a flag is deleted; the sync endpoint (and later the evaluate proxy's
  variant-type lookup) serves from the memo (architecture §2.1).
- Vendor the official flagd JSON schema into `server/test/fixtures/schema/` + refresh script
  (`server/scripts/refresh-flagd-schema.mjs`); contract tests validate every emitted document
  (NFR-9).
- Golden-file tests for the compiler (fixtures committed).

**Acceptance**
- [x] All [05-testing.md §2.2](05-testing.md) scenarios green.
- [x] Manual: with flagd from M0 pointed at the endpoint (config finalized per OQ-6),
      `curl` of a flagd evaluation (HTTP on 8013) returns the expected variant for a
      hand-created flag in a test project (smoke, not a committed test until M3) — verified
      2026-11-04 against the running stack: `POST /flagd.evaluation.v2.Service/ResolveBoolean`
      → `{"value":false,"reason":"STATIC","variant":"off","metadata":{"version":2}}` for
      `new-checkout` (staging, default off, no rules), `flagSetId: checkout:staging`.
- [x] 304 behavior verified against flagd's actual polling (logs/metrics or curl replay) —
      `If-None-Match` replay against the sync endpoint returned `304 Not Modified` with the
      current ETag.
- [x] OpenAPI document at `/api/v1/openapi.json` includes `GET /api/v1/sync/:projectKey/:env`
      and matches [04-api.md §6](04-api.md) (API §11).

### M2 follow-up (2026-11-04 alignment review)

- [ ] Measure and log NFR-1 sync latency: p99 < 50 ms with `ETag`/`304`, and < 200 ms for a
      full 1,000-flag body (1,000 flags × 3 environments is the NFR-2 shape).

---

## M3 — Evaluation path (OpenFeature + flagd)

**Goal:** `/api/v1/evaluate` works end-to-end against real flagd; readiness reflects
provider state.

- `FlagEvaluator` interface + OpenFeature implementation (per (project, env)
  `FlagdProvider` registry, selector over the project-namespaced flag-set ID per the OQ-6
  resolution, gRPC `rpc` mode) (FR-21/FR-25, architecture §2.1/§4).
- Provider state tracking → `readyz` (architecture §7); 503 policy (FR-24).
- `POST /api/v1/evaluate` (typed dispatch from stored variant type; `flagVersion` from flag
  metadata; percentage flags without a `targetingKey` use flagd's single deterministic
  bucket) (FR-19/FR-22/FR-23).
- `GET /api/v1/projects/:projectId/flags/:key/observed` probe helper (per-environment
  flagd-observed version/enablement) backing the dashboard sync-health badge (FR-47,
  architecture §7, [04-api.md §4](04-api.md)).
- Change events (ADR-0008): per (project, env) broadcaster (queue drained on observed
  `PROVIDER_CONFIGURATION_CHANGED`); `GET /api/v1/events` SSE — `flag-changed` /
  `provider-ready` / `provider-error` with `projectKey`/`env`/`flagSetId`, `?envs=` filter over
  flag-set IDs, 15 s keepalive, no replay, `evaluate`-scope/session auth (FR-51).
- OpenAPI document updated with evaluate, events, and observed routes (API §11).
- E2E harness: Vitest + compose (flagd + mariadb), ready-wait helper, deterministic scenarios
  per [05-testing.md §2.3](05-testing.md) (stickiness, propagation, 304, flagd-down 503,
  flagd-restart recovery, SSE ordering + no-replay, OpenFeature provider event (FR-50));
  scenarios are written as Given/When/Then specs in the testing strategy, not a Gherkin parser.
- Seed: on first boot with an empty DB, log the `SYNC_KEY` once (architecture §9) so the
  operator can wire `flagd/config.yaml` (source URIs per the OQ-6 resolution).

**Acceptance**
- [ ] All [05-testing.md §2.3](05-testing.md) E2E scenarios green via `npm run test:e2e`
      (Vitest + compose).
- [ ] NFR-1 latency: local `/evaluate` p99 < 25 ms measured in E2E (1,000 calls, logged).
- [ ] `readyz` transitions observed: READY → (flagd stopped) ERROR → (flagd restarted) READY;
      `readyz` keys are project-namespaced flag-set IDs (`<projectKey>:<env>`).
- [ ] SSE: change → `flag-changed` arrives after flagd serves the new value and within ~2×
      interval; payload includes `projectKey`/`env`/`flagSetId`; no replay after reconnect;
      `provider-error`/`provider-ready` on stop/restart; an unknown `?envs=` flag-set ID → `400`.
- [ ] `GET /api/v1/projects/:projectId/flags/:key/observed` returns the flagd-observed
      version/enablement per environment (FR-47) and omits environments with no definition.
- [ ] NFR-3: while flagd is stopped, management CRUD/audit/key operations still succeed;
      only evaluation returns `503` (FR-24).

---

## M4 — Dashboard

**Goal:** the full operator surface in the browser (FR-40–FR-47, FR-53–FR-59).

- Vue 3 dashboard in `web/` (Naive UI, Pinia, hash router; built assets served by the API);
  cookie auth; login view (FR-40).
- Multi-user scope (FR-53–FR-59): project list + create (409 on duplicate name/key),
  admin member invites (role + project assignment; temporary password shown once),
  per-project environments (default set seeded on create; developers can add custom envs —
  FR-55/FR-58), per-project flag lists and editor, role-gated access per the
  [capability matrix](01-requirements.md) — developers and product owners see and act only on
  assigned projects; product owners can toggle `enabled` but cannot edit variants/rules,
  create/delete flags, add environments, or copy definitions (FR-59).
- Per-project flag list (per-env status, version); flag editor: env tabs from the
  project's environment set, enable toggle, variant table (name/value/type), default
  variant, ordered rule editor (attribute conditions + percentage splits; add/remove/
  reorder), all-at-once error display (FR-14 UX), pre-submit validation imported from
  `shared/` (same code as the server — ADR-0006).
- Copy-from-env control (FR-9 UX).
- Evaluate playground: project/flag + env picker, targetingKey (required for flags with a
  percentage rule — FR-19 UX), context JSON editor, result display incl. reason +
  `flagVersion` (FR-44).
- API keys view (create shows plaintext once; revoke) (FR-45).
- Audit view (pagination, filters, before/after diff) (FR-46).
- Sync health badge per project+env: stored version vs. observed `flagVersion` (FR-47).
- Live updates: subscribe to `GET /api/v1/events` (`EventSource`, session cookie); flag list
  + sync-health badge refresh on `flag-changed` / `provider-ready` (FR-52).

**Acceptance**
- [ ] Every UI-scoped requirement (FR-40–FR-49, FR-52–FR-59) exercisable in the UI; manual
      checklist committed to the M4 note. FR-50 (client-side OpenFeature events) and FR-51
      (SSE API) are API/provider requirements verified in M3, not UI acceptance criteria.
- [ ] UI-level [05-testing.md §2.6](05-testing.md) scenarios green (login gate, assigned-project
      visibility, developer create env/flag, 409 duplicate env, unassigned 403, product-owner
      toggle, per-environment isolation, duplicate project name) via Vitest +
      `@vue/test-utils` with the API client mocked.
- [ ] Capability matrix enforced in the UI and API: product-owner `enabled`-only toggle;
      developer cannot manage members/keys/projects; admin-only audit/keys/member views
      (FR-54/FR-58/FR-59).
- [ ] Sync-health badge consumes `GET …/flags/:key/observed` and refreshes on
      `flag-changed`/`provider-ready` (FR-47/FR-52).
- [ ] No validation/compilation logic reimplemented in dashboard code (`shared/` imports
      only); component tests (Vitest + @vue/test-utils) for the rule editor and diff view.
- [ ] Bundle budget (Vue + Naive UI, gzip) recorded in the M4 note.

---

## M5 — Hardening & documentation

**Goal:** v1 is operationally trustworthy and documented.

- Structured logging polish (request ids, actor, audit correlation) (NFR-7).
- Body size limits, error hygiene pass (no stack leaks), production-mode guardrails
  (refuse insecure defaults, architecture §6).
- Runbook: backup/restore (single-transaction `mariadb-dump` + named volume), key rotation,
  flagd upgrade procedure (coordinated provider bump — fractional hashing ADR note), compose
  file walkthrough (flagd + mariadb).
- Client integration guide (OpenFeature SDK + flagd provider, selector per the OQ-6
  resolution (per (project, env) flag set), change events — provider events + FMS SSE
  (FR-50/FR-51), in-process HTTP provider for high-volume clients (architecture §11),
  browser proxy pattern) in `docs/client-integration.md` (FR-25 documentation).
- `docker-compose.yml` final form (flagd + mariadb; pinned images, healthchecks, env-driven
  sync key + DB credentials).
- Full docs pass: requirements/architecture/api/data-model remain accurate; open questions
  resolved or re-scoped (01 §7; OQ-6 was already settled in M2, so the docs must match
  the chosen flag-set naming end to end — architecture §4, sync/selector wording in
  02/03/04, client guide).

**Acceptance**
- [ ] `npm test` + `npm run test:e2e` green; `typecheck`/`lint` green.
- [ ] Runbook steps executed once on a clean machine (documented evidence in M5 note):
      backup/restore, key rotation, flagd upgrade, compose walkthrough (NFR-4/NFR-6).
- [ ] NFR-1/NFR-2 measured and logged: `/evaluate` p99 < 25 ms; sync p99 < 50 ms and
      < 200 ms full body at 1,000 flags × 3 environments; 100 evaluations/s sustained.
- [ ] NFR-3 verified: flagd-down leaves management operations working and evaluation at `503`;
      NFR-5 security audit (no secrets in repo, hashes only, production defaults refused);
      NFR-7 structured logs/health verified.
- [ ] OpenAPI completeness: every route in [04-api.md](04-api.md) is represented in
      `server/openapi.json` and the document validates as OpenAPI 3.0.
- [ ] All `FR-n`/`NFR-n` marked with a pointer to the test(s) proving them (audit trail in
      the M5 wrap-up), including the M1/M2 follow-up items above.

---

## Deferred (v1.1 candidates)

- Optimistic locking (`If-Match` on flag version) for concurrent edits.
- "Advanced JSONLogic" escape hatch for power users (OQ-4).
- Scheduled rollouts via `$flagd.timestamp` (OQ-3).
- Container image for the management API; TLS guidance; Postgres port (OQ-5); multi-instance
  FMS (incl. boot-time migration locking); flagd replicas / LB (architecture §11).
- Browser-side evaluation pattern hardening (OQ-2).
- Rate limiting + Prometheus wiring of flagd metrics.
