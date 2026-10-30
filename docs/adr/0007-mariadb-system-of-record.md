# ADR-0007 — MariaDB as the system of record

**Status:** Accepted (supersedes ADR-0002)

## Context

ADR-0002 chose SQLite for zero-setup dev and file-copy backups, holding MariaDB/Postgres as a
v1.1 swap behind a portability rule. The project direction now includes parallel writes from
several people/keys and eventual multi-instance deployment, where SQLite's single-writer
limit and file-based backup become a recurring tax rather than a one-time cost. Adopting
MariaDB in v1 avoids a live migration of real data and makes the storage layer
production-grade from day one. Costs: one more compose service, migrations, and an async
store.

## Decision

Use **MariaDB** as the sole system of record:

- Compose service `mariadb` (image pinned, `mariadb:11.8` LTS line), env-driven credentials
  (`FMS_DB_DATABASE` / `FMS_DB_USER` / `FMS_DB_PASSWORD`), named volume for persistence,
  `mariadb-admin ping` healthcheck, port 3306 bound to localhost only.
- Driver: **Kysely** (`@kysely/mysql` over `mysql2`) with a small connection pool. The schema
  is a TS object; migrations are numbered SQL files in `server/src/db/migrations/`, applied
  at boot (Kysely migrate plugin). v1 assumes a single API instance for boot-time
  migrations; multi-instance migration locking is a v1.1 note.
- ADR-0002's portability rule carries over: all persistence stays behind the thin store
  module — no driver types or SQL leak into `domain/`; JSON columns are validated in app
  code and never touched by JSON operators in domain queries.
- Schema: InnoDB, `utf8mb4`. ULIDs as `CHAR(26)`; timestamps as `DATETIME(6)` UTC (formatted
  ISO-8601 at the API boundary); `enabled` as `TINYINT(1)`; `variants`/`rules`/`before`/
  `after` as `JSON`. No `CHECK` on `env` (the env list is config-driven, FR-6; app-level
  validation); `CHECK` constraints kept on `scope`/`actor_type` (fixed enums).
- Config: `DATABASE_URL` replaces `DATABASE_PATH` (dev default matches the compose service;
  `NODE_ENV=production` refuses the insecure default, same guardrail as admin credentials).
- Backup: single-transaction `mariadb-dump`; restore documented in the M5 runbook.

## Consequences

- + Multi-writer ready; proper connection pooling; unblocks multi-instance FMS later
  (with the boot-migration note).
- + `mysql2` is pure JS — the `better-sqlite3` native-build concern disappears.
- + Dump-based backup/restore is the standard operator story; state lives on a named volume.
- − The store becomes async (pooled connections). `better-sqlite3`'s synchronous transaction
  code becomes per-connection `BEGIN … COMMIT`; FR-39 (audit + mutation atomicity) is
  unchanged in semantics.
- − Store integration tests need a real database: they run against a **testcontainers**
  MariaDB. The unit tier (domain, compiler, ETag, audit shape) stays Docker-free (NFR-8).
- − One more compose service and one volume to operate/backup; M0 grows accordingly.
