# Graph Report - flag-management-system  (2026-11-02)

## Corpus Check
- 45 files · ~20,682 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 252 nodes · 290 edges · 25 communities (15 shown, 5 thin omitted)
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 24 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8b80cebd`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- ADR-0006 — Vue 3 + Vite dashboard in a separate workspace
- Flag Management System Architecture
- web/package.json
- server/package.json
- Feature Flag
- ADR-0007 — MariaDB as the system of record
- config.ts
- Client Application
- Dashboard
- ULID
- OpenAPI
- package.json
- compilerOptions
- scripts
- compilerOptions
- shared/package.json
- dependencies
- server/tsconfig.json
- shared/tsconfig.json
- shared/src/index.ts

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 16 edges
2. `scripts` - 12 edges
3. `loadConfig()` - 9 edges
4. `Flag Management System Architecture` - 9 edges
5. `Architecture Decision Records` - 9 edges
6. `Flag Management System` - 9 edges
7. `Flag Management System API Contract` - 8 edges
8. `Flagd Model Compilation and Data Model` - 7 edges
9. `Flag Management System Testing Strategy` - 7 edges
10. `compilerOptions` - 6 edges

## Surprising Connections (you probably didn't know these)
- `Evaluation` --conceptually_related_to--> `flagd`  [INFERRED]
  docs/01-requirements.md → README.md
- `Flag Management System Testing Strategy` --references--> `Development Guidelines`  [EXTRACTED]
  docs/05-testing.md → AGENTS.md
- `JWT Session` --conceptually_related_to--> `Flag Management System API Contract`  [INFERRED]
  docs/01-requirements.md → docs/04-api.md
- `Management API` --conceptually_related_to--> `Flag Sync`  [INFERRED]
  docs/02-architecture.md → docs/01-requirements.md
- `Flag Management System` --references--> `Flag Management System Requirements`  [EXTRACTED]
  README.md → docs/01-requirements.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Architecture Decision Records Corpus** — docs_adr_0001_use_flagd_as_evaluation_engine_flagd, docs_adr_0002_sqlite_system_of_record_sqlite, docs_adr_0003_http_sync_pull_publication_http_sync, docs_adr_0004_environments_as_flag_sets_flag_set, docs_adr_0005_ordered_rules_with_terminal_fractional_fractional [EXTRACTED 1.00]
- **Flag Authoring Model** — docs_01_requirements_feature_flag, docs_01_requirements_definition, docs_01_requirements_rule, docs_01_requirements_percentage_rule [INFERRED 0.85]
- **Flag Evaluation Implementation Chain** — docs_02_architecture_flagd_provider, docs_02_architecture_flag_evaluator, docs_01_requirements_evaluation, readme_flagd [INFERRED 0.85]

## Communities (25 total, 5 thin omitted)

### Community 0 - "ADR-0006 — Vue 3 + Vite dashboard in a separate workspace"
Cohesion: 0.18
Nodes (8): ADR-0006 — Vue 3 + Vite dashboard in a separate workspace, Consequences, Context, Decision, ADR-0008 — Flag change events: OpenFeature events + FMS SSE relay, Consequences, Context, Decision

### Community 1 - "Flag Management System Architecture"
Cohesion: 0.16
Nodes (24): Development Guidelines, Environment, Evaluation, Flag Management System Requirements, JWT Session, Flag Sync, Flag Evaluator, Flag Management System Architecture (+16 more)

### Community 2 - "web/package.json"
Cohesion: 0.06
Nodes (31): happy-dom, naive-ui, pinia, vite, @vitejs/plugin-vue, vue, vue-router, @vue/test-utils (+23 more)

### Community 3 - "server/package.json"
Cohesion: 0.07
Nodes (26): prisma, tsx, @types/node, typescript, dependencies, fastify, @fastify/static, prisma (+18 more)

### Community 4 - "Feature Flag"
Cohesion: 0.15
Nodes (14): API Key, Attribute Condition, Audit Log, Flag Definition, Feature Flag, Flag Version, Percentage Rule, Percentage Rollout (+6 more)

### Community 5 - "ADR-0007 — MariaDB as the system of record"
Cohesion: 0.40
Nodes (4): ADR-0007 — MariaDB as the system of record, Consequences, Context, Decision

### Community 7 - "config.ts"
Cohesion: 0.09
Nodes (29): fastify, @fastify/static, @prisma/adapter-mariadb, @prisma/client, vitest, createApp(), AppConfig, assertSecureDefaults() (+21 more)

### Community 12 - "package.json"
Cohesion: 0.10
Nodes (20): devDependencies, eslint, eslint-config-prettier, @eslint/js, eslint-plugin-vitest, prettier, typescript, typescript-eslint (+12 more)

### Community 13 - "compilerOptions"
Cohesion: 0.11
Nodes (17): compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution, noFallthroughCasesInSwitch (+9 more)

### Community 14 - "scripts"
Cohesion: 0.17
Nodes (12): scripts, build:web, dev, dev:web, format, format:check, lint, lint:fix (+4 more)

### Community 15 - "compilerOptions"
Cohesion: 0.20
Nodes (9): compilerOptions, jsx, module, moduleResolution, noEmit, types, extends, include (+1 more)

### Community 16 - "shared/package.json"
Cohesion: 0.22
Nodes (8): main, name, private, scripts, typecheck, type, types, version

### Community 17 - "dependencies"
Cohesion: 0.33
Nodes (6): dependencies, naive-ui, pinia, @vitejs/plugin-vue, vue, vue-router

### Community 18 - "server/tsconfig.json"
Cohesion: 0.33
Nodes (5): compilerOptions, outDir, extends, include, ../tsconfig.base.json

### Community 19 - "shared/tsconfig.json"
Cohesion: 0.33
Nodes (5): compilerOptions, outDir, extends, include, ../tsconfig.base.json

## Knowledge Gaps
- **153 isolated node(s):** `DEFAULT_PORT`, `DEFAULT_FLAGD_HOST`, `DEFAULT_FLAGD_PORT`, `DEFAULT_ENVS`, `DEFAULT_WEB_DIST` (+148 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 159 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Architecture Decision Records` connect `Flag Management System Architecture` to `ADR-0006 — Vue 3 + Vite dashboard in a separate workspace`, `Feature Flag`, `ADR-0007 — MariaDB as the system of record`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `Ordered rules with a terminal percentage rule` connect `Feature Flag` to `Flag Management System Architecture`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **What connects `DEFAULT_PORT`, `DEFAULT_FLAGD_HOST`, `DEFAULT_FLAGD_PORT` to the rest of the system?**
  _153 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `web/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.06349206349206349 - nodes in this community are weakly interconnected._
- **Should `server/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.07407407407407407 - nodes in this community are weakly interconnected._
- **Should `config.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09206349206349207 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.1038961038961039 - nodes in this community are weakly interconnected._