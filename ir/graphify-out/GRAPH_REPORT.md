# Graph Report - .  (2026-07-18)

## Corpus Check
- Corpus is ~8,228 words - fits in a single context window. You may not need a graph.

## Summary
- 94 nodes · 210 edges · 13 communities (8 shown, 5 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Schema Types & Public API
- Validator Structural Checks
- Behavior AST & POC Routines
- POC Test Harness & World State
- Behavior Interpreter
- World Builtins
- Transpiled Comparison
- Validator Types & Constants
- Validator Tests
- Interpreter Return Signal
- Validator CLI
- Sample World Test
- Validator Array Helpers

## God Nodes (most connected - your core abstractions)
1. `validateWorld()` - 17 edges
2. `truthy()` - 7 edges
3. `BehaviorValue` - 7 edges
4. `evalExpr()` - 6 edges
5. `WorldState` - 6 edges
6. `tell()` - 6 edges
7. `ExitBase` - 6 edges
8. `execStmt()` - 5 edges
9. `trapDoorExit()` - 5 edges
10. `hasFlag()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `WorldState` --references--> `BehaviorValue`  [EXTRACTED]
  poc/world.ts → src/behavior.ts
- `errorsFor()` --calls--> `validateWorld()`  [EXTRACTED]
  test/validate.test.ts → src/validate.ts
- `runInterpreted()` --calls--> `runRoutine()`  [EXTRACTED]
  test/behavior-poc.test.ts → poc/interpreter.ts
- `Scenario` --references--> `WorldState`  [EXTRACTED]
  test/behavior-poc.test.ts → poc/world.ts
- `runInterpreted()` --calls--> `snapshot()`  [EXTRACTED]
  test/behavior-poc.test.ts → poc/world.ts

## Import Cycles
- None detected.

## Communities (13 total, 5 thin omitted)

### Community 0 - "Schema Types & Public API"
Cohesion: 0.19
Nodes (21): BlockedExit, ConditionalExit, Direction, DIRECTIONS, DoorExit, EntityRef, Exit, ExitBase (+13 more)

### Community 1 - "Validator Structural Checks"
Cohesion: 0.29
Nodes (10): checkKeys(), Ctx, isObject(), isScalar(), optBool(), optInt(), optString(), reqArray() (+2 more)

### Community 2 - "Behavior AST & POC Routines"
Cohesion: 0.24
Nodes (8): KITCHEN_WINDOW_F, T, TRAP_DOOR_EXIT, BehaviorRoutine, CondClause, Expr, Stmt, TellPart

### Community 3 - "POC Test Harness & World State"
Cohesion: 0.46
Nodes (7): runRoutine(), snapshot(), WorldState, runInterpreted(), runTranspiled(), Scenario, scenarios

### Community 4 - "Behavior Interpreter"
Cohesion: 0.52
Nodes (6): evalExpr(), execBody(), execStmt(), execTellPart(), Locals, num()

### Community 5 - "World Builtins"
Cohesion: 0.29
Nodes (6): Builtin, builtins, clearFlag(), DUMMY_RESPONSES, makeWorld(), setFlag()

### Community 6 - "Transpiled Comparison"
Cohesion: 0.67
Nodes (5): kitchenWindowF(), trapDoorExit(), hasFlag(), tell(), truthy()

### Community 7 - "Validator Types & Constants"
Cohesion: 0.33
Nodes (5): DIRECTION_SET, Json, ValidationError, ValidationResult, WorldSummary

## Knowledge Gaps
- **11 isolated node(s):** `Locals`, `T`, `DUMMY_RESPONSES`, `Builtin`, `CondClause` (+6 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `validateWorld()` connect `Validator Structural Checks` to `Schema Types & Public API`, `Validator Types & Constants`, `Validator Tests`, `Validator CLI`, `Sample World Test`, `Validator Array Helpers`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **Why does `BehaviorValue` connect `Interpreter Return Signal` to `Behavior AST & POC Routines`, `POC Test Harness & World State`, `Behavior Interpreter`, `World Builtins`, `Transpiled Comparison`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **Why does `truthy()` connect `Transpiled Comparison` to `Behavior Interpreter`, `World Builtins`?**
  _High betweenness centrality (0.004) - this node is a cross-community bridge._
- **What connects `Locals`, `T`, `DUMMY_RESPONSES` to the rest of the system?**
  _11 weakly-connected nodes found - possible documentation gaps or missing edges._