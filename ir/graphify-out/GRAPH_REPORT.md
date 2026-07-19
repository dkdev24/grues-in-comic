# Graph Report - ir  (2026-07-19)

## Corpus Check
- 21 files · ~23,415 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 218 nodes · 594 edges · 12 communities (10 shown, 2 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.7)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a445d21b`
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
- extract.test.ts

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

## Communities (12 total, 2 thin omitted)

### Community 0 - "Schema Types & Public API"
Cohesion: 0.08
Nodes (36): BehaviorExtraction, CatalogEntry, ExtractionResult, RoomExtraction, BehaviorPropertyKey, BlockedExit, ConditionalExit, DirectionWord (+28 more)

### Community 1 - "Validator Structural Checks"
Cohesion: 0.11
Nodes (26): args, BEHAVIOR_PROPERTY_KEYS, DIRECTIONS, SYNTAX_SEARCH_OPTIONS, checkKeys(), checkPropKey(), Ctx, DIRECTION_SET (+18 more)

### Community 2 - "Behavior AST & POC Routines"
Cohesion: 0.29
Nodes (9): KITCHEN_WINDOW_F, T, TRAP_DOOR_EXIT, snapshot(), BehaviorRoutine, runInterpreted(), runTranspiled(), Scenario (+1 more)

### Community 3 - "POC Test Harness & World State"
Cohesion: 0.17
Nodes (19): CondClause, Expr, Stmt, TellPart, AstNode, atomName(), BehaviorSources, CLOCK_BUILTINS (+11 more)

### Community 4 - "Behavior Interpreter"
Cohesion: 0.30
Nodes (22): extractBehavior(), atomName(), decodeZilString(), DIRECTION_MAP, evalCondPredicate(), expandCompileTimeConds(), extractObject(), extractRoom() (+14 more)

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

### Community 11 - "extract.test.ts"
Cohesion: 0.13
Nodes (13): [astDir = "../importer/artifacts/ast", outFile = "artifacts/zork1.world.json"], catalogFile, programs, result, { world, catalog }, AstNode, AstProgram, astDir (+5 more)

## Knowledge Gaps
- **52 isolated node(s):** `ContinueSignal`, `Locals`, `T`, `DUMMY_RESPONSES`, `Builtin` (+47 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `validateWorld()` connect `Validator Structural Checks` to `Schema Types & Public API`, `POC Test Harness & World State`, `extract.test.ts`, `Behavior Interpreter`?**
  _High betweenness centrality (0.094) - this node is a cross-community bridge._
- **Why does `BehaviorValue` connect `Transpiled Comparison` to `Schema Types & Public API`, `Behavior AST & POC Routines`, `World Builtins`, `Validator Types & Constants`, `Room`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **Why does `WorldDocument` connect `Schema Types & Public API` to `Validator Structural Checks`, `Behavior AST & POC Routines`, `Behavior Interpreter`, `WorldDocument`, `behavior-35b.test.ts`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **What connects `ContinueSignal`, `Locals`, `T` to the rest of the system?**
  _52 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Schema Types & Public API` be split into smaller, more focused modules?**
  _Cohesion score 0.08461538461538462 - nodes in this community are weakly interconnected._
- **Should `Validator Structural Checks` be split into smaller, more focused modules?**
  _Cohesion score 0.11229946524064172 - nodes in this community are weakly interconnected._
- **Should `extract.test.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._