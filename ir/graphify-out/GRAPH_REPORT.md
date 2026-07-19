# Graph Report - ir  (2026-07-19)

## Corpus Check
- 26 files · ~28,055 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 252 nodes · 670 edges · 7 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.7)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7f1f86b9`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Schema Types & Public API
- Validator Structural Checks
- behavior-35-triage.test.ts
- POC Test Harness & World State
- Behavior Interpreter
- World Builtins
- WorldDocument

## God Nodes (most connected - your core abstractions)
1. `validateWorld()` - 24 edges
2. `RoutineTransformer` - 20 edges
3. `extractWorld()` - 16 edges
4. `WorldDocument` - 15 edges
5. `evalExpr()` - 14 edges
6. `runRoutine()` - 13 edges
7. `Expr` - 13 edges
8. `atomName()` - 12 edges
9. `BehaviorValue` - 11 edges
10. `BehaviorRoutine` - 11 edges

## Surprising Connections (you probably didn't know these)
- `runInterpreted()` --calls--> `runRoutine()`  [EXTRACTED]
  test/behavior-poc.test.ts → poc/interpreter.ts
- `RuntimeTable` --references--> `BehaviorValue`  [EXTRACTED]
  poc/world.ts → src/behavior.ts
- `WorldState` --references--> `BehaviorValue`  [EXTRACTED]
  poc/world.ts → src/behavior.ts
- `Scenario` --references--> `WorldState`  [EXTRACTED]
  test/behavior-poc.test.ts → poc/world.ts
- `runInterpreted()` --calls--> `snapshot()`  [EXTRACTED]
  test/behavior-poc.test.ts → poc/world.ts

## Import Cycles
- None detected.

## Communities (7 total, 0 thin omitted)

### Community 0 - "Schema Types & Public API"
Cohesion: 0.08
Nodes (38): KITCHEN_WINDOW_F, T, TRAP_DOOR_EXIT, BehaviorLiteral, BehaviorRoutine, CondClause, TableRef, TellPart (+30 more)

### Community 1 - "Validator Structural Checks"
Cohesion: 0.09
Nodes (32): args, BEHAVIOR_PROPERTY_KEYS, DIRECTIONS, SYNTAX_SEARCH_OPTIONS, checkKeys(), checkPropKey(), Ctx, DIRECTION_SET (+24 more)

### Community 2 - "behavior-35-triage.test.ts"
Cohesion: 0.29
Nodes (6): catalog, catalogIds, here, routineById, ADR-0001, world

### Community 3 - "POC Test Harness & World State"
Cohesion: 0.33
Nodes (8): Expr, Stmt, atomName(), BehaviorSources, CLOCK_BUILTINS, extractBehavior(), meaningful(), RoutineTransformer

### Community 4 - "Behavior Interpreter"
Cohesion: 0.14
Nodes (35): [astDir = "../importer/artifacts/ast", outFile = "artifacts/zork1.world.json"], catalogFile, programs, result, { world, catalog }, AstNode, AstProgram, atomName() (+27 more)

### Community 5 - "World Builtins"
Cohesion: 0.08
Nodes (50): applyRoutine(), BreakSignal, callRoutine(), ContinueSignal, entityId(), evalExpr(), execBody(), execStmt() (+42 more)

### Community 8 - "WorldDocument"
Cohesion: 0.06
Nodes (29): makeWorld(), CatalogEntry, ExtractionResult, WorldDocument, BehaviorRoutineReturn, catalog, catalogIds, golden (+21 more)

## Knowledge Gaps
- **75 isolated node(s):** `ContinueSignal`, `Locals`, `T`, `DUMMY_RESPONSES`, `Builtin` (+70 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `validateWorld()` connect `Validator Structural Checks` to `Schema Types & Public API`, `POC Test Harness & World State`, `Behavior Interpreter`?**
  _High betweenness centrality (0.070) - this node is a cross-community bridge._
- **Why does `WorldDocument` connect `WorldDocument` to `Schema Types & Public API`, `Validator Structural Checks`, `behavior-35-triage.test.ts`, `Behavior Interpreter`, `World Builtins`?**
  _High betweenness centrality (0.069) - this node is a cross-community bridge._
- **Why does `Expr` connect `POC Test Harness & World State` to `Schema Types & Public API`, `WorldDocument`, `World Builtins`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **What connects `ContinueSignal`, `Locals`, `T` to the rest of the system?**
  _75 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Schema Types & Public API` be split into smaller, more focused modules?**
  _Cohesion score 0.08484848484848485 - nodes in this community are weakly interconnected._
- **Should `Validator Structural Checks` be split into smaller, more focused modules?**
  _Cohesion score 0.08658536585365853 - nodes in this community are weakly interconnected._
- **Should `Behavior Interpreter` be split into smaller, more focused modules?**
  _Cohesion score 0.13813813813813813 - nodes in this community are weakly interconnected._