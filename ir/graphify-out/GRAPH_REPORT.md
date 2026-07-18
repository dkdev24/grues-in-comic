# Graph Report - ir  (2026-07-18)

## Corpus Check
- 16 files · ~12,696 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 137 nodes · 333 edges · 8 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `092b76c1`
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

## God Nodes (most connected - your core abstractions)
1. `validateWorld()` - 22 edges
2. `extractWorld()` - 13 edges
3. `atomName()` - 11 edges
4. `fail()` - 10 edges
5. `meaningful()` - 9 edges
6. `truthy()` - 7 edges
7. `BehaviorValue` - 7 edges
8. `extractRoom()` - 7 edges
9. `expandCompileTimeConds()` - 7 edges
10. `extractVocabulary()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `WorldState` --references--> `BehaviorValue`  [EXTRACTED]
  poc/world.ts → src/behavior.ts
- `runInterpreted()` --calls--> `runRoutine()`  [EXTRACTED]
  test/behavior-poc.test.ts → poc/interpreter.ts
- `Scenario` --references--> `WorldState`  [EXTRACTED]
  test/behavior-poc.test.ts → poc/world.ts
- `runInterpreted()` --calls--> `snapshot()`  [EXTRACTED]
  test/behavior-poc.test.ts → poc/world.ts
- `runTranspiled()` --calls--> `snapshot()`  [EXTRACTED]
  test/behavior-poc.test.ts → poc/world.ts

## Import Cycles
- None detected.

## Communities (8 total, 0 thin omitted)

### Community 0 - "Schema Types & Public API"
Cohesion: 0.19
Nodes (20): BlockedExit, ConditionalExit, Direction, DIRECTIONS, DoorExit, EntityRef, Exit, ExitBase (+12 more)

### Community 1 - "Validator Structural Checks"
Cohesion: 0.12
Nodes (23): args, SYNTAX_SEARCH_OPTIONS, checkKeys(), Ctx, DIRECTION_SET, isObject(), isScalar(), Json (+15 more)

### Community 2 - "Behavior AST & POC Routines"
Cohesion: 0.29
Nodes (8): Locals, ReturnSignal, BehaviorRoutine, BehaviorValue, CondClause, Expr, Stmt, TellPart

### Community 3 - "POC Test Harness & World State"
Cohesion: 0.29
Nodes (10): runRoutine(), KITCHEN_WINDOW_F, T, TRAP_DOOR_EXIT, snapshot(), WorldState, runInterpreted(), runTranspiled() (+2 more)

### Community 4 - "Behavior Interpreter"
Cohesion: 0.19
Nodes (28): atomName(), decodeZilString(), DIRECTION_MAP, evalCondPredicate(), expandCompileTimeConds(), extractObject(), extractRoom(), extractSyntaxRule() (+20 more)

### Community 5 - "World Builtins"
Cohesion: 0.29
Nodes (6): Builtin, builtins, clearFlag(), DUMMY_RESPONSES, makeWorld(), setFlag()

### Community 6 - "Transpiled Comparison"
Cohesion: 0.35
Nodes (10): evalExpr(), execBody(), execStmt(), execTellPart(), num(), kitchenWindowF(), trapDoorExit(), hasFlag() (+2 more)

### Community 7 - "Validator Types & Constants"
Cohesion: 0.14
Nodes (12): [astDir = "../importer/artifacts/ast", outFile = "artifacts/zork1.world.json"], programs, result, world, AstNode, AstProgram, astDir, here (+4 more)

## Knowledge Gaps
- **22 isolated node(s):** `Locals`, `T`, `DUMMY_RESPONSES`, `Builtin`, `CondClause` (+17 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `validateWorld()` connect `Validator Structural Checks` to `Schema Types & Public API`, `Behavior Interpreter`, `Validator Types & Constants`?**
  _High betweenness centrality (0.077) - this node is a cross-community bridge._
- **Why does `extractWorld()` connect `Behavior Interpreter` to `Schema Types & Public API`, `Validator Types & Constants`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Why does `OPTION_SET` connect `Behavior Interpreter` to `Validator Structural Checks`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **What connects `Locals`, `T`, `DUMMY_RESPONSES` to the rest of the system?**
  _22 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Validator Structural Checks` be split into smaller, more focused modules?**
  _Cohesion score 0.12043010752688173 - nodes in this community are weakly interconnected._
- **Should `Validator Types & Constants` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._