# Flag Management System

A self-hosted feature flag management system built on the [OpenFeature](https://openfeature.dev/)
spec and the [flagd](https://flagd.dev/) evaluation engine.

The system provides a management API and web dashboard for defining feature flags, per-environment
rollouts, and targeting rules (attribute conditions + percentage splits). Flag definitions are
published to a [flagd](https://flagd.dev) instance, which performs all runtime evaluation. Client
applications evaluate flags through any official OpenFeature SDK + flagd provider — no custom
client is required.

## Status

**Planning phase.** No application code exists yet. This repository currently contains the design
and requirements documentation only.

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

A TypeScript management API (Fastify + SQLite) is the system of record for flags, per-environment
definitions, targeting rules, API keys, and an audit log. It exposes a REST API for the web
dashboard and a pull-based sync endpoint (with ETag/304 caching) that [flagd](https://flagd.dev)
polls — one sync source per environment, each carried in its own flagd *flag set*
(`flagSetId=<env>`). Runtime evaluation happens inside flagd: server-side clients use the
OpenFeature server SDK with the official `@openfeature/flagd-provider` (gRPC, one provider
instance per environment, selected via flagd selectors), and the management API itself offers a
convenience `/evaluate` endpoint backed by the same OpenFeature integration. Targeting rules
authored in the dashboard are compiled to flagd's JSONLogic-based targeting, including the
`fractional` operation for sticky percentage rollouts.

## Planned runtime components

| Component | Technology | Role |
| --- | --- | --- |
| Management API | Node.js (TypeScript), Fastify, SQLite (better-sqlite3) | System of record, REST API, sync source, evaluate proxy, hosts dashboard |
| flagd | `ghcr.io/open-feature/flagd` (Docker) | Flag evaluation engine; syncs from the management API |
| Dashboard | Vanilla TS/JS static SPA (no build step) | Flag CRUD, per-environment editor, evaluate playground, API keys, audit log |
| Client applications | Any language with an official OpenFeature SDK + flagd provider | Evaluate flags at runtime |

## Getting started

Not yet available — see [docs/06-roadmap.md](docs/06-roadmap.md) for the implementation plan.
