# Graph Report - ir  (2026-07-19)

## Corpus Check
- 19 files · ~21,801 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 203 nodes · 567 edges · 11 communities
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.7)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `239e12dc`
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

## Communities (11 total, 0 thin omitted)

### Community 0 - "Schema Types & Public API"
Cohesion: 0.08
Nodes (42): BehaviorRoutine, CondClause, TellPart, AstNode, BehaviorExtraction, CatalogEntry, DENIED_OPERATORS, EXPR_HEADS (+34 more)

### Community 1 - "Validator Structural Checks"
Cohesion: 0.12
Nodes (25): args, BEHAVIOR_PROPERTY_KEYS, DIRECTIONS, SYNTAX_SEARCH_OPTIONS, checkKeys(), checkPropKey(), Ctx, DIRECTION_SET (+17 more)

### Community 2 - "Behavior AST & POC Routines"
Cohesion: 0.33
Nodes (8): KITCHEN_WINDOW_F, T, TRAP_DOOR_EXIT, snapshot(), runInterpreted(), runTranspiled(), Scenario, scenarios

### Community 3 - "POC Test Harness & World State"
Cohesion: 0.36
Nodes (6): Expr, Stmt, atomName(), BehaviorSources, meaningful(), RoutineTransformer

### Community 4 - "Behavior Interpreter"
Cohesion: 0.26
Nodes (24): extractBehavior(), atomName(), decodeZilString(), DIRECTION_MAP, evalCondPredicate(), expandCompileTimeConds(), extractObject(), extractRoom() (+16 more)

### Community 5 - "World Builtins"
Cohesion: 0.35
Nodes (13): callRoutine(), ContinueSignal, entityId(), evalExpr(), execBody(), execStmt(), execTellPart(), Locals (+5 more)

### Community 6 - "Transpiled Comparison"
Cohesion: 0.67
Nodes (5): kitchenWindowF(), trapDoorExit(), hasFlag(), tell(), truthy()

### Community 7 - "Validator Types & Constants"
Cohesion: 0.13
Nodes (13): [astDir = "../importer/artifacts/ast", outFile = "artifacts/zork1.world.json"], catalogFile, programs, result, { world, catalog }, AstNode, AstProgram, astDir (+5 more)

### Community 8 - "WorldDocument"
Cohesion: 0.22
Nodes (8): makeWorld(), BehaviorRoutineReturn, catalog, catalogIds, golden, here, routineById, world

### Community 9 - "Room"
Cohesion: 0.20
Nodes (9): BreakSignal, ReturnSignal, Builtin, clearFlag(), DUMMY_RESPONSES, RuntimeTable, setFlag(), WorldState (+1 more)

### Community 10 - "behavior-35b.test.ts"
Cohesion: 0.29
Nodes (6): builtins, catalog, catalogIds, here, routineById, world

## Knowledge Gaps
- **41 isolated node(s):** `ContinueSignal`, `Locals`, `T`, `DUMMY_RESPONSES`, `Builtin` (+36 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `validateWorld()` connect `Validator Structural Checks` to `Schema Types & Public API`, `POC Test Harness & World State`, `Behavior Interpreter`, `Validator Types & Constants`?**
  _High betweenness centrality (0.107) - this node is a cross-community bridge._
- **Why does `BehaviorValue` connect `Room` to `Schema Types & Public API`, `Behavior AST & POC Routines`, `World Builtins`, `Transpiled Comparison`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Why does `Expr` connect `POC Test Harness & World State` to `Schema Types & Public API`, `Behavior AST & POC Routines`, `World Builtins`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **What connects `ContinueSignal`, `Locals`, `T` to the rest of the system?**
  _41 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Schema Types & Public API` be split into smaller, more focused modules?**
  _Cohesion score 0.08156028368794327 - nodes in this community are weakly interconnected._
- **Should `Validator Structural Checks` be split into smaller, more focused modules?**
  _Cohesion score 0.11742424242424243 - nodes in this community are weakly interconnected._
- **Should `Validator Types & Constants` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._