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
| `manage` | flags/definitions CRUD, keys CRUD, audit read, evaluate |
| `evaluate` | `POST /api/v1/evaluate` only |
| `sync` | `GET /api/v1/sync/:env` only (consumed by flagd) |
| `all` | everything |

Session tokens are treated as `all`-scoped (admin identity, FR-30).

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

```json
// request
{ "username": "admin", "password": "…" }
// 200 response
{ "token": "eyJ…", "expiresAt": "2026-10-26T24:00:00.000Z" }
// + Set-Cookie: fms_token=eyJ…; HttpOnly; SameSite=Lax; Path=/; Max-Age=43200
// 401 on bad credentials (audit: auth.login on success only)
```

### `POST /api/v1/auth/logout`

`204`. Clears the cookie. (Stateless JWT: server-side expiry is not enforced; the cookie is
deleted and the token simply ignored by the client. Documented v1 behavior.)

## 4. Flags

### `GET /api/v1/flags`

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

### `POST /api/v1/flags`

```json
// request
{ "key": "new-checkout", "description": "Checkout v2 rollout" }
// 201 response — flag as in GET (environments: {})
// 409 if key exists; 400 if key invalid (FR-1)
```

### `GET /api/v1/flags/:key`

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

### `PUT /api/v1/flags/:key`

```json
// request: { "description": "…" }   // description update only (key is immutable)
// 200 → updated flag; 404 unknown
```

### `DELETE /api/v1/flags/:key`

`204`. Deletes flag + all definitions + audit row recording full before-state (FR-4).

## 5. Definitions

### `PUT /api/v1/flags/:key/definitions/:env`

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
```

Constraints (rejected with `400`): variant name rules and type homogeneity (FR-11);
`defaultVariant` ∈ variants (FR-12); rule shape per [03-data-model.md §2](03-data-model.md);
percentage rule terminal + at most one (FR-17/FR-18); variant references exist (FR-16).

### `POST /api/v1/flags/:key/definitions/:env/copy`

```json
// request
{ "fromEnv": "dev" }
// 200 → { "flagKey": "new-checkout", "env": "staging", "version": 9 }
// 404 if source env has no definition
// 400 if fromEnv == env
```

Replaces the target definition with a copy of the source (FR-9); audited as
`definition.copy` with `copiedFrom` in the after-state.

## 6. Sync (consumed by flagd)

### `GET /api/v1/sync/:env`

Requires `sync` scope (FR-27). Returns the flagd model document for the environment's flag set
(format: [03-data-model.md §3.1](03-data-model.md)).

```
GET /api/v1/sync/staging
Authorization: Bearer fms_…

200 OK
ETag: "fms-a1b2c3…"
Content-Type: application/json

{ "metadata": { "flagSetId": "staging", … }, "flags": { … } }

304 Not Modified            ← when If-None-Match matches the current ETag
404                         ← unknown environment
```

Behavior: byte-stable serialization per state (FR-28); ETag excludes the `generatedAt`
metadata field; 304 responses carry the current `ETag` header.

## 7. Evaluate

### `POST /api/v1/evaluate`

Requires `evaluate` scope or a session. The server picks the typed OpenFeature call from the
flag's stored variant type — the client never specifies a type.

```json
// request
{
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
| Unknown flag key | `404` not-found |
| Unknown/missing `environment` | `400` |
| Malformed `context` (not an object) / `targetingKey` not a string | `400` |
| Flag disabled in that environment | `200` with `{ "value": null, "variant": null, "reason": "DISABLED", "flagVersion": n }` |
| flagd provider not READY (down / sync stalled past grace) | `503` unavailable — *no* defaulted value (FR-24) |
| flagd reports evaluation error (e.g. invalid model — should be impossible post-validation) | `502` with `errorCode`/`errorMessage` surfaced |

`flagVersion` is read from flag metadata returned by flagd (observed model version; also the
basis of the dashboard's stale indicator, FR-47).

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

Unauthenticated. `200` when all environment providers are READY, else `503`:

```json
{
  "status": "not_ready",
  "flagd": { "dev": "READY", "staging": "STALE", "prod": "ERROR" }
}
```

Provider states from OpenFeature events per environment (`READY` / `STALE` / `ERROR`,
see architecture §7).

## 11. OpenAPI

A hand-maintained `openapi.yaml` (or generated via Fastify's `fastify-openapi-glue`, decided
in M1) is published at `/api/v1/openapi.json` from M1 onward and kept in sync with this
document; on conflict, this document + tests win.
