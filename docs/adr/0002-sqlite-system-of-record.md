# ADR-0002 — SQLite as the system of record

**Status:** Superseded by ADR-0007

## Context

The management API needs durable storage for flags, definitions, keys, and the audit log.
Constraints: single-host v1 (NFR-6), one-process deployment, trivial backups, no operational
burden; but domain logic must stay portable to Postgres later (OQ-5).

## Decision

Use **SQLite** (`better-sqlite3`, WAL mode) as the sole store. Rules:

- All persistence lives behind a thin store module; domain logic receives results via
  plain objects — no SQL, no driver types, leak into `domain/` (NFR-8, OQ-5).
- No SQLite-specific SQL in queries the domain cares about (no `upsert`-only tricks beyond
  standard `INSERT … ON CONFLICT` which maps to Postgres; no FTS, no JSON1 operators in
  domain queries — JSON columns are validated in app code).
- Backups = checkpoint + file copy (runbook, M5).

## Consequences

- + Zero-setup local dev; one file to back up; excellent read/write perf at v1 scale
  (NFR-2: 1,000 flags × 3 envs, 100 eval/s — evaluation doesn't even touch SQLite at
  runtime; flagd serves it).
- + Synchronous driver keeps transaction code (mutation + audit atomicity, FR-39) simple.
- − Single-writer: concurrent *management* writes serialize. v1 has one admin + keys;
  last-writer-wins semantics are accepted (architecture §8), optimistic locking deferred
  to v1.1.
- − Not a path to multi-instance FMS without a storage swap — acknowledged; the portability
  rule above keeps that swap contained in the store module.
