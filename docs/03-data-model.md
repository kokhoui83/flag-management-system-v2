# 03 — Data Model & flagd Model Compilation

This document defines (a) the MariaDB schema, (b) FMS's canonical rule format, and
(c) the compilation from FMS state to flagd model documents. All requirements referenced as
`FR-n` are in [01-requirements.md](01-requirements.md).

## 1. MariaDB schema

MariaDB (InnoDB, `utf8mb4`), single database (`fms`). Timestamps are `DATETIME(6)` UTC —
formatted ISO-8601 at the API boundary. JSON columns hold canonical JSON; they are validated
in app code and never touched by JSON operators in domain queries (ADR-0007). Migrations:
via Prisma (`prisma migrate`), initial migration generated in `prisma/migrations/<timestamp>_init/migration.sql`;
this section is the reference for the initial migration.

```sql
CREATE TABLE flags (
  id          CHAR(26) PRIMARY KEY,             -- ULID
  project_id CHAR(26) NOT NULL,                 -- owning project (FR-56)
  key         VARCHAR(128) NOT NULL,            -- unique within the project (FR-56)
  description VARCHAR(1024) NOT NULL DEFAULT '',-- FR-2
  version     INT NOT NULL DEFAULT 1,           -- FR-5, bumped per definition change
  created_at  DATETIME(6) NOT NULL,
  updated_at  DATETIME(6) NOT NULL,
  UNIQUE (project_id, key)                     -- FR-56: a flag key belongs to one project only
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE flag_definitions (
  id              CHAR(26) PRIMARY KEY,         -- ULID
  flag_id         CHAR(26) NOT NULL REFERENCES flags(id) ON DELETE CASCADE,
  env             VARCHAR(64) NOT NULL,         -- validated against the project's env set (FR-6 / FR-55)
  enabled         TINYINT(1) NOT NULL,          -- FR-10
  variants        JSON NOT NULL,                -- object: name -> value (FR-11)
  default_variant VARCHAR(64) NOT NULL,         -- must exist in variants (FR-12)
  rules           JSON NOT NULL,                -- rule array, §2 (FR-13)
  created_at      DATETIME(6) NOT NULL,
  updated_at      DATETIME(6) NOT NULL,
  UNIQUE (flag_id, env)                         -- FR-7
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE api_keys (
  id           CHAR(26) PRIMARY KEY,            -- ULID
  name         VARCHAR(128) NOT NULL,
  key_hash     CHAR(64) NOT NULL UNIQUE,        -- SHA-256 hex of plaintext (FR-32)
  key_prefix   VARCHAR(8) NOT NULL,             -- first 8 chars of plaintext, for display
  scope        VARCHAR(16) NOT NULL CHECK (scope IN ('manage','evaluate','sync','all')),
  created_at   DATETIME(6) NOT NULL,
  last_used_at DATETIME(6),
  revoked_at   DATETIME(6),
  created_by   VARCHAR(128) NOT NULL            -- actor name
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE audit_logs (
  id         CHAR(26) PRIMARY KEY,              -- ULID, also pagination cursor (FR-38)
  created_at DATETIME(6) NOT NULL,
  actor_type VARCHAR(16) NOT NULL CHECK (actor_type IN ('session','api_key')),
  actor_name VARCHAR(128) NOT NULL,             -- username or key name
  action     VARCHAR(64) NOT NULL,              -- dot-namespaced, see §5
  entity     VARCHAR(32) NOT NULL,              -- 'flag' | 'definition' | 'api_key' | 'auth' | 'project'
  entity_id  VARCHAR(256) NOT NULL,             -- flag key / def id / key id / '-'
  env        VARCHAR(64),                       -- NULL when not environment-specific
  before     JSON,                              -- or NULL
  after      JSON                               -- or NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_defs_flag     ON flag_definitions (flag_id);
CREATE INDEX idx_audit_created ON audit_logs (created_at, id);
CREATE INDEX idx_audit_entity  ON audit_logs (entity, entity_id);
```

Multi-user / project scope tables (requirements FR-53–FR-59):

```sql
CREATE TABLE projects (
  id          CHAR(26) PRIMARY KEY,             -- ULID
  key         VARCHAR(128) NOT NULL UNIQUE,     -- application key; globally unique (2 projects cannot share a name)
  name        VARCHAR(255) NOT NULL UNIQUE,     -- project name; unique per FMS (user requirement)
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE project_environments (
  project_id  CHAR(26) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  env         VARCHAR(64) NOT NULL,             -- per-project environment name (FR-55); name format per FR-55
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  PRIMARY KEY (project_id, env)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE users (
  user_name     VARCHAR(128) PRIMARY KEY,       -- invited username (FR-53/FR-57); the bootstrap admin (FR-30) is env-configured and not stored here
  password_hash VARCHAR(255) NOT NULL,          -- argon2id hash of the invite temporary password; plaintext never stored (FR-57)
  global_role   VARCHAR(32) NOT NULL CHECK (global_role IN ('admin','developer','product-owner')),  -- FR-54
  created_at    DATETIME(6) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE project_memberships (
  user_name   VARCHAR(128) NOT NULL REFERENCES users(user_name) ON DELETE CASCADE,
  project_id  CHAR(26) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  role        VARCHAR(32) NOT NULL CHECK (role IN ('admin','developer','product-owner')),
  created_at DATETIME(6) NOT NULL,
  PRIMARY KEY (user_name, project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

Invariants (enforced in application code, transactionally):

- A flag belongs to exactly one project and its key is unique within that project (FR-56); the
  flag is available in all environments of the project while enabled state / definitions stay
  unique per environment (FR-7/FR-8 semantics applied per project).
- A project name (`projects.name`) and key (`projects.key`) are unique — two projects cannot
  share a name (user requirement); project creation collides on name/key are rejected with `409`.
- Each flag definition is scoped to its owning project (`flags.project_id`) and its environment
  (`flag_definitions.env`) — the flag ↔ project ↔ env linkage the user requirements ask for;
  the (flag, env) pair stays unique within the project (FR-7).
- Effective permissions of a user = union of the user's global type (`users.global_role`)
  and per-project grants (`project_memberships.role`) (FR-54); `admin` holds full access on
  assigned projects (FR-57). Developers and product owners only operate on projects they
  are assigned to (FR-58/FR-59); other assignments fail with `403`. The bootstrap admin
  (FR-30, env-configured) has full access and is not a `users` row.
- Invited users exist only as `users` rows created by an invite (FR-57): the temporary
  password is shown once and only its argon2id hash is stored; login verifies against
  `users` (or the env-configured bootstrap admin) (FR-31).
- Per-project environment names match `^[a-z][a-z0-9-]{0,63}$` and are unique within the
  project (`project_environments` PK) (FR-55).
- `flags.version` increments by exactly 1 per definition upsert (create or update) on that
  flag, in any environment (FR-5).
- `flag_definitions.rules` is always a valid canonical rule array per §2 (validated before
  insert; FR-14).
- `audit_logs` has no UPDATE/DELETE path anywhere in the codebase (FR-37).
- Boot-time migration assumes a single API instance (ADR-0007); concurrent first boots are a
  v1.1 concern.

## 2. Canonical rule format

Stored in `flag_definitions.rules`. JSON array, **ordered**, first-match-wins (FR-15–FR-20).

```jsonc
// one attribute rule followed by a terminal percentage rule
[
  {
    "type": "attribute",
    "conditions": [
      { "attribute": "email", "op": "ends_with", "value": "@acme.com" },
      { "attribute": "plan",  "op": "eq",        "value": "enterprise" }
    ],
    "variant": "on"
  },
  {
    "type": "percentage",
    "splits": [
      { "variant": "on",  "weight": 25 },
      { "variant": "off", "weight": 75 }
    ]
  }
]
```

### 2.1 `attribute` rule

| Field | Type | Constraint |
| --- | --- | --- |
| `type` | `"attribute"` | literal |
| `conditions` | non-empty array | all must hold (AND) |
| `conditions[].attribute` | string | 1–128 chars; must not start with `$`; may be `targetingKey` |
| `conditions[].op` | enum | `eq`, `neq`, `in`, `starts_with`, `ends_with`, `gt`, `gte`, `lt`, `lte`, `exists` |
| `conditions[].value` | per op | see below |
| `variant` | string | must exist in `variants` (FR-16) |

`value` rules:

| op | value |
| --- | --- |
| `eq`, `neq` | scalar string or number (strict comparison — no type coercion) |
| `in` | non-empty array of scalars (string or number; elements share one type) |
| `starts_with`, `ends_with` | non-empty string |
| `gt`, `gte`, `lt`, `lte` | number |
| `exists` | absent (property not allowed) |

Shape mismatches (e.g. `gt` with a string value, `in` with a scalar) are validation errors
reported per FR-14.

### 2.2 `percentage` rule

| Field | Type | Constraint |
| --- | --- | --- |
| `type` | `"percentage"` | literal |
| `splits` | non-empty array | at most one percentage rule per definition, and it must be last (FR-17/FR-18) |
| `splits[].variant` | string | must exist in `variants`; variants may not repeat within `splits` |
| `splits[].weight` | number | > 0; relative (weights need not sum to 100) |

Semantics (delegated to flagd's `fractional` operation): traffic reaching this rule is
distributed proportionally to weights, deterministically per `targetingKey` (sticky, FR-19),
salted by flag key so independent flags split independently. If no `targetingKey` is supplied
at evaluation, all such evaluations land in the same bucket — the playground enforces a
targeting key for flags containing a percentage rule (FR-19).

### 2.3 Validation summary (all-at-once, FR-14)

Validation returns the full list of problems, each with a JSON pointer into the request body
(e.g. `rules[2].conditions[0].value`), so the dashboard can display every error at once.

## 3. flagd model compilation

### 3.1 Output document shape

`compile(flags, env)` — pure function — emits, per environment, the document served at
`GET /api/v1/sync/:env` (FR-26):

```json
{
  "$schema": "https://flagd.dev/schema/v0/flags.json",
  "metadata": { "flagSetId": "staging", "generator": "fms", "generatedAt": "2026-10-26T12:00:00Z" },
  "flags": {
    "new-checkout": {
      "state": "ENABLED",
      "variants": { "on": true, "off": false },
      "defaultVariant": "off",
      "targeting": { "...": "JSONLogic, §3.2" },
      "metadata": { "version": 7 }
    }
  }
}
```

Rules of compilation:

- Set-level `metadata.flagSetId` = the environment name (ADR-0004).
- `state` = `"ENABLED"` if `enabled`, else `"DISABLED"` (FR-10; disabled flags evaluate with
  `reason=DISABLED` and no value).
- `variants` copied verbatim from the definition (type homogeneity already enforced at write
  time, FR-11).
- `defaultVariant` = `default_variant` (FR-12).
- `targeting` present only when `rules` is non-empty; otherwise omitted (evaluation reason
  `STATIC` — cacheable).
- Flag-level `metadata.version` = `flags.version` (FR-5) — visible to consumers via OpenFeature
  flag metadata and used by the dashboard's sync-health badge (FR-47).
- Serialization: object keys sorted, no whitespace → byte-stable for a given state
  (FR-28). ETag = `"fms-" + SHA-256 hex of body`; the endpoint honors `If-None-Match` with
  `304` (FR-26).
- `generatedAt` is the **only** non-state-derived field; it is excluded from the ETag
  computation (ETag is computed over the body without the `metadata.generatedAt` field).
- The emitted document is validated against the official JSON schema in tests (NFR-9).

### 3.2 Targeting compilation

Input: ordered rule list. Output: a single JSONLogic expression (the `targeting` value) whose
evaluation resolves to a variant name (or `null` → `defaultVariant`).

**Attribute rule → condition expression.**
Conditions combine with `and`:

```json
{ "and": [
    { "ends_with": [ { "var": "email" }, "@acme.com" ] },
    { "===":       [ { "var": "plan" }, "enterprise" ] }
] }
```

Op mapping (strict; no coercion — deliberate, see ADR-0005):

| FMS op | JSONLogic |
| --- | --- |
| `eq` | `{ "===": [ { "var": attr }, value ] }` |
| `neq` | `{ "!==": [ { "var": attr }, value ] }` |
| `in` | `{ "in": [ value, [list...] ] }` (array form = membership) |
| `starts_with` | `{ "starts_with": [ { "var": attr }, value ] }` |
| `ends_with` | `{ "ends_with": [ { "var": attr }, value ] }` |
| `gt` / `gte` / `lt` / `lte` | `{ ">": [...] }` / `">="` / `"<"` / `"<="` |
| `exists` | `{ "!!": [ { "var": attr } ] }` |

**Rule list → nested `if` chain.**
First-match-wins compiles to right-nested `if`s (JsonLogic `if` supports multiple branches, but
right-nesting keeps the generator trivial and the output stable):

```
rules = [r1, r2, r3(percentage)]   →
{ "if": [ cond(r1), variant(r1),
          { "if": [ cond(r2), variant(r2),
                    fractional(r3) ] } ] }
```

**Percentage rule (terminal) → `fractional`.**
No bucketing expression is emitted, so flagd uses its built-in default bucketing value
`[flagKey, targetingKey]` — independent per flag, sticky per targeting key (FR-19):

```json
{ "fractional": [
    [ "on",  25 ],
    [ "off", 75 ]
] }
```

Weights are emitted verbatim (relative; flagd normalizes). Because `fractional` must be the
last expression in the chain, a percentage rule mid-list is rejected at validation time
(FR-18) — this is the only place the "terminal" constraint matters (ADR-0005).

**No rules** → no `targeting` property at all.

### 3.3 Worked example

Definition for flag `new-checkout` (boolean variants `on`/`off`, default `off`), environment
`staging`:

- enabled
- rules:
  1. attribute: `email ends_with "@acme.com"` → `on`
  2. percentage: `on` 25 / `off` 75

Compiled flag entry:

```json
{
  "state": "ENABLED",
  "variants": { "on": true, "off": false },
  "defaultVariant": "off",
  "targeting": {
    "if": [
      { "ends_with": [ { "var": "email" }, "@acme.com" ] },
      "on",
      { "fractional": [ [ "on", 25 ], [ "off", 75 ] ] }
    ]
  },
  "metadata": { "version": 7 }
}
```

Evaluation outcomes:

| Context | Variant | Reason |
| --- | --- | --- |
| `email: "x@acme.com"` | `on` | `TARGETING_MATCH` |
| `targetingKey: "user-42"` (no email), bucket in top 25% | `on` | `TARGETING_MATCH` |
| `targetingKey: "user-42"`, bucket in bottom 75% | `off` | `TARGETING_MATCH` |
| `{}` (no matching attribute; fractional without targetingKey → single bucket, deterministic) | deterministic variant | `TARGETING_MATCH` |
| no rules at all (hypothetical) | `off` | `STATIC` |
| flag disabled | *(none)* | `DISABLED` |

### 3.4 Compile-time error surface

The compiler is total over validated input — it never throws for well-formed state. Defensive
preconditions (variant referenced by a rule exists, etc.) are invariants of the store, checked
in tests (property-based golden tests, §[05-testing](05-testing.md)).

## 4. Version & id conventions

- **ULIDs** for all primary keys (sortable, no coordination needed).
- **Flag version** (FR-5): starts at 1 on flag creation; +1 on every definition upsert for
  that flag in *any* environment. Used for: flagd metadata (observed in UI), future optimistic
  locking, audit correlation.
- **Audit cursor** (FR-38): `id` (ULID) is monotonic; `GET /audit?before=<ulid>` pages.

## 5. Audit action names

| Action | Entity | Notes |
| --- | --- | --- |
| `flag.create` | `flag` | after = flag row |
| `flag.update` | `flag` | before/after = description |
| `flag.delete` | `flag` | before = full flag incl. definitions |
| `definition.create` / `definition.update` | `definition` | env set; before/after = definition payload |
| `definition.copy` | `definition` | env = target; after includes `copiedFrom` env |
| `project.create` | `project` | after = project (FR-55) |
| `project.environment.create` | `project` | env set; after = { env } (FR-55) |
| `project.member.invite` | `project` | after = { user, role, projects }; never includes the temporary password (FR-57) |
| `api_key.create` / `api_key.revoke` | `api_key` | never includes key material |
| `auth.login` | `auth` | success only |
