# 03 — Data Model & flagd Model Compilation

This document defines (a) the SQLite schema, (b) FMS's canonical rule format, and
(c) the compilation from FMS state to flagd model documents. All requirements referenced as
`FR-n` are in [01-requirements.md](01-requirements.md).

## 1. SQLite schema

SQLite (WAL mode). Timestamps are ISO-8601 UTC strings (`TEXT`) — no type portability cost,
JSON-friendly. JSON columns are `TEXT` holding canonical JSON (object keys sorted).

```sql
CREATE TABLE flags (
  id          TEXT PRIMARY KEY,            -- ULID
  key         TEXT NOT NULL UNIQUE,        -- FR-1
  description TEXT NOT NULL DEFAULT '',    -- FR-2
  version     INTEGER NOT NULL DEFAULT 1,  -- FR-5, bumped per definition change
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE flag_definitions (
  id              TEXT PRIMARY KEY,        -- ULID
  flag_id         TEXT NOT NULL REFERENCES flags(id) ON DELETE CASCADE,
  env             TEXT NOT NULL CHECK (env IN ('dev', 'staging', 'prod')),  -- FR-6
  enabled         INTEGER NOT NULL,        -- 0/1 (FR-10)
  variants        TEXT NOT NULL,           -- JSON object: name -> value (FR-11)
  default_variant TEXT NOT NULL,           -- must exist in variants (FR-12)
  rules           TEXT NOT NULL DEFAULT '[]',  -- JSON array (FR-13)
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL,
  UNIQUE (flag_id, env)                    -- FR-7
);

CREATE TABLE api_keys (
  id           TEXT PRIMARY KEY,           -- ULID
  name         TEXT NOT NULL,
  key_hash     TEXT NOT NULL UNIQUE,       -- SHA-256 hex of plaintext (FR-32)
  key_prefix   TEXT NOT NULL,              -- first 8 chars of plaintext, for display
  scope        TEXT NOT NULL CHECK (scope IN ('manage', 'evaluate', 'sync', 'all')),
  created_at   TEXT NOT NULL,
  last_used_at TEXT,
  revoked_at   TEXT,
  created_by   TEXT NOT NULL               -- actor name
);

CREATE TABLE audit_logs (
  id         TEXT PRIMARY KEY,             -- ULID, also pagination cursor (FR-38)
  created_at TEXT NOT NULL,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('session', 'api_key')),
  actor_name TEXT NOT NULL,                -- username or key name
  action     TEXT NOT NULL,                -- dot-namespaced, see §5
  entity     TEXT NOT NULL,                -- 'flag' | 'definition' | 'api_key' | 'auth'
  entity_id  TEXT NOT NULL,                -- flag key / def id / key id / '-'
  env        TEXT,                         -- NULL when not environment-specific
  before     TEXT,                         -- JSON or NULL
  after      TEXT                          -- JSON or NULL
);

CREATE INDEX idx_defs_flag     ON flag_definitions (flag_id);
CREATE INDEX idx_audit_created ON audit_logs (created_at DESC, id DESC);
CREATE INDEX idx_audit_entity  ON audit_logs (entity, entity_id);
```

Invariants (enforced in application code, transactionally):

- `flags.version` increments by exactly 1 per definition upsert (create or update) on that
  flag, in any environment (FR-5).
- `flag_definitions.rules` is always a valid canonical rule array per §2 (validated before
  insert; FR-14).
- `audit_logs` has no UPDATE/DELETE path anywhere in the codebase (FR-37).

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
| `api_key.create` / `api_key.revoke` | `api_key` | never includes key material |
| `auth.login` | `auth` | success only |
