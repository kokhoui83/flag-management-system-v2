# 06 — Roadmap

Milestones are ordered so each one leaves the system in a runnable, tested state. Every
milestone is TDD-shaped per [05-testing.md](05-testing.md): the behavior specs for a milestone
are written (failing) before its implementation. Acceptance criteria reference
[01-requirements.md](01-requirements.md) (`FR-n`, `NFR-n`).

> Scope note: M1–M5 deliver v1 as specified. Items marked _v1.1_ are explicitly deferred and
> do not block "done".

Requirement coverage by milestone (details in [01-requirements.md](01-requirements.md)):

| Milestone | Functional requirements                                                                                | Non-functional requirements                                                |
| --------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| M0        | — (tooling)                                                                                            | NFR-6 (portability baseline), NFR-7 (health endpoints), NFR-8 (test seams) |
| M1        | FR-1–FR-20, FR-30–FR-39, FR-53–FR-59 (API; capability-matrix follow-up implemented — see M1 follow-up) | NFR-5 (password/key hashing), NFR-8                                        |
| M2        | FR-26–FR-29                                                                                            | NFR-1 (sync latency), NFR-9                                                |
| M3        | FR-21–FR-25, FR-50–FR-51                                                                               | NFR-1 (evaluate latency), NFR-3, NFR-7 (readiness)                         |
| M4        | FR-40–FR-47, FR-52, FR-53–FR-59 (UI)                                                                   | NFR-7 (sync-health badge)                                                  |
| M5        | FR-25 (client guide)                                                                                   | NFR-1–NFR-9 verification, NFR-9 (OpenAPI completeness)                     |

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
  project+env) and the sync URL shape were provisional at M0 and settled with OQ-6 before M2
  (see the resolved M2 prerequisite).
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

**Status:** baseline complete (2026-11-03); the M1 follow-up items below (capability matrix,
audit actor, effective-permission union, per-project invite roles) were implemented on
2026-11-05, so M1 is now fully closed at the API level (dashboard UI scope remains in M4).

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
- [x] Capability-matrix scenarios in [05-testing.md §2.4](05-testing.md) green
      (product-owner `enabled`-only toggle, developer blocked from admin-only surfaces,
      effective permissions as the global+project union, mixed per-project roles) — implemented
      via the M1 follow-up items below and verified in `server/test/m1.integration.test.ts`.
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
the FR-54/FR-58/FR-59 capability matrix and invite contract. The baseline is done; all four
follow-up items below are now implemented and the capability-matrix acceptance is closed:

- [x] Enforce the product-owner capability matrix (FR-59): the flag-create,
      description-update, definition `PUT`/`copy`, and environment-create routes now reject
      product owners with `403` (product owners are limited to `enabled`-only definition updates;
      everything else is `403`); flag delete requires the effective (project-scoped) admin
      capability. Guards + API tests added in `server/src/http/routes.ts` and
      `server/src/domain/flags.ts`.
- [x] Record the authenticated actor (not a hardcoded `admin`) on the
      `project.environment.create` audit entry (FR-36): the route passes the resolved actor
      (`actorName(principal)`) into the store.
- [x] Compute effective permissions as the union of the global role and project membership
      (FR-54); the guard now resolves the union via `effectiveCapability` in
      `server/src/domain/types.ts` (membership may elevate, never reduce; unassigned → no access),
      and flag deletion checks the effective project capability instead of the global admin key.
- [x] Implement per-project membership roles in the invite API (FR-54/FR-57): the new
      contract (global `role` + `projects: [{ projectId, role }]`) is implemented in the
      invite route (`server/src/http/routes.ts`) and store (`server/src/store/index.ts`); the
      §2.4 mixed-role tests pass end-to-end in `server/test/m1.integration.test.ts`.

---

## M2 — Model compilation & sync endpoint

**Goal:** FMS becomes a valid flagd HTTP source (with no client consuming it yet).

**Prerequisite (resolved before M2):** OQ-6 (project-namespaced flag-set IDs, e.g.
`<projectKey>:<env>`); ADR-0004 was updated accordingly. The sync URL shape, the flagd config
source layout (M0's provisional `flagd/config.yaml`), set-level `flagSetId`, and provider
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

### M2 follow-up (2026-11-04 alignment review; measurement protocol landed 2026-11-05)

- [x] Measure and log NFR-1 sync latency per the [05-testing.md §2.3](05-testing.md) protocol
      (100-call warmup discarded; 1,000 conditional requests, 100 full-body fetches):
      p99 < 50 ms with `ETag`/`304`, and < 200 ms for a full 1,000-flag body (1,000 flags ×
      3 environments is the NFR-2 shape).

  The measurement protocol landed in code first (`server/src/evaluate/latency.ts`:
  `percentile99`/`mean`, warmup discard, sequential samples); the measured numbers are produced
  by the M3 E2E latency scenario (`npm run test:e2e`) and the M2 follow-up sync-latency
  measurement scenario (`measures the NFR-1 sync latency (M2 follow-up: conditional requests +
full body)` in `server/test/m3.evaluate.e2e.test.ts`) — green in the final E2E run (8/8).

---

## M3 — Evaluation path (OpenFeature + flagd)

**Status:** implementation landed 2026-11-05 (evaluate domain + flagd provider registry +
SSE broadcaster/stream + readiness, latency helpers, integration suite green); end-to-end
validation via `npm run test:e2e` is now green against the real flagd engine (Vitest +
testcontainers: MariaDB + real flagd, 7/7 scenarios) and the measured NFR-1 numbers are captured.
The M3 acceptance criteria below are checked as of the final green E2E run.

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

- [x] All [05-testing.md §2.3](05-testing.md) E2E scenarios green via `npm run test:e2e`
      (Vitest + testcontainers: MariaDB + real flagd engine).
- [x] NFR-1 latency: local `/evaluate` p99 < 25 ms measured in E2E per the
      [05-testing.md §2.3](05-testing.md) protocol (100-call warmup discarded, 1,000
      measured calls, logged).
- [x] `readyz` transitions observed: READY → (flagd stopped) ERROR → (flagd restarted) READY;
      `readyz` keys are project-namespaced flag-set IDs (`<projectKey>:<env>`).
- [x] SSE: change → `flag-changed` arrives after flagd serves the new value and within ~2×
      interval; payload includes `projectKey`/`env`/`flagSetId`; no replay after reconnect;
      `provider-error`/`provider-ready` on stop/restart; an unknown `?envs=` flag-set ID → `400`.
- [x] `GET /api/v1/projects/:projectId/flags/:key/observed` returns the flagd-observed
      version/enablement per environment (FR-47) and omits environments with no definition.
- [x] NFR-3: while flagd is stopped, management CRUD/audit/key operations still succeed;
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
  - sync-health badge refresh on `flag-changed` / `provider-ready` (FR-52).

**Implementation status (2026-11-07):** the M4 dashboard surface is implemented in `web/` (Vue 3 +
Naive UI + Pinia + hash router; Vite dev proxy `/api` → `:3000`; prod build served by the API at
`/`). Built assets: 659.28 kB JS / 197.33 kB gzip (bundle budget, M4 note). A Playwright browser
E2E setup is adopted as the executable form of the M4 manual checklist (§2.6); a demo client app
is **not** required for the M4 flag-behaviour verification (the dashboard evaluate playground +
API evaluate cover it).

- FR-40: login view + session bootstrap (`GET /api/v1/auth/session`, cookie/Bearer).
- FR-41/42/47/52: flag list + editor (env tabs from the project's env set, enable toggle, variant
  table, default variant, ordered rule editor, copy-from-env, all-at-once error display, pre-submit
  validation via `@fms/shared` — ADR-0006), sync-health badge, SSE refresh.
- FR-44: evaluate playground (project/flag + env picker, targeting key, context JSON, result).
- FR-45/46: API keys view (create once / revoke) and audit view (list + before/after diff).
- FR-52: `EventSource('/api/v1/events')` refresh of flag list/detail and sync badge.

**Acceptance**

- [x] Every UI-scoped requirement (FR-40–FR-47, FR-52–FR-59) exercisable in the UI; manual
      checklist committed to the M4 note — adopted as the Playwright browser E2E plan
      (UF-1…UF-9) over the docker compose stack; FR-50 (client-side OpenFeature events) and
      FR-51 (SSE API) are API/provider requirements verified in M3, not UI acceptance criteria.
- [ ] UI-level [05-testing.md §2.6](05-testing.md) scenarios green (login gate, assigned-project
      visibility, developer create env/flag, 409 duplicate env, unassigned 403, product-owner
      toggle, per-environment isolation, duplicate project name) — component scenarios via
      Vitest + `@vue/test-utils` with the API client mocked, browser scenarios via Playwright
      against the compose stack.
- [ ] Capability matrix enforced in the UI and API: product-owner `enabled`-only toggle;
      developer cannot manage members/keys/projects; admin-only audit/keys/member views
      (FR-54/FR-58/FR-59).
- [x] Sync-health badge consumes `GET …/flags/:key/observed` and refreshes on
      `flag-changed`/`provider-ready` (FR-47/FR-52).
- [ ] No validation/compilation logic reimplemented in dashboard code (`shared/` imports
      only); component tests (Vitest + @vue/test-utils) for the rule editor and diff view.
- [x] Bundle budget (Vue + Naive UI, gzip) recorded in the M4 note.

**M4 note (implementation record, 2026-11-07):** the dashboard implementation is complete for the
auth → projects → flags → evaluate → keys → audit → sync → guide user flows listed above; the
manual E2E checklist on a running stack (docker compose) — adopted as the Playwright browser E2E
plan (UF-1…UF-9) — and the full §2.6 UI scenario matrix remain as the final acceptance step.

**M4 integration fixes (2026-11-07, via the Playwright browser E2E):** the first green UF-1 run
surfaced two M4-blocking integration bugs, both fixed:
- The auth `onRequest` hook ran before the `@fastify/cookie` plugin was registered, so the cookie
  parsing hook never preceded it — cookie-authenticated session calls (`fms_token`) were rejected
  with `401` even right after a successful login (Bearer kept working, masking the issue).
- The dashboard SPA entry `/` was inside the auth-guarded surface, so an unauthenticated visitor
  received the `401` problem JSON instead of the SPA (login gate never rendered). The guard now
  exempts the non-`/api/` namespace.

**M4 integration fixes (2026-11-08, via the Playwright browser E2E, follow-up runs):** the next
green UF-1…UF-8 run surfaced two further M4-blocking UI bugs, both fixed:
- The dashboard `n-alert` error surfaces bound `:message`, which Naive UI does not render (the
  prop is `title`) — errors never displayed. All alert usages now bind `:title`.
- The flags list bound `<n-spin :show="loading">` with a spinner that was never cleared after the
  initial flag load, leaving an overlay that intercepted pointer events. The spinner is now cleared
  after the load settles.

**M4 E2E status (2026-11-08, via `npm run test:e2e:web`):** the Playwright browser E2E suite is green
for UF-1 (login gate), UF-2 (admin → `/projects`), UF-3 (developer env `qa` + flag `new-thing`),
UF-4 (developer duplicate env → `409`), UF-5 (unassigned developer flag create → `403`), UF-7
(admin flag creation via UI) and UF-8 (admin duplicate project → `409`); the full run reports
**7 passed**. The remaining checklist flow **UF-6 (product owner toggle in `staging`, editor
read-only)** is authored in `web/e2e/flags.spec.ts` but still red at the environment-switch step
(the env tab pane content does not render), so the M4 acceptance is not yet formally closed.

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
- [ ] NFR-1/NFR-2 measured and logged per the [05-testing.md §2.3](05-testing.md) protocol:
      `/evaluate` p99 < 25 ms; sync p99 < 50 ms and < 200 ms full body at 1,000 flags ×
      3 environments; 100 evaluations/s sustained for 60 s (6,000 calls, no errors).
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
