# 05 — Testing Strategy

This project follows strict TDD (per `AGENTS.md`): for every behavior, a failing test is
written first; the smallest production change makes it pass; then refactor with the suite
green. The tests below are the *specification* — they are written before the feature they
describe exists.

Runner: **vitest**. Node ≥ 22. No test that requires Docker runs in the default `npm test`;
Docker-dependent tests live behind `npm run test:e2e`.

## 1. Test pyramid

| Layer | What | How | Docker? |
| --- | --- | --- | --- |
| **Unit** | Domain: validation, rule→flagd compiler, ETag/serialization, config parsing, key hashing, ULID/version logic | pure functions, in-memory or temp-file SQLite (`:memory:`), no network | No |
| **Integration (API)** | Routes + middleware + SQLite + model compilation, with the `FlagEvaluator` seam injected | supertest-style calls against the Fastify app; temp DB file; evaluator mocked at the `FlagEvaluator` interface | No |
| **Contract** | Published sync documents conform to the official flagd JSON schema; golden-file outputs of the compiler | JSON Schema (draft-07) validation + golden files committed to `test/fixtures` | No |
| **E2E** | Real flagd in Docker: sync poll, real evaluation incl. `fractional` stickiness, ETag/304 | vitest + `docker compose` (flagd profile), retry-until-ready helper, deterministic assertions | Yes |

The `FlagEvaluator` seam (architecture §2.1) is what keeps the evaluation path testable without
flagd: unit/integration tests inject a stub; only E2E uses the real OpenFeature provider.

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

- **G** flagd running with FMS as sync source; a boolean flag enabled in `staging`,
  no rules, default `off`
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

### 2.4 Auth & audit

- **G** no/invalid/expired credential on a managed route
  **W** requested
  **T** `401` problem+json; with a valid `evaluate`-scoped key on a `manage` route → `403`.

- **G** a sync request with an `evaluate`-scoped key
  **W** issued
  **T** `403`; with the `sync` key → `200` (FR-27).

- **G** an API key is created
  **W** its plaintext is shown
  **T** exactly once (the list endpoint shows only `prefix`), and the stored row contains the
  SHA-256, not the plaintext (FR-32) — asserted by inspecting the DB in the integration test.

- **G** a definition update succeeds
  **W** the audit log is read
  **T** exactly one new entry: action `definition.update`, env set, before/after payloads
  match the previous/new state (FR-36).

- **G** the audit write is made to fail (test seam: DB locked / trigger)
  **W** a definition update is attempted
  **T** the update is rolled back — no state change, error returned (FR-39).

- **G** a key is revoked
  **W** it is used again
  **T** `401` immediately (FR-34).

### 2.5 API surface

- **G** `POST /api/v1/flags` with an invalid key (`"9bad!"`)
  **W** requested
  **T** `400` naming the `/key` problem (FR-1).

- **G** `DELETE /api/v1/flags/:key`
  **W** the flag was present in 2 environments
  **T** `204`; subsequent sync documents (both envs) omit the flag; audit `flag.delete`
  before-state includes both definitions (FR-4).

- **G** `POST /api/v1/flags/:key/definitions/:env/copy` with `fromEnv` pointing at an env with
  no definition
  **W** requested
  **T** `404` (not 400).

- **G** `GET /api/v1/audit?limit=200&before=<id>`
  **W** more than 200 entries exist
  **T** 200 newest-first entries, `nextBefore` set, pages are disjoint and ordered.

- **G** `PUT …/definitions/:env` for an unknown flag
  **W** requested
  **T** `404` (no implicit flag creation).

## 3. Determinism & hygiene

- No test hits the network except E2E (which talks to localhost Docker only).
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
