# Graph Report - flag-management-system  (2026-11-07)

## Corpus Check
- 102 files · ~61,974 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1114 nodes · 1700 edges · 83 communities (71 shown, 6 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 36 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `cae8efb7`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- AuthService
- flagd-model.ts
- web/package.json
- properties
- Flag Management System Architecture
- store/index.ts
- Store
- server/package.json
- Client Application
- Dashboard
- ULID
- OpenAPI
- package.json
- compilerOptions
- config.ts
- compilerOptions
- shared/package.json
- properties
- server/tsconfig.json
- shared/tsconfig.json
- problem.ts
- properties
- routes.ts
- server/src/index.ts
- $ref
- definitions
- flagsMap
- stringCompareRule
- createAuthService
- definitions
- missingSomeRule
- sem_ver
- missingRule
- reduce
- m3.evaluate.integration.test.ts
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
- RuleEditor.vue
- semVerString
- stringCompareArgs
- refresh-flagd-schema.mjs
- flags.json
- metadata
- numberFlag
- objectFlag
- session.ts
- auth.ts
- m2.sync.integration.test.ts
- app.ts
- stream.ts
- FlagEditorView.vue
- broadcaster.ts
- m3.evaluate.e2e.test.ts
- FlagsView.vue
- vue
- PlaygroundView.vue
- AuditView.vue
- ApiKeysView.vue
- domain/flags.ts
- binaryOp
- associativeOp
- metadata
- properties
- $evaluators

## God Nodes (most connected - your core abstractions)
1. `Store` - 40 edges
2. `definitions` - 28 edges
3. `FlagdProviderRegistry` - 24 edges
4. `createApp()` - 18 edges
5. `registerRoutes()` - 18 edges
6. `createAuthService()` - 17 edges
7. `definitions` - 17 edges
8. `naive-ui` - 17 edges
9. `compilerOptions` - 16 edges
10. `FmsError` - 15 edges

## Surprising Connections (you probably didn't know these)
- `FlagdFlagInput` --references--> `FlagRule`  [EXTRACTED]
  server/src/domain/flagd-model.ts → shared/src/index.ts
- `FlagdFlagEntry` --references--> `VariantValue`  [EXTRACTED]
  server/src/domain/flagd-model.ts → shared/src/index.ts
- `StoredFlagDefinition` --references--> `VariantValue`  [EXTRACTED]
  server/src/domain/flags.ts → shared/src/index.ts
- `FlagEvaluationInput` --references--> `VariantValue`  [EXTRACTED]
  server/src/evaluate/types.ts → shared/src/index.ts
- `canEvaluate()` --calls--> `effectiveCapability()`  [EXTRACTED]
  server/src/http/auth.ts → shared/src/index.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Architecture Decision Records Corpus** — docs_adr_0001_use_flagd_as_evaluation_engine_flagd, docs_adr_0002_sqlite_system_of_record_sqlite, docs_adr_0003_http_sync_pull_publication_http_sync, docs_adr_0004_environments_as_flag_sets_flag_set, docs_adr_0005_ordered_rules_with_terminal_fractional_fractional [EXTRACTED 1.00]
- **Flag Authoring Model** — docs_01_requirements_feature_flag, docs_01_requirements_definition, docs_01_requirements_rule, docs_01_requirements_percentage_rule [INFERRED 0.85]
- **Flag Evaluation Implementation Chain** — docs_02_architecture_flagd_provider, docs_02_architecture_flag_evaluator, docs_01_requirements_evaluation, readme_flagd [INFERRED 0.85]

## Communities (83 total, 6 thin omitted)

### Community 1 - "flagd-model.ts"
Cohesion: 0.10
Nodes (27): ADR-0005, compileChain(), compileFlagdModel(), compileTargeting(), conditionsToExpression(), conditionToJsonLogic(), compileDoc(), flagsSchemaPath (+19 more)

### Community 2 - "web/package.json"
Cohesion: 0.05
Nodes (35): happy-dom, @playwright/test, vite, @vitejs/plugin-vue, vue-tsc, dependencies, naive-ui, pinia (+27 more)

### Community 3 - "properties"
Cohesion: 0.06
Nodes (34): description, $ref, title, additionalProperties, description, properties, title, type (+26 more)

### Community 4 - "Flag Management System Architecture"
Cohesion: 0.05
Nodes (50): Development Guidelines, API Key, Attribute Condition, Audit Log, Flag Definition, Environment, Evaluation, Feature Flag (+42 more)

### Community 5 - "store/index.ts"
Cohesion: 0.11
Nodes (21): encodeBase32(), generateUlid(), ULID_BASE_POWERS, AuditLogRecord, AuditPage, AuditQuery, CreateApiKeyResult, CreateProjectResult (+13 more)

### Community 7 - "server/package.json"
Cohesion: 0.05
Nodes (39): @fastify/cookie, @fastify/static, prisma, supertest, tsx, @types/supertest, dependencies, fastify (+31 more)

### Community 12 - "package.json"
Cohesion: 0.06
Nodes (33): devDependencies, eslint, eslint-config-prettier, @eslint/js, eslint-plugin-vitest, prettier, typescript, typescript-eslint (+25 more)

### Community 13 - "compilerOptions"
Cohesion: 0.11
Nodes (17): compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution, noFallthroughCasesInSwitch (+9 more)

### Community 14 - "config.ts"
Cohesion: 0.18
Nodes (15): assertSecureDefaults(), DEFAULT_ENVIRONMENTS, DEFAULT_ENVS, DEFAULT_FLAGD_HOST, DEFAULT_FLAGD_PORT, DEFAULT_PORT, DEFAULT_WEB_DIST, generateJwtSecret() (+7 more)

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

### Community 20 - "problem.ts"
Cohesion: 0.36
Nodes (8): FmsError, forbiddenError(), notFoundError(), ProblemDetails, TITLES, unauthorizedError(), unavailableError(), ValidationProblem

### Community 26 - "properties"
Cohesion: 0.12
Nodes (16): $comment, properties, required, type, description, title, type, baseFlag (+8 more)

### Community 27 - "routes.ts"
Cohesion: 0.24
Nodes (11): validationError(), actorName(), enqueueFlagChange(), ifNoneMatchMatches(), paramsOf(), paramValue(), queryOf(), registerRoutes() (+3 more)

### Community 29 - "server/src/index.ts"
Cohesion: 0.13
Nodes (16): @prisma/adapter-mariadb, @prisma/client, closePrismaClient(), createPrismaClient(), ADR-0007, broadcaster, config, evaluator (+8 more)

### Community 30 - "$ref"
Cohesion: 0.13
Nodes (15): items, maxItems, minItems, type, binaryOrTernaryOp, fractionalShorthandOp, variadicOp, items (+7 more)

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
Cohesion: 0.24
Nodes (9): createAuthService(), authenticate(), issue(), resolve(), safeEqual(), signJwt(), storeUserSession(), verifyBootstrap() (+1 more)

### Community 35 - "definitions"
Cohesion: 0.18
Nodes (11): anyOf, oneOf, definitions, anyRule, args, primitive, stringCompareArg, unaryOp (+3 more)

### Community 36 - "missingSomeRule"
Cohesion: 0.18
Nodes (11): missingSomeRule, items, maxItems, minItems, type, additionalProperties, description, properties (+3 more)

### Community 37 - "sem_ver"
Cohesion: 0.18
Nodes (11): ruleSemVer, sem_ver, additionalProperties, properties, type, description, items, maxItems (+3 more)

### Community 38 - "missingRule"
Cohesion: 0.20
Nodes (10): missingRule, type, items, type, additionalProperties, description, properties, title (+2 more)

### Community 39 - "reduce"
Cohesion: 0.20
Nodes (10): reduceRule, reduce, description, maxItems, minItems, title, type, additionalProperties (+2 more)

### Community 40 - "m3.evaluate.integration.test.ts"
Cohesion: 0.16
Nodes (6): @testcontainers/mariadb, AppConfig, adminToken(), login(), repoRoot, repoRoot

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
Cohesion: 0.15
Nodes (19): ApiError, request(), RFC-9457, CopyResult, CreateEnvironmentResult, DefinitionPutResult, EvaluationResult, FlagDefinition (+11 more)

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
Cohesion: 0.16
Nodes (18): ATTRIBUTE_OPS, AttributeRule, CAPABILITY_LADDER, conditionIsValid(), ENV_PATTERN, FLAG_KEY_PATTERN, isVariantValue(), RESERVED_VARIANT_NAMES (+10 more)

### Community 56 - "RuleEditor.vue"
Cohesion: 0.11
Nodes (20): AttributeOp, FlagRule, PercentageRule, PercentageSplit, addCondition(), addRule(), addSplit(), attributeOpOptions (+12 more)

### Community 57 - "semVerString"
Cohesion: 0.40
Nodes (5): semVerString, description, pattern, title, type

### Community 58 - "stringCompareArgs"
Cohesion: 0.40
Nodes (5): stringCompareArgs, items, maxItems, minItems, type

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

### Community 64 - "session.ts"
Cohesion: 0.08
Nodes (25): naive-ui, pinia, vue-router, api, ProjectSummary, app, naiveApp, router (+17 more)

### Community 65 - "auth.ts"
Cohesion: 0.12
Nodes (18): COOKIE_NAME, canEvaluate(), canSync(), requireProjectRole(), fastify, FastifyRequest, Principal, SessionContext (+10 more)

### Community 66 - "m2.sync.integration.test.ts"
Cohesion: 0.25
Nodes (3): adminToken(), login(), repoRoot

### Community 67 - "app.ts"
Cohesion: 0.24
Nodes (8): createApp(), PUBLIC_AUTH_PATHS, PUBLIC_PATHS, stubStore, RFC-9457, stubStore, PROBLEM_TYPES, problemBody()

### Community 68 - "stream.ts"
Cohesion: 0.24
Nodes (8): fastify, FlagdProviderEvent, FlagChangeStreamHandle, flagSetParts(), SSE_KEEPALIVE_MS, sseFrame(), startFlagChangeStream(), ADR-0008

### Community 69 - "FlagEditorView.vue"
Cohesion: 0.09
Nodes (18): copyFromEnv, copySourceEnvs, env, environments, errorMessage, flagKey, flagsStore, isCreate (+10 more)

### Community 70 - "broadcaster.ts"
Cohesion: 0.18
Nodes (5): FlagChangeBroadcaster, InMemoryFlagChangeBroadcaster, QueuedFlagChange, ADR-0008, StartFlagChangeStreamInput

### Community 71 - "m3.evaluate.e2e.test.ts"
Cohesion: 0.05
Nodes (37): @openfeature/flagd-provider, @openfeature/server-sdk, AppOptions, FlagEvaluator, observedFlagVersion(), OpenFeatureFlagEvaluator, openFeature, OpenFeatureLike (+29 more)

### Community 72 - "FlagsView.vue"
Cohesion: 0.11
Nodes (13): effectiveRoleFor(), canManage, canCreateFlags, flags, flagsStore, loading, project, projectId (+5 more)

### Community 73 - "vue"
Cohesion: 0.16
Nodes (11): vue, @vue/test-utils, ObservedEnvironmentStatus, computeDiffs(), DiffRow, diffs, props, stable() (+3 more)

### Community 74 - "PlaygroundView.vue"
Cohesion: 0.12
Nodes (15): contextJson, env, envOptions, errorMessage, flagKey, flagOptions, flagsStore, loading (+7 more)

### Community 75 - "AuditView.vue"
Cohesion: 0.20
Nodes (7): AuditEntry, AuditPage, actionFilter, entityFilter, entries, loading, nextBefore

### Community 76 - "ApiKeysView.vue"
Cohesion: 0.15
Nodes (13): ApiKeyCreated, ApiKeyRecord, create(), createdKey, creating, creatingKey, errorMessage, keys (+5 more)

### Community 77 - "domain/flags.ts"
Cohesion: 0.36
Nodes (9): changedFields(), DefinitionChange, definitionsEqual(), nextFlagVersion(), productOwnerPutAllowed(), solelyEnabledChanged(), stableStringify(), StoredFlagDefinition (+1 more)

### Community 78 - "binaryOp"
Cohesion: 0.40
Nodes (5): items, maxItems, minItems, type, binaryOp

### Community 79 - "associativeOp"
Cohesion: 0.50
Nodes (4): items, minItems, type, associativeOp

### Community 80 - "metadata"
Cohesion: 0.22
Nodes (9): description, properties, title, type, baseConfig, description, $ref, title (+1 more)

### Community 81 - "properties"
Cohesion: 0.29
Nodes (7): description, type, properties, flagSetId, version, description, type

### Community 82 - "$evaluators"
Cohesion: 0.33
Nodes (6): additionalProperties, description, patternProperties, title, type, $evaluators

## Knowledge Gaps
- **551 isolated node(s):** `name`, `version`, `private`, `type`, `workspaces` (+546 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 656 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `definitions` connect `definitions` to `properties`, `properties`, `$ref`, `stringCompareRule`, `missingSomeRule`, `sem_ver`, `missingRule`, `reduce`, `reference`, `binaryOrTernaryRule`, `fractionalRule`, `varRule`, `targeting.json`, `fractionalOp`, `associativeRule`, `fractionalWeightArg`, `unaryRule`, `semVerString`, `stringCompareArgs`, `binaryOp`, `associativeOp`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Why does `Store` connect `Store` to `auth.ts`, `flagd-model.ts`, `app.ts`, `m2.sync.integration.test.ts`, `store/index.ts`, `m3.evaluate.e2e.test.ts`, `m3.evaluate.integration.test.ts`, `RuleEditor.vue`, `routes.ts`, `server/src/index.ts`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Why does `naive-ui` connect `session.ts` to `web/package.json`, `FlagEditorView.vue`, `FlagsView.vue`, `vue`, `PlaygroundView.vue`, `AuditView.vue`, `ApiKeysView.vue`, `RuleEditor.vue`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _551 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `flagd-model.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10241820768136557 - nodes in this community are weakly interconnected._
- **Should `web/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.05128205128205128 - nodes in this community are weakly interconnected._
- **Should `properties` be split into smaller, more focused modules?**
  _Cohesion score 0.058823529411764705 - nodes in this community are weakly interconnected._