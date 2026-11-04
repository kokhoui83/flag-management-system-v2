# 04 — API Contract

Base URL: `http://localhost:3000` (same host serves the dashboard at `/`).
All bodies are JSON. Errors are RFC 9457 problem documents
(`application/problem+json`). Requirements referenced as `FR-n` are in
[01-requirements.md](01-requirements.md).

## 1. Authentication

Every `/api/v1/*` route except `POST /api/v1/auth/login` and the health endpoints requires an
`Authorization: Bearer <credential>` header (or the session cookie, which the dashboard sends
automatically).

- **Session token** (JWT): issued by login, 12 h expiry.
- **API key** (`fms_…`): created via the keys API; scopes `manage` | `evaluate` | `sync` | `all`.

Endpoint scopes:

| Scope | Grants |
| --- | --- |
| `manage` | projects (create, environments, invites), flags/definitions CRUD, keys CRUD, audit read, evaluate |
| `evaluate` | `POST /api/v1/evaluate`, `GET /api/v1/events` |
| `sync` | `GET /api/v1/sync/:projectKey/:env` only (consumed by flagd) |
| `all` | everything |

Session tokens are treated as `all`-scoped for the bootstrap admin (FR-30); invited users'
sessions resolve to the capability level of their role / project assignments (FR-53, FR-54).

Errors: missing/invalid credential → `401` (`WWW-Authenticate: Bearer`); valid credential
without scope → `403`; revoked key → `401`.

## 2. Conventions

- **Timestamps**: ISO-8601 UTC (`2026-10-26T12:00:00.000Z`).
- **IDs**: ULID strings.
- **List endpoints**: `?limit=` (default 50, max 200) + `?before=<id>` cursor; response
  includes `nextBefore` (null at end).
- **Idempotency**: `PUT` is full-replace and idempotent; `POST` is not.
- **Concurrency**: last-writer-wins in v1 (see architecture §8).

### 2.1 Error shape

```json
{
  "type": "https://fms.local/errors/validation",
  "title": "Invalid definition",
  "status": 400,
  "detail": "2 validation problem(s)",
  "errors": [
    { "pointer": "/rules/1/splits/0/weight", "message": "weight must be > 0" },
    { "pointer": "/rules/0/variant", "message": "variant 'yes' does not exist" }
  ]
}
```

Common `type` URIs: `…/errors/validation` (400), `…/errors/not-found` (404),
`…/errors/unauthorized` (401), `…/errors/forbidden` (403), `…/errors/unavailable` (503).

## 3. Auth

### `POST /api/v1/auth/login`

Credentials are either the env-configured bootstrap admin (FR-30) or an invited user
(username + temporary password from an invite, FR-57; §13).

```json
// request
{ "username": "admin", "password": "…" }
// 200 response
{ "token": "eyJ…", "expiresAt": "2026-10-27T00:00:00.000Z" }
// + Set-Cookie: fms_token=eyJ…; HttpOnly; SameSite=Lax; Path=/; Max-Age=43200
// 401 on bad credentials (audit: auth.login on success only)
```

### `POST /api/v1/auth/logout`

`204`. Clears the cookie. (Stateless JWT: server-side expiry is not enforced; the cookie is
deleted and the token simply ignored by the client. Documented v1 behavior.)

## 4. Flags (project-scoped)

Flag routes live under the owning project (`flags.project_id` is NOT NULL — 03 §1);
`:projectId` is the project's ULID, and flag keys are unique within the project (FR-56).

### `GET /api/v1/projects/:projectId/flags`

```json
{
  "flags": [
    {
      "key": "new-checkout",
      "description": "Checkout v2 rollout",
      "version": 7,
      "createdAt": "2026-10-01T09:00:00.000Z",
      "updatedAt": "2026-10-20T15:30:00.000Z",
      "environments": {
        "dev":     { "enabled": true,  "variantType": "boolean" },
        "staging": { "enabled": true,  "variantType": "boolean" },
        "prod":    { "enabled": false, "variantType": "boolean" }
      }
    }
  ],
  "nextBefore": null
}
```

`environments` omits environments with no definition (`FR-7`). `variantType` is
`boolean` | `number` | `string` derived from the (any) definition's variants.

### `POST /api/v1/projects/:projectId/flags`

```json
// request
{ "key": "new-checkout", "description": "Checkout v2 rollout" }
// 201 response — flag as in GET (environments: {})
// 409 if the key already exists in the project; 400 if key invalid (FR-1)
// 403 without `manage`, or without an admin/developer assignment to the project
//     (FR-58; product owners may only toggle, FR-59)
```

### `GET /api/v1/projects/:projectId/flags/:key`

```json
{
  "key": "new-checkout",
  "description": "Checkout v2 rollout",
  "version": 7,
  "createdAt": "…",
  "updatedAt": "…",
  "definitions": {
    "staging": {
      "enabled": true,
      "variants": { "on": true, "off": false },
      "defaultVariant": "off",
      "rules": [
        { "type": "attribute",
          "conditions": [ { "attribute": "email", "op": "ends_with", "value": "@acme.com" } ],
          "variant": "on" },
        { "type": "percentage", "splits": [ { "variant": "on", "weight": 25 }, { "variant": "off", "weight": 75 } ] }
      ],
      "updatedAt": "2026-10-20T15:30:00.000Z"
    }
  }
}
// 404 if unknown flag
```

### `GET /api/v1/projects/:projectId/flags/:key/observed`

Internal helper backing the dashboard sync-health badge (FR-47; architecture §7). Runs a probe
evaluation for each environment of the project via the per-(project, env) flagd provider and
returns the flagd-observed version and enablement for each environment:

```json
{
  "key": "new-checkout",
  "observed": {
    "dev":     { "version": 7, "enabled": true,  "variantType": "boolean" },
    "staging": { "version": 7, "enabled": true,  "variantType": "boolean" }
  }
}
```

Environments with no definition are omitted (FR-7). Requires `evaluate` scope or a session.

### `PUT /api/v1/projects/:projectId/flags/:key`

```json
// request: { "description": "…" }   // description update only (key is immutable)
// 200 → updated flag; 404 unknown
// 403 without `manage` or an admin/developer assignment (product owner → 403, FR-59)
```

### `DELETE /api/v1/projects/:projectId/flags/:key`

`204`. Deletes flag + all definitions + audit row recording full before-state (FR-4).
Admin-only in v1 (`manage`/`all` key, or a global or project-scoped admin); developers and
product owners → `403`.

## 5. Definitions

### `PUT /api/v1/projects/:projectId/flags/:key/definitions/:env`

Full replace of one environment's definition (create or update).

```json
// request
{
  "enabled": true,
  "variants": { "on": true, "off": false },
  "defaultVariant": "off",
  "rules": [
    { "type": "attribute",
      "conditions": [ { "attribute": "email", "op": "ends_with", "value": "@acme.com" } ],
      "variant": "on" },
    { "type": "percentage", "splits": [ { "variant": "on", "weight": 25 }, { "variant": "off", "weight": 75 } ] }
  ]
}
// 200 → { "flagKey": "new-checkout", "env": "staging", "version": 8 }
// 400 all-at-once validation problems (§2.1, FR-14); 404 unknown flag/env
// 403 without `manage` or an admin/developer assignment (FR-58)
```

`PUT` is the create-or-update path and also the toggle path: changing only `enabled` bumps the
flag version and is audited as `definition.update`. A product owner assigned to the project may
submit a definition update **only** when every field except `enabled` is byte-for-byte equal to
the stored definition; any variant/rule/default change is `403` (FR-59). An identical `PUT`
(idempotent no-op) is accepted and does not bump the version (FR-5).

Constraints (rejected with `400`): variant name rules and type homogeneity (FR-11);
`defaultVariant` ∈ variants (FR-12); rule shape per [03-data-model.md §2](03-data-model.md);
percentage rule terminal + at most one (FR-17/FR-18); variant references exist (FR-16).

### `POST /api/v1/projects/:projectId/flags/:key/definitions/:env/copy`

```json
// request
{ "fromEnv": "dev" }
// 200 → { "flagKey": "new-checkout", "env": "staging", "version": 9 }
// 404 if source env has no definition
// 400 if fromEnv == env
// 403 without `manage` or an admin/developer assignment (product owner → 403, FR-59)
```

Replaces the target definition with a copy of the source (FR-9); audited as
`definition.copy` with `copiedFrom` in the after-state.

## 6. Sync (consumed by flagd)

### `GET /api/v1/sync/:projectKey/:env`

Requires an API key with `sync` scope, or an admin session authorized for the requested project
(FR-27). A project-scoped admin session cannot fetch another project's model; a `sync` API key is
not project-bound. Returns the flagd model document for the (project, environment) flag set
(format: [03-data-model.md §3.1](03-data-model.md)).

```
GET /api/v1/sync/checkout/staging
Authorization: Bearer fms_…

200 OK
ETag: "fms-a1b2c3"
Content-Type: application/json

{ "metadata": { "flagSetId": "checkout:staging", … }, "flags": { … } }

304 Not Modified            ← when If-None-Match matches the current ETag (including weak/list/wildcard forms)
404                         ← unknown project or environment
```

Behavior: byte-stable serialization per state (FR-28); ETag is a quoted strong entity tag and
excludes the `generatedAt` metadata field. `If-None-Match` uses HTTP weak comparison, supports
entity-tag lists and `*`, and 304 responses carry the current `ETag` header.

Errors: unauthenticated → `401`; without the required API-key scope or project admin access →
`403`; unknown project or environment → `404`.

## 7. Evaluate

### `POST /api/v1/evaluate`

Requires `evaluate` scope or a session. The server picks the typed OpenFeature call from the
flag's stored variant type — the client never specifies a type. `projectKey` + `flagKey`
identify the flag (keys are unique per project, FR-56); `environment` must be one of that
project's environments (FR-55).

```json
// request
{
  "projectKey": "checkout",
  "flagKey": "new-checkout",
  "environment": "staging",
  "targetingKey": "user-42",
  "context": { "email": "user42@acme.com" }
}
// 200 response
{
  "value": true,
  "variant": "on",
  "reason": "TARGETING_MATCH",
  "flagVersion": 8
}
```

| Case | Response |
| --- | --- |
| Unknown `projectKey`, or flag key not in that project | `404` not-found |
| Unknown/missing `environment` (or not an environment of the project) | `400` |
| Malformed `context` (not an object) / `targetingKey` not a string | `400` |
| Flag disabled in that environment | `200` with `{ "value": null, "variant": null, "reason": "DISABLED", "flagVersion": n }` |
| flagd provider not READY (down / sync stalled past grace) | `503` unavailable — *no* defaulted value (FR-24) |
| flagd reports evaluation error (e.g. invalid model — should be impossible post-validation) | `502` with `errorCode`/`errorMessage` surfaced |

`flagVersion` is read from flag metadata returned by flagd (observed model version; also the
basis of the dashboard's stale indicator, FR-47).

`targetingKey` is optional for flags without a percentage rule. For a flag whose definition
contains a percentage rule, omitting it yields flagd's single deterministic bucket (FR-19);
the dashboard playground blocks evaluation until a targeting key is supplied (FR-44).

## 8. API keys

### `GET /api/v1/api-keys`

```json
{
  "keys": [
    {
      "id": "01J…",
      "name": "flagd-sync",
      "prefix": "fms_7f3a",
      "scope": "sync",
      "createdAt": "…",
      "lastUsedAt": "…",
      "revokedAt": null
    }
  ]
}
```

### `POST /api/v1/api-keys`

```json
// request
{ "name": "flagd-sync", "scope": "sync" }
// 201 response
{ "id": "01J…", "name": "flagd-sync", "scope": "sync", "key": "fms_7f3a…(plaintext, shown once)" }
```

Plaintext is never returned again (FR-32).

### `DELETE /api/v1/api-keys/:id`

`204` — revokes (immediately invalid, FR-34); audited.

## 9. Audit

### `GET /api/v1/audit`

Query: `limit` (≤ 200), `before` (ULID cursor), `action`, `entity`, `actor` (substring on
actor name).

```json
{
  "entries": [
    {
      "id": "01J…",
      "createdAt": "2026-10-26T12:00:00.000Z",
      "actorType": "session",
      "actorName": "admin",
      "action": "definition.update",
      "entity": "definition",
      "entityId": "new-checkout:staging",
      "env": "staging",
      "before": { "…": "definition payload" },
      "after":  { "…": "definition payload" }
    }
  ],
  "nextBefore": "01J…"
}
```

Append-only (FR-37): no write endpoints exist.

## 10. Health

### `GET /healthz`

Unauthenticated. `200 { "status": "ok" }` when the process is alive.

### `GET /readyz`

Unauthenticated. `200` when the process is alive, the database is reachable, and all environment providers are READY; otherwise `503`:

```json
{
  "status": "not_ready",
  "db": "OK",
  "flagd": {
    "checkout:dev": "READY",
    "checkout:staging": "STALE",
    "checkout:prod": "ERROR"
  }
}
```

Provider states from OpenFeature events per (project, environment), keyed by flag-set ID
`<projectKey>:<env>` (`READY` / `STALE` / `ERROR`; OQ-6 resolution, architecture §7) — the
example above shows the default environment set of project `checkout`. Readiness is not ready
while the database reports `"DOWN"` or any provider is not `READY`.

## 11. OpenAPI

The hand-maintained `server/openapi.json` (decided in M1; no codegen/glue library) is
published at `/api/v1/openapi.json` and updated in the same milestone as every API change;
on conflict, this document + tests win. The M1/M2 surface is documented today; M3 adds
evaluate/events/observed and M5 verifies completeness against this contract. (SSE is specified
here in §12; OpenAPI represents it as a `text/event-stream` response.)

## 12. Events (SSE)

### `GET /api/v1/events`

Requires `evaluate` scope or a session. Optional filter `?envs=` (comma-separated
flag-set IDs `<projectKey>:<env>`; unknown value → `400`).

```
GET /api/v1/events?envs=checkout:staging
Authorization: Bearer fms_…

200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive

: keepalive (comment line, every 15 s)

event: flag-changed
data: {"projectKey":"checkout","env":"staging","flagSetId":"checkout:staging","flagKey":"new-checkout","version":8,"at":"2026-10-28T12:00:03.250Z"}

event: provider-ready
data: {"projectKey":"checkout","env":"staging","flagSetId":"checkout:staging","at":"2026-10-28T12:00:05.000Z"}

event: provider-error
data: {"projectKey":"checkout","env":"staging","flagSetId":"checkout:staging","at":"2026-10-28T12:00:07.000Z"}
```

Semantics (ADR-0008):

- `flag-changed` is emitted **only after** FMS's own per-(project, env) provider observes the
  new model
  in flagd — it means *flagd in `env` is now serving `flagKey` at version ≥ `version`*.
  There is no early window.
- No replay: events are not retained. After a disconnect, reconnect and re-fetch state to
  reconcile (FR-51).
- `provider-ready` / `provider-error` fire on per-(project, env) provider state transitions
  — the same states `readyz` reports (architecture §7).
- The stream carries only flag keys + versions: nothing beyond what the management API
  already exposes to the same credential.

## 13. Projects, users & multi-user access

Covers the dashboard requirements FR-53–FR-59 (multi-user access, per-project environments and
flags, role-based access). See [01-requirements.md §4.9.1](01-requirements.md).

### `GET /api/v1/projects`

Lists the projects visible to the caller: all projects for an `admin` session or a
`manage`/`all` API key; only assigned projects for `developer` and `product-owner` sessions
(FR-53, FR-54, FR-57). API keys are scope-based and carry no project assignments; an
`evaluate`/`sync` key cannot list projects (`403`).

```json
{
  "projects": [
    {
      "id": "01J…",
      "key": "checkout",
      "name": "Checkout",
      "environments": ["dev", "staging", "prod"],
      "members": [
        { "user": "admin", "role": "admin" },
        { "user": "brian", "role": "developer" }
      ]
    }
  ]
}
```

### `POST /api/v1/projects`

Admin (`manage` scope) creates a project and seeds the default environment set
(`dev`, `staging`, `prod`) (FR-55); additional per-project environments are added via
`POST /api/v1/projects/:projectId/environments` (admin or an assigned developer —
FR-55/FR-58).

```json
// request
{ "key": "checkout", "name": "Checkout" }
// 201 response → project as in GET /api/v1/projects; 403 without `manage`
// 409 if the name (or key) is already taken — projects are unique (FR-55, FR-56)
```

### `POST /api/v1/projects/:projectId/environments`

Admin (`manage` scope) or a developer assigned to the project (FR-58) adds a custom
environment to the project's environment set (FR-55). A product owner assigned to the project
cannot add environments (`403`, FR-59):

```json
// request
{ "env": "qa" }
// 201 → project as in GET /api/v1/projects (environments now includes "qa")
// 400 if the env name is invalid (`^[a-z][a-z0-9-]{0,63}$`, FR-55)
// 409 if the environment already exists in the project
// 403 without `manage` or an assignment to the project (FR-58)
```

### `POST /api/v1/projects/:projectId/members` — invite

Admin (`manage` scope) invites a user with a role and assigns one or more projects
(`FR-57`):

```json
// request
{ "username": "brian", "role": "developer", "projectIds": ["01J…"] }
// 201 → { "user": "brian", "role": "developer", "projects": ["01J…"],
//          "password": "temp-…(generated, shown once — FR-57)" }
// 403 without `manage`
```

The invite creates the user if absent (temporary password, FR-57), sets the global role,
and upserts the memberships — one audited operation (`project.member.invite`; the
after-state never includes the password). Re-inviting an existing user updates the
assignment and reissues a temporary password.

### `GET /api/v1/projects/:projectId/members`

Admin (`manage` scope) lists the members of a project with their assigned roles (FR-57).

## 14. Flag scoping per project (FR-56)

All flag routes are project-scoped (§4/§5 live under `projects/:projectId`) — a flag belongs
to exactly one project, is available in all environments of that project, and carries state
unique per environment (FR-56). There are no unscoped flag routes: every flag row has a
`project_id` (03 §1), so every flag operation names its project.

Authorization (capability matrix in [01-requirements.md §4.9.1](01-requirements.md)):

- Global admin session / `manage`/`all` key: any project — full access, including flag
  delete, member invites, environment creation, and audit/key management (FR-57).
- A project member with role `admin` holds the project-scoped admin capabilities on that
  project only (FR-54).
- Developer: assigned projects only — create flags and environments, edit/copy definitions,
  and toggle state (FR-58).
- Product owner: assigned projects only — view and toggle state. A definition `PUT` is
  accepted only when `enabled` is the sole change; any variant/rule/default edit, flag
  create/delete, environment create, or copy → `403` (FR-59).
- Any other caller → `403`.

Environment-scoped operations remain environment-isolated: changing one environment's
definition never affects another environment of the same flag (FR-8), and versions bump per
changed definition only (FR-5).
