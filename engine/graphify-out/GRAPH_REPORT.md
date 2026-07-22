# Graph Report - engine  (2026-07-22)

## Corpus Check
- 29 files · ~37,672 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 277 nodes · 788 edges · 8 communities
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 14 edges (avg confidence: 0.61)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6664602c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- replay.ts
- Rng
- index.ts
- movement.ts
- state.ts
- load.ts
- runtime.ts
- interpreter.ts

## God Nodes (most connected - your core abstractions)
1. `createEngine()` - 28 edges
2. `createBuiltins()` - 24 edges
3. `hasFlag()` - 21 edges
4. `parse()` - 19 edges
5. `here()` - 19 edges
6. `truthy()` - 17 edges
7. `evalExpr()` - 16 edges
8. `tell()` - 14 edges
9. `callRoutine()` - 13 edges
10. `emit()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `createBuiltins()` --indirect_call--> `tableRef()`  [INFERRED]
  engine/src/builtins.ts → engine/src/interpreter.ts
- `runFullGame()` --calls--> `createEngine()`  [EXTRACTED]
  engine/harness/complete.ts → engine/src/engine.ts
- `replay()` --calls--> `createEngine()`  [EXTRACTED]
  engine/harness/replay.ts → engine/src/engine.ts
- `replay()` --calls--> `transcriptText()`  [EXTRACTED]
  engine/harness/replay.ts → engine/src/events.ts
- `createBuiltins()` --calls--> `callRoutine()`  [EXTRACTED]
  engine/src/builtins.ts → engine/src/interpreter.ts

## Import Cycles
- None detected.

## Communities (8 total, 0 thin omitted)

### Community 0 - "replay.ts"
Cohesion: 0.14
Nodes (25): diffTurns(), GoldenTranscript, normalize(), ParityMode, parseGolden(), parseWalkthrough(), stripBanner(), stripSessionEnd() (+17 more)

### Community 1 - "Rng"
Cohesion: 0.13
Nodes (24): APPROACH, COMBAT_ROUTINES, legalTurn, MELEE_TABLES, ADR-0002, ADR-0003, villains, discriminating() (+16 more)

### Community 2 - "index.ts"
Cohesion: 0.10
Nodes (53): addScore(), createBuiltins(), describeContents(), describeRoom(), displayName(), globalIn(), interruptRecord(), isBrief() (+45 more)

### Community 3 - "movement.ts"
Cohesion: 0.15
Nodes (18): adjacencyTableId(), containerFor(), elementValue(), link(), loadWorld(), ADR-0002, ADR-0003, firstChild() (+10 more)

### Community 4 - "state.ts"
Cohesion: 0.10
Nodes (46): EngineOptions, SaveState, ADR-0002, FatalSignal, LoadOptions, ExitResolution, ALL_WORDS, allEligible() (+38 more)

### Community 5 - "load.ts"
Cohesion: 0.08
Nodes (21): Engine, EngineEvent, NarrationChannel, transcriptText(), ADR-0002, TurnResult, LoadedWorld, Rng (+13 more)

### Community 6 - "runtime.ts"
Cohesion: 0.08
Nodes (24): JUNK, loadCommands(), loadWorldDoc(), ROOT, runFullGame(), RunOptions, RunResult, TO_CASE (+16 more)

### Community 8 - "interpreter.ts"
Cohesion: 0.16
Nodes (22): applyRoutine(), BreakSignal, callRoutine(), ContinueSignal, displayName(), entityId(), evalExpr(), execBody() (+14 more)

## Knowledge Gaps
- **74 isolated node(s):** `ROOT`, `VILLAIN`, `WEAPON`, `TO_HIDEAWAY`, `TO_CASE` (+69 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createEngine()` connect `index.ts` to `replay.ts`, `Rng`, `movement.ts`, `state.ts`, `load.ts`, `runtime.ts`, `interpreter.ts`?**
  _High betweenness centrality (0.101) - this node is a cross-community bridge._
- **Why does `Rng` connect `load.ts` to `index.ts`, `state.ts`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Why does `Engine` connect `load.ts` to `replay.ts`, `index.ts`, `state.ts`, `runtime.ts`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **What connects `ROOT`, `VILLAIN`, `WEAPON` to the rest of the system?**
  _74 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `replay.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1354679802955665 - nodes in this community are weakly interconnected._
- **Should `Rng` be split into smaller, more focused modules?**
  _Cohesion score 0.13105413105413105 - nodes in this community are weakly interconnected._
- **Should `index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10344827586206896 - nodes in this community are weakly interconnected._