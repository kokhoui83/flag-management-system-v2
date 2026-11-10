# Graph Report - flag-management-system  (2026-11-10)

## Corpus Check
- 122 files · ~268,634 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1292 nodes · 1973 edges · 111 communities (92 shown, 8 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 36 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4bd6805f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- AuthService
- flagd-model.ts
- web/package.json
- properties
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
- properties
- server/tsconfig.json
- shared/tsconfig.json
- auth.ts
- properties
- 07-screens-d.js
- server/src/index.ts
- $ref
- definitions
- flagsMap
- stringCompareRule
- createAuthService
- definitions
- missingSomeRule
- sem_ver
- router/index.ts
- reduce
- stream.ts
- reference
- providerConfig
- binaryOrTernaryRule
- fractionalRule
- varRule
- targeting.json
- fractionalOp
- api/types.ts
- flagsArray
- associativeRule
- fractionalWeightArg
- unaryRule
- booleanFlag
- flagdConfig
- shared/src/index.ts
- 5. Screen specifications
- semVerString
- m3.evaluate.e2e.test.ts
- refresh-flagd-schema.mjs
- flags.json
- metadata
- numberFlag
- objectFlag
- ProjectsView.vue
- 04-screens-a.js
- 02-atoms.js
- DiffView.vue
- binaryOrTernaryOp
- FlagEditorView.vue
- 06-screens-c.js
- LatencyTracker
- FlagsView.vue
- naive-ui
- PlaygroundView.vue
- FlagdProviderRegistry
- ApiKeysView.vue
- evaluator.ts
- session.ts
- config.ts
- metadata
- properties
- $evaluators
- 05-screens-b.js
- missingRule
- routes.ts
- Feature Flag
- 01-icons.js
- 03-shell.js
- Architecture Decision Records
- flagd
- Figma build — resume kit
- Flag Sync
- ADR-0006 — Vue 3 + Vite dashboard in a separate workspace
- ADR-0008 — Flag change events: OpenFeature events + FMS SSE relay
- app.ts
- 08-user-flow.js
- db/index.ts
- dependencies
- 00-tokens.js
- devDependencies
- scripts
- stringCompareArgs
- providers.test.ts
- associativeOp
- sample4.py

## God Nodes (most connected - your core abstractions)
1. `Store` - 40 edges
2. `definitions` - 28 edges
3. `FlagdProviderRegistry` - 24 edges
4. `naive-ui` - 19 edges
5. `createApp()` - 18 edges
6. `registerRoutes()` - 18 edges
7. `createAuthService()` - 17 edges
8. `definitions` - 17 edges
9. `compilerOptions` - 16 edges
10. `FmsError` - 15 edges

## Surprising Connections (you probably didn't know these)
- `canEvaluate()` --calls--> `effectiveCapability()`  [EXTRACTED]
  server/src/http/auth.ts → shared/src/index.ts
- `FlagdFlagInput` --references--> `FlagRule`  [EXTRACTED]
  server/src/domain/flagd-model.ts → shared/src/index.ts
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

## Communities (111 total, 8 thin omitted)

### Community 1 - "flagd-model.ts"
Cohesion: 0.11
Nodes (26): ADR-0005, compileChain(), compileFlagdModel(), compileTargeting(), conditionsToExpression(), conditionToJsonLogic(), compileDoc(), flagsSchemaPath (+18 more)

### Community 2 - "web/package.json"
Cohesion: 0.05
Nodes (35): happy-dom, @playwright/test, vite, @vitejs/plugin-vue, vue-tsc, dependencies, naive-ui, pinia (+27 more)

### Community 3 - "properties"
Cohesion: 0.06
Nodes (34): description, $ref, title, additionalProperties, description, properties, title, type (+26 more)

### Community 4 - "Flag Management System"
Cohesion: 0.36
Nodes (12): Development Guidelines, Flag Management System Requirements, JWT Session, Flag Management System Architecture, SQLite, Flagd Model Compilation and Data Model, Flag Management System API Contract, RFC 9457 Problem Document (+4 more)

### Community 5 - "store/index.ts"
Cohesion: 0.13
Nodes (19): encodeBase32(), generateUlid(), ULID_BASE_POWERS, AuditLogRecord, AuditQuery, CreateApiKeyResult, CreateProjectResult, createStore() (+11 more)

### Community 7 - "server/package.json"
Cohesion: 0.13
Nodes (14): @fastify/cookie, @fastify/static, prisma, supertest, tsx, @types/supertest, @types/node, typescript (+6 more)

### Community 12 - "package.json"
Cohesion: 0.06
Nodes (33): devDependencies, eslint, eslint-config-prettier, @eslint/js, eslint-plugin-vitest, prettier, typescript, typescript-eslint (+25 more)

### Community 13 - "compilerOptions"
Cohesion: 0.11
Nodes (17): compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution, noFallthroughCasesInSwitch (+9 more)

### Community 14 - "m3.evaluate.integration.test.ts"
Cohesion: 0.10
Nodes (10): fastify, @testcontainers/mariadb, AppConfig, adminToken(), login(), repoRoot, adminToken(), login() (+2 more)

### Community 15 - "compilerOptions"
Cohesion: 0.15
Nodes (12): compilerOptions, baseUrl, jsx, module, moduleResolution, noEmit, paths, types (+4 more)

### Community 16 - "shared/package.json"
Cohesion: 0.20
Nodes (9): main, name, private, scripts, test, typecheck, type, types (+1 more)

### Community 17 - "properties"
Cohesion: 0.07
Nodes (29): description, $ref, title, description, $ref, title, variadicRule, description (+21 more)

### Community 18 - "server/tsconfig.json"
Cohesion: 0.33
Nodes (5): compilerOptions, outDir, extends, include, ../tsconfig.base.json

### Community 19 - "shared/tsconfig.json"
Cohesion: 0.33
Nodes (5): compilerOptions, outDir, extends, include, ../tsconfig.base.json

### Community 20 - "auth.ts"
Cohesion: 0.17
Nodes (15): COOKIE_NAME, fastify, FastifyRequest, Principal, SessionContext, FmsError, forbiddenError(), notFoundError() (+7 more)

### Community 26 - "properties"
Cohesion: 0.12
Nodes (16): $comment, properties, required, type, description, title, type, baseFlag (+8 more)

### Community 27 - "07-screens-d.js"
Cohesion: 0.19
Nodes (16): C(), card(), checkCell(), ds, F(), FONTS, getComp(), headRow() (+8 more)

### Community 29 - "server/src/index.ts"
Cohesion: 0.18
Nodes (10): broadcaster, config, evaluator, memo, prisma, registry, repoRoot, store (+2 more)

### Community 30 - "$ref"
Cohesion: 0.13
Nodes (15): items, maxItems, minItems, type, binaryOp, fractionalShorthandOp, variadicOp, items (+7 more)

### Community 31 - "definitions"
Cohesion: 0.12
Nodes (19): anyOf, properties, type, definitions, anyFlag, booleanVariants, numberVariants, objectVariants (+11 more)

### Community 32 - "flagsMap"
Cohesion: 0.17
Nodes (12): $comment, $ref, type, flagsMap, additionalProperties, $comment, description, patternProperties (+4 more)

### Community 33 - "stringCompareRule"
Cohesion: 0.17
Nodes (12): stringCompareRule, description, $ref, title, ends_with, starts_with, description, $ref (+4 more)

### Community 34 - "createAuthService"
Cohesion: 0.22
Nodes (10): createAuthService(), authenticate(), canEvaluate(), issue(), resolve(), safeEqual(), signJwt(), storeUserSession() (+2 more)

### Community 35 - "definitions"
Cohesion: 0.18
Nodes (11): anyOf, oneOf, definitions, anyRule, args, primitive, stringCompareArg, unaryOp (+3 more)

### Community 36 - "missingSomeRule"
Cohesion: 0.18
Nodes (11): missingSomeRule, items, maxItems, minItems, type, additionalProperties, description, properties (+3 more)

### Community 37 - "sem_ver"
Cohesion: 0.18
Nodes (11): ruleSemVer, sem_ver, additionalProperties, properties, type, description, items, maxItems (+3 more)

### Community 38 - "router/index.ts"
Cohesion: 0.12
Nodes (13): vue, vue-router, app, naiveApp, router, routes, ADR-0006, errorMessage (+5 more)

### Community 39 - "reduce"
Cohesion: 0.20
Nodes (10): reduceRule, reduce, description, maxItems, minItems, title, type, additionalProperties (+2 more)

### Community 40 - "stream.ts"
Cohesion: 0.12
Nodes (11): FlagChangeBroadcaster, InMemoryFlagChangeBroadcaster, QueuedFlagChange, ADR-0008, FlagChangeStreamHandle, flagSetParts(), SSE_KEEPALIVE_MS, sseFrame() (+3 more)

### Community 41 - "reference"
Cohesion: 0.22
Nodes (9): reference, ^\\$ref$, description, title, type, additionalProperties, $comment, patternProperties (+1 more)

### Community 42 - "providerConfig"
Cohesion: 0.25
Nodes (8): providerConfig, $ref, flags, allOf, description, properties, required, type

### Community 43 - "binaryOrTernaryRule"
Cohesion: 0.25
Nodes (8): additionalProperties, properties, type, binaryOrTernaryRule, substr, description, $ref, title

### Community 44 - "fractionalRule"
Cohesion: 0.25
Nodes (8): fractionalRule, description, oneOf, title, additionalProperties, properties, type, fractional

### Community 45 - "varRule"
Cohesion: 0.25
Nodes (8): varRule, var, anyOf, additionalProperties, description, properties, title, type

### Community 46 - "targeting.json"
Cohesion: 0.29
Nodes (6): anyOf, description, $id, $schema, title, type

### Community 47 - "fractionalOp"
Cohesion: 0.29
Nodes (7): $ref, fractionalOp, additionalItems, $comment, items, minItems, type

### Community 48 - "api/types.ts"
Cohesion: 0.11
Nodes (21): ApiError, request(), RFC-9457, AuditEntry, AuditPage, CopyResult, CreateEnvironmentResult, DefinitionPutResult (+13 more)

### Community 49 - "flagsArray"
Cohesion: 0.33
Nodes (6): flagsArray, description, items, title, type, allOf

### Community 50 - "associativeRule"
Cohesion: 0.33
Nodes (6): additionalProperties, description, properties, title, type, associativeRule

### Community 51 - "fractionalWeightArg"
Cohesion: 0.33
Nodes (6): fractionalWeightArg, description, items, maxItems, minItems, type

### Community 52 - "unaryRule"
Cohesion: 0.33
Nodes (6): unaryRule, additionalProperties, description, properties, title, type

### Community 53 - "booleanFlag"
Cohesion: 0.40
Nodes (5): allOf, $comment, description, title, booleanFlag

### Community 54 - "flagdConfig"
Cohesion: 0.40
Nodes (5): flagdConfig, allOf, description, required, type

### Community 55 - "shared/src/index.ts"
Cohesion: 0.06
Nodes (55): changedFields(), DefinitionChange, definitionsEqual(), nextFlagVersion(), productOwnerPutAllowed(), solelyEnabledChanged(), stableStringify(), StoredFlagDefinition (+47 more)

### Community 56 - "5. Screen specifications"
Cohesion: 0.08
Nodes (26): 07 — Dashboard Design, 1. Design goals, 2. Information architecture, 3.1 Color (Figma collection `FMS Color`), 3.2 Spacing & radius (`FMS Spacing`, `FMS Radius`), 3.3 Type (Figma text styles), 3. Design tokens, 4. Component inventory (Figma page `00 · Design System`) (+18 more)

### Community 57 - "semVerString"
Cohesion: 0.40
Nodes (5): semVerString, description, pattern, title, type

### Community 58 - "m3.evaluate.e2e.test.ts"
Cohesion: 0.14
Nodes (9): evaluate(), EvaluateBody, ReadyBody, readyz(), repoRoot, RunningWaitStrategy, SseEvent, waitForEvaluate() (+1 more)

### Community 59 - "refresh-flagd-schema.mjs"
Cohesion: 0.50
Nodes (3): files, outDir, scriptDir

### Community 60 - "flags.json"
Cohesion: 0.50
Nodes (3): $id, $ref, $schema

### Community 61 - "metadata"
Cohesion: 0.50
Nodes (4): type, metadata, additionalProperties, type

### Community 62 - "numberFlag"
Cohesion: 0.21
Nodes (8): numberFlag, stringFlag, allOf, description, title, allOf, description, title

### Community 63 - "objectFlag"
Cohesion: 0.50
Nodes (4): objectFlag, allOf, description, title

### Community 64 - "ProjectsView.vue"
Cohesion: 0.18
Nodes (7): createKey, createName, creating, creatingProject, errorMessage, router, session

### Community 65 - "04-screens-a.js"
Cohesion: 0.19
Nodes (16): C(), card(), ds, F(), field(), FONTS, frow(), getComp() (+8 more)

### Community 66 - "02-atoms.js"
Cohesion: 0.26
Nodes (16): button(), C(), diff(), existing(), F(), fillArr(), FONTS, getIcon() (+8 more)

### Community 67 - "DiffView.vue"
Cohesion: 0.43
Nodes (5): computeDiffs(), DiffRow, diffs, props, stable()

### Community 68 - "binaryOrTernaryOp"
Cohesion: 0.40
Nodes (5): items, maxItems, minItems, type, binaryOrTernaryOp

### Community 69 - "FlagEditorView.vue"
Cohesion: 0.09
Nodes (18): copyFromEnv, copySourceEnvs, env, environments, errorMessage, flagKey, flagsStore, isCreate (+10 more)

### Community 70 - "06-screens-c.js"
Cohesion: 0.22
Nodes (15): C(), card(), ds, F(), FONTS, getComp(), headRow(), makeTable() (+7 more)

### Community 71 - "LatencyTracker"
Cohesion: 0.26
Nodes (4): LATENCY_WARMUP_CALLS, LatencyTracker, mean(), percentile99()

### Community 72 - "FlagsView.vue"
Cohesion: 0.11
Nodes (13): effectiveRoleFor(), canManage, canCreateFlags, flags, flagsStore, loading, project, projectId (+5 more)

### Community 73 - "naive-ui"
Cohesion: 0.22
Nodes (8): naive-ui, @vue/test-utils, FlagRule, ObservedEnvironmentStatus, variants, isHealthy, Props, staleEnvs

### Community 74 - "PlaygroundView.vue"
Cohesion: 0.12
Nodes (15): contextJson, env, envOptions, errorMessage, flagKey, flagOptions, flagsStore, loading (+7 more)

### Community 75 - "FlagdProviderRegistry"
Cohesion: 0.15
Nodes (10): @openfeature/flagd-provider, eventTypeOf(), FlagdEventListener, FlagdProviderBinding, FlagdProviderEvent, FlagdProviderRegistry, flagSetIdOf(), stateForEvent() (+2 more)

### Community 76 - "ApiKeysView.vue"
Cohesion: 0.15
Nodes (13): ApiKeyCreated, ApiKeyRecord, create(), createdKey, creating, creatingKey, errorMessage, keys (+5 more)

### Community 77 - "evaluator.ts"
Cohesion: 0.22
Nodes (11): @openfeature/server-sdk, observedFlagVersion(), OpenFeatureFlagEvaluator, openFeature, OpenFeatureLike, ADR-0004, FlagEvaluationInput, FlagEvaluationResult (+3 more)

### Community 78 - "session.ts"
Cohesion: 0.22
Nodes (12): pinia, api, FlagDefinition, FlagDetail, ProjectSummary, FlagChangeEvent, ADR-0008, useFlagsStore (+4 more)

### Community 79 - "config.ts"
Cohesion: 0.18
Nodes (15): assertSecureDefaults(), DEFAULT_ENVIRONMENTS, DEFAULT_ENVS, DEFAULT_FLAGD_HOST, DEFAULT_FLAGD_PORT, DEFAULT_PORT, DEFAULT_WEB_DIST, generateJwtSecret() (+7 more)

### Community 80 - "metadata"
Cohesion: 0.22
Nodes (9): description, properties, title, type, baseConfig, description, $ref, title (+1 more)

### Community 81 - "properties"
Cohesion: 0.29
Nodes (7): description, type, properties, flagSetId, version, description, type

### Community 82 - "$evaluators"
Cohesion: 0.33
Nodes (6): additionalProperties, description, patternProperties, title, type, $evaluators

### Community 83 - "05-screens-b.js"
Cohesion: 0.23
Nodes (14): C(), card(), ds, F(), FONTS, getComp(), ghostBtn(), newScreen() (+6 more)

### Community 84 - "missingRule"
Cohesion: 0.20
Nodes (10): missingRule, type, items, type, additionalProperties, description, properties, title (+2 more)

### Community 85 - "routes.ts"
Cohesion: 0.20
Nodes (13): actorName(), enqueueFlagChange(), ifNoneMatchMatches(), paramsOf(), paramValue(), queryOf(), registerRoutes(), ADR-0008 (+5 more)

### Community 86 - "Feature Flag"
Cohesion: 0.20
Nodes (11): Attribute Condition, Flag Definition, Feature Flag, Flag Version, Percentage Rule, Percentage Rollout, Targeting Rule, Variant (+3 more)

### Community 87 - "01-icons.js"
Cohesion: 0.33
Nodes (9): buildSet(), C(), ell(), F(), iconComp(), ICONS, out, rect() (+1 more)

### Community 88 - "03-shell.js"
Cohesion: 0.36
Nodes (7): C(), F(), FONTS, getComp(), navItem(), out, T()

### Community 89 - "Architecture Decision Records"
Cohesion: 0.22
Nodes (8): Environment, SQLite as the system of record, Environments as flag sets, ADR-0007 — MariaDB as the system of record, Consequences, Context, Decision, Architecture Decision Records

### Community 90 - "flagd"
Cohesion: 0.33
Nodes (6): Evaluation, Flag Evaluator, flagd, Flagd Provider, flagd as the evaluation engine, flagd

### Community 91 - "Figma build — resume kit"
Cohesion: 0.40
Nodes (4): Figma build — resume kit, How to run, What is already on canvas (verified 2026-11-09), Why this exists

### Community 92 - "Flag Sync"
Cohesion: 0.40
Nodes (5): API Key, Audit Log, Flag Sync, Management API, HTTP sync pull as the publication mechanism

### Community 93 - "ADR-0006 — Vue 3 + Vite dashboard in a separate workspace"
Cohesion: 0.40
Nodes (4): ADR-0006 — Vue 3 + Vite dashboard in a separate workspace, Consequences, Context, Decision

### Community 94 - "ADR-0008 — Flag change events: OpenFeature events + FMS SSE relay"
Cohesion: 0.40
Nodes (4): ADR-0008 — Flag change events: OpenFeature events + FMS SSE relay, Consequences, Context, Decision

### Community 95 - "app.ts"
Cohesion: 0.19
Nodes (11): AppOptions, createApp(), PUBLIC_AUTH_PATHS, PUBLIC_PATHS, stubStore, RFC-9457, FlagEvaluator, stubStore (+3 more)

### Community 96 - "08-user-flow.js"
Cohesion: 0.21
Nodes (13): arrowD(), arrowR(), box(), C(), F(), flows, FONTS, fr (+5 more)

### Community 97 - "db/index.ts"
Cohesion: 0.31
Nodes (6): @prisma/adapter-mariadb, @prisma/client, closePrismaClient(), createPrismaClient(), ADR-0007, shutdown()

### Community 98 - "dependencies"
Cohesion: 0.22
Nodes (9): dependencies, fastify, @fastify/cookie, @fastify/static, @openfeature/flagd-provider, @openfeature/server-sdk, prisma, @prisma/adapter-mariadb (+1 more)

### Community 99 - "00-tokens.js"
Cohesion: 0.29
Nodes (7): C(), COLOR, FILL, out, RADIUS, SPACING, sync()

### Community 100 - "devDependencies"
Cohesion: 0.25
Nodes (8): devDependencies, supertest, @testcontainers/mariadb, tsx, @types/node, @types/supertest, typescript, vitest

### Community 101 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, dev, refresh:schema, start, test, test:e2e, test:integration, typecheck

### Community 102 - "stringCompareArgs"
Cohesion: 0.40
Nodes (5): stringCompareArgs, items, maxItems, minItems, type

### Community 104 - "associativeOp"
Cohesion: 0.50
Nodes (4): items, minItems, type, associativeOp

## Knowledge Gaps
- **614 isolated node(s):** `FILL`, `COLOR`, `SPACING`, `RADIUS`, `out` (+609 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 733 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `definitions` connect `definitions` to `properties`, `properties`, `$ref`, `stringCompareRule`, `missingSomeRule`, `sem_ver`, `reduce`, `reference`, `binaryOrTernaryRule`, `fractionalRule`, `varRule`, `targeting.json`, `fractionalOp`, `associativeRule`, `fractionalWeightArg`, `unaryRule`, `semVerString`, `binaryOrTernaryOp`, `missingRule`, `stringCompareArgs`, `associativeOp`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `Store` connect `Store` to `flagd-model.ts`, `store/index.ts`, `m3.evaluate.integration.test.ts`, `auth.ts`, `routes.ts`, `m3.evaluate.e2e.test.ts`, `server/src/index.ts`, `app.ts`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Why does `FlagRule` connect `naive-ui` to `flagd-model.ts`, `store/index.ts`, `Store`, `FlagEditorView.vue`, `session.ts`, `shared/src/index.ts`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **What connects `FILL`, `COLOR`, `SPACING` to the rest of the system?**
  _614 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `flagd-model.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11260504201680673 - nodes in this community are weakly interconnected._
- **Should `web/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.04878048780487805 - nodes in this community are weakly interconnected._
- **Should `properties` be split into smaller, more focused modules?**
  _Cohesion score 0.058823529411764705 - nodes in this community are weakly interconnected._