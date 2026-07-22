# Graph Report - ir  (2026-07-22)

## Corpus Check
- 31 files · ~37,565 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 309 nodes · 825 edges · 13 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.7)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6693b99f`
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
- behavior-35i.test.ts
- makeWorld
- behavior-poc.test.ts
- behavior-35h.test.ts
- behavior.ts

## God Nodes (most connected - your core abstractions)
1. `validateWorld()` - 31 edges
2. `RoutineTransformer` - 24 edges
3. `extractWorld()` - 20 edges
4. `atomName()` - 19 edges
5. `WorldDocument` - 19 edges
6. `runRoutine()` - 17 edges
7. `Expr` - 15 edges
8. `meaningful()` - 15 edges
9. `evalExpr()` - 14 edges
10. `makeWorld()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `WorldState` --references--> `BehaviorValue`  [EXTRACTED]
  poc/world.ts → src/behavior.ts
- `extractWithPerturbedScan()` --calls--> `extractWorld()`  [EXTRACTED]
  test/exit-scan.test.ts → src/extract-world.ts
- `runInterpreted()` --calls--> `runRoutine()`  [EXTRACTED]
  test/behavior-poc.test.ts → poc/interpreter.ts
- `RuntimeTable` --references--> `BehaviorValue`  [EXTRACTED]
  poc/world.ts → src/behavior.ts
- `Scenario` --references--> `WorldState`  [EXTRACTED]
  test/behavior-poc.test.ts → poc/world.ts

## Import Cycles
- None detected.

## Communities (13 total, 0 thin omitted)

### Community 0 - "Schema Types & Public API"
Cohesion: 0.08
Nodes (42): TableRef, BehaviorExtraction, RoomExtraction, BEHAVIOR_PROPERTY_KEYS, BehaviorPropertyKey, BlockedExit, ConditionalExit, deriveAdjacent() (+34 more)

### Community 1 - "Validator Structural Checks"
Cohesion: 0.10
Nodes (30): args, DIRECTIONS, META_ENTITY_ROLES, checkKeys(), checkPropKey(), Ctx, DIRECTION_SET, isObject() (+22 more)

### Community 2 - "behavior-35-triage.test.ts"
Cohesion: 0.09
Nodes (18): CatalogEntry, ExtractionResult, WorldDocument, catalog, catalogIds, here, routineById, ADR-0001 (+10 more)

### Community 3 - "POC Test Harness & World State"
Cohesion: 0.14
Nodes (27): Expr, Stmt, AstNode, atomName(), BehaviorSources, clauseParts(), CLOCK_BUILTINS, DENIED_OPERATORS (+19 more)

### Community 4 - "Behavior Interpreter"
Cohesion: 0.10
Nodes (44): extractBehavior(), [astDir = "../importer/artifacts/ast", outFile = "artifacts/zork1.world.json"], catalogFile, programs, result, { world, catalog }, AstNode, AstProgram (+36 more)

### Community 5 - "World Builtins"
Cohesion: 0.30
Nodes (15): applyRoutine(), callRoutine(), ContinueSignal, entityId(), evalExpr(), execBody(), execStmt(), execTellPart() (+7 more)

### Community 6 - "table-globals.test.ts"
Cohesion: 0.18
Nodes (9): BreakSignal, ReturnSignal, RuntimeTable, BehaviorValue, globalById, here, routineById, tableById (+1 more)

### Community 7 - "world.ts"
Cohesion: 0.29
Nodes (9): kitchenWindowF(), trapDoorExit(), Builtin, clearFlag(), DUMMY_RESPONSES, hasFlag(), setFlag(), tell() (+1 more)

### Community 8 - "behavior-35i.test.ts"
Cohesion: 0.17
Nodes (10): builtins, catalog, catalogIds, here, routineById, world, catalog, here (+2 more)

### Community 9 - "makeWorld"
Cohesion: 0.17
Nodes (10): makeWorld(), catalog, here, routineById, world, catalog, catalogIds, here (+2 more)

### Community 10 - "behavior-poc.test.ts"
Cohesion: 0.46
Nodes (7): runRoutine(), snapshot(), WorldState, runInterpreted(), runTranspiled(), Scenario, scenarios

### Community 11 - "behavior-35h.test.ts"
Cohesion: 0.29
Nodes (5): catalog, here, routineById, tableById, world

### Community 15 - "behavior.ts"
Cohesion: 0.09
Nodes (20): KITCHEN_WINDOW_F, T, TRAP_DOOR_EXIT, BehaviorLiteral, BehaviorRoutine, CondClause, TellPart, ADR-0002 (+12 more)

## Knowledge Gaps
- **106 isolated node(s):** `ContinueSignal`, `Locals`, `T`, `DUMMY_RESPONSES`, `Builtin` (+101 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `validateWorld()` connect `Validator Structural Checks` to `Schema Types & Public API`, `POC Test Harness & World State`, `Behavior Interpreter`, `table-globals.test.ts`?**
  _High betweenness centrality (0.083) - this node is a cross-community bridge._
- **Why does `WorldDocument` connect `behavior-35-triage.test.ts` to `Schema Types & Public API`, `Validator Structural Checks`, `Behavior Interpreter`, `table-globals.test.ts`, `behavior-35i.test.ts`, `makeWorld`, `behavior-35h.test.ts`, `behavior.ts`?**
  _High betweenness centrality (0.069) - this node is a cross-community bridge._
- **Why does `Expr` connect `POC Test Harness & World State` to `Schema Types & Public API`, `behavior-35-triage.test.ts`, `World Builtins`, `behavior-35i.test.ts`, `makeWorld`, `behavior-35h.test.ts`, `behavior.ts`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **What connects `ContinueSignal`, `Locals`, `T` to the rest of the system?**
  _106 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Schema Types & Public API` be split into smaller, more focused modules?**
  _Cohesion score 0.07585568917668825 - nodes in this community are weakly interconnected._
- **Should `Validator Structural Checks` be split into smaller, more focused modules?**
  _Cohesion score 0.09851551956815115 - nodes in this community are weakly interconnected._
- **Should `behavior-35-triage.test.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09090909090909091 - nodes in this community are weakly interconnected._