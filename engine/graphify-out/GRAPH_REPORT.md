# Graph Report - engine  (2026-07-20)

## Corpus Check
- 21 files · ~23,596 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 197 nodes · 601 edges · 8 communities
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.68)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ed75ff10`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- load.ts
- Rng
- index.ts
- movement.ts
- state.ts
- builtins.ts
- engine.ts
- interpreter.ts

## God Nodes (most connected - your core abstractions)
1. `createBuiltins()` - 21 edges
2. `hasFlag()` - 21 edges
3. `parse()` - 19 edges
4. `evalExpr()` - 16 edges
5. `here()` - 15 edges
6. `truthy()` - 15 edges
7. `createEngine()` - 13 edges
8. `callRoutine()` - 12 edges
9. `emit()` - 12 edges
10. `GameState` - 12 edges

## Surprising Connections (you probably didn't know these)
- `replay()` --calls--> `createEngine()`  [EXTRACTED]
  harness/replay.ts → src/engine.ts
- `replay()` --calls--> `transcriptText()`  [EXTRACTED]
  harness/replay.ts → src/events.ts
- `text()` --calls--> `transcriptText()`  [EXTRACTED]
  test/engine.test.ts → src/events.ts
- `createBuiltins()` --indirect_call--> `tableRef()`  [INFERRED]
  src/builtins.ts → src/interpreter.ts
- `run()` --calls--> `parse()`  [EXTRACTED]
  test/parser.test.ts → src/parser.ts

## Import Cycles
- None detected.

## Communities (8 total, 0 thin omitted)

### Community 0 - "load.ts"
Cohesion: 0.15
Nodes (23): diffTurns(), GoldenTranscript, normalize(), ParityMode, parseGolden(), parseWalkthrough(), stripBanner(), stripSessionEnd() (+15 more)

### Community 1 - "Rng"
Cohesion: 0.25
Nodes (3): Rng, ADR-0002, ADR-0002

### Community 2 - "index.ts"
Cohesion: 0.18
Nodes (7): Engine, EngineEvent, transcriptText(), ADR-0002, TurnResult, doc, text()

### Community 3 - "movement.ts"
Cohesion: 0.14
Nodes (31): EngineOptions, NarrationChannel, ADR-0002, containerFor(), elementValue(), link(), LoadedWorld, LoadOptions (+23 more)

### Community 4 - "state.ts"
Cohesion: 0.12
Nodes (33): ALL_WORDS, allEligible(), askFor(), completeOrAsk(), isPrefixOf(), NounMatch, parse(), ParsedCommand (+25 more)

### Community 5 - "builtins.ts"
Cohesion: 0.20
Nodes (20): addScore(), createBuiltins(), describeContents(), describeRoom(), interruptRecord(), isBrief(), isLit(), resolveTable() (+12 more)

### Community 7 - "engine.ts"
Cohesion: 0.19
Nodes (22): advancesTheClock(), createEngine(), dispatch(), entityAction(), handled(), handleParse(), metaVerb(), restore() (+14 more)

### Community 8 - "interpreter.ts"
Cohesion: 0.15
Nodes (24): applyRoutine(), BreakSignal, callRoutine(), ContinueSignal, displayName(), entityId(), evalExpr(), execBody() (+16 more)

## Knowledge Gaps
- **32 isolated node(s):** `GoldenTranscript`, `Walkthrough`, `ADR-0002`, `ROOT`, `WALKTHROUGHS` (+27 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Rng` connect `Rng` to `movement.ts`, `state.ts`, `engine.ts`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **Why does `Engine` connect `index.ts` to `movement.ts`, `engine.ts`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Why does `createEngine()` connect `engine.ts` to `load.ts`, `index.ts`, `movement.ts`, `state.ts`, `builtins.ts`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **What connects `GoldenTranscript`, `Walkthrough`, `ADR-0002` to the rest of the system?**
  _32 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `movement.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.13663663663663664 - nodes in this community are weakly interconnected._
- **Should `state.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11561561561561562 - nodes in this community are weakly interconnected._
- **Should `interpreter.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.14814814814814814 - nodes in this community are weakly interconnected._