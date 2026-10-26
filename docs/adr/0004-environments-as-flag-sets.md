# ADR-0004 — Environments as flagd flag sets

**Status:** Accepted

## Context

v1 needs isolated per-environment definitions (FR-6/FR-8) evaluated by one flagd instance.
Options:

1. **Multiple flagd instances** (one per env) — clean isolation, but N containers, N sync
   configs, N provider endpoints for clients, and FMS must know N addresses.
2. **Context-based environments** (`environment` attribute + rules) — keeps one model, but
   pushes environment logic into every rule and leaks it into client context; evaluation
   semantics become our problem, not flagd's.
3. **flagd flag sets + selectors** — flagd natively supports set-level
   `metadata.flagSetId` and selector-based evaluation (`flagSetId=<value>`; documented
   "By Environment" pattern). One flagd instance; per-environment isolation is enforced by
   the engine.

## Decision

Option 3. Concretely:

- The sync document for environment `e` carries set-level `"metadata": { "flagSetId": "e" }`
  (ADR-0003's one-source-per-env layout: flagd's sync sources can each declare a set-level
  `flagSetId`; a single source document cannot hold two entries for the same flag key under
  different sets, so one source per environment is required, not just convenient).
- Evaluation isolation: each consumer uses a provider configured with
  `selector: "flagSetId=<env>"` (Node provider: constructor option; flagd sends it via the
  `flagd-selector` metadata). FMS's evaluate proxy keeps **one `FlagdProvider` instance per
  environment** (three total) — the Node provider documents no per-request selector
  (OQ-1), and three gRPC channels are negligible cost.
- flagd selectors also give us future headroom: team/application flag sets without a new
  isolation mechanism.

## Consequences

- + Engine-enforced isolation (a wrong-env request simply can't see other envs' flags).
- + One container, one sync pipeline, one metrics endpoint.
- + FMS storage stays environment-agnostic (one `flag_definitions` table); only publication
  and provider wiring are per-env.
- − Clients must configure the correct selector per environment — a misconfiguration means
  "flag not found" rather than a wrong value (fails safe; documented in the client guide).
- − If flagd's selector semantics change (project is evolving fast), the ADR's
  flag-sets-dependent parts may need revisiting; the rest of the system (storage, API,
  compiler) is unaffected.
