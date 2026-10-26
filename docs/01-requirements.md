# 01 — Requirements

Feature flag management system ("FMS"). Evaluation is delegated to
[flagd](https://flagd.dev) per the [OpenFeature](https://openfeature.dev/) specification; this
system provides the management plane (API, dashboard, storage, auth, audit).

## 1. Goals

1. **One system of record** for feature flags across all environments (dev, staging, prod).
2. **OpenFeature as the integration standard**: client applications consume flags through
   official OpenFeature SDKs and the official flagd provider — FMS does not require any
   proprietary client library.
3. **Self-hosted and lightweight**: runs locally with `docker compose` (flagd) + one Node.js
   process (management API + dashboard). No external SaaS dependency.
4. **Safe rollouts**: per-environment enablement, attribute targeting, and deterministic
   percentage rollouts with a full audit trail of every change.
5. **Transparent operations**: every mutation is auditable; flag state and sync health are
   observable without a separate toolchain.

## 2. Non-goals (v1)

- Multi-tenancy (projects, workspaces, per-team flag sets).
- Client-side/browser evaluation (web SDKs). Browser apps are expected to evaluate flags via
  their own backend in v1 (see ADR-0004 and open questions).
- Scheduled/time-based rollouts through the API (flagd can express them via
  `$flagd.timestamp`, but FMS v1 does not expose a scheduling UI).
- Observability platform integration (Prometheus scraping, alerting). flagd exposes its own
  metrics endpoint; FMS v1 does not scrape or forward them.
- Flag archival / soft-delete, flag "owners", and approval workflows.
- High-availability deployments (multi-instance management API, Postgres).

## 3. Personas

| Persona | Needs |
| --- | --- |
| **Application developer** | Evaluate a flag from their code with the standard OpenFeature API; know which environments a flag is live in; test a flag with "test as user" before rolling out. |
| **Release engineer / on-call** | Flip a flag in a specific environment quickly (kill switch); know who changed what and when; verify the change actually reached flagd (sync health). |
| **Platform operator** | Run the whole system with one compose file + one process; back up one SQLite file; reason about failure modes (flagd down, sync stalled). |

## 4. Functional requirements

Requirements are numbered `FR-n`. Each is stated as observable behavior so it can be converted
directly into tests (see [05-testing.md](05-testing.md)).

### 4.1 Flags

- **FR-1** — A flag is identified by a unique *key*. Keys must match
  `^[a-zA-Z][a-zA-Z0-9-_]{0,127}$` (letters, digits, `-`, `_`; no dots/spaces).
- **FR-2** — A flag has an optional description (max 1024 chars).
- **FR-3** — Flags can be created, listed, read, updated (description), and deleted.
- **FR-4** — Deleting a flag removes it from all environments and removes it from published
  flagd models on the next sync poll.
- **FR-5** — Every flag carries a monotonically increasing `version` (starts at 1) that is
  bumped on every definition change in any environment. The version is published in flag-level
  metadata to flagd so consumers can observe changes.

### 4.2 Environments

- **FR-6** — v1 has a fixed set of environments: `dev`, `staging`, `prod`. The list is a
  compile-time constant (configurable in code for tests) — not user-managed.
- **FR-7** — Each flag has at most one *definition* per environment.
- **FR-8** — A definition may be updated independently in each environment; environments are
  isolated (changing `staging` never affects `prod`).
- **FR-9** — A definition can be *copied* from one environment to another
  (promotion workflow, e.g. dev → staging). Copying is a full replacement of the target
  definition and is audited as its own change.

### 4.3 Definitions (per flag, per environment)

A definition consists of:

- **FR-10** — `enabled`: boolean. When disabled, evaluation returns no value (OpenFeature
  `reason=DISABLED`); the caller's code default applies.
- **FR-11** — `variants`: a non-empty map of variant name → variant value. All values in one
  flag must share a single JSON type: `boolean`, `number`, or `string`. Variant names must
  match `^[a-zA-Z][a-zA-Z0-9-_]{0,63}$` and must not be reserved: `true`, `false`, `null`.
- **FR-12** — `defaultVariant`: the variant returned when no rule matches. Must reference an
  existing variant name.
- **FR-13** — `rules`: an ordered list of targeting rules (see 4.4). May be empty.
- **FR-14** — Validation failures reject the whole definition update with a structured error
  that names every problem (all-at-once validation, not fail-on-first).

### 4.4 Targeting rules

Rule evaluation is **first-match-wins in list order**; if no rule matches, `defaultVariant`
applies. v1 rule types:

- **FR-15** — *Attribute rule*: matches when **all** of its conditions hold. Conditions are
  `{ attribute, op, value }` where:
  - `attribute` is a non-empty context attribute name (max 128 chars; must not start with `$`).
  - `op` ∈ `eq`, `neq`, `in`, `starts_with`, `ends_with`, `gt`, `gte`, `lt`, `lte`, `exists`.
  - `value` semantics per op: `eq`/`neq`/`gt`/`gte`/`lt`/`lte` take a scalar (string or number,
    compared with strict typing — no coercion); `in` takes a non-empty array of scalars;
    `starts_with`/`ends_with` take a non-empty string; `exists` takes no value.
  - `eq`/`neq`/`in` apply to string-or-number attributes; comparison operators apply to
    numeric attributes; `starts_with`/`ends_with` apply to string attributes. Mismatched
    shape is a validation error.
- **FR-16** — The attribute rule names the `variant` to return on match (must exist).
- **FR-17** — *Percentage rule*: deterministically distributes matching traffic across
  `splits: [{ variant, weight }...]` (weights: positive numbers; relative — need not sum to 100).
  All split variants must exist.
- **FR-18** — The percentage rule **must be the last rule** in the list (v1 constraint,
  ADR-0005). A flag may have at most one percentage rule.
- **FR-19** — Percentage rollouts are **sticky per targeting key**: the same `targetingKey`
  (and flag) always resolves to the same variant, independently of time and independently of
  other flags. Percentage rollouts require a `targetingKey` at evaluation time; without one,
  behavior is undefined-by-design (documented) — the dashboard playground enforces it.
- **FR-20** — Rules may reference any context attribute the client supplies
  (e.g. `email`, `plan`, `tenantId`) in addition to the OpenFeature `targetingKey`.

### 4.5 Evaluation

- **FR-21** — All evaluation is performed by **flagd**; FMS never evaluates flags itself.
- **FR-22** — FMS exposes `POST /api/v1/evaluate` as a convenience for tooling and the
  dashboard: input `{ flagKey, environment, targetingKey?, context? }`, output the OpenFeature
  resolution details (`value`, `variant`, `reason`, error info). The response variant value is
  typed per the flag's definition.
- **FR-23** — The same endpoint rejects with `404` for unknown flags and `400` for invalid
  bodies (malformed context, missing environment, unknown environment).
- **FR-24** — When flagd is unreachable or its configuration is not ready, evaluation returns
  `503` with a structured error — never a silently defaulted value (no "success-shaped
  fallback").
- **FR-25** — Client applications integrate **directly** with flagd via the official
  OpenFeature SDKs + flagd provider (gRPC, `flagSetId=<env>` selector). FMS documents this
  pattern; it requires no FMS API at runtime.

### 4.6 Publish / sync

- **FR-26** — FMS exposes `GET /api/v1/sync/:env` returning the complete flagd model document
  for that environment's flag set (schema `https://flagd.dev/schema/v0/flags.json`), with a
  strong `ETag`; clients (flagd) sending `If-None-Match` receive `304 Not Modified`.
- **FR-27** — The sync endpoint is authenticated (API key with `sync` scope; flagd is
  configured to send it).
- **FR-28** — Model publication is a pure function of stored state: the same state always
  yields the same serialized document (stable key ordering, stable ETag).
- **FR-29** — Every change to flag state is visible to flagd within one sync interval
  (default 5 s poll; configurable).

### 4.7 Authentication & API keys

- **FR-30** — Dashboard and management API authenticate a single admin identity configured via
  environment variables (`ADMIN_USERNAME`, `ADMIN_PASSWORD`).
- **FR-31** — `POST /api/v1/auth/login` issues a signed session token (JWT, HS256, 12 h expiry)
  returned in the body and set as an `HttpOnly`, `SameSite=Lax` cookie.
- **FR-32** — API keys are created via the dashboard/API with a `name` and `scope`
  (`manage`, `evaluate`, `sync`; `all` = all three). The plaintext key (`fms_` prefix +
  32 random bytes, base62) is shown **once**; only its SHA-256 hash is stored.
- **FR-33** — Requests authenticate with `Authorization: Bearer <token-or-key>`. The token is
  resolved to a principal with an explicit scope set; endpoints require the scope they declare.
- **FR-34** — Keys can be revoked (immediately invalid). Revocation is audited.
- **FR-35** — Failed authentication returns `401` with a problem document; insufficient scope
  returns `403`.

### 4.8 Audit log

- **FR-36** — Every mutating operation (flag create/update/delete, definition update/copy, API
  key create/revoke, login success) is recorded with: timestamp, actor (session user or API
  key name), action, entity + id, environment (when applicable), and the before/after state
  (JSON, for definition changes).
- **FR-37** — The audit log is append-only: no API can update or delete entries.
- **FR-38** — `GET /api/v1/audit` lists entries newest-first with pagination
  (`limit` default 50, max 200; `cursor` = last-seen id) and optional filters
  (`action`, `entity`, `actor`).
- **FR-39** — Failures to write an audit entry abort the mutation (no untracked changes).

### 4.9 Dashboard

- **FR-40** — Login/logout (form → session cookie).
- **FR-41** — Flag list: key, description, per-environment status (enabled/disabled, version).
- **FR-42** — Flag editor: per environment — enable toggle, variant table (name, value, type),
  default variant selector, ordered rule editor (add/remove/reorder; attribute conditions and
  percentage splits), fallback = default variant. Save validates (FR-14) and surfaces
  all-at-once errors.
- **FR-43** — Per-environment "copy from…" (FR-9).
- **FR-44** — Evaluate playground: pick flag + environment, enter `targetingKey` + arbitrary
  context JSON, show `value`/`variant`/`reason`; percentage rules require a targeting key.
- **FR-45** — API key management: list (name, scope, created, last used, revoked), create
  (shows plaintext once), revoke.
- **FR-46** — Audit view: paginated table (time, actor, action, entity, env) with expandable
  before/after diff.
- **FR-47** — Dashboard shows sync health: for each environment, the flagd-observed model
  version vs. the stored version (stale indicator when they differ).

## 5. Non-functional requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | **Latency**: `/evaluate` p99 < 25 ms locally (flagd co-located), excluding first-call provider warmup. Sync endpoint p99 < 50 ms with ETag, < 200 ms full body for 1,000 flags. |
| NFR-2 | **Scale (v1)**: 1,000 flags × 3 environments; 100 evaluations/s sustained. Beyond that is out of scope. |
| NFR-3 | **Availability**: if flagd is down, management operations (CRUD, audit, keys) keep working; evaluations fail with 503 (FR-24). If FMS is down, flagd keeps serving its last synced model (stale, but functional). |
| NFR-4 | **Durability**: flag state survives restart (SQLite, WAL mode). No in-memory-only state for definitions. |
| NFR-5 | **Security**: no secrets in the repo; JWT secret and admin credentials from environment; API keys hashed at rest; sync endpoint never open; no PII in audit log by design (state snapshots may contain what users configured — accepted in v1). |
| NFR-6 | **Portability**: runs on macOS/Linux with Docker for flagd and Node ≥ 22 for the API; no system dependencies beyond that. |
| NFR-7 | **Observability**: structured JSON logs (request id, actor, route, duration, outcome); `GET /healthz` (liveness) and `GET /readyz` (readiness incl. per-environment flagd provider state). |
| NFR-8 | **Testability**: all domain logic (validation, rule→flagd-model compilation, ETag, audit) is pure or dependency-injected and unit-testable without Docker. |
| NFR-9 | **Standards**: published flagd models conform to the official JSON schema (`flagd.dev/schema/v0/flags.json`); API errors follow RFC 9457 (`application/problem+json`). |

## 6. Assumptions

1. A single admin user is sufficient for v1 (small team / internal tool).
2. flagd runs in Docker on the same host/network as the API (compose file provided).
3. Environments map 1:1 to flagd flag sets; one flagd instance serves all environments
   (ADR-0004).
4. Evaluation context is supplied by the calling application; FMS does not enrich it.
5. Node.js ≥ 22 with native `fetch` and ESM is the runtime baseline (Node 24 in CI/dev).

## 7. Open questions (to resolve during implementation)

| # | Question | Current inclination |
| --- | --- | --- |
| OQ-1 | Can a per-request `Flagd-Selector` be passed through the Node flagd provider without one provider instance per environment? | No documented support → use one provider instance per environment (ADR-0004). |
| OQ-2 | Do client *browsers* evaluate flags directly (web SDK + flagd web provider) or through their backend? | v1: backend-only. Document the proxy pattern; revisit later. |
| OQ-3 | Should scheduled rollouts (`$flagd.timestamp`-based `fractional` weights) get an API/UI in v1.1? | Postpone; the compiled model already *can* express them via advanced rule JSON escape hatch (see OQ-4). |
| OQ-4 | Do we need an "advanced JSONLogic" escape-hatch field for power users beyond the structured rule editor? | Postpone to v1.1; the compiler must not make this unnecessary later. |
| OQ-5 | Postgres backend for multi-instance FMS? | Out of scope; schema must stay mappable (no SQLite-isms in domain logic). |
