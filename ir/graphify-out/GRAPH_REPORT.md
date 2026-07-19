# Graph Report - ir  (2026-07-19)

## Corpus Check
- 23 files · ~25,064 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 229 nodes · 620 edges · 14 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.7)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `370e70fe`
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
- behavior.ts
- behavior-35-triage.test.ts
- extract.test.ts

## God Nodes (most connected - your core abstractions)
1. `validateWorld()` - 24 edges
2. `RoutineTransformer` - 20 edges
3. `extractWorld()` - 16 edges
4. `atomName()` - 12 edges
5. `WorldDocument` - 12 edges
6. `evalExpr()` - 11 edges
7. `Expr` - 11 edges
8. `BehaviorRoutine` - 11 edges
9. `meaningful()` - 11 edges
10. `atomName()` - 11 edges

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

## Communities (14 total, 0 thin omitted)

### Community 0 - "Schema Types & Public API"
Cohesion: 0.11
Nodes (38): BehaviorRoutine, BehaviorExtraction, CatalogEntry, AstNode, AstProgram, DIRECTION_MAP, ExtractionResult, FLAG_DESCRIPTIONS (+30 more)

### Community 1 - "Validator Structural Checks"
Cohesion: 0.09
Nodes (31): args, [astDir = "../importer/artifacts/ast", outFile = "artifacts/zork1.world.json"], catalogFile, programs, result, { world, catalog }, OPTION_SET, BEHAVIOR_PROPERTY_KEYS (+23 more)

### Community 2 - "Behavior AST & POC Routines"
Cohesion: 0.29
Nodes (10): runRoutine(), KITCHEN_WINDOW_F, T, TRAP_DOOR_EXIT, snapshot(), WorldState, runInterpreted(), runTranspiled() (+2 more)

### Community 3 - "POC Test Harness & World State"
Cohesion: 0.20
Nodes (16): Expr, Stmt, AstNode, atomName(), BehaviorSources, CLOCK_BUILTINS, DENIED_OPERATORS, EXPR_HEADS (+8 more)

### Community 4 - "Behavior Interpreter"
Cohesion: 0.33
Nodes (18): atomName(), decodeZilString(), evalCondPredicate(), expandCompileTimeConds(), extractObject(), extractRoom(), extractSyntaxRule(), extractVocabulary() (+10 more)

### Community 5 - "World Builtins"
Cohesion: 0.30
Nodes (14): callRoutine(), ContinueSignal, entityId(), evalExpr(), execBody(), execStmt(), execTellPart(), Locals (+6 more)

### Community 6 - "Transpiled Comparison"
Cohesion: 0.33
Nodes (4): BreakSignal, ReturnSignal, RuntimeTable, BehaviorValue

### Community 7 - "Validator Types & Constants"
Cohesion: 0.17
Nodes (10): makeWorld(), catalog, catalogIds, here, routineById, world, catalog, here (+2 more)

### Community 8 - "WorldDocument"
Cohesion: 0.25
Nodes (7): BehaviorRoutineReturn, catalog, catalogIds, golden, here, routineById, world

### Community 9 - "Room"
Cohesion: 0.35
Nodes (8): kitchenWindowF(), trapDoorExit(), Builtin, builtins, DUMMY_RESPONSES, hasFlag(), tell(), truthy()

### Community 10 - "behavior-35b.test.ts"
Cohesion: 0.33
Nodes (5): catalog, catalogIds, here, routineById, world

### Community 11 - "behavior.ts"
Cohesion: 0.22
Nodes (7): CondClause, TellPart, catalog, catalogReasons, here, routineById, world

### Community 12 - "behavior-35-triage.test.ts"
Cohesion: 0.29
Nodes (6): catalog, catalogIds, here, routineById, ADR-0001, world

### Community 13 - "extract.test.ts"
Cohesion: 0.29
Nodes (6): astDir, here, programs, result, sample, { world, catalog }

## Knowledge Gaps
- **61 isolated node(s):** `ContinueSignal`, `Locals`, `T`, `DUMMY_RESPONSES`, `Builtin` (+56 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `validateWorld()` connect `Validator Structural Checks` to `Schema Types & Public API`, `POC Test Harness & World State`, `extract.test.ts`?**
  _High betweenness centrality (0.084) - this node is a cross-community bridge._
- **Why does `WorldDocument` connect `Schema Types & Public API` to `Validator Structural Checks`, `Validator Types & Constants`, `WorldDocument`, `behavior-35b.test.ts`, `behavior.ts`, `behavior-35-triage.test.ts`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Why does `Expr` connect `POC Test Harness & World State` to `Schema Types & Public API`, `Behavior AST & POC Routines`, `behavior.ts`, `World Builtins`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **What connects `ContinueSignal`, `Locals`, `T` to the rest of the system?**
  _61 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Schema Types & Public API` be split into smaller, more focused modules?**
  _Cohesion score 0.1091753774680604 - nodes in this community are weakly interconnected._
- **Should `Validator Structural Checks` be split into smaller, more focused modules?**
  _Cohesion score 0.08974358974358974 - nodes in this community are weakly interconnected._