# Graph Report - ir  (2026-07-19)

## Corpus Check
- 20 files · ~23,021 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 211 nodes · 585 edges · 11 communities (9 shown, 2 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.7)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `efcd410f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Schema Types & Public API
- Validator Structural Checks
- Behavior AST & POC Routines
- POC Test Harness & World State
- Behavior Interpreter
- World Builtins
- Transpiled Comparison
- Validator Types & Constants
- WorldDocument
- Room
- behavior-35b.test.ts

## God Nodes (most connected - your core abstractions)
1. `validateWorld()` - 24 edges
2. `RoutineTransformer` - 20 edges
3. `extractWorld()` - 16 edges
4. `atomName()` - 12 edges
5. `BehaviorRoutine` - 11 edges
6. `meaningful()` - 11 edges
7. `atomName()` - 11 edges
8. `evalExpr()` - 10 edges
9. `execStmt()` - 10 edges
10. `BehaviorValue` - 10 edges

## Surprising Connections (you probably didn't know these)
- `runInterpreted()` --calls--> `runRoutine()`  [EXTRACTED]
  test/behavior-poc.test.ts → poc/interpreter.ts
- `Scenario` --references--> `WorldState`  [EXTRACTED]
  test/behavior-poc.test.ts → poc/world.ts
- `RuntimeTable` --references--> `BehaviorValue`  [EXTRACTED]
  poc/world.ts → src/behavior.ts
- `WorldState` --references--> `BehaviorValue`  [EXTRACTED]
  poc/world.ts → src/behavior.ts
- `runInterpreted()` --calls--> `snapshot()`  [EXTRACTED]
  test/behavior-poc.test.ts → poc/world.ts

## Import Cycles
- None detected.

## Communities (11 total, 2 thin omitted)

### Community 0 - "Schema Types & Public API"
Cohesion: 0.08
Nodes (40): CondClause, TellPart, AstNode, BehaviorExtraction, CatalogEntry, DENIED_OPERATORS, EXPR_HEADS, FALSE (+32 more)

### Community 1 - "Validator Structural Checks"
Cohesion: 0.09
Nodes (32): args, BEHAVIOR_PROPERTY_KEYS, DIRECTIONS, SYNTAX_SEARCH_OPTIONS, checkKeys(), checkPropKey(), Ctx, DIRECTION_SET (+24 more)

### Community 2 - "Behavior AST & POC Routines"
Cohesion: 0.29
Nodes (9): KITCHEN_WINDOW_F, T, TRAP_DOOR_EXIT, snapshot(), BehaviorRoutine, runInterpreted(), runTranspiled(), Scenario (+1 more)

### Community 3 - "POC Test Harness & World State"
Cohesion: 0.34
Nodes (7): Expr, Stmt, atomName(), BehaviorSources, CLOCK_BUILTINS, meaningful(), RoutineTransformer

### Community 4 - "Behavior Interpreter"
Cohesion: 0.17
Nodes (31): extractBehavior(), [astDir = "../importer/artifacts/ast", outFile = "artifacts/zork1.world.json"], catalogFile, programs, result, { world, catalog }, AstNode, AstProgram (+23 more)

### Community 5 - "World Builtins"
Cohesion: 0.28
Nodes (15): callRoutine(), ContinueSignal, entityId(), evalExpr(), execBody(), execStmt(), execTellPart(), Locals (+7 more)

### Community 6 - "Transpiled Comparison"
Cohesion: 0.31
Nodes (10): kitchenWindowF(), trapDoorExit(), Builtin, DUMMY_RESPONSES, hasFlag(), RuntimeTable, tell(), truthy() (+2 more)

### Community 8 - "WorldDocument"
Cohesion: 0.25
Nodes (7): BehaviorRoutineReturn, catalog, catalogIds, golden, here, routineById, world

### Community 10 - "behavior-35b.test.ts"
Cohesion: 0.15
Nodes (12): builtins, makeWorld(), catalog, catalogIds, here, routineById, world, catalog (+4 more)

## Knowledge Gaps
- **46 isolated node(s):** `ContinueSignal`, `Locals`, `T`, `DUMMY_RESPONSES`, `Builtin` (+41 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `validateWorld()` connect `Validator Structural Checks` to `Schema Types & Public API`, `POC Test Harness & World State`, `Behavior Interpreter`?**
  _High betweenness centrality (0.100) - this node is a cross-community bridge._
- **Why does `BehaviorValue` connect `Transpiled Comparison` to `Schema Types & Public API`, `Behavior AST & POC Routines`, `World Builtins`, `Validator Types & Constants`, `Room`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Why does `Expr` connect `POC Test Harness & World State` to `Schema Types & Public API`, `Behavior AST & POC Routines`, `World Builtins`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **What connects `ContinueSignal`, `Locals`, `T` to the rest of the system?**
  _46 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Schema Types & Public API` be split into smaller, more focused modules?**
  _Cohesion score 0.08080808080808081 - nodes in this community are weakly interconnected._
- **Should `Validator Structural Checks` be split into smaller, more focused modules?**
  _Cohesion score 0.08658536585365853 - nodes in this community are weakly interconnected._