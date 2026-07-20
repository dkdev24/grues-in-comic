# Graph Report - ir  (2026-07-20)

## Corpus Check
- 30 files · ~36,416 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 303 nodes · 811 edges · 9 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.7)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `53716a38`
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
- behavior.ts

## God Nodes (most connected - your core abstractions)
1. `validateWorld()` - 31 edges
2. `RoutineTransformer` - 24 edges
3. `extractWorld()` - 20 edges
4. `atomName()` - 19 edges
5. `WorldDocument` - 18 edges
6. `runRoutine()` - 16 edges
7. `meaningful()` - 15 edges
8. `evalExpr()` - 14 edges
9. `Expr` - 14 edges
10. `makeWorld()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `extractWithPerturbedScan()` --calls--> `extractWorld()`  [EXTRACTED]
  test/exit-scan.test.ts → src/extract-world.ts
- `runInterpreted()` --calls--> `runRoutine()`  [EXTRACTED]
  test/behavior-poc.test.ts → poc/interpreter.ts
- `RuntimeTable` --references--> `BehaviorValue`  [EXTRACTED]
  poc/world.ts → src/behavior.ts
- `WorldState` --references--> `BehaviorValue`  [EXTRACTED]
  poc/world.ts → src/behavior.ts
- `Scenario` --references--> `WorldState`  [EXTRACTED]
  test/behavior-poc.test.ts → poc/world.ts

## Import Cycles
- None detected.

## Communities (9 total, 0 thin omitted)

### Community 0 - "Schema Types & Public API"
Cohesion: 0.10
Nodes (39): AstNode, AstProgram, DIRECTION_MAP, FLAG_DESCRIPTIONS, RoomExtraction, SCAFFOLDING, BEHAVIOR_PROPERTY_KEYS, BehaviorPropertyKey (+31 more)

### Community 1 - "Validator Structural Checks"
Cohesion: 0.08
Nodes (36): args, [astDir = "../importer/artifacts/ast", outFile = "artifacts/zork1.world.json"], catalogFile, programs, result, { world, catalog }, DIRECTIONS, META_ENTITY_ROLES (+28 more)

### Community 2 - "behavior-35-triage.test.ts"
Cohesion: 0.07
Nodes (27): makeWorld(), CatalogEntry, ExtractionResult, WorldDocument, catalog, here, routineById, world (+19 more)

### Community 3 - "POC Test Harness & World State"
Cohesion: 0.14
Nodes (28): Expr, Stmt, AstNode, atomName(), BehaviorSources, clauseParts(), CLOCK_BUILTINS, DENIED_OPERATORS (+20 more)

### Community 4 - "Behavior Interpreter"
Cohesion: 0.17
Nodes (27): atomName(), decodeZilString(), evalCondPredicate(), expandCompileTimeConds(), extractObject(), extractRoom(), extractSyntaxRule(), extractVocabulary() (+19 more)

### Community 5 - "World Builtins"
Cohesion: 0.08
Nodes (50): applyRoutine(), BreakSignal, callRoutine(), ContinueSignal, entityId(), evalExpr(), execBody(), execStmt() (+42 more)

### Community 6 - "table-globals.test.ts"
Cohesion: 0.22
Nodes (8): TableRef, BehaviorExtraction, GlobalVariable, Table, globalById, here, tableById, world

### Community 7 - "world.ts"
Cohesion: 0.29
Nodes (6): catalog, catalogIds, here, routineById, ADR-0001, world

### Community 15 - "behavior.ts"
Cohesion: 0.09
Nodes (20): KITCHEN_WINDOW_F, T, TRAP_DOOR_EXIT, BehaviorLiteral, BehaviorRoutine, CondClause, TellPart, ADR-0002 (+12 more)

## Knowledge Gaps
- **101 isolated node(s):** `ContinueSignal`, `Locals`, `T`, `DUMMY_RESPONSES`, `Builtin` (+96 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `validateWorld()` connect `Validator Structural Checks` to `Schema Types & Public API`, `behavior-35-triage.test.ts`, `POC Test Harness & World State`, `Behavior Interpreter`, `World Builtins`, `table-globals.test.ts`?**
  _High betweenness centrality (0.086) - this node is a cross-community bridge._
- **Why does `WorldDocument` connect `behavior-35-triage.test.ts` to `Schema Types & Public API`, `Validator Structural Checks`, `World Builtins`, `table-globals.test.ts`, `world.ts`, `behavior.ts`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **Why does `Expr` connect `POC Test Harness & World State` to `Schema Types & Public API`, `behavior-35-triage.test.ts`, `World Builtins`, `behavior.ts`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **What connects `ContinueSignal`, `Locals`, `T` to the rest of the system?**
  _101 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Schema Types & Public API` be split into smaller, more focused modules?**
  _Cohesion score 0.10336817653890824 - nodes in this community are weakly interconnected._
- **Should `Validator Structural Checks` be split into smaller, more focused modules?**
  _Cohesion score 0.0782608695652174 - nodes in this community are weakly interconnected._
- **Should `behavior-35-triage.test.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0659536541889483 - nodes in this community are weakly interconnected._