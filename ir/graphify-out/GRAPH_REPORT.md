# Graph Report - ir  (2026-07-20)

## Corpus Check
- 29 files · ~32,501 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 277 nodes · 747 edges · 7 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.7)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3c33ff5f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Schema Types & Public API
- Validator Structural Checks
- behavior-35-triage.test.ts
- POC Test Harness & World State
- Behavior Interpreter
- World Builtins
- behavior.ts

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

## Communities (7 total, 0 thin omitted)

### Community 0 - "Schema Types & Public API"
Cohesion: 0.11
Nodes (40): TableRef, CatalogEntry, AstNode, AstProgram, DIRECTION_MAP, ExtractionResult, FLAG_DESCRIPTIONS, RoomExtraction (+32 more)

### Community 1 - "Validator Structural Checks"
Cohesion: 0.08
Nodes (36): args, [astDir = "../importer/artifacts/ast", outFile = "artifacts/zork1.world.json"], catalogFile, programs, result, { world, catalog }, OPTION_SET, BEHAVIOR_PROPERTY_KEYS (+28 more)

### Community 2 - "behavior-35-triage.test.ts"
Cohesion: 0.05
Nodes (32): makeWorld(), WorldDocument, catalog, catalogIds, here, routineById, ADR-0001, world (+24 more)

### Community 3 - "POC Test Harness & World State"
Cohesion: 0.18
Nodes (17): Expr, Stmt, AstNode, atomName(), BehaviorSources, CLOCK_BUILTINS, DENIED_OPERATORS, EXPR_HEADS (+9 more)

### Community 4 - "Behavior Interpreter"
Cohesion: 0.34
Nodes (18): atomName(), decodeZilString(), evalCondPredicate(), expandCompileTimeConds(), extractObject(), extractRoom(), extractSyntaxRule(), extractVocabulary() (+10 more)

### Community 5 - "World Builtins"
Cohesion: 0.07
Nodes (55): applyRoutine(), BreakSignal, callRoutine(), ContinueSignal, entityId(), evalExpr(), execBody(), execStmt() (+47 more)

### Community 15 - "behavior.ts"
Cohesion: 0.09
Nodes (20): KITCHEN_WINDOW_F, T, TRAP_DOOR_EXIT, BehaviorLiteral, BehaviorRoutine, CondClause, TellPart, BehaviorExtraction (+12 more)

## Knowledge Gaps
- **90 isolated node(s):** `ContinueSignal`, `Locals`, `T`, `DUMMY_RESPONSES`, `Builtin` (+85 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `validateWorld()` connect `Validator Structural Checks` to `Schema Types & Public API`, `behavior-35-triage.test.ts`, `POC Test Harness & World State`, `World Builtins`?**
  _High betweenness centrality (0.093) - this node is a cross-community bridge._
- **Why does `WorldDocument` connect `behavior-35-triage.test.ts` to `Schema Types & Public API`, `World Builtins`, `behavior.ts`?**
  _High betweenness centrality (0.069) - this node is a cross-community bridge._
- **Why does `Expr` connect `POC Test Harness & World State` to `Schema Types & Public API`, `behavior-35-triage.test.ts`, `World Builtins`, `behavior.ts`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **What connects `ContinueSignal`, `Locals`, `T` to the rest of the system?**
  _90 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Schema Types & Public API` be split into smaller, more focused modules?**
  _Cohesion score 0.10963455149501661 - nodes in this community are weakly interconnected._
- **Should `Validator Structural Checks` be split into smaller, more focused modules?**
  _Cohesion score 0.07777777777777778 - nodes in this community are weakly interconnected._
- **Should `behavior-35-triage.test.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05365853658536585 - nodes in this community are weakly interconnected._