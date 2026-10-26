# ADR-0005 — Ordered rules with a terminal percentage rule

**Status:** Accepted

## Context

The dashboard needs a rule model that is (a) simple enough for non-infrastructure users to
edit safely, (b) completely expressible in flagd's JSONLogic targeting, and (c) deterministic
to compile (pure function, golden-testable). flagd's targeting language is powerful
(arbitrary JSONLogic, shared evaluators, time-based weights) — too powerful to expose raw
in v1 (misuse risk: invalid variants → evaluation errors at runtime; type coercion via
`==` surprises).

## Decision

A structured, ordered rule list (first-match-wins) with exactly two rule types
([03-data-model.md §2](../03-data-model.md)):

1. **Attribute rules** — conjunction of typed conditions over client-supplied context
   attributes (ops: `eq`, `neq`, `in`, `starts_with`, `ends_with`, `gt`, `gte`, `lt`, `lte`,
   `exists`), returning a named variant.
2. **Percentage rule** — relative-weight splits across variants, compiled to flagd's
   `fractional` operation **without an explicit bucketing expression** (flagd's default
   bucketing value `[flagKey, targetingKey]`: per-flag independence + sticky assignment by
   targeting key, FR-19).

Constraints (enforced at validation, FR-14):

- **The percentage rule must be last**, at most one per definition.
  *Why:* `fractional` always resolves to one of its own variants — it has no "fall through"
  result. A mid-list percentage rule whose traffic should continue to later rules is not
  expressible in a single targeting expression. Terminal placement (rollout applies to the
  remainder of traffic) covers the standard use case (A/B, gradual rollout) and keeps the
  compiler a trivial right-nested `if` chain.
- **Strict comparison semantics**: `eq`/`neq` compile to `===`/`!==` (no JsonLogic type
  coercion: `"1" == 1` must not be true in targeting). The remaining ops map 1:1 to
  JsonLogic/flagd custom ops with matching types (validated on input).
- **All variant references validated** against the definition's variants at write time —
  runtime "invalid variant" evaluation errors become impossible for FMS-managed flags.

## Consequences

- + Compiler is a small, total, pure function → golden-file + JSON-schema contract tests
  (NFR-9); no runtime surprises from the model we publish.
- + Matches mainstream tool UX (ordered rules, first-match-wins, terminal rollout split).
- − Expressiveness ceiling: no time-based/scheduled rollouts, no "fraction then continue",
  no arbitrary JSONLogic in v1. Accepted — the escape hatch (raw targeting JSON) is a
  deliberate v1.1 candidate (OQ-4) and the storage format (JSON column) already admits it
  without migration.
- − Sticky bucketing follows flagd's hashing (murmur3, changed in v0.18.0): bucket
  assignment is stable *for a given flagd/provider version pair*; cross-version upgrades
  may reassign users (flagd's documented behavior — runbook note).
