# Graph Report - flag-management-system-v2  (2026-11-15)

## Corpus Check
- 124 files · ~86,519 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 9 file(s) not represented in the graph (top: (none) 5, .example 1, .figcraft 1)

## Summary
- 1024 nodes · 1802 edges · 62 communities (54 shown, 8 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 40 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3c764444`
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
- ci.yml
- auth.ts
- LoginView.vue
- ref_node_path
- with
- auth.ts
- server/src/index.ts
- app.ts
- domain/types.ts
- Figma build — resume kit
- m1.integration.test.ts
- router/index.ts
- stream.ts
- api/types.ts
- RuleEditor.vue
- RuleEditor.vue
- m3.evaluate.e2e.test.ts
- 04-screens-a.js
- m2.sync.integration.test.ts
- FlagEditorView.vue
- m3.evaluate.integration.test.ts
- FlagsView.vue
- ref_vitest
- PlaygroundView.vue
- FlagdProviderRegistry
- ApiKeysView.vue
- evaluator.ts
- session.ts
- config.ts
- 05-screens-b.js
- routes.ts
- Feature Flag
- 01-icons.js
- 03-shell.js
- Architecture Decision Records
- flagd
- build.mjs
- ADR-0008 — Flag change events: OpenFeature events + FMS SSE relay
- app.ts
- 08-user-flow.js
- 00-tokens.js

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
- `4. Planned component inventory (`00 · Design System`)` --references--> `DiffRow`  [INFERRED]
  docs/07-dashboard-design.md → web/src/components/DiffView.vue
- `ProblemDetails` --references--> `ValidationProblem`  [EXTRACTED]
  server/src/http/problem.ts → shared/src/index.ts
- `FlagdFlagEntry` --references--> `VariantValue`  [EXTRACTED]
  server/src/domain/flagd-model.ts → shared/src/index.ts
- `StoredFlagDefinition` --references--> `VariantValue`  [EXTRACTED]
  server/src/domain/flags.ts → shared/src/index.ts
- `FlagEvaluationInput` --references--> `VariantValue`  [EXTRACTED]
  server/src/evaluate/types.ts → shared/src/index.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Architecture Decision Records Corpus** — docs_adr_0001_use_flagd_as_evaluation_engine_flagd, docs_adr_0002_sqlite_system_of_record_sqlite, docs_adr_0003_http_sync_pull_publication_http_sync, docs_adr_0004_environments_as_flag_sets_flag_set, docs_adr_0005_ordered_rules_with_terminal_fractional_fractional [EXTRACTED 1.00]
- **Flag Authoring Model** — docs_01_requirements_feature_flag, docs_01_requirements_definition, docs_01_requirements_rule, docs_01_requirements_percentage_rule [INFERRED 0.85]
- **Flag Evaluation Implementation Chain** — docs_02_architecture_flagd_provider, docs_02_architecture_flag_evaluator, docs_01_requirements_evaluation, readme_flagd [INFERRED 0.85]

## Communities (62 total, 8 thin omitted)

### Community 1 - "flagd-model.ts"
Cohesion: 0.10
Nodes (26): ADR-0005, compileChain(), compileFlagdModel(), compileTargeting(), conditionsToExpression(), conditionToJsonLogic(), compileDoc(), flagsSchemaPath (+18 more)

### Community 2 - "web/package.json"
Cohesion: 0.07
Nodes (28): happy-dom, @playwright/test, vite, @vitejs/plugin-vue, vue-tsc, @vitejs/plugin-vue@^5.2.2, devDependencies, happy-dom@^17.1.0 (+20 more)

### Community 3 - "healthcheck"
Cohesion: 0.07
Nodes (26): mariadb, MARIADB_DATABASE, MARIADB_PASSWORD, MARIADB_ROOT_PASSWORD, MARIADB_USER, command, depends_on, image (+18 more)

### Community 4 - "Flag Management System"
Cohesion: 0.37
Nodes (12): Development Guidelines, Flag Management System Requirements, JWT Session, Flag Management System Architecture, SQLite, Flagd Model Compilation and Data Model, Flag Management System API Contract, RFC 9457 Problem Document (+4 more)

### Community 5 - "store/index.ts"
Cohesion: 0.09
Nodes (30): changedFields(), DefinitionChange, definitionsEqual(), nextFlagVersion(), productOwnerPutAllowed(), solelyEnabledChanged(), stableStringify(), StoredFlagDefinition (+22 more)

### Community 7 - "server/package.json"
Cohesion: 0.06
Nodes (39): @fastify/cookie, @fastify/static, @openfeature/flagd-provider, prisma, @prisma/adapter-mariadb, supertest, tsx, @types/supertest (+31 more)

### Community 12 - "package.json"
Cohesion: 0.07
Nodes (33): devDependencies, eslint@^9.17.0, eslint-config-prettier@^9.0.1, @eslint/js@^9.17.0, eslint-plugin-vitest@^0.5.4, prettier@^3.4.2, typescript@^5.6.0, typescript-eslint@^8.0.0 (+25 more)

### Community 13 - "compilerOptions"
Cohesion: 0.11
Nodes (17): compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution, noFallthroughCasesInSwitch (+9 more)

### Community 14 - "m2.sync.integration.test.ts"
Cohesion: 0.08
Nodes (14): @testcontainers/mariadb, @testcontainers/mariadb@^12.2.1, files, outDir, scriptDir, AppConfig, adminToken(), login() (+6 more)

### Community 15 - "compilerOptions"
Cohesion: 0.15
Nodes (12): compilerOptions, baseUrl, jsx, module, moduleResolution, noEmit, paths, types (+4 more)

### Community 16 - "shared/package.json"
Cohesion: 0.20
Nodes (9): main, name, private, scripts, test, typecheck, type, types (+1 more)

### Community 17 - "with"
Cohesion: 0.14
Nodes (20): ATTRIBUTE_OPS, AttributeOp, AttributeRule, CAPABILITY_LADDER, conditionIsValid(), ENV_PATTERN, FLAG_KEY_PATTERN, isVariantValue() (+12 more)

### Community 18 - "server/tsconfig.json"
Cohesion: 0.33
Nodes (5): compilerOptions, outDir, extends, include, ../tsconfig.base.json

### Community 19 - "shared/tsconfig.json"
Cohesion: 0.33
Nodes (5): compilerOptions, outDir, extends, include, ../tsconfig.base.json

### Community 20 - "ci.yml"
Cohesion: 0.07
Nodes (30): name, runs-on, steps, timeout-minutes, concurrency, cancel-in-progress, group, env (+22 more)

### Community 21 - "auth.ts"
Cohesion: 0.22
Nodes (8): fastify, fastify@^5.3.0, COOKIE_NAME, fastify, FastifyRequest, Principal, SessionContext, ApiKeyRecord

### Community 22 - "LoginView.vue"
Cohesion: 0.25
Nodes (6): errorMessage, loading, password, router, session, username

### Community 23 - "ref_node_path"
Cohesion: 0.28
Nodes (6): API_KEY_SCOPES, ApiKeyScope, EffectiveRole, isFullAccess(), Role, ROLES

### Community 25 - "with"
Cohesion: 0.22
Nodes (6): AuditEntry, actionFilter, entityFilter, entries, loading, nextBefore

### Community 27 - "auth.ts"
Cohesion: 0.19
Nodes (16): C(), card(), checkCell(), ds, F(), FONTS, getComp(), headRow() (+8 more)

### Community 29 - "server/src/index.ts"
Cohesion: 0.14
Nodes (15): @prisma/client, closePrismaClient(), createPrismaClient(), ADR-0007, broadcaster, config, evaluator, memo (+7 more)

### Community 30 - "app.ts"
Cohesion: 0.33
Nodes (5): sources, authHeader, interval, provider, uri

### Community 33 - "Figma build — resume kit"
Cohesion: 0.40
Nodes (4): Figma build — resume kit, How to run, What was recorded on canvas (2026-11-09), Why this exists

### Community 34 - "m1.integration.test.ts"
Cohesion: 0.16
Nodes (16): createAuthService(), authenticate(), canEvaluate(), canSync(), issue(), requireProjectRole(), resolve(), safeEqual() (+8 more)

### Community 38 - "router/index.ts"
Cohesion: 0.09
Nodes (19): vue, vue-router, dependencies, naive-ui@^2.45.3, pinia@^2.2.0, vue@^3.5.13, vue-router@^4.1.0, app (+11 more)

### Community 40 - "stream.ts"
Cohesion: 0.19
Nodes (8): FlagChangeBroadcaster, FlagChangeStreamHandle, flagSetParts(), SSE_KEEPALIVE_MS, sseFrame(), startFlagChangeStream(), StartFlagChangeStreamInput, ADR-0008

### Community 48 - "api/types.ts"
Cohesion: 0.16
Nodes (19): ApiError, request(), RFC-9457, ApiKeyCreated, ApiKeyRecord, AuditPage, CopyResult, CreateEnvironmentResult (+11 more)

### Community 55 - "RuleEditor.vue"
Cohesion: 0.12
Nodes (18): FlagRule, PercentageRule, addCondition(), addRule(), addSplit(), attributeOpOptions, emit, localRules (+10 more)

### Community 56 - "RuleEditor.vue"
Cohesion: 0.06
Nodes (32): 07 — Dashboard Design, 1. Design goals, 2. Information architecture, 3.1 Color (planned `FMS Color` collection), 3.2 Spacing & radius (`FMS Spacing`, `FMS Radius`), 3.3 Type (planned text styles), 3. Design tokens, 4. Planned component inventory (`00 · Design System`) (+24 more)

### Community 58 - "m3.evaluate.e2e.test.ts"
Cohesion: 0.18
Nodes (8): evaluate(), EvaluateBody, ReadyBody, readyz(), repoRoot, SseEvent, waitForEvaluate(), waitUntilReady()

### Community 65 - "04-screens-a.js"
Cohesion: 0.19
Nodes (16): C(), card(), ds, F(), field(), FONTS, frow(), getComp() (+8 more)

### Community 66 - "m2.sync.integration.test.ts"
Cohesion: 0.26
Nodes (16): button(), C(), diff(), existing(), F(), fillArr(), FONTS, getIcon() (+8 more)

### Community 69 - "FlagEditorView.vue"
Cohesion: 0.09
Nodes (18): copyFromEnv, copySourceEnvs, env, environments, errorMessage, flagKey, flagsStore, isCreate (+10 more)

### Community 70 - "m3.evaluate.integration.test.ts"
Cohesion: 0.22
Nodes (15): C(), card(), ds, F(), FONTS, getComp(), headRow(), makeTable() (+7 more)

### Community 72 - "FlagsView.vue"
Cohesion: 0.11
Nodes (13): effectiveRoleFor(), canManage, canCreateFlags, flags, flagsStore, loading, project, projectId (+5 more)

### Community 73 - "ref_vitest"
Cohesion: 0.21
Nodes (8): naive-ui, @vue/test-utils, @vue/test-utils@^2.5.1, ObservedEnvironmentStatus, isHealthy, Props, props, staleEnvs

### Community 74 - "PlaygroundView.vue"
Cohesion: 0.12
Nodes (15): contextJson, env, envOptions, errorMessage, flagKey, flagOptions, flagsStore, loading (+7 more)

### Community 75 - "FlagdProviderRegistry"
Cohesion: 0.13
Nodes (11): eventTypeOf(), FlagdEventListener, FlagdProviderBinding, FlagdProviderEvent, FlagdProviderRegistry, flagSetIdOf(), stateForEvent(), openFeature (+3 more)

### Community 76 - "ApiKeysView.vue"
Cohesion: 0.18
Nodes (11): create(), createdKey, creating, creatingKey, errorMessage, keys, loadKeys(), newKeyName (+3 more)

### Community 77 - "evaluator.ts"
Cohesion: 0.12
Nodes (15): @openfeature/server-sdk, FlagEvaluator, observedFlagVersion(), OpenFeatureFlagEvaluator, openFeature, OpenFeatureLike, ADR-0004, LATENCY_WARMUP_CALLS (+7 more)

### Community 78 - "session.ts"
Cohesion: 0.25
Nodes (10): pinia, api, FlagDefinition, FlagChangeEvent, ADR-0008, useFlagsStore, ProjectAssignment, useSessionStore (+2 more)

### Community 79 - "config.ts"
Cohesion: 0.12
Nodes (17): stubStore, assertSecureDefaults(), DEFAULT_ENVIRONMENTS, DEFAULT_ENVS, DEFAULT_FLAGD_HOST, DEFAULT_FLAGD_PORT, DEFAULT_PORT, DEFAULT_WEB_DIST (+9 more)

### Community 83 - "05-screens-b.js"
Cohesion: 0.23
Nodes (14): C(), card(), ds, F(), FONTS, getComp(), ghostBtn(), newScreen() (+6 more)

### Community 85 - "routes.ts"
Cohesion: 0.16
Nodes (19): FmsError, forbiddenError(), notFoundError(), PROBLEM_TYPES, ProblemDetails, TITLES, unavailableError(), validationError() (+11 more)

### Community 86 - "Feature Flag"
Cohesion: 0.20
Nodes (10): Attribute Condition, Flag Definition, Feature Flag, Flag Version, Percentage Rule, Percentage Rollout, Targeting Rule, Variant (+2 more)

### Community 87 - "01-icons.js"
Cohesion: 0.33
Nodes (9): buildSet(), C(), ell(), F(), iconComp(), ICONS, out, rect() (+1 more)

### Community 88 - "03-shell.js"
Cohesion: 0.36
Nodes (7): C(), F(), FONTS, getComp(), navItem(), out, T()

### Community 89 - "Architecture Decision Records"
Cohesion: 0.14
Nodes (10): Environment, ADR-0006 — Vue 3 + Vite dashboard in a separate workspace, Consequences, Context, Decision, ADR-0007 — MariaDB as the system of record, Consequences, Context (+2 more)

### Community 90 - "flagd"
Cohesion: 0.18
Nodes (9): API Key, Audit Log, Evaluation, Flag Sync, Flag Evaluator, flagd, Flagd Provider, Management API (+1 more)

### Community 91 - "build.mjs"
Cohesion: 0.29
Nodes (5): buildDesign(), colors, screens, FMS dashboard — FigCraft draft, Rebuild

### Community 94 - "ADR-0008 — Flag change events: OpenFeature events + FMS SSE relay"
Cohesion: 0.40
Nodes (4): ADR-0008 — Flag change events: OpenFeature events + FMS SSE relay, Consequences, Context, Decision

### Community 95 - "app.ts"
Cohesion: 0.15
Nodes (11): AppOptions, createApp(), PUBLIC_AUTH_PATHS, PUBLIC_PATHS, RFC-9457, InMemoryFlagChangeBroadcaster, QueuedFlagChange, ADR-0008 (+3 more)

### Community 96 - "08-user-flow.js"
Cohesion: 0.21
Nodes (13): arrowD(), arrowR(), box(), C(), F(), flows, FONTS, fr (+5 more)

### Community 99 - "00-tokens.js"
Cohesion: 0.29
Nodes (7): C(), COLOR, FILL, out, RADIUS, SPACING, sync()

## Knowledge Gaps
- **37 isolated node(s):** `ADR-0005`, `ADR-0004`, `../tsconfig.base.json`, `ADR-0006`, `../tsconfig.base.json` (+32 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 494 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Flag Management System` connect `Flag Management System` to `Architecture Decision Records`, `flagd`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Are the 9 inferred relationships involving `createAuthService()` (e.g. with `canEvaluate()` and `canSync()`) actually correct?**
  _`createAuthService()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **What connects `ADR-0005`, `ADR-0004`, `../tsconfig.base.json` to the rest of the system?**
  _37 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `flagd-model.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1021021021021021 - nodes in this community are weakly interconnected._
- **Why does `07 — Dashboard Design` connect `RuleEditor.vue` to `Flag Management System`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Should `web/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.07130124777183601 - nodes in this community are weakly interconnected._
- **Why does `naive-ui` connect `ref_vitest` to `web/package.json`, `FlagEditorView.vue`, `router/index.ts`, `FlagsView.vue`, `PlaygroundView.vue`, `ApiKeysView.vue`, `session.ts`, `LoginView.vue`, `RuleEditor.vue`, `RuleEditor.vue`, `with`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._