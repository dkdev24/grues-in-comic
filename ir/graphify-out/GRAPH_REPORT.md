# Graph Report - ir  (2026-07-19)

## Corpus Check
- 18 files · ~19,504 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 188 nodes · 519 edges · 10 communities
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.7)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `66110307`
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

## God Nodes (most connected - your core abstractions)
1. `validateWorld()` - 24 edges
2. `RoutineTransformer` - 17 edges
3. `extractWorld()` - 15 edges
4. `atomName()` - 11 edges
5. `evalExpr()` - 10 edges
6. `Expr` - 10 edges
7. `BehaviorRoutine` - 10 edges
8. `atomName()` - 10 edges
9. `fail()` - 10 edges
10. `BehaviorValue` - 9 edges

## Surprising Connections (you probably didn't know these)
- `runInterpreted()` --calls--> `runRoutine()`  [EXTRACTED]
  test/behavior-poc.test.ts → poc/interpreter.ts
- `WorldState` --references--> `BehaviorValue`  [EXTRACTED]
  poc/world.ts → src/behavior.ts
- `RuntimeTable` --references--> `BehaviorValue`  [EXTRACTED]
  poc/world.ts → src/behavior.ts
- `Scenario` --references--> `WorldState`  [EXTRACTED]
  test/behavior-poc.test.ts → poc/world.ts
- `runInterpreted()` --calls--> `snapshot()`  [EXTRACTED]
  test/behavior-poc.test.ts → poc/world.ts

## Import Cycles
- None detected.

## Communities (10 total, 0 thin omitted)

### Community 0 - "Schema Types & Public API"
Cohesion: 0.11
Nodes (38): BehaviorExtraction, CatalogEntry, AstNode, AstProgram, DIRECTION_MAP, ExtractionResult, FLAG_DESCRIPTIONS, RoomExtraction (+30 more)

### Community 1 - "Validator Structural Checks"
Cohesion: 0.09
Nodes (30): args, [astDir = "../importer/artifacts/ast", outFile = "artifacts/zork1.world.json"], catalogFile, programs, result, { world, catalog }, OPTION_SET, BEHAVIOR_PROPERTY_KEYS (+22 more)

### Community 2 - "Behavior AST & POC Routines"
Cohesion: 0.27
Nodes (10): KITCHEN_WINDOW_F, T, TRAP_DOOR_EXIT, snapshot(), WorldState, BehaviorRoutine, runInterpreted(), runTranspiled() (+2 more)

### Community 3 - "POC Test Harness & World State"
Cohesion: 0.19
Nodes (17): CondClause, Expr, Stmt, TellPart, AstNode, atomName(), BehaviorSources, DENIED_OPERATORS (+9 more)

### Community 4 - "Behavior Interpreter"
Cohesion: 0.35
Nodes (17): atomName(), decodeZilString(), evalCondPredicate(), expandCompileTimeConds(), extractObject(), extractRoom(), extractSyntaxRule(), extractVocabulary() (+9 more)

### Community 5 - "World Builtins"
Cohesion: 0.47
Nodes (10): callRoutine(), entityId(), evalExpr(), execBody(), execStmt(), execTellPart(), Locals, num() (+2 more)

### Community 6 - "Transpiled Comparison"
Cohesion: 0.30
Nodes (10): kitchenWindowF(), trapDoorExit(), Builtin, builtins, clearFlag(), DUMMY_RESPONSES, hasFlag(), setFlag() (+2 more)

### Community 7 - "Validator Types & Constants"
Cohesion: 0.29
Nodes (6): astDir, here, programs, result, sample, { world, catalog }

### Community 8 - "WorldDocument"
Cohesion: 0.22
Nodes (8): makeWorld(), BehaviorRoutineReturn, catalog, catalogIds, golden, here, routineById, world

### Community 9 - "Room"
Cohesion: 0.50
Nodes (3): ReturnSignal, RuntimeTable, BehaviorValue

## Knowledge Gaps
- **35 isolated node(s):** `Locals`, `T`, `DUMMY_RESPONSES`, `Builtin`, `args` (+30 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `validateWorld()` connect `Validator Structural Checks` to `Schema Types & Public API`, `POC Test Harness & World State`, `Validator Types & Constants`?**
  _High betweenness centrality (0.117) - this node is a cross-community bridge._
- **Why does `BehaviorValue` connect `Room` to `Schema Types & Public API`, `Behavior AST & POC Routines`, `World Builtins`, `Transpiled Comparison`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Why does `Expr` connect `POC Test Harness & World State` to `Schema Types & Public API`, `Behavior AST & POC Routines`, `World Builtins`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **What connects `Locals`, `T`, `DUMMY_RESPONSES` to the rest of the system?**
  _35 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Schema Types & Public API` be split into smaller, more focused modules?**
  _Cohesion score 0.10685249709639953 - nodes in this community are weakly interconnected._
- **Should `Validator Structural Checks` be split into smaller, more focused modules?**
  _Cohesion score 0.09176788124156546 - nodes in this community are weakly interconnected._