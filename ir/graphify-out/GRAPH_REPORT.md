# Graph Report - ir  (2026-07-18)

## Corpus Check
- 17 files · ~16,937 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 172 nodes · 474 edges · 10 communities (9 shown, 1 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.65)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b91f35d7`
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
1. `validateWorld()` - 22 edges
2. `RoutineTransformer` - 15 edges
3. `extractWorld()` - 15 edges
4. `atomName()` - 11 edges
5. `fail()` - 10 edges
6. `Expr` - 9 edges
7. `BehaviorRoutine` - 9 edges
8. `atomName()` - 9 edges
9. `meaningful()` - 9 edges
10. `evalExpr()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `runInterpreted()` --calls--> `runRoutine()`  [EXTRACTED]
  test/behavior-poc.test.ts → poc/interpreter.ts
- `WorldState` --references--> `BehaviorValue`  [EXTRACTED]
  poc/world.ts → src/behavior.ts
- `Scenario` --references--> `WorldState`  [EXTRACTED]
  test/behavior-poc.test.ts → poc/world.ts
- `runInterpreted()` --calls--> `snapshot()`  [EXTRACTED]
  test/behavior-poc.test.ts → poc/world.ts
- `runTranspiled()` --calls--> `snapshot()`  [EXTRACTED]
  test/behavior-poc.test.ts → poc/world.ts

## Import Cycles
- None detected.

## Communities (10 total, 1 thin omitted)

### Community 0 - "Schema Types & Public API"
Cohesion: 0.16
Nodes (21): BlockedExit, ConditionalExit, DirectionWord, DoorExit, EntityRef, Exit, ExitBase, FlagDeclaration (+13 more)

### Community 1 - "Validator Structural Checks"
Cohesion: 0.12
Nodes (24): args, DIRECTIONS, SYNTAX_SEARCH_OPTIONS, checkKeys(), Ctx, DIRECTION_SET, isObject(), isScalar() (+16 more)

### Community 2 - "Behavior AST & POC Routines"
Cohesion: 0.29
Nodes (6): KITCHEN_WINDOW_F, T, TRAP_DOOR_EXIT, BehaviorRoutine, CondClause, TellPart

### Community 3 - "POC Test Harness & World State"
Cohesion: 0.41
Nodes (6): Expr, Stmt, atomName(), BehaviorSources, meaningful(), RoutineTransformer

### Community 4 - "Behavior Interpreter"
Cohesion: 0.30
Nodes (21): extractBehavior(), atomName(), decodeZilString(), DIRECTION_MAP, evalCondPredicate(), expandCompileTimeConds(), extractObject(), extractRoom() (+13 more)

### Community 5 - "World Builtins"
Cohesion: 0.16
Nodes (12): AstNode, BehaviorExtraction, DENIED_OPERATORS, EXPR_HEADS, FALSE, TRUE, ADR-0001, Unsupported (+4 more)

### Community 6 - "Transpiled Comparison"
Cohesion: 0.16
Nodes (28): callRoutine(), entityId(), evalExpr(), execBody(), execStmt(), execTellPart(), Locals, num() (+20 more)

### Community 7 - "Validator Types & Constants"
Cohesion: 0.13
Nodes (13): [astDir = "../importer/artifacts/ast", outFile = "artifacts/zork1.world.json"], catalogFile, programs, result, { world, catalog }, AstNode, AstProgram, astDir (+5 more)

### Community 8 - "WorldDocument"
Cohesion: 0.67
Nodes (3): CatalogEntry, ExtractionResult, WorldDocument

## Knowledge Gaps
- **27 isolated node(s):** `Locals`, `T`, `DUMMY_RESPONSES`, `Builtin`, `args` (+22 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `validateWorld()` connect `Validator Structural Checks` to `Schema Types & Public API`, `Behavior Interpreter`, `Validator Types & Constants`?**
  _High betweenness centrality (0.097) - this node is a cross-community bridge._
- **Why does `BehaviorValue` connect `Transpiled Comparison` to `Schema Types & Public API`, `Behavior AST & POC Routines`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **Why does `Expr` connect `POC Test Harness & World State` to `Schema Types & Public API`, `Behavior AST & POC Routines`, `World Builtins`, `Transpiled Comparison`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **What connects `Locals`, `T`, `DUMMY_RESPONSES` to the rest of the system?**
  _27 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Validator Structural Checks` be split into smaller, more focused modules?**
  _Cohesion score 0.11693548387096774 - nodes in this community are weakly interconnected._
- **Should `Validator Types & Constants` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._