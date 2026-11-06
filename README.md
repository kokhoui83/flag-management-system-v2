# Flag Management System

A self-hosted feature flag management system built on the [OpenFeature](https://openfeature.dev/)
spec and the [flagd](https://flagd.dev/) evaluation engine.

The system provides a management API and web dashboard for defining feature flags, per-environment
rollouts, and targeting rules (attribute conditions + percentage splits). Flag definitions are
published to a [flagd](https://flagd.dev) instance, which performs all runtime evaluation. Client
applications evaluate flags through any official OpenFeature SDK + flagd provider — no custom
client is required.

## Status

**M0 — Skeleton & tooling (complete, TDD green).** The repository now contains the M0
skeleton: npm workspaces (`server`, `web`, `shared`) on TypeScript (strict, ESM), vitest, ESLint +
Prettier, a Fastify management API with `/healthz` + `/readyz`, env-driven config, and a Vite +
Vue placeholder dashboard.

**M1 — Flags & definitions core / system of record (baseline complete; M1 follow-up capability-matrix enforcement implemented).** The M1 surface is
implemented and verified end to end: `@fms/shared` canonical types plus all-at-once validation
(flag key, env, variants, default variant, rules); the management API (Fastify + Prisma/MariaDB)
with session auth (JWT + bootstrap admin, invited users with argon2id temp passwords), projects,
flags, per-environment definitions with one global flag version (create=1, any-env update +1,
idempotent put no-op), append-only audit log, API keys with scopes, RFC 9457 problem+json errors,
and the hand-maintained OpenAPI document served at `GET /api/v1/openapi.json`. Integration-tested
against a testcontainers MariaDB; unit tier green. The 2026-11-04 M1 follow-up items are implemented:
the capability matrix (product owners limited to `enabled`-only definition toggles; create/edit/copy/
environment/delete guards), the authenticated actor on the `project.environment.create` audit entry,
effective permissions as the union of global + per-project roles, and the per-project invite contract.

**M2 — Model compilation & sync endpoint (complete, TDD green).** FMS now compiles stored flag
state into the flagd flag-set document (JSONLogic targeting, terminal `fractional`, byte-stable
serialization, quoted strong state-hash ETag) and serves it via the authenticated
`GET /api/v1/sync/:projectKey/:env` endpoint (project-namespaced flag set ID per the OQ-6
resolution). Sync-scoped API keys or project-authorized admin sessions can access it;
`If-None-Match` follows standard list, weak-comparison, and wildcard semantics. The model is
memoized per (project, env) and invalidated after definition copies and flag deletions as well as
definition writes.

**M3 — Evaluation path (implemented; E2E green).** The runtime evaluation path landed: the
`FlagEvaluator` interface with the OpenFeature server-SDK implementation (flagd gRPC provider,
per-(project, env) flag-set selector), the `FlagdProviderRegistry` tracking provider state,
the `GET /readyz` readiness probe (DB + all flag sets READY, else `503 not_ready`), the
`POST /api/v1/evaluate` proxy, the `GET /api/v1/projects/:projectId/flags/:key/observed` probe,
and the `GET /api/v1/events` SSE stream over flagd provider events (ADR-0008). The NFR-1 latency
measurement helpers landed in `server/src/evaluate/latency.ts`; measured numbers come from the M3
E2E scenario.

Flag/store/evaluation work continues in M4 (dashboard) per [docs/06-roadmap.md](docs/06-roadmap.md).

The multi-user dashboard requirements are captured: login (FR-40/FR-53), per-user roles with
different access levels (FR-54), per-project environments (FR-55), per-project flags with
per-environment state (FR-56), admin invites (FR-57), developer and product-owner capabilities
(FR-58/FR-59) — see [docs/01-requirements.md §4.9.1](docs/01-requirements.md). Implementation lands in
M4 per [docs/06-roadmap.md](docs/06-roadmap.md).

## Documentation

| Document                                           | Contents                                                                      |
| -------------------------------------------------- | ----------------------------------------------------------------------------- |
| [docs/01-requirements.md](docs/01-requirements.md) | Goals, personas, functional & non-functional requirements, out of scope       |
| [docs/02-architecture.md](docs/02-architecture.md) | System design, components, data flows, security, observability, failure modes |
| [docs/03-data-model.md](docs/03-data-model.md)     | Database schema, rule format, compilation to the flagd model (with examples)  |
| [docs/04-api.md](docs/04-api.md)                   | REST API contract, sync endpoint, evaluation endpoint, error model            |
| [docs/05-testing.md](docs/05-testing.md)           | TDD strategy, behavior specs (Given/When/Then), test pyramid                  |
| [docs/06-roadmap.md](docs/06-roadmap.md)           | Milestones with acceptance criteria                                           |
| [docs/adr/](docs/adr/)                             | Architecture decision records                                                 |

## Architecture in one paragraph

A TypeScript management API (Fastify + MariaDB) is the system of record for flags,
per-environment definitions, targeting rules, API keys, and an audit log. It exposes a REST
API for the Vue 3 web dashboard, a pull-based sync endpoint (with ETag/304 caching) that
[flagd](https://flagd.dev) polls — one sync source per (project, environment), each carried
in its own flagd _flag set_ — and an SSE stream (`GET /api/v1/events`) that relays
flag-change notifications once flagd serves them. Runtime evaluation happens inside flagd:
server-side clients use the OpenFeature server SDK with the official
`@openfeature/flagd-provider` (gRPC, one provider instance per (project, environment),
selected via flagd selectors), and the management API itself offers a convenience
`/evaluate` endpoint
backed by the same OpenFeature integration; clients can subscribe to model changes via
standard OpenFeature provider events. Targeting rules authored in the dashboard are compiled
to flagd's JSONLogic-based targeting, including the `fractional` operation for sticky
percentage rollouts.

## Planned runtime components

| Component           | Technology                                                           | Role                                                                                            |
| ------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Management API      | Node.js (TypeScript), Fastify, MariaDB (Prisma)                      | System of record, REST API, sync source, evaluate proxy, SSE change events, hosts dashboard     |
| MariaDB             | `mariadb:11.8` (Docker)                                              | Persistent storage (system of record)                                                           |
| flagd               | `ghcr.io/open-feature/flagd` (Docker)                                | Flag evaluation engine; syncs from the management API                                           |
| Dashboard           | Vue 3 + Vite + TypeScript, Naive UI (built assets served by the API) | Flag CRUD, per-environment editor, evaluate playground, API keys, audit log, live change events |
| Client applications | Any language with an official OpenFeature SDK + flagd provider       | Evaluate flags at runtime; subscribe to change events                                           |

## Getting started

Current state (M2 — model compilation & sync endpoint landed; M3 evaluation path landed):

```bash
docker compose up -d   # flagd (pinned image) + mariadb (pinned mariadb:11.8, healthcheck) — see docker-compose.yml
npm run build:web      # vite build → web/dist
npm run dev            # management API (Fastify) on :3000 (tsx watch)
npm run dev:web        # dashboard dev server on :5173 (Vite proxy /api → :3000)
npm test               # unit tier (vitest; server + shared)
npm run test:integration  # integration tier (testcontainers MariaDB) — M1 flags/definitions suite
```

The full milestone plan lives in [docs/06-roadmap.md](docs/06-roadmap.md); the M2 acceptance
checks are green per [05-testing.md](docs/05-testing.md) §2.2 (compiler/ETag) and the sync-scope
scenarios, plus the integration tier against testcontainers MariaDB (FR-26/FR-27/FR-28). The M3
backend (evaluate, readiness, SSE, latency) is implemented and integration-tested; its E2E
scenarios (`npm run test:e2e`) are green against the real flagd engine via testcontainers.
