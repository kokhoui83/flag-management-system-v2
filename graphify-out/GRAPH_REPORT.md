# Graph Report - flag-management-system  (2026-11-04)

## Corpus Check
- 65 files · ~37,702 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 799 nodes · 1043 edges · 66 communities (55 shown, 5 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 32 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `bb09d8da`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- app.ts
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
- shared/src/index.ts
- properties
- m2.sync.integration.test.ts
- server/src/index.ts
- associativeOp
- variants
- flagsMap
- stringCompareRule
- m1.integration.test.ts
- definitions
- missingSomeRule
- sem_ver
- missingRule
- reduce
- types.ts
- reference
- providerConfig
- binaryOrTernaryRule
- fractionalRule
- varRule
- targeting.json
- fractionalOp
- defaultVariant
- flagsArray
- associativeRule
- fractionalWeightArg
- unaryRule
- booleanFlag
- flagdConfig
- $ref
- fractionalShorthandOp
- semVerString
- stringCompareArgs
- refresh-flagd-schema.mjs
- definitions
- metadata
- numberFlag
- objectFlag
- stringFlag
- variadicOp

## God Nodes (most connected - your core abstractions)
1. `Store` - 32 edges
2. `definitions` - 28 edges
3. `definitions` - 17 edges
4. `compilerOptions` - 16 edges
5. `createAuthService()` - 15 edges
6. `FmsError` - 15 edges
7. `registerRoutes()` - 13 edges
8. `FlagdModelMemo` - 13 edges
9. `scripts` - 12 edges
10. `createApp()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `FlagdFlagInput` --references--> `VariantValue`  [EXTRACTED]
  server/src/domain/flagd-model.ts → shared/src/index.ts
- `FlagdFlagEntry` --references--> `VariantValue`  [EXTRACTED]
  server/src/domain/flagd-model.ts → shared/src/index.ts
- `ProblemDetails` --references--> `ValidationProblem`  [EXTRACTED]
  server/src/http/problem.ts → shared/src/index.ts
- `registerRoutes()` --calls--> `validateDefinition()`  [EXTRACTED]
  server/src/http/routes.ts → shared/src/index.ts
- `Evaluation` --conceptually_related_to--> `flagd`  [INFERRED]
  docs/01-requirements.md → README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Architecture Decision Records Corpus** — docs_adr_0001_use_flagd_as_evaluation_engine_flagd, docs_adr_0002_sqlite_system_of_record_sqlite, docs_adr_0003_http_sync_pull_publication_http_sync, docs_adr_0004_environments_as_flag_sets_flag_set, docs_adr_0005_ordered_rules_with_terminal_fractional_fractional [EXTRACTED 1.00]
- **Flag Authoring Model** — docs_01_requirements_feature_flag, docs_01_requirements_definition, docs_01_requirements_rule, docs_01_requirements_percentage_rule [INFERRED 0.85]
- **Flag Evaluation Implementation Chain** — docs_02_architecture_flagd_provider, docs_02_architecture_flag_evaluator, docs_01_requirements_evaluation, readme_flagd [INFERRED 0.85]

## Communities (66 total, 5 thin omitted)

### Community 0 - "app.ts"
Cohesion: 0.06
Nodes (45): RFC-9457, fastify, @fastify/static, AppOptions, createApp(), PUBLIC_PATHS, EffectiveRole, AuthService (+37 more)

### Community 1 - "flagd-model.ts"
Cohesion: 0.13
Nodes (24): ADR-0004, ADR-0005, compileChain(), compileFlagdModel(), compileTargeting(), conditionsToExpression(), conditionToJsonLogic(), compileDoc() (+16 more)

### Community 2 - "web/package.json"
Cohesion: 0.05
Nodes (37): happy-dom, naive-ui, pinia, vite, @vitejs/plugin-vue, vue, vue-router, @vue/test-utils (+29 more)

### Community 3 - "properties"
Cohesion: 0.06
Nodes (34): description, $ref, title, additionalProperties, description, properties, title, type (+26 more)

### Community 4 - "Flag Management System Architecture"
Cohesion: 0.05
Nodes (50): Development Guidelines, API Key, Attribute Condition, Audit Log, Flag Definition, Environment, Evaluation, Feature Flag (+42 more)

### Community 5 - "store/index.ts"
Cohesion: 0.12
Nodes (19): AuditLogRecord, AuditPage, AuditQuery, CreateApiKeyResult, CreateProjectResult, createStore(), FlagDetail, FlagEnvironmentStatus (+11 more)

### Community 7 - "server/package.json"
Cohesion: 0.06
Nodes (35): @fastify/cookie, prisma, supertest, tsx, @types/supertest, dependencies, fastify, @fastify/cookie (+27 more)

### Community 12 - "package.json"
Cohesion: 0.06
Nodes (32): devDependencies, eslint, eslint-config-prettier, @eslint/js, eslint-plugin-vitest, prettier, typescript, typescript-eslint (+24 more)

### Community 13 - "compilerOptions"
Cohesion: 0.11
Nodes (17): compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution, noFallthroughCasesInSwitch (+9 more)

### Community 14 - "config.ts"
Cohesion: 0.18
Nodes (15): assertSecureDefaults(), DEFAULT_ENVIRONMENTS, DEFAULT_ENVS, DEFAULT_FLAGD_HOST, DEFAULT_FLAGD_PORT, DEFAULT_PORT, DEFAULT_WEB_DIST, generateJwtSecret() (+7 more)

### Community 15 - "compilerOptions"
Cohesion: 0.20
Nodes (9): compilerOptions, jsx, module, moduleResolution, noEmit, types, extends, include (+1 more)

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

### Community 20 - "shared/src/index.ts"
Cohesion: 0.11
Nodes (28): FlagdFlagEntry, definitionsEqual(), nextFlagVersion(), stableStringify(), StoredFlagDefinition, ATTRIBUTE_OPS, AttributeCondition, AttributeOp (+20 more)

### Community 26 - "properties"
Cohesion: 0.17
Nodes (12): $comment, properties, required, type, baseFlag, state, targeting, description (+4 more)

### Community 27 - "m2.sync.integration.test.ts"
Cohesion: 0.25
Nodes (3): adminToken(), login(), repoRoot

### Community 29 - "server/src/index.ts"
Cohesion: 0.19
Nodes (12): @prisma/adapter-mariadb, @prisma/client, closePrismaClient(), createPrismaClient(), ADR-0007, config, memo, prisma (+4 more)

### Community 30 - "associativeOp"
Cohesion: 0.50
Nodes (4): items, minItems, type, associativeOp

### Community 31 - "variants"
Cohesion: 0.15
Nodes (13): properties, type, booleanVariants, numberVariants, stringVariants, properties, type, variants (+5 more)

### Community 32 - "flagsMap"
Cohesion: 0.06
Nodes (34): $comment, $ref, type, description, properties, title, type, baseConfig (+26 more)

### Community 33 - "stringCompareRule"
Cohesion: 0.17
Nodes (12): stringCompareRule, description, $ref, title, ends_with, starts_with, description, $ref (+4 more)

### Community 34 - "m1.integration.test.ts"
Cohesion: 0.33
Nodes (5): @testcontainers/mariadb, AppConfig, adminToken(), login(), repoRoot

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
Cohesion: 0.18
Nodes (11): reduceRule, reduce, description, items, maxItems, minItems, title, type (+3 more)

### Community 40 - "types.ts"
Cohesion: 0.22
Nodes (5): ActorType, API_KEY_SCOPES, ApiKeyScope, Role, ROLES

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

### Community 48 - "defaultVariant"
Cohesion: 0.50
Nodes (4): description, title, type, defaultVariant

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

### Community 55 - "$ref"
Cohesion: 0.18
Nodes (11): items, maxItems, minItems, type, items, maxItems, minItems, type (+3 more)

### Community 56 - "fractionalShorthandOp"
Cohesion: 0.50
Nodes (4): fractionalShorthandOp, items, minItems, type

### Community 57 - "semVerString"
Cohesion: 0.40
Nodes (5): semVerString, description, pattern, title, type

### Community 58 - "stringCompareArgs"
Cohesion: 0.40
Nodes (5): stringCompareArgs, items, maxItems, minItems, type

### Community 59 - "refresh-flagd-schema.mjs"
Cohesion: 0.50
Nodes (3): files, outDir, scriptDir

### Community 60 - "definitions"
Cohesion: 0.20
Nodes (9): anyOf, definitions, anyFlag, objectVariants, $id, properties, type, $ref (+1 more)

### Community 61 - "metadata"
Cohesion: 0.50
Nodes (4): type, metadata, additionalProperties, type

### Community 62 - "numberFlag"
Cohesion: 0.50
Nodes (4): numberFlag, allOf, description, title

### Community 63 - "objectFlag"
Cohesion: 0.50
Nodes (4): objectFlag, allOf, description, title

### Community 64 - "stringFlag"
Cohesion: 0.50
Nodes (4): stringFlag, allOf, description, title

### Community 65 - "variadicOp"
Cohesion: 0.50
Nodes (4): variadicOp, items, minItems, type

## Knowledge Gaps
- **433 isolated node(s):** `name`, `version`, `private`, `type`, `workspaces` (+428 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 483 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `definitions` connect `definitions` to `properties`, `properties`, `associativeOp`, `stringCompareRule`, `missingSomeRule`, `sem_ver`, `missingRule`, `reduce`, `reference`, `binaryOrTernaryRule`, `fractionalRule`, `varRule`, `targeting.json`, `fractionalOp`, `associativeRule`, `fractionalWeightArg`, `unaryRule`, `$ref`, `fractionalShorthandOp`, `semVerString`, `stringCompareArgs`, `variadicOp`?**
  _High betweenness centrality (0.074) - this node is a cross-community bridge._
- **Why does `binaryRule` connect `properties` to `definitions`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Are the 7 inferred relationships involving `createAuthService()` (e.g. with `canSync()` and `isAdmin()`) actually correct?**
  _`createAuthService()` has 7 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _433 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `app.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05625 - nodes in this community are weakly interconnected._
- **Should `flagd-model.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12701612903225806 - nodes in this community are weakly interconnected._
- **Should `web/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.053426248548199766 - nodes in this community are weakly interconnected._