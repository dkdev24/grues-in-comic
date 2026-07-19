# Graph Report - engine  (2026-07-20)

## Corpus Check
- 21 files · ~20,859 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 186 nodes · 576 edges · 8 communities (7 shown, 1 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.68)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `02f62221`
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
2. `hasFlag()` - 20 edges
3. `parse()` - 17 edges
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

## Communities (8 total, 1 thin omitted)

### Community 0 - "load.ts"
Cohesion: 0.15
Nodes (23): diffTurns(), GoldenTranscript, normalize(), ParityMode, parseGolden(), parseWalkthrough(), stripBanner(), stripSessionEnd() (+15 more)

### Community 1 - "Rng"
Cohesion: 0.12
Nodes (16): EngineEvent, NarrationChannel, transcriptText(), ADR-0002, LoadedWorld, Rng, ADR-0002, Builtin (+8 more)

### Community 3 - "movement.ts"
Cohesion: 0.15
Nodes (22): EngineOptions, SaveState, ADR-0002, FatalSignal, containerFor(), elementValue(), link(), LoadOptions (+14 more)

### Community 4 - "state.ts"
Cohesion: 0.20
Nodes (19): ALL_WORDS, NounMatch, parse(), ParseResult, Phrase, prepositionsAgree(), resolveNoun(), splitPhrases() (+11 more)

### Community 5 - "builtins.ts"
Cohesion: 0.15
Nodes (29): addScore(), createBuiltins(), describeContents(), describeRoom(), interruptRecord(), isBrief(), isLit(), resolveTable() (+21 more)

### Community 7 - "engine.ts"
Cohesion: 0.25
Nodes (18): advancesTheClock(), createEngine(), dispatch(), entityAction(), handled(), handleParse(), metaVerb(), restore() (+10 more)

### Community 8 - "interpreter.ts"
Cohesion: 0.16
Nodes (23): applyRoutine(), BreakSignal, callRoutine(), ContinueSignal, displayName(), entityId(), evalExpr(), execBody() (+15 more)

## Knowledge Gaps
- **30 isolated node(s):** `GoldenTranscript`, `Walkthrough`, `ADR-0002`, `ROOT`, `WALKTHROUGHS` (+25 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Rng` connect `Rng` to `movement.ts`, `state.ts`, `engine.ts`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **Why does `Engine` connect `index.ts` to `Rng`, `movement.ts`, `engine.ts`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Why does `createEngine()` connect `engine.ts` to `load.ts`, `Rng`, `movement.ts`, `state.ts`, `builtins.ts`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **What connects `GoldenTranscript`, `Walkthrough`, `ADR-0002` to the rest of the system?**
  _30 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Rng` be split into smaller, more focused modules?**
  _Cohesion score 0.11692307692307692 - nodes in this community are weakly interconnected._
- **Should `movement.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1476923076923077 - nodes in this community are weakly interconnected._
- **Should `builtins.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.14583333333333334 - nodes in this community are weakly interconnected._