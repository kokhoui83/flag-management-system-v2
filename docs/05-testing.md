# 05 — Testing Strategy

This project follows strict TDD (per `AGENTS.md`): for every behavior, a failing test is
written first; the smallest production change makes it pass; then refactor with the suite
green. The tests below are the *specification* — they are written before the feature they
describe exists.

Runner: **vitest**. Node ≥ 22. No test that requires Docker runs in the default `npm test`
(unit tier); Docker-dependent tests live behind `npm run test:integration` (testcontainers)
and `npm run test:e2e` (compose: flagd + mariadb).

## 1. Test pyramid

| Layer | What | How | Docker? |
| --- | --- | --- | --- |
| **Unit** | Domain: validation, rule→flagd compiler, ETag/serialization, config parsing, key hashing, ULID/version logic, event-broadcaster queue | pure functions, no DB, no network | No |
| **Integration (API)** | Routes + middleware + MariaDB + model compilation, with the `FlagEvaluator` seam injected | supertest-style calls against the Fastify app; **testcontainers** MariaDB; evaluator mocked at the `FlagEvaluator` interface | Yes (testcontainers) |
| **Contract** | Published sync documents conform to the official flagd JSON schema; golden-file outputs of the compiler | JSON Schema (draft-07) validation + golden files committed to `test/fixtures` | No |
| **E2E** | Real flagd in Docker: sync poll, real evaluation incl. `fractional` stickiness, ETag/304 | vitest + `docker compose` (flagd profile), retry-until-ready helper, deterministic assertions | Yes |

The `FlagEvaluator` seam (architecture §2.1) is what keeps the evaluation path testable without
flagd: unit/integration tests inject a stub; only E2E uses the real OpenFeature provider.

The `web/` dashboard workspace has its own Vitest + `@vue/test-utils` component tests (rule
editor, diff view) run by `npm test -w web`; they mock the API client and contain no network
calls. The shared validators are tested once, in the unit tier, and imported by both sides.

## 2. Core behavior specs (Given/When/Then)

Each scenario maps to at least one test. `…` abbreviates context.

### 2.1 Validation

- **G** a definition with variants `{"a": 1, "b": 2, "c": true}`
  **W** it is submitted
  **T** it is rejected listing *all* problems (e.g. `/variants/c` type mismatch) — never just
  the first (FR-14, NFR all-at-once).

- **G** a rule referencing variant `"yes"` on a flag whose variants are `on/off`
  **W** the definition is submitted
  **T** the error points at `rules[i].variant` and names the missing variant (FR-16).

- **G** a percentage rule appears as rule 2 of 3
  **W** the definition is submitted
  **T** it is rejected: "percentage rule must be the last rule" (FR-18).

- **G** two percentage rules
  **W** submitted
  **T** rejected: at most one percentage rule (FR-18).

- **G** condition `{attribute: "plan", op: "gt", value: "pro"}` (string where a number is
  required)
  **W** submitted
  **T** rejected at `rules[i].conditions[0].value` (FR-15).

- **G** `defaultVariant: "maybe"` not in variants
  **W** submitted
  **T** rejected at `/defaultVariant` (FR-12).

- **G** a valid definition
  **W** submitted twice in a row
  **T** the second is accepted and the flag version does **not** change (idempotent put,
  FR-5).

### 2.2 Compilation (pure function)

- **G** a definition with no rules
  **W** compiled
  **T** the emitted flag has **no** `targeting` property (reason will be `STATIC`).

- **G** one attribute rule `email ends_with "@acme.com"` → `on`
  **W** compiled
  **T** `targeting` deep-equals the golden expression
  `{"if": [{"ends_with": [{"var": "email"}, "@acme.com"]}, "on", null→default]}`
  (golden file `test/fixtures/compile/attribute-single.json`).

- **G** three attribute rules
  **W** compiled
  **T** output is right-nested `if`s, first-match-wins order preserved (golden file).

- **G** attribute + terminal percentage rule (weights 25/75)
  **W** compiled
  **T** innermost branch is `{"fractional": [["on",25],["off",75]]}` with **no** bucketing
  expression (golden file `compile/attribute-then-fractional.json`).

- **G** any compiled document for a valid state
  **W** validated
  **T** it passes the official `https://flagd.dev/schema/v0/flags.json` schema (pinned local
  copy of the schema in `test/fixtures/schema/`, refreshed by a documented script) (NFR-9).

- **G** the same state
  **W** compiled twice (any call order)
  **T** the two bodies are byte-identical (stable key order; FR-28) and ETags equal.

- **G** state with a `generatedAt`-changing-only "update" (no state change)
  **W** ETag computed
  **T** ETag unchanged (generatedAt excluded; FR-26).

### 2.3 flagd E2E (real engine, Docker)

- **G** flagd running with FMS as sync source; a boolean flag enabled in its project's
  `staging` environment, no rules, default `off`
  **W** `POST /api/v1/evaluate` for a user
  **T** `{value: false, variant: "off", reason: "STATIC"}` and `flagVersion` matches the
  stored version.

- **G** same flag with `email ends_with "@acme.com"` → `on`
  **W** evaluate with `context.email = "x@acme.com"` / `"x@other.io"`
  **T** variants `on` / `off` respectively (reasons `TARGETING_MATCH` / `DEFAULT`).

- **G** percentage rule on/off 50/50
  **W** evaluate 1,000 synthetic targeting keys
  **T** every key returns a *stable* variant across 3 repeated evaluations (stickiness,
  FR-19) and the observed split is within ±5% of 50/50 (statistical, generous bound to stay
  deterministic-enough).

- **G** a flag changed in FMS
  **W** ≤ 2× sync interval passes
  **T** evaluations reflect the new variant (propagation, FR-29).

- **G** a sync request with `If-None-Match` equal to the current ETag
  **W** issued (by flagd or a test client)
  **T** `304` with no body.

- **G** flagd container stopped
  **W** `POST /api/v1/evaluate`
  **T** `503` problem+json — never a defaulted value (FR-24); `GET /readyz` reports the
  environment `ERROR`.

- **G** flagd restarted
  **W** ≤ 2× sync interval
  **T** `readyz` returns READY and evaluation works again.

- **G** a subscriber is connected to `GET /api/v1/events` (evaluate-scoped key); a definition
  is changed
  **W** ≤ 2× sync interval passes
  **T** a `flag-changed` event arrives with the new version — and **not before** flagd serves
  the new value (ordering asserted by evaluating first) (FR-51, FR-29).

- **G** a subscriber disconnects, a change is committed, the subscriber reconnects
  **W** it reads the stream
  **T** no missed event is replayed; re-fetching the flag shows the new state (FR-51,
  no-replay).

- **G** flagd is stopped, then restarted, while a subscriber watches the stream
  **W** the transitions happen
  **T** a `provider-error` event is emitted on the way down; `provider-ready` on recovery
  (FR-51).

- **G** a client app with a real flagd provider registers a
  `PROVIDER_CONFIGURATION_CHANGED` handler
  **W** a definition is changed
  **T** the handler fires within ≤ 2× sync interval (FR-50, ADR-0008).

### 2.4 Auth & audit

- **G** no/invalid/expired credential on a managed route
  **W** requested
  **T** `401` problem+json; with a valid `evaluate`-scoped key on a `manage` route → `403`.

- **G** an admin invites `brian` (role `developer`, project `checkout`); the temporary
  password is shown once in the invite response
  **W** `brian` logs in with the username + temporary password
  **T** a session is issued (FR-31/FR-53); the stored `users` row holds a hash, not the
  plaintext (asserted by inspecting the DB, FR-57); `brian`'s session acts on `checkout`
  only — other projects → `403` (FR-54, FR-58).

- **G** a sync request with an `evaluate`-scoped key
  **W** issued
  **T** `403`; with the `sync` key → `200` (FR-27).

- **G** an `evaluate`-scoped key on `GET /api/v1/events`
  **W** requested
  **T** the stream opens (`200`, `text/event-stream`); the same key on
  `GET /api/v1/sync/:env` → `403` (scope split, §1).

- **G** an API key is created
  **W** its plaintext is shown
  **T** exactly once (the list endpoint shows only `prefix`), and the stored row contains the
  SHA-256, not the plaintext (FR-32) — asserted by inspecting the DB in the integration test.

- **G** a definition update succeeds
  **W** the audit log is read
  **T** exactly one new entry: action `definition.update`, env set, before/after payloads
  match the previous/new state (FR-36).

- **G** the audit write is made to fail (test seam: a `BEFORE INSERT` trigger on
  `audit_logs` that raises an error, installed in the test DB)
  **W** a definition update is attempted
  **T** the update is rolled back — no state change, error returned (FR-39).

- **G** a key is revoked
  **W** it is used again
  **T** `401` immediately (FR-34).

### 2.5 API surface

- **G** `POST /api/v1/projects/:projectId/flags` with an invalid key (`"9bad!"`)
  **W** requested
  **T** `400` naming the `/key` problem (FR-1).

- **G** `DELETE /api/v1/projects/:projectId/flags/:key`
  **W** the flag was present in 2 environments
  **T** `204`; subsequent sync documents (both envs) omit the flag; audit `flag.delete`
  before-state includes both definitions (FR-4).

- **G** `POST /api/v1/projects/:projectId/flags/:key/definitions/:env/copy` with `fromEnv`
  pointing at an env with no definition
  **W** requested
  **T** `404` (not 400).

- **G** `GET /api/v1/audit?limit=200&before=<id>`
  **W** more than 200 entries exist
  **T** 200 newest-first entries, `nextBefore` set, pages are disjoint and ordered.

- **G** `PUT …/definitions/:env` for an unknown flag
  **W** requested
  **T** `404` (no implicit flag creation).

### 2.6 Multi-user, projects & environments (dashboard)

Covers the multi-user dashboard requirements FR-53–FR-59 (see [01-requirements.md](01-requirements.md)).

- **G** an unauthenticated visitor opens the dashboard
  **W** they navigate to a flag view
  **T** the login view is shown; successful login issues a session cookie (FR-40, FR-53).

- **G** an admin invites a user with role `developer` and assigns them to project `checkout`
  **W** the invite is accepted (user created + membership persisted)
  **T** the user can log in and only sees the assigned project (FR-53, FR-57).

- **G** a developer assigned to project `checkout` creates an environment (`qa`) and a flag
  `new-thing` in that project
  **W** they submit the creation
  **T** both are scoped to the assigned project; the default env set is seeded on project create
  (FR-55, FR-56, FR-58).

- **G** a developer adds environment `qa` to a project that already has `qa`
  **W** the request is submitted
  **T** `409` — environment names are unique within a project (FR-55).

- **G** a developer without an assignment attempts to create a flag in a project they are not
  assigned to
  **W** the create request is submitted
  **T** it fails with `403` (FR-58).

- **G** a product owner assigned to project `checkout` toggles a flag state in the `staging`
  environment
  **W** they toggle the flag
  **T** the state changes in `staging` only; the flag is available in all environments of the
  project but its state stays unique per environment (FR-56, FR-59).

- **G** an admin toggles a flag in the `dev` environment of a project
  **W** the toggle is saved
  **T** sibling environments of the same flag keep their prior state and versions bump only for
  the changed environment's definition (FR-5, FR-56).

- **G** an admin creates a project whose name is already taken by another project
  **W** the create request is submitted
  **T** it fails with `409` — project names (and flag keys) are unique per FMS (FR-55, FR-56).

## 3. Determinism & hygiene

- No test hits the network except the Docker tiers (testcontainers on localhost, E2E against
  localhost Docker only).
- The flagd JSON schema is vendored locally; contract tests never fetch.
- Statistical E2E assertions use fixed synthetic key sequences (deterministic population),
  so bounds are stable across runs.
- Every test file is named `*.test.ts` next to the code it tests (domain unit) or in
  `test/` for integration/e2e; e2e files are `*.e2e.test.ts` and excluded from the default
  vitest run.
- Fixtures under `test/fixtures/` are reviewed in PRs — golden file changes are an explicit
  part of a compiler change's diff.

## 4. Definition of done (per milestone)

- New behavior: red → green → refactored, suite green locally before the commit is finished.
- `npm run typecheck` (strict TS), lint, and `npm test` green.
- E2E (`npm run test:e2e`) green for milestones M2–M5.
- Docs updated for any user-visible change (AGENTS.md documentation rule).
