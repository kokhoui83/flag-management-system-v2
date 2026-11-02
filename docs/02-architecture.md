# 02 — Architecture

This document describes the system design of the Flag Management System (FMS). Requirements
referenced as `FR-n` / `NFR-n` live in [01-requirements.md](01-requirements.md). Decisions with
rationale are captured as ADRs in [adr/](adr/).

## 1. System context

```mermaid
flowchart TB
    subgraph FMS["FMS (this project)"]
        api["Management API (TypeScript, Fastify)<br/>REST + static hosting + sync endpoint + SSE events"]
        spa["Dashboard (Vue 3 SPA,<br/>built assets served by the API)"]
        db[("MariaDB<br/>system of record")]
    end

    browser["Browser (dashboard user)"]
    flagd["flagd evaluation engine<br/>ghcr.io/open-feature/flagd (Docker)"]
    clients["Client applications<br/>official OpenFeature SDKs + flagd provider<br/>one provider instance per (project, env)"]

    browser <-->|"REST (cookie / Bearer auth) + SSE events"| api
    spa -.->|"served from"| api
    api <-->|"auth, CRUD, audit (Prisma client, async)"| db
    flagd <-->|"sync: flagd polls GET /api/v1/sync/:env (ETag / 304, authHeader)"| api
    api -->|"evaluate: gRPC 8013 via OpenFeature server SDK"| flagd
    api -->|"SSE: GET /api/v1/events (relayed provider events)"| browser
    clients -->|"evaluate: gRPC 8013, selector flagSetId=env"| flagd
```

Key properties:

- **flagd is the only evaluator.** FMS stores definitions and publishes them; it never computes
  flag values (FR-21). This keeps FMS simple and makes every client language a first-class
  citizen via the official OpenFeature providers.
- **MariaDB is the only system of record.** Everything flagd serves is derivable from it
  (FR-28). flagd is stateless from FMS's perspective (ADR-0007).
- **The dashboard is a Vue 3 SPA**; its built assets are served by the management API — one
  process to run at runtime, the Vite build is a dev/release step only (ADR-0006).
- **Changes are observable in two ways**: the standard OpenFeature provider event
  (`PROVIDER_CONFIGURATION_CHANGED`) and an FMS SSE stream whose events are sent only after
  flagd serves the new version (ADR-0008).

## 2. Components

### 2.1 Management API

| Concern | Choice |
| --- | --- |
| Language / runtime | TypeScript on Node.js ≥ 22 (ESM) |
| HTTP framework | Fastify (structured logging, schema validation, static serving) |
| Storage | MariaDB via Prisma (driver adapter `@prisma/adapter-mariadb` over the `mariadb` connector, small pool), migrations via `prisma migrate` applied at boot (ADR-0007) |
| Sync model memo | In-process per (project, env) `{ version, body, etag, variantTypes }`, compiled once per state change and invalidated on commit — steady-state sync polls and the evaluate proxy's variant-type lookup hit memory, not the DB |
| Change events | In-process broadcaster: per-(project, env) queue of committed changes, drained onto the SSE stream when that (project, env)'s provider observes the change in flagd (ADR-0008) |
| Sessions | JWT (HS256), 12 h expiry, `HttpOnly`/`SameSite=Lax` cookie + bearer use |
| Flag evaluation client | `@openfeature/server-sdk` + `@openfeature/flagd-provider` (gRPC, `rpc` resolver) |
| Validation | `zod` at the HTTP boundary; domain-level validation in pure functions (shared with the dashboard via the `shared/` workspace, ADR-0006) |
| Testing | `vitest` (unit + integration), testcontainers for store tests, Docker-based e2e against a real flagd |

Responsibilities:

1. **REST API** for projects, flags, definitions, keys, audit (contract in [04-api.md](04-api.md)).
2. **Model publication**: pure function `compile(flag, definition, env) → flagd model document`,
   plus the `/api/v1/sync/:env` endpoint with strong ETags (details in
   [03-data-model.md](03-data-model.md)).
3. **Evaluate proxy**: `/api/v1/evaluate` delegating to OpenFeature (one `FlagdProvider`
   instance per (project, environment); each created with a selector over the flag-set ID —
   naming per OQ-6).
4. **Static hosting** for the built dashboard (`web/dist`).
5. **Audit** on every mutation (append-only table; write-failure aborts the mutation).
6. **Auth**: bootstrap admin identity (env-configured) for login; invited users (`users`
   table, one-time temporary password — FR-57) carry per-user roles and project assignments
   (FR-53–FR-59); API keys for programmatic access.
7. **Change events**: `GET /api/v1/events` SSE stream (ADR-0008, contract in
   [04-api.md §12](04-api.md)).

Module layout (planned; see NFR-8 — domain logic stays free of framework concerns):

```
server/src/
├── index.ts               # bootstrap: config → db → app → listen
├── app.ts                 # Fastify app factory (routes, plugins, static)
├── config.ts              # env parsing/defaults (pure, testable)
├── db/
│   ├── index.ts           # Prisma client factory, migrations applied at boot (prisma migrate deploy)
│   └── migrations/        # Prisma migration files (prisma/migrations/, ADR-0007)
├── domain/
│   ├── flags.ts           # flag/definition validation (pure; uses @fms/shared)
│   ├── rules.ts           # rule model + validation (pure; uses @fms/shared)
│   └── flagd-model.ts     # rule → flagd JSONLogic compiler (pure, server-only)
├── sync/
│   └── model-memo.ts      # per (project, env) { version, body, etag, variantTypes } memo
├── events/
│   ├── broadcaster.ts     # per (project, env) queue + fanout (pure logic, DI seam)
│   └── stream.ts          # SSE route adapter (keepalive, no replay)
├── evaluate/
│   ├── evaluator.ts       # FlagEvaluator interface + OpenFeature impl (DI seam)
│   └── providers.ts       # per (project, environment) FlagdProvider registry (+ event hooks)
├── http/
│   ├── auth.ts            # session/api-key middleware, scopes
│   ├── problem.ts         # RFC 9457 helpers
│   └── routes/            # projects, flags, definitions, sync, evaluate, events, keys, audit, auth
└── (serves web/dist)      # built dashboard assets (see 2.3)
```

The `shared/` workspace (`@fms/shared`) holds the canonical rule types and all-at-once
validation (FR-14), imported by `domain/` above and by the dashboard — one implementation
(ADR-0006).

### 2.2 flagd

Run as a Docker container (`ghcr.io/open-feature/flagd:<pinned tag>`), started via
`docker compose`. Configuration (planned `flagd/config.yaml`, passed with `--config`):

```yaml
sources:
  - uri: http://host.docker.internal:3000/api/v1/sync/dev
    provider: http
    interval: 5
    authHeader: "Bearer fms_<SYNC_KEY>"
  - uri: http://host.docker.internal:3000/api/v1/sync/staging
    provider: http
    interval: 5
    authHeader: "Bearer fms_<SYNC_KEY>"
  - uri: http://host.docker.internal:3000/api/v1/sync/prod
    provider: http
    interval: 5
    authHeader: "Bearer fms_<SYNC_KEY>"
```

Initial layout: one source per environment of a single project. With per-project
environments (FR-55) there is one source per (project, environment) — URI and `flagSetId`
naming follow OQ-6 (see [06-roadmap.md](06-roadmap.md) M2).

**Compose topology note:** In the v1 local deployment the management API runs as a host Node process and flagd runs in a Docker container (the API container image is a v1.1 candidate; see [06-roadmap.md](06-roadmap.md) M0). Inside a container, `localhost` refers to the container itself, so the flagd sync source URIs must point at the host: `http://host.docker.internal:3000/api/v1/sync/<env>` (Docker Desktop) or the compose service name (e.g. `http://api:3000/api/v1/sync/<env>`) once the API runs in a container.

Notes (verified against current flagd docs):

- **One HTTP source per (project, environment)** (FR-55), each serving a document whose
  set-level metadata carries the flag-set ID (ADR-0004; naming per OQ-6). flagd polls each at
  `interval` (default 5 s) and uses `If-None-Match`/`ETag` → `304 Not Modified` when
  unchanged, so steady-state polling is cheap.
- `authHeader` supplies the complete `Authorization` header value — FMS issues a dedicated
  API key with `sync` scope (FR-27).
- Port map (current flagd): **8013** gRPC evaluation (also serves HTTP JSON at
  `/flagd.evaluation.v2.Service/Resolve*`), **8014** OFREP service, **8015** gRPC sync
  service, **8017** metrics. The compose file pins the flagd image tag; verify the port map
  against that release's docs before upgrading.
- The flagd image tag is **pinned** in `docker-compose.yml` (upgrades are coordinated: the
  `fractional` hashing scheme changed in flagd v0.18.0, so flagd and providers must be upgraded
  together).

### 2.3 Dashboard

Vue 3 + Vite + TypeScript single-page app in the `web/` workspace (ADR-0006): **Naive UI**
component library, **Pinia** stores (session, flags), **vue-router** in hash mode.

- Views: `#/projects`, `#/projects/:projectId/flags`, `#/projects/:projectId/flags/:key`,
  `#/evaluate`, `#/keys`, `#/audit`; login view when unauthenticated.
- Rule editor: ordered list with add/remove/reorder; attribute-condition and percentage-split
  forms; **pre-submit validation imports the same validators the server runs** from
  `shared/` — no reimplementation.
- Live updates: subscribes to `GET /api/v1/events` via `EventSource` (session cookie);
  `flag-changed` / `provider-ready` refresh the affected flag row and the sync-health badge
  (FR-52, FR-47).
- API client: fetch-based (relative `/api/v1/...`, cookie auth).

Build & serving:

- **Dev**: `vite dev` (port 5173) proxying `/api` → `:3000`.
- **Prod**: `vite build` → `web/dist`, served by the API at `/` (path from `WEB_DIST`).
  The runtime stays one process; the build is a dev/release step only.

Constraint: nothing rule-shaped (validation, compilation) is reimplemented in dashboard code —
validation lives in `shared/`, the flagd compiler stays server-only in `domain/`.

### 2.4 Client applications (out of scope, documented pattern)

Server-side clients use the official OpenFeature SDK for their language plus the flagd
provider, configured per (project, environment) they evaluate:

```ts
// Node example (server-side)
import { OpenFeature } from '@openfeature/server-sdk';
import { FlagdProvider } from '@openfeature/flagd-provider';

await OpenFeature.setProviderAndWait(
  new FlagdProvider({ host: 'localhost', port: 8013, selector: 'flagSetId=production' }),
);

const client = OpenFeature.getClient();
const beta = client.getBooleanValue('new-checkout', false, {
  targetingKey: 'user-123',
  email: 'dev@example.com',
});
```

- One provider instance per (project, environment) (selector is a constructor option in
  the Node provider; no per-request selector is documented — OQ-1).
- Browsers do **not** evaluate directly in v1 (non-goal); they call their backend.

### 2.5 Change events (client pattern)

- **Standard (recommended default):** OpenFeature provider events. The flagd provider emits
  `PROVIDER_CONFIGURATION_CHANGED` when flagd applies a new model; client apps register a
  handler (FR-50):

  ```ts
  OpenFeature.addHandler(OpenFeature.Events.PROVIDER_CONFIGURATION_CHANGED, (details) => {
    // flagd's model changed — invalidate local caches, log, re-evaluate
  });
  ```

  Latency is bounded by one sync interval (FR-29).
- **FMS SSE (optional, exact semantics):** `GET /api/v1/events` (FR-51; contract in
  [04-api.md §12](04-api.md)). A `flag-changed` event means *flagd in that env is now serving
  the flagKey at version ≥ N* — emitted only after FMS's own per-(project, env) provider
  observes the change (ADR-0008). No replay; reconcile on reconnect by re-fetching state.

## 3. Data flows

### 3.1 Definition change → flagd

```mermaid
sequenceDiagram
    autonumber
    participant D as Dashboard
    participant API as Management API
    participant DB as MariaDB
    participant F as flagd

    D->>API: PUT /api/v1/projects/:projectId/flags/:key/definitions/:env
    API->>API: validate body (all-at-once, FR-14)
    API->>DB: tx: upsert definition + bump version + audit row
    Note over API,DB: FR-39 — audit write failure rolls back the transaction
    Note over API: queue {flagKey, version, at, auditId} for events (ADR-0008)
    API-->>D: 200 updated flag + new version
    F->>API: GET /api/v1/sync/:env (If-None-Match)
    alt model changed
        API-->>F: 200 model document + new ETag
    else unchanged
        API-->>F: 304 Not Modified
    end
    Note over F: applies model, emits PROVIDER_CONFIGURATION_CHANGED to SDK consumers
    Note over API: own per-(project, env) provider fires → queue drained → SSE flag-changed (ADR-0008)
```

End-to-end propagation latency ≈ one sync interval (≤ 5 s default; FR-29).

### 3.2 Evaluation (client app)

```mermaid
sequenceDiagram
    participant C as Client app
    participant P as flagd provider (OpenFeature SDK)
    participant F as flagd

    C->>P: typed call, e.g. getBooleanValue(key, default, context)
    P->>F: gRPC 8013 (flagd-selector: flagSetId=env)
    F-->>P: { value, variant, reason, metadata{version, ...} }
    P-->>C: resolved value
```

No FMS process is in this path at runtime (NFR-1 latency budget applies to flagd, which is
co-located).

### 3.3 Evaluation (FMS proxy / dashboard playground)

```mermaid
sequenceDiagram
    autonumber
    participant D as Dashboard
    participant API as Management API
    participant P as OpenFeature (per (project, env) provider)
    participant F as flagd

    D->>API: POST /api/v1/evaluate {projectKey, flagKey, environment, targetingKey?, context?}
    API->>API: auth (evaluate scope or session)
    API->>API: look up definition (404 unknown project/flag / 400 bad env)
    API->>P: typed call per stored variant type (Boolean/String/Number +Details)
    P->>F: gRPC 8013
    alt provider READY
        F-->>P: { value, variant, reason, metadata }
        P-->>API: resolution details
        API-->>D: 200 { value, variant, reason, flagVersion }
    else provider not READY (down / sync stalled past grace)
        API-->>D: 503 problem+json (FR-24)
    end
```

### 3.4 Flag-change events (SSE)

```mermaid
sequenceDiagram
    autonumber
    participant C as Dashboard / tool
    participant API as Management API
    participant P as FMS per (project, env) provider
    participant F as flagd

    C->>API: GET /api/v1/events (Bearer / session, ?envs=…)
    API-->>C: 200 text/event-stream (keepalive comment every 15 s)
    Note over API: committed change queued per env {flagKey, version, at, auditId}
    F->>F: syncs the new model (≤ one interval)
    F-->>P: new model
    P-->>API: PROVIDER_CONFIGURATION_CHANGED
    API-->>C: event: flag-changed {"env","flagKey","version","at"}
    Note over C,API: event is true when sent — flagd serves the new version now
```

- Events are emitted on **observed** provider changes, never on commit alone (ADR-0008).
- `provider-ready` / `provider-error` fire on per-(project, env) provider state transitions
  (the same states `readyz` reports) — the dashboard's sync-health badge uses them (FR-52).
- No replay: a disconnect loses in-flight events; reconnect + re-fetch state reconciles.
- Auth: `evaluate` scope or session ([04-api.md §1](04-api.md)).

## 4. Environments as flag sets (ADR-0004)

- Environments (`dev`/`staging`/`prod`) map 1:1 to flagd **flag sets**: the sync document for
  environment `e` carries set-level `"metadata": { "flagSetId": "e" }`. With per-project
  environments (FR-55), set IDs may become project-namespaced (`<projectKey>:<env>`) — open
  question OQ-6 in [01-requirements.md](01-requirements.md).
- flagd's selector mechanism (`flagSetId=<env>`) isolates environments: a provider configured
  with a selector only sees and evaluates that set's flags.
- One flagd instance serves all environments (simpler ops than N containers; isolation is
  logical, enforced by the selector).
- FMS keeps per-environment definitions in one table (unique per flag+env) — storage is
  environment-agnostic; only publication differs per env.

## 5. Rule compilation (overview)

The dashboard's structured rule model (defined in [03-data-model.md](03-data-model.md)) is
compiled to flagd's JSONLogic-based targeting by a pure function in `domain/flagd-model.ts`:

- **No rules** → no `targeting` property (evaluation reason `STATIC`, cacheable by flagd).
- **Attribute rules** → nested `{"if": [cond, variant, next]}` chain; conditions ANDed with
  `{"and": [...]}`; op mapping: `eq→==="`, `neq→!==`, `in→in` (array form),
  `starts_with/ends_with→starts_with/ends_with`, `gt/gte/lt/lte→>,>=,<,<=`,
  `exists→!!` (strict semantics, no type coercion — `===`/`!==` chosen deliberately).
- **Percentage rule (terminal, FR-18)** → the `fractional` custom operation with **no bucketing
  expression**, so flagd uses its default bucketing value `[flagKey, targetingKey]`:
  per-flag independence and sticky assignment by targeting key (FR-19).
- **Fallback** → `defaultVariant` in the flag definition (the final `else` is implicit).

The compiled document must validate against the official JSON schema
(`https://flagd.dev/schema/v0/flags.json`) — enforced by tests with golden files
([05-testing.md](05-testing.md)).

## 6. Security

| Area | Design |
| --- | --- |
| Admin credentials | `ADMIN_USERNAME` / `ADMIN_PASSWORD` from environment. Local-dev defaults exist (`admin` / `dev-insecure-password`) but `app.ts` refuses to boot with defaults when `NODE_ENV=production`. |
| JWT | HS256, secret from `JWT_SECRET` (random at boot with warning when unset, in dev only). Claims: `sub` (username), `type: "session"`, `exp` (12 h). |
| API keys | `fms_` + 32 random bytes (base62). Only SHA-256 stored. Scopes: `manage`, `evaluate`, `sync`, `all`. Resolution order: bearer is a JWT (session) or a key (hash compare, constant-time). |
| User passwords | Invited users only: a temporary password is generated at invite time, shown once, stored as an argon2id hash (`users`); login matches the env-configured bootstrap admin or `users` (FR-31). No password-change flow in v1 — re-invite reissues a temporary password. |
| Sync endpoint | `sync` scope required (FR-27). flagd is the only expected consumer; key is provisioned in `flagd/config.yaml`. |
| Events stream | `GET /api/v1/events` requires `evaluate` scope or a session (ADR-0008); the payload carries only flag keys + versions — nothing beyond what the management API exposes to the same credential. |
| Audit | Append-only table, no update/delete API (FR-37); audit write participates in the mutation transaction (FR-39). |
| HTTP hardening | `HttpOnly` + `SameSite=Lax` session cookie; `application/problem+json` errors leak no internals; no CORS (same-origin dashboard); JSON body size limit (1 MB). |
| Secrets in repo | None. `docker-compose.yml` reads the sync key from the environment. |

Threats explicitly out of scope for v1: transport encryption (assume trusted network / TLS
terminating proxy), rate limiting, PII redaction in audit.

## 7. Observability

- **Logging**: pino (via Fastify), JSON. Every request: id, route, actor (when authenticated),
  status, duration. Domain events (flag created, definition published, key revoked) as
  structured log lines with the audit id. SSE subscriber connect/disconnect (actor, envs
  filter) and every `flag-changed` emission (with the queued change's audit id) are logged
  the same way.
- **Health**: `GET /healthz` → process alive. `GET /readyz` → `{ status, db: "OK"|"DOWN",
  flagd: { <flagSetId>: "READY"|"STALE"|"ERROR" } }` — `db` from a pool ping, `flagd` derived
  from OpenFeature provider state events per (project, environment), keyed by flag-set ID
  (naming per OQ-6). `readyz` is 503 when the DB is down or any provider is not READY.
- **Sync health in the UI** (FR-47): the dashboard compares stored flag `version` with the
  `version` in flagd flag metadata (exposed by the provider on evaluated flags; a
  `/api/v1/projects/:projectId/flags/:key/observed` helper reads it via a probe evaluation
  per (project, env)) and shows a stale badge when they differ; the badge refreshes on SSE
  events (FR-52) rather than polling.
- **flagd metrics** (8017, Prometheus) are available but not wired into FMS in v1 (non-goal).

## 8. Failure modes & behavior

| Failure | Behavior |
| --- | --- |
| flagd down at boot | API boots; `readyz` 503; `/evaluate` 503 (FR-24); CRUD unaffected. Provider retries per its backoff; `readyz` flips to READY when the gRPC stream establishes. |
| flagd restarts / model resets | flagd re-syncs from FMS within one poll; evaluation unavailable only for that window. |
| FMS API down | flagd keeps serving last synced model (NFR-3). Dashboard/CRUD unavailable. |
| Sync endpoint error (5xx) | flagd keeps last good model, retries on interval. FMS logs the request; a prolonged outage is visible via `readyz` STALE and the UI badge. |
| Concurrent definition edits | Last-writer-wins per (flag, env); the audit log preserves both before/after states. Optimistic locking (version precondition) is a documented v1.1 candidate. |
| MariaDB down | CRUD/audit and `/evaluate` → 503 (`…/errors/unavailable`); `GET /sync/:env` still serves from the sync memo (no commit can happen while the DB is down, so the memo is current) or 503 if never compiled; flagd keeps serving its last model; `readyz` reports `db: "DOWN"`. |
| DB pool exhaustion | Connection-wait timeout → 503, logged with pool stats. |
| SSE client disconnect | Stream closes; no replay on reconnect (ADR-0008) — clients reconcile by re-fetching state. |
| MariaDB data loss | Backup = single-transaction `mariadb-dump` + named volume; restore documented in runbook. |
| JWT secret rotated | Sessions invalid (re-login). Keys unaffected. |

## 9. Configuration (environment variables)

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | HTTP port (API + dashboard + sync) |
| `NODE_ENV` | `development` | `production` enforces no insecure defaults |
| `DATABASE_URL` | dev default matching compose (`mysql://fms:***@127.0.0.1:3306/fms`; refused in production) | MariaDB connection |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | dev defaults (refused in production) | Login credentials |
| `JWT_SECRET` | random per boot (dev warning) | Session signing |
| `FLAGD_HOST` / `FLAGD_PORT` | `localhost` / `8013` | flagd gRPC endpoint for the evaluate proxy |
| `ENVS` | `dev,staging,prod` | Default environment set seeded on each project creation (FR-55); order = display order |
| `SYNC_KEY` | — | Pre-seeded `sync`-scoped API key (logged once at first boot, also settable for compose/flagd) |
| `WEB_DIST` | `web/dist` (repo root) | Built dashboard served at `/` |

## 10. Deployment

**Local / single-host (v1 target):**

```
docker compose up -d            # flagd + mariadb (images pinned; flagd config from flagd/config.yaml)
npm run build:web               # vite build → web/dist
npm run start -w server        # API + dashboard on :3000
```

Dev loop: `npm run dev` (API, watch) + `npm run dev:web` (Vite dev server on :5173, proxying
`/api` → :3000). `docker-compose.yml` ships with the repo and contains **flagd and mariadb**;
the API runs as a Node process (keeps the dev loop simple; a container image for the API is
a v1.1 candidate).

**Later (out of scope for v1):** API container image, TLS termination, Postgres, multi-instance
FMS (incl. boot-time migration locking), multiple flagd instances (see §11).

## 11. Scaling (flagd)

v1 runs a **single flagd**: NFR-2 (100 eval/s) is a small fraction of one instance's
capacity — evaluation is in-memory and the server holds no client state. The design keeps
the scale-up path open with no v1 work:

1. **Do nothing** — one flagd handles a large multiple of v1 load.
2. **Client-side lever first** — the official **flagd HTTP provider** evaluates in-process
   (the client pulls the model over plain HTTP; embedded flagd core evaluates locally).
   High-volume clients opt out of central gRPC load with zero infra change.
3. **Replicate flagd** — flagd is stateless (model = pure function of FMS state, FR-28).
   N replicas pointed at the same sync sources converge within one interval; put an LB in
   front (or clients round-robin across endpoints). No FMS or SDK contract changes;
   selectors/flag sets work per replica. Point `FLAGD_HOST`/`FLAGD_PORT` (evaluate proxy +
   `readyz`) at the LB — a config-only change. Per-replica sync polling stays cheap on the
   FMS side because of the sync model memo (§2.1).
4. **Per-environment flagd instances** — ADR-0004's option 1, only if one environment
   outgrows the rest.

Multi-flagd HA is a v1 non-goal ([01-requirements.md §2](01-requirements.md)).

## 12. References

- flagd — flag definitions & targeting (JSONLogic, custom operations):
  <https://flagd.dev/reference/flag-definitions/>
- flagd — `fractional` operation: <https://flagd.dev/reference/custom-operations/fractional-operation/>
- flagd — sync configuration (HTTP provider, `authHeader`, `interval`, ETag behavior):
  <https://flagd.dev/reference/sync-configuration/>
- flagd — flag sets & selectors: <https://flagd.dev/guides/migrating-to-flag-sets/>
- flagd — JSON schemas (flags, targeting, config): <https://flagd.dev/reference/schema/>
- flagd — Node.js providers (gRPC + HTTP in-process): <https://flagd.dev/providers/nodejs/>
- OpenFeature specification (incl. provider events): <https://openfeature.dev/specification/>
