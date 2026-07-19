# Graph Report - ir  (2026-07-19)

## Corpus Check
- 29 files · ~32,495 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 277 nodes · 741 edges · 14 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.7)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7a675623`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Schema Types & Public API
- Validator Structural Checks
- behavior-35-triage.test.ts
- POC Test Harness & World State
- Behavior Interpreter
- World Builtins
- world.ts
- behavior-35b.test.ts
- WorldDocument
- behavior-35d.test.ts
- behavior-35h.test.ts
- behavior-35j.test.ts
- behavior.ts
- WorldDocument

## God Nodes (most connected - your core abstractions)
1. `validateWorld()` - 30 edges
2. `RoutineTransformer` - 21 edges
3. `WorldDocument` - 18 edges
4. `extractWorld()` - 17 edges
5. `runRoutine()` - 16 edges
6. `evalExpr()` - 14 edges
7. `makeWorld()` - 13 edges
8. `Expr` - 13 edges
9. `atomName()` - 13 edges
10. `BehaviorValue` - 12 edges

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

## Communities (14 total, 0 thin omitted)

### Community 0 - "Schema Types & Public API"
Cohesion: 0.08
Nodes (38): TableRef, BehaviorExtraction, RoomExtraction, BehaviorPropertyKey, BlockedExit, ConditionalExit, Direction, DIRECTIONS (+30 more)

### Community 1 - "Validator Structural Checks"
Cohesion: 0.09
Nodes (32): args, BEHAVIOR_PROPERTY_KEYS, SYNTAX_SEARCH_OPTIONS, checkKeys(), checkPropKey(), Ctx, DIRECTION_SET, isObject() (+24 more)

### Community 2 - "behavior-35-triage.test.ts"
Cohesion: 0.29
Nodes (6): catalog, catalogIds, here, routineById, ADR-0001, world

### Community 3 - "POC Test Harness & World State"
Cohesion: 0.20
Nodes (15): Expr, Stmt, AstNode, atomName(), BehaviorSources, CLOCK_BUILTINS, DENIED_OPERATORS, EXPR_HEADS (+7 more)

### Community 4 - "Behavior Interpreter"
Cohesion: 0.13
Nodes (36): extractBehavior(), [astDir = "../importer/artifacts/ast", outFile = "artifacts/zork1.world.json"], catalogFile, programs, result, { world, catalog }, AstNode, AstProgram (+28 more)

### Community 5 - "World Builtins"
Cohesion: 0.08
Nodes (50): applyRoutine(), BreakSignal, callRoutine(), ContinueSignal, entityId(), evalExpr(), execBody(), execStmt() (+42 more)

### Community 6 - "world.ts"
Cohesion: 0.33
Nodes (5): catalog, catalogIds, here, routineById, world

### Community 7 - "behavior-35b.test.ts"
Cohesion: 0.33
Nodes (4): catalog, here, routineById, world

### Community 8 - "WorldDocument"
Cohesion: 0.25
Nodes (7): BehaviorRoutineReturn, catalog, catalogIds, golden, here, routineById, world

### Community 9 - "behavior-35d.test.ts"
Cohesion: 0.33
Nodes (5): makeWorld(), catalog, here, routineById, world

### Community 11 - "behavior-35h.test.ts"
Cohesion: 0.29
Nodes (5): catalog, here, routineById, tableById, world

### Community 13 - "behavior-35j.test.ts"
Cohesion: 0.33
Nodes (5): catalog, catalogReasons, here, routineById, world

### Community 15 - "behavior.ts"
Cohesion: 0.25
Nodes (7): KITCHEN_WINDOW_F, T, TRAP_DOOR_EXIT, BehaviorLiteral, BehaviorRoutine, CondClause, TellPart

### Community 16 - "WorldDocument"
Cohesion: 0.67
Nodes (3): CatalogEntry, ExtractionResult, WorldDocument

## Knowledge Gaps
- **90 isolated node(s):** `ContinueSignal`, `Locals`, `T`, `DUMMY_RESPONSES`, `Builtin` (+85 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `validateWorld()` connect `Validator Structural Checks` to `Schema Types & Public API`, `POC Test Harness & World State`, `Behavior Interpreter`, `World Builtins`?**
  _High betweenness centrality (0.092) - this node is a cross-community bridge._
- **Why does `WorldDocument` connect `WorldDocument` to `Schema Types & Public API`, `Validator Structural Checks`, `behavior-35-triage.test.ts`, `Behavior Interpreter`, `World Builtins`, `world.ts`, `behavior-35b.test.ts`, `WorldDocument`, `behavior-35d.test.ts`, `behavior-35h.test.ts`, `behavior-35j.test.ts`, `behavior.ts`?**
  _High betweenness centrality (0.069) - this node is a cross-community bridge._
- **Why does `Expr` connect `POC Test Harness & World State` to `Schema Types & Public API`, `World Builtins`, `behavior-35h.test.ts`, `behavior-35j.test.ts`, `behavior.ts`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **What connects `ContinueSignal`, `Locals`, `T` to the rest of the system?**
  _90 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Schema Types & Public API` be split into smaller, more focused modules?**
  _Cohesion score 0.08194905869324474 - nodes in this community are weakly interconnected._
- **Should `Validator Structural Checks` be split into smaller, more focused modules?**
  _Cohesion score 0.08902439024390243 - nodes in this community are weakly interconnected._
- **Should `Behavior Interpreter` be split into smaller, more focused modules?**
  _Cohesion score 0.13090418353576247 - nodes in this community are weakly interconnected._