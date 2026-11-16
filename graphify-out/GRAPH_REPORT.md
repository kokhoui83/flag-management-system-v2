# Graph Report - flag-management-system-v2  (2026-11-16)

## Corpus Check
- 159 files · ~113,107 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 10 file(s) not represented in the graph (top: (none) 5, .example 1, .figcraft 1)

## Summary
- 1453 nodes · 2658 edges · 81 communities (72 shown, 9 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 46 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c55e9f86`
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
- m3.evaluate.integration.test.ts
- compilerOptions
- shared/package.json
- with
- server/tsconfig.json
- shared/tsconfig.json
- ci.yml
- ProjectsView.vue
- steps
- with
- AuditView.vue
- ref_vitest
- auth.ts
- support.ts
- server/src/index.ts
- app.ts
- stack.mjs
- VariantTable.vue
- Figma build — resume kit
- m1.integration.test.ts
- capabilityMatrix.ts
- app.ts
- evaluator.ts
- router/index.ts
- domain/flags.ts
- stream.ts
- routes.ts
- InviteMemberDialog.vue
- reportFailure
- stores/flags.ts
- DefinitionValidationError
- AppShell.vue
- errorMessage
- api/types.ts
- ProjectAccessView.vue
- OpenFeatureFlagEvaluator
- LoginView.vue
- FlagChangeDispatcher
- format.ts
- FlagsView.test.ts
- RuleEditor.vue
- RuleEditor.vue
- providers.test.ts
- m3.evaluate.e2e.test.ts
- 04-screens-a.js
- m2.sync.integration.test.ts
- FlagEditorView.vue
- m3.evaluate.integration.test.ts
- FlagsView.vue
- SyncHealthBadge.vue
- PlaygroundView.vue
- FlagdProviderRegistry
- ApiKeysView.vue
- evaluator.ts
- session.ts
- config.ts
- 05-screens-b.js
- Feature Flag
- 01-icons.js
- 03-shell.js
- Architecture Decision Records
- flagd
- build.mjs
- ADR-0008 — Flag change events: OpenFeature events + FMS SSE relay
- 08-user-flow.js
- 00-tokens.js

## God Nodes (most connected - your core abstractions)
1. `Store` - 40 edges
2. `useSessionStore` - 30 edges
3. `FlagdProviderRegistry` - 27 edges
4. `vue` - 25 edges
5. `naive-ui` - 25 edges
6. `errorMessage()` - 23 edges
7. `api` - 22 edges
8. `createAuthService()` - 21 edges
9. `registerRoutes()` - 20 edges
10. `createApp()` - 18 edges

## Surprising Connections (you probably didn't know these)
- `4. Planned component inventory (`00 · Design System`)` --references--> `DiffRow`  [INFERRED]
  docs/07-dashboard-design.md → web/src/components/DiffView.vue
- `FlagdFlagEntry` --references--> `VariantValue`  [EXTRACTED]
  server/src/domain/flagd-model.ts → shared/src/index.ts
- `FlagdFlagInput` --references--> `VariantValue`  [EXTRACTED]
  server/src/domain/flagd-model.ts → shared/src/index.ts
- `CapabilityRow` --references--> `Role`  [EXTRACTED]
  web/src/capabilityMatrix.ts → shared/src/index.ts
- `StoredFlagDefinition` --references--> `VariantValue`  [EXTRACTED]
  server/src/domain/flags.ts → shared/src/index.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Architecture Decision Records Corpus** — docs_adr_0001_use_flagd_as_evaluation_engine_flagd, docs_adr_0002_sqlite_system_of_record_sqlite, docs_adr_0003_http_sync_pull_publication_http_sync, docs_adr_0004_environments_as_flag_sets_flag_set, docs_adr_0005_ordered_rules_with_terminal_fractional_fractional [EXTRACTED 1.00]
- **Flag Authoring Model** — docs_01_requirements_feature_flag, docs_01_requirements_definition, docs_01_requirements_rule, docs_01_requirements_percentage_rule [INFERRED 0.85]
- **Flag Evaluation Implementation Chain** — docs_02_architecture_flagd_provider, docs_02_architecture_flag_evaluator, docs_01_requirements_evaluation, readme_flagd [INFERRED 0.85]

## Communities (81 total, 9 thin omitted)

### Community 1 - "flagd-model.ts"
Cohesion: 0.09
Nodes (27): ADR-0005, compileChain(), compileFlagdModel(), compileTargeting(), conditionsToExpression(), conditionToJsonLogic(), compileDoc(), flagsSchemaPath (+19 more)

### Community 2 - "web/package.json"
Cohesion: 0.07
Nodes (34): happy-dom, vite, @vitejs/plugin-vue, vue-router, vue-tsc, dependencies, naive-ui@^2.45.3, pinia@^2.2.0 (+26 more)

### Community 3 - "healthcheck"
Cohesion: 0.07
Nodes (26): mariadb, MARIADB_DATABASE, MARIADB_PASSWORD, MARIADB_ROOT_PASSWORD, MARIADB_USER, command, depends_on, image (+18 more)

### Community 4 - "Flag Management System"
Cohesion: 0.37
Nodes (12): Development Guidelines, Flag Management System Requirements, JWT Session, Flag Management System Architecture, SQLite, Flagd Model Compilation and Data Model, Flag Management System API Contract, RFC 9457 Problem Document (+4 more)

### Community 5 - "store/index.ts"
Cohesion: 0.11
Nodes (21): encodeBase32(), generateUlid(), ULID_BASE_POWERS, AuditLogRecord, AuditPage, AuditQuery, CreateApiKeyResult, CreateProjectResult (+13 more)

### Community 7 - "server/package.json"
Cohesion: 0.06
Nodes (43): argon2, fastify, @fastify/cookie, @fastify/static, @openfeature/flagd-provider, prisma, @prisma/adapter-mariadb, supertest (+35 more)

### Community 12 - "package.json"
Cohesion: 0.07
Nodes (34): devDependencies, eslint@^9.17.0, eslint-config-prettier@^9.0.1, @eslint/js@^9.17.0, eslint-plugin-vitest@^0.5.4, prettier@^3.4.2, typescript@^5.6.0, typescript-eslint@^8.0.0 (+26 more)

### Community 13 - "compilerOptions"
Cohesion: 0.11
Nodes (17): compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution, noFallthroughCasesInSwitch (+9 more)

### Community 14 - "m3.evaluate.integration.test.ts"
Cohesion: 0.08
Nodes (14): @testcontainers/mariadb, @testcontainers/mariadb@^12.2.1, files, outDir, scriptDir, AppConfig, adminToken(), login() (+6 more)

### Community 15 - "compilerOptions"
Cohesion: 0.15
Nodes (12): compilerOptions, baseUrl, jsx, module, moduleResolution, noEmit, paths, types (+4 more)

### Community 16 - "shared/package.json"
Cohesion: 0.20
Nodes (9): main, name, private, scripts, test, typecheck, type, types (+1 more)

### Community 17 - "with"
Cohesion: 0.15
Nodes (20): ATTRIBUTE_OPS, AttributeRule, CAPABILITY_LADDER, conditionIsValid(), ENV_PATTERN, FLAG_KEY_PATTERN, isVariantValue(), normalizeRole() (+12 more)

### Community 18 - "server/tsconfig.json"
Cohesion: 0.33
Nodes (5): compilerOptions, outDir, extends, include, ../tsconfig.base.json

### Community 19 - "shared/tsconfig.json"
Cohesion: 0.33
Nodes (5): compilerOptions, outDir, extends, include, ../tsconfig.base.json

### Community 20 - "ci.yml"
Cohesion: 0.07
Nodes (30): name, runs-on, steps, timeout-minutes, concurrency, cancel-in-progress, group, env (+22 more)

### Community 21 - "ProjectsView.vue"
Cohesion: 0.10
Nodes (15): vue, drawerWidth, emit, props, tone, countLabel, createKey, createName (+7 more)

### Community 22 - "steps"
Cohesion: 0.06
Nodes (38): if, name, runs-on, steps, timeout-minutes, env, E2E_API_HOST, NODE_VERSION (+30 more)

### Community 23 - "with"
Cohesion: 0.05
Nodes (36): concurrency, cancel-in-progress, group, env, IMAGE, name, runs-on, steps (+28 more)

### Community 25 - "AuditView.vue"
Cohesion: 0.13
Nodes (14): actionFilter, actorFilter, appliedFilters, AuditFilters, carriesState(), entityFilter, entries, errorMessageText (+6 more)

### Community 26 - "ref_vitest"
Cohesion: 0.09
Nodes (13): naive-ui, @vue/test-utils, ObservedEnvironmentStatus, variants, Variants, allByTestId(), AnyComponent, byTestId() (+5 more)

### Community 27 - "auth.ts"
Cohesion: 0.19
Nodes (16): C(), card(), checkCell(), ds, F(), FONTS, getComp(), headRow() (+8 more)

### Community 28 - "support.ts"
Cohesion: 0.17
Nodes (25): @playwright/test, DESKTOP, Fixture, MOBILE, provision(), ADMIN, backToFlags(), choose() (+17 more)

### Community 29 - "server/src/index.ts"
Cohesion: 0.14
Nodes (15): ADR-0007, @prisma/client, closePrismaClient(), createPrismaClient(), ADR-0007, broadcaster, config, evaluator (+7 more)

### Community 30 - "app.ts"
Cohesion: 0.33
Nodes (5): sources, authHeader, interval, provider, uri

### Community 31 - "stack.mjs"
Cohesion: 0.18
Nodes (17): ADMIN, api(), assertPortFree(), docker(), down(), flagdConfig, here, pidFile (+9 more)

### Community 32 - "VariantTable.vue"
Cohesion: 0.17
Nodes (17): variantTypeOfVariants(), add(), booleanOptions, changeType(), convert(), defaultValueOf(), emit, emitEntries() (+9 more)

### Community 33 - "Figma build — resume kit"
Cohesion: 0.40
Nodes (4): Figma build — resume kit, How to run, What was recorded on canvas (2026-11-09), Why this exists

### Community 34 - "m1.integration.test.ts"
Cohesion: 0.12
Nodes (23): COOKIE_NAME, createAuthService(), authenticate(), canEvaluate(), canSync(), issue(), requireProjectRole(), resolve() (+15 more)

### Community 35 - "capabilityMatrix.ts"
Cohesion: 0.16
Nodes (12): API_KEY_SCOPES, ApiKeyScope, Role, ROLES, capabilityMatrix(), CapabilityRow, GLOBAL_CAPABILITIES, perRole() (+4 more)

### Community 36 - "app.ts"
Cohesion: 0.11
Nodes (16): @openfeature/server-sdk, AppOptions, createApp(), PUBLIC_AUTH_PATHS, PUBLIC_PATHS, RFC-9457, FlagEvaluator, ADR-0004 (+8 more)

### Community 37 - "evaluator.ts"
Cohesion: 0.33
Nodes (7): FlagEvaluationInput, FlagEvaluationResult, FlagObservation, FlagObservationInput, ADR-0004, VariantType, VariantValue

### Community 38 - "router/index.ts"
Cohesion: 0.11
Nodes (12): ADR-0006, route, session, showShell, app, router, routes, themeOverrides (+4 more)

### Community 39 - "domain/flags.ts"
Cohesion: 0.35
Nodes (9): changedFields(), DefinitionChange, definitionsEqual(), nextFlagVersion(), productOwnerPutAllowed(), solelyEnabledChanged(), stableStringify(), StoredFlagDefinition (+1 more)

### Community 40 - "stream.ts"
Cohesion: 0.16
Nodes (11): dispatcherFor(), dispatchers, FlagChangeStreamHandle, FrameListener, SSE_KEEPALIVE_MS, sseFrame(), startFlagChangeStream(), StreamFrame (+3 more)

### Community 41 - "routes.ts"
Cohesion: 0.16
Nodes (17): ADR-0008, FmsError, forbiddenError(), notFoundError(), PROBLEM_TYPES, ProblemDetails, TITLES, unavailableError() (+9 more)

### Community 42 - "InviteMemberDialog.vue"
Cohesion: 0.14
Nodes (14): InviteResult, close(), emit, errorMessageText, globalRole, invite(), invited, projectRoleOptions (+6 more)

### Community 43 - "reportFailure"
Cohesion: 0.28
Nodes (9): copyFrom(), deleteFlag(), describeProblems(), draftOf(), loadDraft(), pristineDefinition(), reportFailure(), save() (+1 more)

### Community 44 - "stores/flags.ts"
Cohesion: 0.09
Nodes (13): FlagDefinition, FlagDetail, FlagSummary, push, route, LiveState, SETTLE_DELAYS_MS, DEFINITION (+5 more)

### Community 46 - "AppShell.vue"
Cohesion: 0.12
Nodes (12): content, Crumb, crumbs, flagsStore, liveLabel, liveTitle, rail, railOpen (+4 more)

### Community 47 - "errorMessage"
Cohesion: 0.17
Nodes (11): apiValidationProblems(), errorMessage(), RFC-9457, ValidationProblem, loadOlder(), search(), createFlag(), load() (+3 more)

### Community 48 - "api/types.ts"
Cohesion: 0.11
Nodes (21): RFC-9457, ApiError, request(), ApiKeyCreated, ApiKeyRecord, AuditEntry, AuditPage, CopyResult (+13 more)

### Community 49 - "ProjectAccessView.vue"
Cohesion: 0.17
Nodes (10): MemberAssignment, inviting, loadError, loading, members, projectId, projectName, route (+2 more)

### Community 50 - "OpenFeatureFlagEvaluator"
Cohesion: 0.29
Nodes (5): observedFlagVersion(), OpenFeatureFlagEvaluator, evaluatorWith(), openFeature, OpenFeatureLike

### Community 51 - "LoginView.vue"
Cohesion: 0.20
Nodes (8): errorMessage, loading, password, passwordError, router, session, username, usernameError

### Community 52 - "FlagChangeDispatcher"
Cohesion: 0.28
Nodes (3): FlagdProviderEvent, FlagChangeDispatcher, flagSetParts()

### Community 53 - "format.ts"
Cohesion: 0.43
Nodes (6): DEFAULT_ENVIRONMENT_ORDER, formatRelative(), formatTimestamp(), initialsOf(), orderEnvironments(), suggestFlagKey()

### Community 54 - "FlagsView.test.ts"
Cohesion: 0.47
Nodes (5): dialogStub, mountFlags(), openDrawer(), push, signInAs()

### Community 55 - "RuleEditor.vue"
Cohesion: 0.12
Nodes (23): AttributeOp, PercentageRule, PercentageSplit, addCondition(), addPercentageRule(), addRule(), addSplit(), attributeOpOptions (+15 more)

### Community 56 - "RuleEditor.vue"
Cohesion: 0.06
Nodes (33): 07 — Dashboard Design, 1. Design goals, 2. Information architecture, 3.1 Color (planned `FMS Color` collection), 3.2 Spacing & radius (`FMS Spacing`, `FMS Radius`), 3.3 Type (planned text styles), 3. Design tokens, 4. Planned component inventory (`00 · Design System`) (+25 more)

### Community 58 - "m3.evaluate.e2e.test.ts"
Cohesion: 0.12
Nodes (9): evaluate(), EvaluateBody, ReadyBody, readyz(), repoRoot, RunningWaitStrategy, SseEvent, waitForEvaluate() (+1 more)

### Community 65 - "04-screens-a.js"
Cohesion: 0.19
Nodes (16): C(), card(), ds, F(), field(), FONTS, frow(), getComp() (+8 more)

### Community 66 - "m2.sync.integration.test.ts"
Cohesion: 0.26
Nodes (16): button(), C(), diff(), existing(), F(), fillArr(), FONTS, getIcon() (+8 more)

### Community 69 - "FlagEditorView.vue"
Cohesion: 0.05
Nodes (34): baseline, canEditDefinition, canSave, canToggle, capabilities, copyFromEnv, copying, copySourceEnvs (+26 more)

### Community 70 - "m3.evaluate.integration.test.ts"
Cohesion: 0.22
Nodes (15): C(), card(), ds, F(), FONTS, getComp(), headRow(), makeTable() (+7 more)

### Community 72 - "FlagsView.vue"
Cohesion: 0.05
Nodes (34): validateEnvName(), addEnvironment(), addingEnvironment, capabilities, createDescription, createKey, createName, createProblems (+26 more)

### Community 73 - "SyncHealthBadge.vue"
Cohesion: 0.22
Nodes (9): detail, label, pillClass, Props, props, served(), staleEntries, state (+1 more)

### Community 74 - "PlaygroundView.vue"
Cohesion: 0.09
Nodes (23): contextJson, definition, definitionMissing, detail, env, envOptions, errorMessageText, evaluatedEnv (+15 more)

### Community 75 - "FlagdProviderRegistry"
Cohesion: 0.21
Nodes (8): eventTypeOf(), FlagdEventListener, FlagdProviderBinding, FlagdProviderRegistry, flagSetIdOf(), stateForEvent(), ADR-0004, ProviderRuntimeState

### Community 76 - "ApiKeysView.vue"
Cohesion: 0.12
Nodes (15): create(), createdKey, creating, creatingKey, dialogOpen, errorMessageText, keys, loaded (+7 more)

### Community 77 - "evaluator.ts"
Cohesion: 0.21
Nodes (4): LATENCY_WARMUP_CALLS, LatencyTracker, mean(), percentile99()

### Community 78 - "session.ts"
Cohesion: 0.11
Nodes (22): pinia, EffectiveRole, api, ProjectSummary, signIn(), effectiveRoleFor(), ProjectAssignment, ProjectCapabilities (+14 more)

### Community 79 - "config.ts"
Cohesion: 0.13
Nodes (19): stubStore, assertSecureDefaults(), DEFAULT_ENVIRONMENTS, DEFAULT_ENVS, DEFAULT_FLAGD_HOST, DEFAULT_FLAGD_PORT, DEFAULT_HOST, DEFAULT_PORT (+11 more)

### Community 83 - "05-screens-b.js"
Cohesion: 0.23
Nodes (14): C(), card(), ds, F(), FONTS, getComp(), ghostBtn(), newScreen() (+6 more)

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
Cohesion: 0.28
Nodes (6): buildDesign(), colors, allText(), screens, FMS dashboard — FigCraft draft, Rebuild

### Community 94 - "ADR-0008 — Flag change events: OpenFeature events + FMS SSE relay"
Cohesion: 0.40
Nodes (4): ADR-0008 — Flag change events: OpenFeature events + FMS SSE relay, Consequences, Context, Decision

### Community 96 - "08-user-flow.js"
Cohesion: 0.21
Nodes (13): arrowD(), arrowR(), box(), C(), F(), flows, FONTS, fr (+5 more)

### Community 99 - "00-tokens.js"
Cohesion: 0.29
Nodes (7): C(), COLOR, FILL, out, RADIUS, SPACING, sync()

## Knowledge Gaps
- **38 isolated node(s):** `ADR-0005`, `ADR-0004`, `ADR-0006`, `../tsconfig.base.json`, `ADR-0006` (+33 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 735 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vue` connect `ProjectsView.vue` to `web/package.json`, `with`, `AuditView.vue`, `ref_vitest`, `VariantTable.vue`, `router/index.ts`, `InviteMemberDialog.vue`, `stores/flags.ts`, `AppShell.vue`, `ProjectAccessView.vue`, `LoginView.vue`, `RuleEditor.vue`, `RuleEditor.vue`, `FlagEditorView.vue`, `FlagsView.vue`, `SyncHealthBadge.vue`, `PlaygroundView.vue`, `ApiKeysView.vue`, `session.ts`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **What connects `ADR-0005`, `ADR-0004`, `ADR-0006` to the rest of the system?**
  _38 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `flagd-model.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0931174089068826 - nodes in this community are weakly interconnected._
- **Why does `Flag Management System` connect `Flag Management System` to `Architecture Decision Records`, `flagd`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Should `web/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.06825396825396825 - nodes in this community are weakly interconnected._
- **Why does `07 — Dashboard Design` connect `RuleEditor.vue` to `Flag Management System`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Should `healthcheck` be split into smaller, more focused modules?**
  _Cohesion score 0.07407407407407407 - nodes in this community are weakly interconnected._