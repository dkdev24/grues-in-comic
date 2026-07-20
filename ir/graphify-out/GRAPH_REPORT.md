# Graph Report - ir  (2026-07-20)

## Corpus Check
- 29 files · ~33,767 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 283 nodes · 763 edges · 13 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.7)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `34ba79a4`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Schema Types & Public API
- Validator Structural Checks
- behavior-35-triage.test.ts
- POC Test Harness & World State
- Behavior Interpreter
- World Builtins
- table-globals.test.ts
- world.ts
- makeWorld
- behavior-poc.test.ts
- behavior-35h.test.ts
- behavior-35i.test.ts
- behavior.ts

## God Nodes (most connected - your core abstractions)
1. `validateWorld()` - 30 edges
2. `RoutineTransformer` - 22 edges
3. `WorldDocument` - 18 edges
4. `extractWorld()` - 17 edges
5. `runRoutine()` - 16 edges
6. `evalExpr()` - 14 edges
7. `atomName()` - 14 edges
8. `makeWorld()` - 13 edges
9. `Expr` - 13 edges
10. `BehaviorValue` - 12 edges

## Surprising Connections (you probably didn't know these)
- `WorldState` --references--> `BehaviorValue`  [EXTRACTED]
  poc/world.ts → src/behavior.ts
- `runInterpreted()` --calls--> `runRoutine()`  [EXTRACTED]
  test/behavior-poc.test.ts → poc/interpreter.ts
- `RuntimeTable` --references--> `BehaviorValue`  [EXTRACTED]
  poc/world.ts → src/behavior.ts
- `Scenario` --references--> `WorldState`  [EXTRACTED]
  test/behavior-poc.test.ts → poc/world.ts
- `runInterpreted()` --calls--> `snapshot()`  [EXTRACTED]
  test/behavior-poc.test.ts → poc/world.ts

## Import Cycles
- None detected.

## Communities (13 total, 0 thin omitted)

### Community 0 - "Schema Types & Public API"
Cohesion: 0.10
Nodes (36): TableRef, BehaviorExtraction, BehaviorPropertyKey, BlockedExit, ConditionalExit, Direction, DIRECTIONS, DirectionWord (+28 more)

### Community 1 - "Validator Structural Checks"
Cohesion: 0.11
Nodes (27): args, BEHAVIOR_PROPERTY_KEYS, SYNTAX_SEARCH_OPTIONS, checkKeys(), checkPropKey(), Ctx, DIRECTION_SET, isObject() (+19 more)

### Community 2 - "behavior-35-triage.test.ts"
Cohesion: 0.07
Nodes (23): CatalogEntry, ExtractionResult, WorldDocument, catalog, catalogIds, here, routineById, ADR-0001 (+15 more)

### Community 3 - "POC Test Harness & World State"
Cohesion: 0.17
Nodes (20): Expr, Stmt, AstNode, atomName(), BehaviorSources, CLOCK_BUILTINS, DENIED_OPERATORS, ENGINE_IMPLEMENTED (+12 more)

### Community 4 - "Behavior Interpreter"
Cohesion: 0.13
Nodes (37): [astDir = "../importer/artifacts/ast", outFile = "artifacts/zork1.world.json"], catalogFile, programs, result, { world, catalog }, AstNode, AstProgram, atomName() (+29 more)

### Community 5 - "World Builtins"
Cohesion: 0.30
Nodes (15): applyRoutine(), callRoutine(), ContinueSignal, entityId(), evalExpr(), execBody(), execStmt(), execTellPart() (+7 more)

### Community 6 - "table-globals.test.ts"
Cohesion: 0.18
Nodes (9): BreakSignal, ReturnSignal, RuntimeTable, BehaviorValue, globalById, here, routineById, tableById (+1 more)

### Community 7 - "world.ts"
Cohesion: 0.29
Nodes (9): kitchenWindowF(), trapDoorExit(), Builtin, clearFlag(), DUMMY_RESPONSES, hasFlag(), setFlag(), tell() (+1 more)

### Community 8 - "makeWorld"
Cohesion: 0.17
Nodes (10): makeWorld(), catalog, catalogIds, here, routineById, world, catalog, here (+2 more)

### Community 9 - "behavior-poc.test.ts"
Cohesion: 0.46
Nodes (7): runRoutine(), snapshot(), WorldState, runInterpreted(), runTranspiled(), Scenario, scenarios

### Community 10 - "behavior-35h.test.ts"
Cohesion: 0.29
Nodes (5): catalog, here, routineById, tableById, world

### Community 11 - "behavior-35i.test.ts"
Cohesion: 0.33
Nodes (5): builtins, catalog, here, routineById, world

### Community 15 - "behavior.ts"
Cohesion: 0.09
Nodes (20): KITCHEN_WINDOW_F, T, TRAP_DOOR_EXIT, BehaviorLiteral, BehaviorRoutine, CondClause, TellPart, ADR-0002 (+12 more)

## Knowledge Gaps
- **91 isolated node(s):** `ContinueSignal`, `Locals`, `T`, `DUMMY_RESPONSES`, `Builtin` (+86 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `validateWorld()` connect `Validator Structural Checks` to `Schema Types & Public API`, `behavior-35-triage.test.ts`, `POC Test Harness & World State`, `Behavior Interpreter`, `table-globals.test.ts`?**
  _High betweenness centrality (0.091) - this node is a cross-community bridge._
- **Why does `WorldDocument` connect `behavior-35-triage.test.ts` to `Schema Types & Public API`, `Validator Structural Checks`, `Behavior Interpreter`, `table-globals.test.ts`, `makeWorld`, `behavior-35h.test.ts`, `behavior-35i.test.ts`, `behavior.ts`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **Why does `Expr` connect `POC Test Harness & World State` to `Schema Types & Public API`, `behavior-35-triage.test.ts`, `World Builtins`, `behavior-35h.test.ts`, `behavior-35i.test.ts`, `behavior.ts`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **What connects `ContinueSignal`, `Locals`, `T` to the rest of the system?**
  _91 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Schema Types & Public API` be split into smaller, more focused modules?**
  _Cohesion score 0.0951219512195122 - nodes in this community are weakly interconnected._
- **Should `Validator Structural Checks` be split into smaller, more focused modules?**
  _Cohesion score 0.11092436974789915 - nodes in this community are weakly interconnected._
- **Should `behavior-35-triage.test.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07142857142857142 - nodes in this community are weakly interconnected._