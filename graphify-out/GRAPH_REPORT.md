# Graph Report - flag-management-system  (2026-11-03)

## Corpus Check
- 56 files · ~30,656 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 404 nodes · 570 edges · 29 communities (19 shown, 4 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 31 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b6ae7d09`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- routes.ts
- Flag Management System Architecture
- web/package.json
- dependencies
- Architecture Decision Records
- store/index.ts
- Store
- app.ts
- Client Application
- Dashboard
- ULID
- OpenAPI
- package.json
- compilerOptions
- config.ts
- compilerOptions
- shared/package.json
- createAuthService
- server/tsconfig.json
- shared/tsconfig.json
- shared/src/index.ts
- devDependencies
- scripts

## God Nodes (most connected - your core abstractions)
1. `Store` - 29 edges
2. `compilerOptions` - 16 edges
3. `FmsError` - 15 edges
4. `createAuthService()` - 14 edges
5. `scripts` - 12 edges
6. `registerRoutes()` - 12 edges
7. `createApp()` - 10 edges
8. `loadConfig()` - 10 edges
9. `AuthService` - 9 edges
10. `createStore()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `ProblemDetails` --references--> `ValidationProblem`  [EXTRACTED]
  server/src/http/problem.ts → shared/src/index.ts
- `registerRoutes()` --calls--> `validateDefinition()`  [EXTRACTED]
  server/src/http/routes.ts → shared/src/index.ts
- `Evaluation` --conceptually_related_to--> `flagd`  [INFERRED]
  docs/01-requirements.md → README.md
- `Flag Management System Testing Strategy` --references--> `Development Guidelines`  [EXTRACTED]
  docs/05-testing.md → AGENTS.md
- `Flag Management System` --references--> `Architecture Decision Records`  [EXTRACTED]
  README.md → docs/adr/README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Architecture Decision Records Corpus** — docs_adr_0001_use_flagd_as_evaluation_engine_flagd, docs_adr_0002_sqlite_system_of_record_sqlite, docs_adr_0003_http_sync_pull_publication_http_sync, docs_adr_0004_environments_as_flag_sets_flag_set, docs_adr_0005_ordered_rules_with_terminal_fractional_fractional [EXTRACTED 1.00]
- **Flag Authoring Model** — docs_01_requirements_feature_flag, docs_01_requirements_definition, docs_01_requirements_rule, docs_01_requirements_percentage_rule [INFERRED 0.85]
- **Flag Evaluation Implementation Chain** — docs_02_architecture_flagd_provider, docs_02_architecture_flag_evaluator, docs_01_requirements_evaluation, readme_flagd [INFERRED 0.85]

## Communities (29 total, 4 thin omitted)

### Community 0 - "routes.ts"
Cohesion: 0.09
Nodes (26): EffectiveRole, AuthService, COOKIE_NAME, fastify, FastifyRequest, Principal, SessionContext, FmsError (+18 more)

### Community 1 - "Flag Management System Architecture"
Cohesion: 0.22
Nodes (18): Development Guidelines, Evaluation, Flag Management System Requirements, JWT Session, Flag Evaluator, Flag Management System Architecture, flagd, Flagd Provider (+10 more)

### Community 2 - "web/package.json"
Cohesion: 0.05
Nodes (37): happy-dom, naive-ui, pinia, vite, @vitejs/plugin-vue, vue, vue-router, @vue/test-utils (+29 more)

### Community 3 - "dependencies"
Cohesion: 0.29
Nodes (7): dependencies, fastify, @fastify/cookie, @fastify/static, prisma, @prisma/adapter-mariadb, @prisma/client

### Community 4 - "Architecture Decision Records"
Cohesion: 0.06
Nodes (32): API Key, Attribute Condition, Audit Log, Flag Definition, Environment, Feature Flag, Flag Version, Percentage Rule (+24 more)

### Community 5 - "store/index.ts"
Cohesion: 0.08
Nodes (25): DEFAULT_ENVIRONMENTS, ActorType, API_KEY_SCOPES, ApiKeyScope, Role, ROLES, AuditLogRecord, AuditPage (+17 more)

### Community 6 - "Store"
Cohesion: 0.09
Nodes (3): AppOptions, Store, FlagRule

### Community 7 - "app.ts"
Cohesion: 0.07
Nodes (35): RFC-9457, fastify, @fastify/cookie, @fastify/static, prisma, @prisma/adapter-mariadb, @prisma/client, supertest (+27 more)

### Community 12 - "package.json"
Cohesion: 0.06
Nodes (32): devDependencies, eslint, eslint-config-prettier, @eslint/js, eslint-plugin-vitest, prettier, typescript, typescript-eslint (+24 more)

### Community 13 - "compilerOptions"
Cohesion: 0.11
Nodes (17): compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution, noFallthroughCasesInSwitch (+9 more)

### Community 14 - "config.ts"
Cohesion: 0.19
Nodes (14): assertSecureDefaults(), DEFAULT_ENVS, DEFAULT_FLAGD_HOST, DEFAULT_FLAGD_PORT, DEFAULT_PORT, DEFAULT_WEB_DIST, generateJwtSecret(), INSECURE_ADMIN_PASSWORD (+6 more)

### Community 15 - "compilerOptions"
Cohesion: 0.20
Nodes (9): compilerOptions, jsx, module, moduleResolution, noEmit, types, extends, include (+1 more)

### Community 16 - "shared/package.json"
Cohesion: 0.20
Nodes (9): main, name, private, scripts, test, typecheck, type, types (+1 more)

### Community 17 - "createAuthService"
Cohesion: 0.24
Nodes (10): createAuthService(), authenticate(), issue(), requireProjectRole(), resolve(), safeEqual(), signJwt(), storeUserSession() (+2 more)

### Community 18 - "server/tsconfig.json"
Cohesion: 0.33
Nodes (5): compilerOptions, outDir, extends, include, ../tsconfig.base.json

### Community 19 - "shared/tsconfig.json"
Cohesion: 0.33
Nodes (5): compilerOptions, outDir, extends, include, ../tsconfig.base.json

### Community 20 - "shared/src/index.ts"
Cohesion: 0.11
Nodes (27): definitionsEqual(), nextFlagVersion(), stableStringify(), StoredFlagDefinition, ATTRIBUTE_OPS, AttributeCondition, AttributeOp, AttributeRule (+19 more)

### Community 26 - "devDependencies"
Cohesion: 0.25
Nodes (8): devDependencies, supertest, @testcontainers/mariadb, tsx, @types/node, @types/supertest, typescript, vitest

### Community 27 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, dev, start, test, test:integration, typecheck

## Knowledge Gaps
- **195 isolated node(s):** `name`, `version`, `private`, `type`, `workspaces` (+190 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 233 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Store` connect `Store` to `routes.ts`, `store/index.ts`, `app.ts`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Why does `fastify` connect `app.ts` to `routes.ts`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Why does `createAuthService()` connect `createAuthService` to `routes.ts`, `app.ts`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Are the 6 inferred relationships involving `createAuthService()` (e.g. with `isAdmin()` and `issue()`) actually correct?**
  _`createAuthService()` has 6 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _195 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `routes.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08961593172119488 - nodes in this community are weakly interconnected._
- **Should `web/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.053426248548199766 - nodes in this community are weakly interconnected._