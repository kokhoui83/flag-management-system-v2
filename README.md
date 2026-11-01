# Flag Management System

A self-hosted feature flag management system built on the [OpenFeature](https://openfeature.dev/)
spec and the [flagd](https://flagd.dev/) evaluation engine.

The system provides a management API and web dashboard for defining feature flags, per-environment
rollouts, and targeting rules (attribute conditions + percentage splits). Flag definitions are
published to a [flagd](https://flagd.dev) instance, which performs all runtime evaluation. Client
applications evaluate flags through any official OpenFeature SDK + flagd provider — no custom
client is required.

## Status

**M0 — Skeleton & tooling (in progress, TDD green).** The repository now contains the M0
skeleton: npm workspaces (`server`, `web`, `shared`) on TypeScript (strict, ESM), vitest, ESLint +
Prettier, a Fastify management API with `/healthz` + `/readyz`, env-driven config, and a Vite +
Vue placeholder dashboard. Flag/store/evaluation work lands in M1–M3 per
[docs/06-roadmap.md](docs/06-roadmap.md).

The multi-user dashboard requirements are captured: login (FR-40/FR-53), per-user roles with
different access levels (FR-54), per-project environments (FR-55), per-project flags with
per-environment state (FR-56), admin invites (FR-57), developer and product-owner capabilities
(FR-58/FR-59) — see [docs/01-requirements.md §4.9.1](docs/01-requirements.md). Implementation lands in
M4 per [docs/06-roadmap.md](docs/06-roadmap.md).

## Documentation

| Document | Contents |
| --- | --- |
| [docs/01-requirements.md](docs/01-requirements.md) | Goals, personas, functional & non-functional requirements, out of scope |
| [docs/02-architecture.md](docs/02-architecture.md) | System design, components, data flows, security, observability, failure modes |
| [docs/03-data-model.md](docs/03-data-model.md) | Database schema, rule format, compilation to the flagd model (with examples) |
| [docs/04-api.md](docs/04-api.md) | REST API contract, sync endpoint, evaluation endpoint, error model |
| [docs/05-testing.md](docs/05-testing.md) | TDD strategy, behavior specs (Given/When/Then), test pyramid |
| [docs/06-roadmap.md](docs/06-roadmap.md) | Milestones with acceptance criteria |
| [docs/adr/](docs/adr/) | Architecture decision records |

## Architecture in one paragraph

A TypeScript management API (Fastify + MariaDB) is the system of record for flags,
per-environment definitions, targeting rules, API keys, and an audit log. It exposes a REST
API for the Vue 3 web dashboard, a pull-based sync endpoint (with ETag/304 caching) that
[flagd](https://flagd.dev) polls — one sync source per (project, environment), each carried
in its own flagd *flag set* — and an SSE stream (`GET /api/v1/events`) that relays
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

| Component | Technology | Role |
| --- | --- | --- |
| Management API | Node.js (TypeScript), Fastify, MariaDB (Kysely) | System of record, REST API, sync source, evaluate proxy, SSE change events, hosts dashboard |
| MariaDB | `mariadb:11.8` (Docker) | Persistent storage (system of record) |
| flagd | `ghcr.io/open-feature/flagd` (Docker) | Flag evaluation engine; syncs from the management API |
| Dashboard | Vue 3 + Vite + TypeScript, Naive UI (built assets served by the API) | Flag CRUD, per-environment editor, evaluate playground, API keys, audit log, live change events |
| Client applications | Any language with an official OpenFeature SDK + flagd provider | Evaluate flags at runtime; subscribe to change events |

## Getting started

Current state (M0):

```bash
docker compose up -d   # flagd (pinned image) + mariadb (pinned mariadb:11.8, healthcheck) — see docker-compose.yml
npm run build:web      # vite build → web/dist
npm run dev            # management API (Fastify) on :3000 (tsx watch)
npm run dev:web        # dashboard dev server on :5173 (Vite proxy /api → :3000)
npm test               # unit tier (vitest)
```

The full milestone plan lives in [docs/06-roadmap.md](docs/06-roadmap.md); the M0 acceptance
checks are being closed as the skeleton lands.
