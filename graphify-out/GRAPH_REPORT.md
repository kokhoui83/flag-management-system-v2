# Graph Report - flag-management-system-v2  (2026-11-15)

## Corpus Check
- 110 files · ~65,274 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 8 file(s) not represented in the graph (top: (none) 5, .example 1, .toml 1)

## Summary
- 936 nodes · 1633 edges · 49 communities (42 shown, 7 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 38 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4ce6b23a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- with
- flagd-model.ts
- web/package.json
- healthcheck
- Flag Management System
- store/index.ts
- Store
- server/package.json
- Client Application
- Dashboard
- ULID
- OpenAPI
- package.json
- compilerOptions
- m2.sync.integration.test.ts
- compilerOptions
- shared/package.json
- with
- server/tsconfig.json
- shared/tsconfig.json
- routes.ts
- ref_vitest
- sources
- ref_node_path
- with
- ApiKeysView.vue
- auth.ts
- shared/src/index.ts
- server/src/index.ts
- app.ts
- problem.ts
- domain/types.ts
- AuthService
- m1.integration.test.ts
- LoginView.vue
- api/types.ts
- RuleEditor.vue
- m3.evaluate.e2e.test.ts
- ProjectsView.vue
- m2.sync.integration.test.ts
- DiffView.vue
- FlagEditorView.vue
- m3.evaluate.integration.test.ts
- FlagdProviderRegistry
- FlagsView.vue
- ref_vitest
- PlaygroundView.vue
- session.ts

## God Nodes (most connected - your core abstractions)
1. `Store` - 40 edges
2. `FlagdProviderRegistry` - 24 edges
3. `createAuthService()` - 21 edges
4. `registerRoutes()` - 20 edges
5. `naive-ui` - 20 edges
6. `createApp()` - 18 edges
7. `compilerOptions` - 16 edges
8. `FlagdModelMemo` - 15 edges
9. `FmsError` - 15 edges
10. `loadConfig()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `FlagdFlagInput` --references--> `FlagRule`  [EXTRACTED]
  server/src/domain/flagd-model.ts → shared/src/index.ts
- `ProblemDetails` --references--> `ValidationProblem`  [EXTRACTED]
  server/src/http/problem.ts → shared/src/index.ts
- `StoredFlagDefinition` --references--> `VariantValue`  [EXTRACTED]
  server/src/domain/flags.ts → shared/src/index.ts
- `FlagdFlagEntry` --references--> `VariantValue`  [EXTRACTED]
  server/src/domain/flagd-model.ts → shared/src/index.ts
- `FlagEvaluationInput` --references--> `VariantValue`  [EXTRACTED]
  server/src/evaluate/types.ts → shared/src/index.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Architecture Decision Records Corpus** — docs_adr_0001_use_flagd_as_evaluation_engine_flagd, docs_adr_0002_sqlite_system_of_record_sqlite, docs_adr_0003_http_sync_pull_publication_http_sync, docs_adr_0004_environments_as_flag_sets_flag_set, docs_adr_0005_ordered_rules_with_terminal_fractional_fractional [EXTRACTED 1.00]
- **Flag Authoring Model** — docs_01_requirements_feature_flag, docs_01_requirements_definition, docs_01_requirements_rule, docs_01_requirements_percentage_rule [INFERRED 0.85]
- **Flag Evaluation Implementation Chain** — docs_02_architecture_flagd_provider, docs_02_architecture_flag_evaluator, docs_01_requirements_evaluation, readme_flagd [INFERRED 0.85]

## Communities (49 total, 7 thin omitted)

### Community 0 - "with"
Cohesion: 0.07
Nodes (30): name, runs-on, steps, timeout-minutes, concurrency, cancel-in-progress, group, env (+22 more)

### Community 1 - "flagd-model.ts"
Cohesion: 0.12
Nodes (24): ADR-0005, compileChain(), compileFlagdModel(), compileTargeting(), conditionsToExpression(), conditionToJsonLogic(), compileDoc(), etagFor() (+16 more)

### Community 2 - "web/package.json"
Cohesion: 0.08
Nodes (27): happy-dom, @playwright/test, vite, vue-tsc, devDependencies, happy-dom@^17.1.0, @playwright/test@^1.65.0, @types/node@^22.10.0 (+19 more)

### Community 3 - "healthcheck"
Cohesion: 0.07
Nodes (26): mariadb, MARIADB_DATABASE, MARIADB_PASSWORD, MARIADB_ROOT_PASSWORD, MARIADB_USER, command, depends_on, image (+18 more)

### Community 4 - "Flag Management System"
Cohesion: 0.05
Nodes (45): Development Guidelines, API Key, Attribute Condition, Audit Log, Flag Definition, Environment, Evaluation, Feature Flag (+37 more)

### Community 5 - "store/index.ts"
Cohesion: 0.09
Nodes (30): changedFields(), DefinitionChange, definitionsEqual(), nextFlagVersion(), productOwnerPutAllowed(), solelyEnabledChanged(), stableStringify(), StoredFlagDefinition (+22 more)

### Community 7 - "server/package.json"
Cohesion: 0.06
Nodes (43): argon2, fastify, @fastify/cookie, @fastify/static, @openfeature/flagd-provider, prisma, @prisma/adapter-mariadb, supertest (+35 more)

### Community 12 - "package.json"
Cohesion: 0.07
Nodes (33): devDependencies, eslint@^9.17.0, eslint-config-prettier@^9.0.1, @eslint/js@^9.17.0, eslint-plugin-vitest@^0.5.4, prettier@^3.4.2, typescript@^5.6.0, typescript-eslint@^8.0.0 (+25 more)

### Community 13 - "compilerOptions"
Cohesion: 0.11
Nodes (17): compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution, noFallthroughCasesInSwitch (+9 more)

### Community 14 - "m2.sync.integration.test.ts"
Cohesion: 0.16
Nodes (17): assertSecureDefaults(), DEFAULT_ENVIRONMENTS, DEFAULT_ENVS, DEFAULT_FLAGD_HOST, DEFAULT_FLAGD_PORT, DEFAULT_HOST, DEFAULT_PORT, DEFAULT_WEB_DIST (+9 more)

### Community 15 - "compilerOptions"
Cohesion: 0.15
Nodes (12): compilerOptions, baseUrl, jsx, module, moduleResolution, noEmit, paths, types (+4 more)

### Community 16 - "shared/package.json"
Cohesion: 0.20
Nodes (9): main, name, private, scripts, test, typecheck, type, types (+1 more)

### Community 17 - "with"
Cohesion: 0.05
Nodes (36): concurrency, cancel-in-progress, group, env, IMAGE, name, runs-on, steps (+28 more)

### Community 18 - "server/tsconfig.json"
Cohesion: 0.33
Nodes (5): compilerOptions, outDir, extends, include, ../tsconfig.base.json

### Community 19 - "shared/tsconfig.json"
Cohesion: 0.33
Nodes (5): compilerOptions, outDir, extends, include, ../tsconfig.base.json

### Community 20 - "routes.ts"
Cohesion: 0.15
Nodes (16): AppOptions, FlagEvaluator, FlagChangeBroadcaster, StartFlagChangeStreamInput, actorName(), enqueueFlagChange(), ifNoneMatchMatches(), paramsOf() (+8 more)

### Community 21 - "ref_vitest"
Cohesion: 0.18
Nodes (3): @vitejs/plugin-vue, @vitejs/plugin-vue@^5.2.2, ADR-0006

### Community 22 - "sources"
Cohesion: 0.33
Nodes (5): sources, authHeader, interval, provider, uri

### Community 23 - "ref_node_path"
Cohesion: 0.22
Nodes (5): files, outDir, scriptDir, flagsSchemaPath, targetingSchemaPath

### Community 25 - "with"
Cohesion: 0.06
Nodes (38): if, name, runs-on, steps, timeout-minutes, env, E2E_API_HOST, NODE_VERSION (+30 more)

### Community 26 - "ApiKeysView.vue"
Cohesion: 0.15
Nodes (13): ApiKeyCreated, ApiKeyRecord, create(), createdKey, creating, creatingKey, errorMessage, keys (+5 more)

### Community 27 - "auth.ts"
Cohesion: 0.12
Nodes (22): COOKIE_NAME, createAuthService(), authenticate(), canEvaluate(), canSync(), issue(), requireProjectRole(), resolve() (+14 more)

### Community 28 - "shared/src/index.ts"
Cohesion: 0.17
Nodes (17): ATTRIBUTE_OPS, AttributeRule, CAPABILITY_LADDER, conditionIsValid(), ENV_PATTERN, FLAG_KEY_PATTERN, isVariantValue(), RESERVED_VARIANT_NAMES (+9 more)

### Community 29 - "server/src/index.ts"
Cohesion: 0.14
Nodes (15): @prisma/client, closePrismaClient(), createPrismaClient(), ADR-0007, broadcaster, config, evaluator, memo (+7 more)

### Community 30 - "app.ts"
Cohesion: 0.19
Nodes (9): createApp(), PUBLIC_AUTH_PATHS, PUBLIC_PATHS, stubStore, RFC-9457, AppConfig, stubStore, problemBody() (+1 more)

### Community 31 - "problem.ts"
Cohesion: 0.31
Nodes (9): FmsError, forbiddenError(), notFoundError(), PROBLEM_TYPES, ProblemDetails, TITLES, unavailableError(), validationError() (+1 more)

### Community 32 - "domain/types.ts"
Cohesion: 0.24
Nodes (6): API_KEY_SCOPES, ApiKeyScope, EffectiveRole, isFullAccess(), Role, ROLES

### Community 34 - "m1.integration.test.ts"
Cohesion: 0.29
Nodes (5): @testcontainers/mariadb, @testcontainers/mariadb@^12.2.1, adminToken(), login(), repoRoot

### Community 35 - "LoginView.vue"
Cohesion: 0.25
Nodes (6): errorMessage, loading, password, router, session, username

### Community 48 - "api/types.ts"
Cohesion: 0.11
Nodes (21): ApiError, request(), RFC-9457, AuditEntry, AuditPage, CopyResult, CreateEnvironmentResult, DefinitionPutResult (+13 more)

### Community 56 - "RuleEditor.vue"
Cohesion: 0.13
Nodes (18): AttributeOp, PercentageRule, PercentageSplit, addCondition(), addRule(), addSplit(), attributeOpOptions, emit (+10 more)

### Community 58 - "m3.evaluate.e2e.test.ts"
Cohesion: 0.12
Nodes (9): evaluate(), EvaluateBody, ReadyBody, readyz(), repoRoot, RunningWaitStrategy, SseEvent, waitForEvaluate() (+1 more)

### Community 64 - "ProjectsView.vue"
Cohesion: 0.09
Nodes (19): vue, vue-router, dependencies, naive-ui@^2.45.3, pinia@^2.2.0, vue@^3.5.13, vue-router@^4.1.0, app (+11 more)

### Community 66 - "m2.sync.integration.test.ts"
Cohesion: 0.25
Nodes (3): adminToken(), login(), repoRoot

### Community 67 - "DiffView.vue"
Cohesion: 0.21
Nodes (8): naive-ui, FlagRule, computeDiffs(), DiffRow, diffs, props, stable(), variants

### Community 69 - "FlagEditorView.vue"
Cohesion: 0.09
Nodes (18): copyFromEnv, copySourceEnvs, env, environments, errorMessage, flagKey, flagsStore, isCreate (+10 more)

### Community 70 - "m3.evaluate.integration.test.ts"
Cohesion: 0.15
Nodes (4): InMemoryFlagChangeBroadcaster, QueuedFlagChange, ADR-0008, repoRoot

### Community 71 - "FlagdProviderRegistry"
Cohesion: 0.06
Nodes (31): @openfeature/server-sdk, observedFlagVersion(), OpenFeatureFlagEvaluator, openFeature, OpenFeatureLike, ADR-0004, LATENCY_WARMUP_CALLS, LatencyTracker (+23 more)

### Community 72 - "FlagsView.vue"
Cohesion: 0.11
Nodes (13): effectiveRoleFor(), canManage, canCreateFlags, flags, flagsStore, loading, project, projectId (+5 more)

### Community 73 - "ref_vitest"
Cohesion: 0.32
Nodes (5): ObservedEnvironmentStatus, isHealthy, Props, props, staleEnvs

### Community 74 - "PlaygroundView.vue"
Cohesion: 0.12
Nodes (15): contextJson, env, envOptions, errorMessage, flagKey, flagOptions, flagsStore, loading (+7 more)

### Community 78 - "session.ts"
Cohesion: 0.21
Nodes (13): pinia, @vue/test-utils, api, FlagDefinition, FlagDetail, FlagSummary, FlagChangeEvent, ADR-0008 (+5 more)

## Knowledge Gaps
- **38 isolated node(s):** `ADR-0005`, `ADR-0004`, `ADR-0007`, `../tsconfig.base.json`, `../tsconfig.base.json` (+33 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 479 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Store` connect `Store` to `domain/types.ts`, `flagd-model.ts`, `m1.integration.test.ts`, `m2.sync.integration.test.ts`, `store/index.ts`, `m3.evaluate.integration.test.ts`, `routes.ts`, `m3.evaluate.e2e.test.ts`, `auth.ts`, `server/src/index.ts`, `app.ts`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Are the 9 inferred relationships involving `createAuthService()` (e.g. with `canEvaluate()` and `canSync()`) actually correct?**
  _`createAuthService()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **What connects `ADR-0005`, `ADR-0004`, `ADR-0007` to the rest of the system?**
  _38 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `with` be split into smaller, more focused modules?**
  _Cohesion score 0.07096774193548387 - nodes in this community are weakly interconnected._
- **Why does `naive-ui` connect `DiffView.vue` to `ProjectsView.vue`, `web/package.json`, `LoginView.vue`, `FlagEditorView.vue`, `FlagsView.vue`, `ref_vitest`, `PlaygroundView.vue`, `session.ts`, `api/types.ts`, `RuleEditor.vue`, `ApiKeysView.vue`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Should `flagd-model.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12096774193548387 - nodes in this community are weakly interconnected._
- **Why does `vue` connect `ProjectsView.vue` to `web/package.json`, `DiffView.vue`, `LoginView.vue`, `FlagEditorView.vue`, `FlagsView.vue`, `ref_vitest`, `PlaygroundView.vue`, `session.ts`, `api/types.ts`, `RuleEditor.vue`, `ApiKeysView.vue`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._