# Graph Report - ir  (2026-07-19)

## Corpus Check
- 22 files · ~24,078 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 223 nodes · 605 edges · 11 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.7)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `fa08e4ec`
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
8. `WorldDocument` - 11 edges
9. `evalExpr()` - 10 edges
10. `execStmt()` - 10 edges

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
Nodes (38): BehaviorExtraction, CatalogEntry, ExtractionResult, RoomExtraction, BehaviorPropertyKey, BlockedExit, ConditionalExit, DirectionWord (+30 more)

### Community 1 - "Validator Structural Checks"
Cohesion: 0.10
Nodes (30): args, BEHAVIOR_PROPERTY_KEYS, DIRECTIONS, SYNTAX_SEARCH_OPTIONS, checkKeys(), checkPropKey(), Ctx, DIRECTION_SET (+22 more)

### Community 2 - "Behavior AST & POC Routines"
Cohesion: 0.29
Nodes (9): KITCHEN_WINDOW_F, T, TRAP_DOOR_EXIT, snapshot(), BehaviorRoutine, runInterpreted(), runTranspiled(), Scenario (+1 more)

### Community 3 - "POC Test Harness & World State"
Cohesion: 0.17
Nodes (19): CondClause, Expr, Stmt, TellPart, AstNode, atomName(), BehaviorSources, CLOCK_BUILTINS (+11 more)

### Community 4 - "Behavior Interpreter"
Cohesion: 0.18
Nodes (29): extractBehavior(), [astDir = "../importer/artifacts/ast", outFile = "artifacts/zork1.world.json"], catalogFile, programs, result, { world, catalog }, AstNode, AstProgram (+21 more)

### Community 5 - "World Builtins"
Cohesion: 0.35
Nodes (13): callRoutine(), ContinueSignal, entityId(), evalExpr(), execBody(), execStmt(), execTellPart(), Locals (+5 more)

### Community 6 - "Transpiled Comparison"
Cohesion: 0.18
Nodes (9): BreakSignal, ReturnSignal, Builtin, clearFlag(), DUMMY_RESPONSES, RuntimeTable, setFlag(), WorldState (+1 more)

### Community 7 - "Validator Types & Constants"
Cohesion: 0.29
Nodes (6): builtins, catalog, catalogIds, here, routineById, world

### Community 8 - "WorldDocument"
Cohesion: 0.25
Nodes (7): BehaviorRoutineReturn, catalog, catalogIds, golden, here, routineById, world

### Community 9 - "Room"
Cohesion: 0.67
Nodes (5): kitchenWindowF(), trapDoorExit(), hasFlag(), tell(), truthy()

### Community 10 - "behavior-35b.test.ts"
Cohesion: 0.17
Nodes (10): makeWorld(), catalog, catalogIds, here, routineById, world, catalog, here (+2 more)

## Knowledge Gaps
- **56 isolated node(s):** `ContinueSignal`, `Locals`, `T`, `DUMMY_RESPONSES`, `Builtin` (+51 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `validateWorld()` connect `Validator Structural Checks` to `Schema Types & Public API`, `POC Test Harness & World State`, `Behavior Interpreter`?**
  _High betweenness centrality (0.089) - this node is a cross-community bridge._
- **Why does `WorldDocument` connect `Schema Types & Public API` to `Behavior AST & POC Routines`, `Behavior Interpreter`, `Validator Types & Constants`, `WorldDocument`, `behavior-35b.test.ts`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Why does `BehaviorValue` connect `Transpiled Comparison` to `Schema Types & Public API`, `Room`, `Behavior AST & POC Routines`, `World Builtins`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **What connects `ContinueSignal`, `Locals`, `T` to the rest of the system?**
  _56 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Schema Types & Public API` be split into smaller, more focused modules?**
  _Cohesion score 0.07751937984496124 - nodes in this community are weakly interconnected._
- **Should `Validator Structural Checks` be split into smaller, more focused modules?**
  _Cohesion score 0.0953058321479374 - nodes in this community are weakly interconnected._