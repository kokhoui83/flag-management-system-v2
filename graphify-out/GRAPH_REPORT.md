# Graph Report - flag-management-system  (2026-11-05)

## Corpus Check
- 66 files · ~42,366 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 807 nodes · 1074 edges · 66 communities (55 shown, 5 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 32 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c47842ee`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- routes.ts
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
- $evaluators
- compilerOptions
- shared/package.json
- properties
- server/tsconfig.json
- shared/tsconfig.json
- shared/src/index.ts
- properties
- devDependencies
- server/src/index.ts
- $ref
- variants
- flagsMap
- stringCompareRule
- dependencies
- definitions
- missingSomeRule
- sem_ver
- missingRule
- reduce
- scripts
- reference
- providerConfig
- binaryOrTernaryRule
- fractionalRule
- varRule
- targeting.json
- fractionalOp
- definitions
- flagsArray
- associativeRule
- fractionalWeightArg
- unaryRule
- booleanFlag
- flagdConfig
- binaryOp
- fractionalShorthandOp
- semVerString
- stringCompareArgs
- refresh-flagd-schema.mjs
- flags.json
- metadata
- numberFlag
- objectFlag
- stringFlag
- binaryOrTernaryOp

## God Nodes (most connected - your core abstractions)
1. `Store` - 32 edges
2. `definitions` - 28 edges
3. `definitions` - 17 edges
4. `compilerOptions` - 16 edges
5. `createAuthService()` - 15 edges
6. `FmsError` - 15 edges
7. `registerRoutes()` - 15 edges
8. `FlagdModelMemo` - 13 edges
9. `scripts` - 12 edges
10. `createApp()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `FlagdFlagEntry` --references--> `VariantValue`  [EXTRACTED]
  server/src/domain/flagd-model.ts → shared/src/index.ts
- `StoredFlagDefinition` --references--> `VariantValue`  [EXTRACTED]
  server/src/domain/flags.ts → shared/src/index.ts
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

### Community 0 - "routes.ts"
Cohesion: 0.05
Nodes (53): RFC-9457, @fastify/static, AppOptions, createApp(), PUBLIC_PATHS, ActorType, API_KEY_SCOPES, ApiKeyScope (+45 more)

### Community 1 - "flagd-model.ts"
Cohesion: 0.11
Nodes (27): ADR-0004, ADR-0005, compileChain(), compileFlagdModel(), compileTargeting(), conditionsToExpression(), conditionToJsonLogic(), compileDoc() (+19 more)

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
Cohesion: 0.05
Nodes (44): fastify, @testcontainers/mariadb, AppConfig, assertSecureDefaults(), DEFAULT_ENVIRONMENTS, DEFAULT_ENVS, DEFAULT_FLAGD_HOST, DEFAULT_FLAGD_PORT (+36 more)

### Community 7 - "server/package.json"
Cohesion: 0.14
Nodes (13): @fastify/cookie, prisma, supertest, tsx, @types/supertest, @types/node, typescript, vitest (+5 more)

### Community 12 - "package.json"
Cohesion: 0.06
Nodes (32): devDependencies, eslint, eslint-config-prettier, @eslint/js, eslint-plugin-vitest, prettier, typescript, typescript-eslint (+24 more)

### Community 13 - "compilerOptions"
Cohesion: 0.11
Nodes (17): compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution, noFallthroughCasesInSwitch (+9 more)

### Community 14 - "$evaluators"
Cohesion: 0.18
Nodes (11): description, properties, title, type, baseConfig, additionalProperties, description, patternProperties (+3 more)

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
Nodes (29): changedFields(), DefinitionChange, definitionsEqual(), nextFlagVersion(), productOwnerPutAllowed(), solelyEnabledChanged(), stableStringify(), StoredFlagDefinition (+21 more)

### Community 26 - "properties"
Cohesion: 0.07
Nodes (27): $comment, properties, required, type, description, title, type, baseFlag (+19 more)

### Community 27 - "devDependencies"
Cohesion: 0.25
Nodes (8): devDependencies, supertest, @testcontainers/mariadb, tsx, @types/node, @types/supertest, typescript, vitest

### Community 29 - "server/src/index.ts"
Cohesion: 0.19
Nodes (12): @prisma/adapter-mariadb, @prisma/client, closePrismaClient(), createPrismaClient(), ADR-0007, config, memo, prisma (+4 more)

### Community 30 - "$ref"
Cohesion: 0.20
Nodes (10): items, minItems, type, associativeOp, variadicOp, $ref, items, items (+2 more)

### Community 31 - "variants"
Cohesion: 0.15
Nodes (13): numberVariants, objectVariants, stringVariants, properties, type, properties, type, variants (+5 more)

### Community 32 - "flagsMap"
Cohesion: 0.17
Nodes (12): $comment, $ref, type, flagsMap, additionalProperties, $comment, description, patternProperties (+4 more)

### Community 33 - "stringCompareRule"
Cohesion: 0.17
Nodes (12): stringCompareRule, description, $ref, title, ends_with, starts_with, description, $ref (+4 more)

### Community 34 - "dependencies"
Cohesion: 0.29
Nodes (7): dependencies, fastify, @fastify/cookie, @fastify/static, prisma, @prisma/adapter-mariadb, @prisma/client

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

### Community 40 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, dev, refresh:schema, start, test, test:integration, typecheck

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

### Community 48 - "definitions"
Cohesion: 0.33
Nodes (6): anyOf, properties, type, definitions, anyFlag, booleanVariants

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

### Community 55 - "binaryOp"
Cohesion: 0.40
Nodes (5): items, maxItems, minItems, type, binaryOp

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

### Community 60 - "flags.json"
Cohesion: 0.50
Nodes (3): $id, $ref, $schema

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

### Community 65 - "binaryOrTernaryOp"
Cohesion: 0.40
Nodes (5): items, maxItems, minItems, type, binaryOrTernaryOp

## Knowledge Gaps
- **435 isolated node(s):** `name`, `version`, `private`, `type`, `workspaces` (+430 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 482 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `definitions` connect `definitions` to `properties`, `properties`, `$ref`, `stringCompareRule`, `missingSomeRule`, `sem_ver`, `missingRule`, `reduce`, `reference`, `binaryOrTernaryRule`, `fractionalRule`, `varRule`, `targeting.json`, `fractionalOp`, `associativeRule`, `fractionalWeightArg`, `unaryRule`, `binaryOp`, `fractionalShorthandOp`, `semVerString`, `stringCompareArgs`, `binaryOrTernaryOp`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **Why does `binaryRule` connect `properties` to `definitions`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Why does `Store` connect `Store` to `routes.ts`, `flagd-model.ts`, `store/index.ts`, `server/src/index.ts`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Are the 7 inferred relationships involving `createAuthService()` (e.g. with `canSync()` and `isAdmin()`) actually correct?**
  _`createAuthService()` has 7 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _435 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `routes.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05109218807848945 - nodes in this community are weakly interconnected._
- **Should `flagd-model.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10510510510510511 - nodes in this community are weakly interconnected._