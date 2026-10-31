# Graph Report - flag-management-system  (2026-10-31)

## Corpus Check
- Corpus is ~11,852 words - fits in a single context window. You may not need a graph.

## Summary
- 42 nodes · 43 edges · 13 communities (7 shown, 6 thin omitted)
- Extraction: 44% EXTRACTED · 56% INFERRED · 0% AMBIGUOUS · INFERRED: 24 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Flag Foundation
- API and Auth
- Management and Sync
- Flag Evaluation
- Targeting Rules
- Flag Lifecycle
- Rollout Logic
- Flag Definition
- Client Applications
- Dashboard
- Identifiers
- OpenAPI Contract
- Roadmap

## God Nodes (most connected - your core abstractions)
1. `Architecture Decision Records` - 6 edges
2. `Flag Management System Architecture` - 5 edges
3. `Flag Management System` - 4 edges
4. `Flag Management System API Contract` - 4 edges
5. `Feature Flag` - 4 edges
6. `Targeting Rule` - 4 edges
7. `Percentage Rule` - 4 edges
8. `flagd` - 4 edges
9. `Flagd Model Compilation and Data Model` - 3 edges
10. `flagd as the evaluation engine` - 3 edges

## Surprising Connections (you probably didn't know these)
- `Evaluation` --conceptually_related_to--> `flagd`  [INFERRED]
  docs/01-requirements.md → README.md
- `Flag Management System` --references--> `Flag Management System Requirements`  [EXTRACTED]
  README.md → docs/01-requirements.md
- `Flag Management System` --references--> `Architecture Decision Records`  [EXTRACTED]
  README.md → docs/adr/README.md
- `Flag Management System Testing Strategy` --references--> `Development Guidelines`  [EXTRACTED]
  docs/05-testing.md → AGENTS.md
- `flagd` --conceptually_related_to--> `Flagd Model Compilation and Data Model`  [INFERRED]
  docs/02-architecture.md → docs/03-data-model.md

## Hyperedges (group relationships)
- **Flag Evaluation Implementation Chain** — docs_02_architecture_flagd_provider, docs_02_architecture_flag_evaluator, docs_01_requirements_evaluation, readme_flagd [INFERRED 0.85]
- **Flag Authoring Model** — docs_01_requirements_feature_flag, docs_01_requirements_definition, docs_01_requirements_rule, docs_01_requirements_percentage_rule [INFERRED 0.85]
- **Architecture Decision Records Corpus** — docs_adr_0001_use_flagd_as_evaluation_engine_flagd, docs_adr_0002_sqlite_system_of_record_sqlite, docs_adr_0003_http_sync_pull_publication_http_sync, docs_adr_0004_environments_as_flag_sets_flag_set, docs_adr_0005_ordered_rules_with_terminal_fractional_fractional [EXTRACTED 1.00]

## Communities (13 total, 6 thin omitted)

### Community 0 - "Flag Foundation"
Cohesion: 0.24
Nodes (10): Environment, Flag Management System Requirements, Flag Management System Architecture, SQLite, flagd as the evaluation engine, SQLite as the system of record, Environments as flag sets, Architecture Decision Records (+2 more)

### Community 1 - "API and Auth"
Cohesion: 0.33
Nodes (6): Development Guidelines, JWT Session, Flagd Model Compilation and Data Model, Flag Management System API Contract, RFC 9457 Problem Document, Flag Management System Testing Strategy

### Community 2 - "Management and Sync"
Cohesion: 0.40
Nodes (5): API Key, Audit Log, Flag Sync, Management API, HTTP sync pull as the publication mechanism

### Community 3 - "Flag Evaluation"
Cohesion: 0.40
Nodes (5): Evaluation, Flag Evaluator, flagd, Flagd Provider, flagd

### Community 4 - "Targeting Rules"
Cohesion: 0.67
Nodes (3): Attribute Condition, Targeting Rule, JSONLogic

### Community 5 - "Flag Lifecycle"
Cohesion: 0.67
Nodes (3): Feature Flag, Flag Version, Percentage Rollout

### Community 6 - "Rollout Logic"
Cohesion: 0.67
Nodes (3): Percentage Rule, Fractional Operation, Ordered rules with a terminal percentage rule

## Knowledge Gaps
- **18 isolated node(s):** `Development Guidelines`, `Flag Management System Roadmap and Milestones`, `OpenFeature`, `Variant`, `Environment` (+13 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 18 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Architecture Decision Records` connect `Flag Foundation` to `Management and Sync`, `Rollout Logic`?**
  _High betweenness centrality (0.322) - this node is a cross-community bridge._
- **Why does `flagd` connect `Flag Evaluation` to `Flag Foundation`, `API and Auth`, `Management and Sync`?**
  _High betweenness centrality (0.218) - this node is a cross-community bridge._
- **Why does `Percentage Rule` connect `Rollout Logic` to `Targeting Rules`, `Flag Lifecycle`?**
  _High betweenness centrality (0.213) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `Flag Management System` (e.g. with `flagd` and `OpenFeature`) actually correct?**
  _`Flag Management System` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `Feature Flag` (e.g. with `Audit Log` and `Flag Definition`) actually correct?**
  _`Feature Flag` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Development Guidelines`, `Flag Management System Roadmap and Milestones`, `OpenFeature` to the rest of the system?**
  _18 weakly-connected nodes found - possible documentation gaps or missing edges._