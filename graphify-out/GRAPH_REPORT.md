# Graph Report - flag-management-system-v2  (2026-11-14)

## Corpus Check
- 121 files · ~84,908 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: (none) 3, .example 1, .figcraft 1)

## Summary
- 993 nodes · 1768 edges · 66 communities (59 shown, 7 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 40 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `83fcde58`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- auth.ts
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
- shared/src/index.ts
- server/tsconfig.json
- shared/tsconfig.json
- problem.ts
- m3.evaluate.integration.test.ts
- domain/flags.ts
- domain/types.ts
- AuditView.vue
- model-memo.ts
- 07-screens-d.js
- FlagdFlagInput
- server/src/index.ts
- sources
- flagd-model-contract.test.ts
- RunningWaitStrategy
- createAuthService
- router/index.ts
- stream.ts
- api/types.ts
- RuleEditor.vue
- 5. Screen specifications
- m3.evaluate.e2e.test.ts
- ProjectsView.vue
- 04-screens-a.js
- 02-atoms.js
- FlagEditorView.vue
- 06-screens-c.js
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
- ADR-0006 — Vue 3 + Vite dashboard in a separate workspace
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
- `save()` --calls--> `validateDefinition()`  [EXTRACTED]
  web/src/views/FlagEditorView.vue → shared/src/index.ts
- `ProblemDetails` --references--> `ValidationProblem`  [EXTRACTED]
  server/src/http/problem.ts → shared/src/index.ts
- `FlagdFlagEntry` --references--> `VariantValue`  [EXTRACTED]
  server/src/domain/flagd-model.ts → shared/src/index.ts
- `FlagdFlagInput` --references--> `VariantValue`  [EXTRACTED]
  server/src/domain/flagd-model.ts → shared/src/index.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Architecture Decision Records Corpus** — docs_adr_0001_use_flagd_as_evaluation_engine_flagd, docs_adr_0002_sqlite_system_of_record_sqlite, docs_adr_0003_http_sync_pull_publication_http_sync, docs_adr_0004_environments_as_flag_sets_flag_set, docs_adr_0005_ordered_rules_with_terminal_fractional_fractional [EXTRACTED 1.00]
- **Flag Authoring Model** — docs_01_requirements_feature_flag, docs_01_requirements_definition, docs_01_requirements_rule, docs_01_requirements_percentage_rule [INFERRED 0.85]
- **Flag Evaluation Implementation Chain** — docs_02_architecture_flagd_provider, docs_02_architecture_flag_evaluator, docs_01_requirements_evaluation, readme_flagd [INFERRED 0.85]

## Communities (66 total, 7 thin omitted)

### Community 0 - "auth.ts"
Cohesion: 0.12
Nodes (7): AuthService, COOKIE_NAME, fastify, FastifyRequest, Principal, SessionContext, ApiKeyRecord

### Community 1 - "flagd-model.ts"
Cohesion: 0.19
Nodes (12): ADR-0005, compileChain(), compileTargeting(), conditionsToExpression(), conditionToJsonLogic(), FLAGD_FLAGS_SCHEMA, FLAGD_GENERATOR, FlagdFlagState (+4 more)

### Community 2 - "web/package.json"
Cohesion: 0.07
Nodes (30): happy-dom, @playwright/test, vite, @vitejs/plugin-vue, vue-tsc, @vitejs/plugin-vue@^5.2.2, devDependencies, happy-dom@^17.1.0 (+22 more)

### Community 3 - "healthcheck"
Cohesion: 0.07
Nodes (26): mariadb, MARIADB_DATABASE, MARIADB_PASSWORD, MARIADB_ROOT_PASSWORD, MARIADB_USER, command, depends_on, image (+18 more)

### Community 4 - "Flag Management System"
Cohesion: 0.39
Nodes (12): Development Guidelines, Flag Management System Requirements, JWT Session, Flag Management System Architecture, SQLite, Flagd Model Compilation and Data Model, Flag Management System API Contract, RFC 9457 Problem Document (+4 more)

### Community 5 - "store/index.ts"
Cohesion: 0.09
Nodes (21): DEFAULT_ENVIRONMENTS, encodeBase32(), generateUlid(), ULID_BASE_POWERS, AuditLogRecord, AuditPage, AuditQuery, CreateApiKeyResult (+13 more)

### Community 7 - "server/package.json"
Cohesion: 0.06
Nodes (41): @fastify/cookie, @fastify/static, @openfeature/flagd-provider, prisma, @prisma/adapter-mariadb, supertest, tsx, @types/supertest (+33 more)

### Community 12 - "package.json"
Cohesion: 0.07
Nodes (33): devDependencies, eslint@^9.17.0, eslint-config-prettier@^9.0.1, @eslint/js@^9.17.0, eslint-plugin-vitest@^0.5.4, prettier@^3.4.2, typescript@^5.6.0, typescript-eslint@^8.0.0 (+25 more)

### Community 13 - "compilerOptions"
Cohesion: 0.11
Nodes (17): compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution, noFallthroughCasesInSwitch (+9 more)

### Community 14 - "m2.sync.integration.test.ts"
Cohesion: 0.11
Nodes (11): @testcontainers/mariadb, files, outDir, scriptDir, AppConfig, adminToken(), login(), repoRoot (+3 more)

### Community 15 - "compilerOptions"
Cohesion: 0.15
Nodes (12): compilerOptions, baseUrl, jsx, module, moduleResolution, noEmit, paths, types (+4 more)

### Community 16 - "shared/package.json"
Cohesion: 0.20
Nodes (9): main, name, private, scripts, test, typecheck, type, types (+1 more)

### Community 17 - "shared/src/index.ts"
Cohesion: 0.18
Nodes (16): ATTRIBUTE_OPS, AttributeRule, CAPABILITY_LADDER, conditionIsValid(), ENV_PATTERN, FLAG_KEY_PATTERN, isVariantValue(), RESERVED_VARIANT_NAMES (+8 more)

### Community 18 - "server/tsconfig.json"
Cohesion: 0.33
Nodes (5): compilerOptions, outDir, extends, include, ../tsconfig.base.json

### Community 19 - "shared/tsconfig.json"
Cohesion: 0.33
Nodes (5): compilerOptions, outDir, extends, include, ../tsconfig.base.json

### Community 20 - "problem.ts"
Cohesion: 0.33
Nodes (8): FmsError, forbiddenError(), notFoundError(), PROBLEM_TYPES, ProblemDetails, TITLES, validationError(), ValidationProblem

### Community 21 - "m3.evaluate.integration.test.ts"
Cohesion: 0.15
Nodes (4): InMemoryFlagChangeBroadcaster, QueuedFlagChange, ADR-0008, repoRoot

### Community 22 - "domain/flags.ts"
Cohesion: 0.29
Nodes (11): FlagdFlagEntry, changedFields(), DefinitionChange, definitionsEqual(), nextFlagVersion(), productOwnerPutAllowed(), solelyEnabledChanged(), stableStringify() (+3 more)

### Community 23 - "domain/types.ts"
Cohesion: 0.21
Nodes (10): canEvaluate(), canSync(), API_KEY_SCOPES, ApiKeyScope, effectiveCapability(), EffectiveRole, isFullAccess(), rankOf() (+2 more)

### Community 25 - "AuditView.vue"
Cohesion: 0.20
Nodes (7): AuditEntry, AuditPage, actionFilter, entityFilter, entries, loading, nextBefore

### Community 26 - "model-memo.ts"
Cohesion: 0.43
Nodes (6): etagFor(), FlagdModelDocument, stableStringify(), stateBodyOf(), variantTypesOf(), CompiledFlagdModel

### Community 27 - "07-screens-d.js"
Cohesion: 0.19
Nodes (16): C(), card(), checkCell(), ds, F(), FONTS, getComp(), headRow() (+8 more)

### Community 28 - "FlagdFlagInput"
Cohesion: 0.29
Nodes (3): FlagdFlagInput, FlagdModelMemoInput, FlagRule

### Community 29 - "server/src/index.ts"
Cohesion: 0.14
Nodes (15): @prisma/client, closePrismaClient(), createPrismaClient(), ADR-0007, broadcaster, config, evaluator, memo (+7 more)

### Community 30 - "sources"
Cohesion: 0.33
Nodes (5): sources, authHeader, interval, provider, uri

### Community 31 - "flagd-model-contract.test.ts"
Cohesion: 0.40
Nodes (4): compileFlagdModel(), compileDoc(), flagsSchemaPath, targetingSchemaPath

### Community 34 - "createAuthService"
Cohesion: 0.20
Nodes (12): createAuthService(), authenticate(), issue(), requireProjectRole(), resolve(), safeEqual(), signJwt(), storeUserSession() (+4 more)

### Community 38 - "router/index.ts"
Cohesion: 0.10
Nodes (18): vue, vue-router, dependencies, naive-ui@^2.45.3, pinia@^2.2.0, vue@^3.5.13, vue-router@^4.1.0, app (+10 more)

### Community 40 - "stream.ts"
Cohesion: 0.16
Nodes (10): fastify, FlagdProviderEvent, FlagChangeBroadcaster, FlagChangeStreamHandle, flagSetParts(), SSE_KEEPALIVE_MS, sseFrame(), startFlagChangeStream() (+2 more)

### Community 48 - "api/types.ts"
Cohesion: 0.13
Nodes (22): ApiError, request(), RFC-9457, CopyResult, CreateEnvironmentResult, DefinitionPutResult, EvaluationResult, FlagDefinition (+14 more)

### Community 55 - "RuleEditor.vue"
Cohesion: 0.13
Nodes (18): AttributeOp, PercentageRule, PercentageSplit, addCondition(), addRule(), addSplit(), attributeOpOptions, emit (+10 more)

### Community 56 - "5. Screen specifications"
Cohesion: 0.06
Nodes (32): 07 — Dashboard Design, 1. Design goals, 2. Information architecture, 3.1 Color (planned `FMS Color` collection), 3.2 Spacing & radius (`FMS Spacing`, `FMS Radius`), 3.3 Type (planned text styles), 3. Design tokens, 4. Planned component inventory (`00 · Design System`) (+24 more)

### Community 58 - "m3.evaluate.e2e.test.ts"
Cohesion: 0.18
Nodes (8): evaluate(), EvaluateBody, ReadyBody, readyz(), repoRoot, SseEvent, waitForEvaluate(), waitUntilReady()

### Community 64 - "ProjectsView.vue"
Cohesion: 0.18
Nodes (7): createKey, createName, creating, creatingProject, errorMessage, router, session

### Community 65 - "04-screens-a.js"
Cohesion: 0.19
Nodes (16): C(), card(), ds, F(), field(), FONTS, frow(), getComp() (+8 more)

### Community 66 - "02-atoms.js"
Cohesion: 0.26
Nodes (16): button(), C(), diff(), existing(), F(), fillArr(), FONTS, getIcon() (+8 more)

### Community 69 - "FlagEditorView.vue"
Cohesion: 0.08
Nodes (19): copyFromEnv, copySourceEnvs, env, environments, errorMessage, flagKey, flagsStore, isCreate (+11 more)

### Community 70 - "06-screens-c.js"
Cohesion: 0.22
Nodes (15): C(), card(), ds, F(), FONTS, getComp(), headRow(), makeTable() (+7 more)

### Community 72 - "FlagsView.vue"
Cohesion: 0.11
Nodes (13): effectiveRoleFor(), canManage, canCreateFlags, flags, flagsStore, loading, project, projectId (+5 more)

### Community 73 - "ref_vitest"
Cohesion: 0.15
Nodes (7): naive-ui, ObservedEnvironmentStatus, variants, isHealthy, Props, props, staleEnvs

### Community 74 - "PlaygroundView.vue"
Cohesion: 0.12
Nodes (15): contextJson, env, envOptions, errorMessage, flagKey, flagOptions, flagsStore, loading (+7 more)

### Community 75 - "FlagdProviderRegistry"
Cohesion: 0.14
Nodes (11): @openfeature/server-sdk, eventTypeOf(), FlagdEventListener, FlagdProviderBinding, FlagdProviderRegistry, flagSetIdOf(), stateForEvent(), openFeature (+3 more)

### Community 76 - "ApiKeysView.vue"
Cohesion: 0.15
Nodes (13): ApiKeyCreated, ApiKeyRecord, create(), createdKey, creating, creatingKey, errorMessage, keys (+5 more)

### Community 77 - "evaluator.ts"
Cohesion: 0.12
Nodes (14): observedFlagVersion(), OpenFeatureFlagEvaluator, openFeature, OpenFeatureLike, ADR-0004, LATENCY_WARMUP_CALLS, LatencyTracker, mean() (+6 more)

### Community 78 - "session.ts"
Cohesion: 0.42
Nodes (5): pinia, @vue/test-utils, api, ProjectAssignment, useSessionStore

### Community 79 - "config.ts"
Cohesion: 0.16
Nodes (16): stubStore, assertSecureDefaults(), DEFAULT_ENVS, DEFAULT_FLAGD_HOST, DEFAULT_FLAGD_PORT, DEFAULT_PORT, DEFAULT_WEB_DIST, generateJwtSecret() (+8 more)

### Community 83 - "05-screens-b.js"
Cohesion: 0.23
Nodes (14): C(), card(), ds, F(), FONTS, getComp(), ghostBtn(), newScreen() (+6 more)

### Community 85 - "routes.ts"
Cohesion: 0.24
Nodes (11): actorName(), enqueueFlagChange(), ifNoneMatchMatches(), paramsOf(), paramValue(), queryOf(), registerRoutes(), ADR-0008 (+3 more)

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
Cohesion: 0.22
Nodes (6): Environment, ADR-0007 — MariaDB as the system of record, Consequences, Context, Decision, Architecture Decision Records

### Community 90 - "flagd"
Cohesion: 0.18
Nodes (9): API Key, Audit Log, Evaluation, Flag Sync, Flag Evaluator, flagd, Flagd Provider, Management API (+1 more)

### Community 91 - "build.mjs"
Cohesion: 0.15
Nodes (9): buildDesign(), colors, screens, FMS dashboard — FigCraft draft, Rebuild, Figma build — resume kit, How to run, What was recorded on canvas (2026-11-09) (+1 more)

### Community 93 - "ADR-0006 — Vue 3 + Vite dashboard in a separate workspace"
Cohesion: 0.40
Nodes (4): ADR-0006 — Vue 3 + Vite dashboard in a separate workspace, Consequences, Context, Decision

### Community 94 - "ADR-0008 — Flag change events: OpenFeature events + FMS SSE relay"
Cohesion: 0.40
Nodes (4): ADR-0008 — Flag change events: OpenFeature events + FMS SSE relay, Consequences, Context, Decision

### Community 95 - "app.ts"
Cohesion: 0.24
Nodes (10): AppOptions, createApp(), PUBLIC_AUTH_PATHS, PUBLIC_PATHS, RFC-9457, FlagEvaluator, problemBody(), RouteServices (+2 more)

### Community 96 - "08-user-flow.js"
Cohesion: 0.21
Nodes (13): arrowD(), arrowR(), box(), C(), F(), flows, FONTS, fr (+5 more)

### Community 99 - "00-tokens.js"
Cohesion: 0.29
Nodes (7): C(), COLOR, FILL, out, RADIUS, SPACING, sync()

## Knowledge Gaps
- **37 isolated node(s):** `ADR-0005`, `ADR-0004`, `../tsconfig.base.json`, `ADR-0006`, `../tsconfig.base.json` (+32 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 477 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Flag Management System` connect `Flag Management System` to `Architecture Decision Records`, `flagd`, `build.mjs`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **Are the 9 inferred relationships involving `createAuthService()` (e.g. with `canEvaluate()` and `canSync()`) actually correct?**
  _`createAuthService()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **What connects `ADR-0005`, `ADR-0004`, `../tsconfig.base.json` to the rest of the system?**
  _37 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `auth.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._
- **Why does `07 — Dashboard Design` connect `5. Screen specifications` to `build.mjs`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Should `web/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.06606606606606606 - nodes in this community are weakly interconnected._
- **Why does `naive-ui` connect `ref_vitest` to `ProjectsView.vue`, `web/package.json`, `FlagEditorView.vue`, `router/index.ts`, `FlagsView.vue`, `PlaygroundView.vue`, `ApiKeysView.vue`, `session.ts`, `api/types.ts`, `RuleEditor.vue`, `5. Screen specifications`, `AuditView.vue`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._