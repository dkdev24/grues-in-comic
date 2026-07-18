# Graph Report - ir  (2026-07-18)

## Corpus Check
- 16 files · ~10,727 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 123 nodes · 288 edges · 8 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `792f3e32`
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
1. `validateWorld()` - 19 edges
2. `extractWorld()` - 11 edges
3. `truthy()` - 7 edges
4. `BehaviorValue` - 7 edges
5. `atomName()` - 7 edges
6. `fail()` - 7 edges
7. `extractRoom()` - 7 edges
8. `evalExpr()` - 6 edges
9. `WorldState` - 6 edges
10. `tell()` - 6 edges

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
Cohesion: 0.14
Nodes (25): BlockedExit, ConditionalExit, Direction, DIRECTIONS, DoorExit, EntityRef, Exit, ExitBase (+17 more)

### Community 1 - "Validator Structural Checks"
Cohesion: 0.17
Nodes (17): args, checkKeys(), Ctx, DIRECTION_SET, isObject(), isScalar(), Json, optBool() (+9 more)

### Community 2 - "Behavior AST & POC Routines"
Cohesion: 0.29
Nodes (8): Locals, ReturnSignal, BehaviorRoutine, BehaviorValue, CondClause, Expr, Stmt, TellPart

### Community 3 - "POC Test Harness & World State"
Cohesion: 0.29
Nodes (10): runRoutine(), KITCHEN_WINDOW_F, T, TRAP_DOOR_EXIT, snapshot(), WorldState, runInterpreted(), runTranspiled() (+2 more)

### Community 4 - "Behavior Interpreter"
Cohesion: 0.36
Nodes (15): atomName(), DIRECTION_MAP, extractRoom(), extractStubObject(), extractWorld(), fail(), findGlobalValue(), FLAG_DESCRIPTIONS (+7 more)

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
- **23 isolated node(s):** `Locals`, `T`, `DUMMY_RESPONSES`, `Builtin`, `CondClause` (+18 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `validateWorld()` connect `Validator Structural Checks` to `Schema Types & Public API`, `Validator Types & Constants`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._
- **Why does `extractWorld()` connect `Behavior Interpreter` to `Schema Types & Public API`, `Validator Types & Constants`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Why does `AstProgram` connect `Validator Types & Constants` to `Schema Types & Public API`, `Behavior Interpreter`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **What connects `Locals`, `T`, `DUMMY_RESPONSES` to the rest of the system?**
  _23 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Schema Types & Public API` be split into smaller, more focused modules?**
  _Cohesion score 0.13756613756613756 - nodes in this community are weakly interconnected._
- **Should `Validator Types & Constants` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._