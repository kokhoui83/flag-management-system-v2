# ADR-0001 — flagd as the evaluation engine (OpenFeature)

**Status:** Accepted

## Context

FMS needs an evaluation engine. Options: (a) implement evaluation in the management API
(our own rules interpreter), (b) adopt an off-the-shelf engine. Requirements: multi-variant
flags, attribute targeting, deterministic sticky percentage rollouts, multi-language client
support, self-hosted, and — per the project brief — OpenFeature as the integration standard.

## Decision

Use [flagd](https://flagd.dev/) (official OpenFeature engine) as the **only** evaluator:

- FMS stores definitions and publishes them; it never computes flag values.
- Clients integrate via official OpenFeature SDKs + flagd providers (gRPC), so every
  supported language gets evaluation for free and standard OpenFeature semantics
  (`reason`, `variant`, metadata, provider events) apply unchanged.
- FMS's own `/api/v1/evaluate` is a thin proxy over the same OpenFeature server SDK +
  `@openfeature/flagd-provider` — one integration to maintain, and the dashboard playground
  exercises the real engine.

## Consequences

- + No evaluation code to write or maintain; edge cases (type coercion, sticky hashing,
  DISABLED/STATIC/TARGETING_MATCH semantics) are owned by flagd and its test suite.
- + Client apps depend on an open standard (OpenFeature), not our API, at runtime.
- − One more runtime component (flagd container) and a publication mechanism (ADR-0003).
- − We must emit valid flagd models: JSONLogic targeting + `fractional` (see ADR-0005);
  our compiler is therefore tested against the official JSON schema (NFR-9).
- − flagd upgrade coupling: the `fractional` hashing scheme changed in flagd v0.18.0 —
  flagd and providers must be upgraded together (pinned image tag; documented runbook step).
- − Evaluation latency/availability now depends on the flagd process; mitigations:
  co-located deployment, `readyz` reporting, 503-on-unavailable policy (FR-24).
