# Graph Report - engine  (2026-07-20)

## Corpus Check
- 18 files · ~16,574 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 156 nodes · 506 edges · 10 communities
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.65)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `75b27581`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- load.ts
- Rng
- index.ts
- movement.ts
- state.ts
- movement.test.ts
- load.test.ts
- engine.ts
- interpreter.ts
- builtins.ts

## God Nodes (most connected - your core abstractions)
1. `createBuiltins()` - 21 edges
2. `hasFlag()` - 18 edges
3. `evalExpr()` - 16 edges
4. `truthy()` - 15 edges
5. `parse()` - 13 edges
6. `here()` - 13 edges
7. `callRoutine()` - 12 edges
8. `emit()` - 12 edges
9. `GameState` - 12 edges
10. `createEngine()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `createBuiltins()` --indirect_call--> `tableRef()`  [INFERRED]
  src/builtins.ts → src/interpreter.ts
- `text()` --calls--> `transcriptText()`  [EXTRACTED]
  test/engine.test.ts → src/events.ts
- `run()` --calls--> `parse()`  [EXTRACTED]
  test/parser.test.ts → src/parser.ts
- `createBuiltins()` --calls--> `callRoutine()`  [EXTRACTED]
  src/builtins.ts → src/interpreter.ts
- `createBuiltins()` --calls--> `entityId()`  [EXTRACTED]
  src/builtins.ts → src/interpreter.ts

## Import Cycles
- None detected.

## Communities (10 total, 0 thin omitted)

### Community 0 - "load.ts"
Cohesion: 0.36
Nodes (9): containerFor(), elementValue(), link(), LoadedWorld, loadWorld(), RuntimeContext, GameState, indexWorld() (+1 more)

### Community 1 - "Rng"
Cohesion: 0.25
Nodes (3): Rng, ADR-0002, ADR-0002

### Community 2 - "index.ts"
Cohesion: 0.18
Nodes (8): Engine, EngineEvent, NarrationChannel, transcriptText(), ADR-0002, TurnResult, doc, text()

### Community 3 - "movement.ts"
Cohesion: 0.21
Nodes (10): clearFlag(), firstChild(), isIn(), isWithin(), locationOf(), move(), nextSibling(), remove() (+2 more)

### Community 4 - "state.ts"
Cohesion: 0.17
Nodes (21): NounMatch, parse(), ParsedCommand, ParsedTravel, ParseFailure, ParseResult, Phrase, prepositionsAgree() (+13 more)

### Community 5 - "movement.test.ts"
Cohesion: 0.33
Nodes (8): exitFor(), ExitResolution, goTo(), resolveExit(), roomIsLit(), here(), setFlag(), doc

### Community 6 - "load.test.ts"
Cohesion: 0.40
Nodes (8): ADR-0002, containerIsPermeable(), inScope(), LOCATION_OPTIONS, scope(), ScopeEntry, ScopeOrigin, childrenOf()

### Community 7 - "engine.ts"
Cohesion: 0.17
Nodes (24): createEngine(), dispatch(), EngineOptions, entityAction(), handled(), handleParse(), metaVerb(), restore() (+16 more)

### Community 8 - "interpreter.ts"
Cohesion: 0.15
Nodes (21): applyRoutine(), BreakSignal, ContinueSignal, displayName(), entityId(), evalExpr(), execBody(), execStmt() (+13 more)

### Community 9 - "builtins.ts"
Cohesion: 0.30
Nodes (14): addScore(), createBuiltins(), describeContents(), describeRoom(), interruptRecord(), isBrief(), isLit(), resolveTable() (+6 more)

## Knowledge Gaps
- **21 isolated node(s):** `ADR-0001`, `ADR-0002`, `ADR-0002`, `ADR-0002`, `ADR-0002` (+16 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Rng` connect `Rng` to `load.ts`, `state.ts`, `load.test.ts`, `engine.ts`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._
- **Why does `Engine` connect `index.ts` to `load.test.ts`, `engine.ts`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Why does `hasFlag()` connect `builtins.ts` to `movement.ts`, `state.ts`, `movement.test.ts`, `load.test.ts`, `interpreter.ts`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **What connects `ADR-0001`, `ADR-0002`, `ADR-0002` to the rest of the system?**
  _21 weakly-connected nodes found - possible documentation gaps or missing edges._