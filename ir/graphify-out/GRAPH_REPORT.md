# Graph Report - ir  (2026-07-19)

## Corpus Check
- 24 files · ~26,567 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 240 nodes · 643 edges · 6 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.7)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f3cd5f16`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Schema Types & Public API
- Validator Structural Checks
- POC Test Harness & World State
- Behavior Interpreter
- World Builtins
- WorldDocument

## God Nodes (most connected - your core abstractions)
1. `validateWorld()` - 24 edges
2. `RoutineTransformer` - 20 edges
3. `extractWorld()` - 16 edges
4. `evalExpr()` - 13 edges
5. `WorldDocument` - 13 edges
6. `Expr` - 12 edges
7. `atomName()` - 12 edges
8. `runRoutine()` - 11 edges
9. `BehaviorRoutine` - 11 edges
10. `meaningful()` - 11 edges

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

## Communities (6 total, 0 thin omitted)

### Community 0 - "Schema Types & Public API"
Cohesion: 0.08
Nodes (42): BehaviorLiteral, BehaviorRoutine, CondClause, TableRef, TellPart, AstNode, BehaviorExtraction, DENIED_OPERATORS (+34 more)

### Community 1 - "Validator Structural Checks"
Cohesion: 0.11
Nodes (26): args, BEHAVIOR_PROPERTY_KEYS, DIRECTIONS, SYNTAX_SEARCH_OPTIONS, checkKeys(), checkPropKey(), Ctx, DIRECTION_SET (+18 more)

### Community 3 - "POC Test Harness & World State"
Cohesion: 0.35
Nodes (7): Expr, Stmt, atomName(), BehaviorSources, CLOCK_BUILTINS, meaningful(), RoutineTransformer

### Community 4 - "Behavior Interpreter"
Cohesion: 0.14
Nodes (35): extractBehavior(), [astDir = "../importer/artifacts/ast", outFile = "artifacts/zork1.world.json"], catalogFile, programs, result, { world, catalog }, AstNode, AstProgram (+27 more)

### Community 5 - "World Builtins"
Cohesion: 0.08
Nodes (48): BreakSignal, callRoutine(), ContinueSignal, entityId(), evalExpr(), execBody(), execStmt(), execTellPart() (+40 more)

### Community 8 - "WorldDocument"
Cohesion: 0.06
Nodes (31): makeWorld(), CatalogEntry, ExtractionResult, WorldDocument, BehaviorRoutineReturn, catalog, catalogIds, golden (+23 more)

## Knowledge Gaps
- **67 isolated node(s):** `ContinueSignal`, `Locals`, `T`, `DUMMY_RESPONSES`, `Builtin` (+62 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `validateWorld()` connect `Validator Structural Checks` to `Schema Types & Public API`, `POC Test Harness & World State`, `Behavior Interpreter`?**
  _High betweenness centrality (0.077) - this node is a cross-community bridge._
- **Why does `WorldDocument` connect `WorldDocument` to `Schema Types & Public API`, `Validator Structural Checks`, `Behavior Interpreter`, `World Builtins`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **Why does `Expr` connect `POC Test Harness & World State` to `Schema Types & Public API`, `WorldDocument`, `World Builtins`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **What connects `ContinueSignal`, `Locals`, `T` to the rest of the system?**
  _67 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Schema Types & Public API` be split into smaller, more focused modules?**
  _Cohesion score 0.07801418439716312 - nodes in this community are weakly interconnected._
- **Should `Validator Structural Checks` be split into smaller, more focused modules?**
  _Cohesion score 0.11229946524064172 - nodes in this community are weakly interconnected._
- **Should `Behavior Interpreter` be split into smaller, more focused modules?**
  _Cohesion score 0.13513513513513514 - nodes in this community are weakly interconnected._