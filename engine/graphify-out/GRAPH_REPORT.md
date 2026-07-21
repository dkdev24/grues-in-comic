# Graph Report - engine  (2026-07-21)

## Corpus Check
- 27 files · ~34,746 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 252 nodes · 738 edges · 7 communities
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 14 edges (avg confidence: 0.61)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5608253c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Rng
- index.ts
- movement.ts
- state.ts
- load.ts
- runtime.ts
- interpreter.ts

## God Nodes (most connected - your core abstractions)
1. `createEngine()` - 26 edges
2. `createBuiltins()` - 21 edges
3. `hasFlag()` - 21 edges
4. `parse()` - 19 edges
5. `here()` - 17 edges
6. `truthy()` - 17 edges
7. `evalExpr()` - 16 edges
8. `tell()` - 14 edges
9. `callRoutine()` - 13 edges
10. `transcriptText()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `text()` --calls--> `transcriptText()`  [EXTRACTED]
  test/engine.test.ts → src/events.ts
- `text()` --calls--> `transcriptText()`  [EXTRACTED]
  test/game-actions.test.ts → src/events.ts
- `replay()` --calls--> `createEngine()`  [EXTRACTED]
  harness/replay.ts → src/engine.ts
- `Fight` --calls--> `createEngine()`  [EXTRACTED]
  test/combat.test.ts → src/engine.ts
- `vigil()` --calls--> `createEngine()`  [EXTRACTED]
  test/thief.test.ts → src/engine.ts

## Import Cycles
- None detected.

## Communities (7 total, 0 thin omitted)

### Community 1 - "Rng"
Cohesion: 0.07
Nodes (50): diffTurns(), GoldenTranscript, normalize(), ParityMode, parseGolden(), parseWalkthrough(), stripBanner(), stripSessionEnd() (+42 more)

### Community 2 - "index.ts"
Cohesion: 0.12
Nodes (42): addScore(), createBuiltins(), describeContents(), describeRoom(), interruptRecord(), isBrief(), resolveTable(), ADR-0001 (+34 more)

### Community 3 - "movement.ts"
Cohesion: 0.10
Nodes (44): isLit(), EngineOptions, SaveState, NarrationChannel, ADR-0002, adjacencyTableId(), containerFor(), elementValue() (+36 more)

### Community 4 - "state.ts"
Cohesion: 0.14
Nodes (28): ALL_WORDS, askFor(), completeOrAsk(), isPrefixOf(), NounMatch, parse(), ParsedCommand, ParsedTravel (+20 more)

### Community 5 - "load.ts"
Cohesion: 0.08
Nodes (17): commands, crashes, doc, engine, misses, raw, ROOT, VILLAIN (+9 more)

### Community 6 - "runtime.ts"
Cohesion: 0.20
Nodes (4): Rng, ADR-0002, run(), ADR-0002

### Community 8 - "interpreter.ts"
Cohesion: 0.15
Nodes (24): applyRoutine(), BreakSignal, callRoutine(), ContinueSignal, displayName(), entityId(), evalExpr(), execBody() (+16 more)

## Knowledge Gaps
- **60 isolated node(s):** `ROOT`, `doc`, `raw`, `commands`, `engine` (+55 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createEngine()` connect `index.ts` to `Rng`, `movement.ts`, `state.ts`, `load.ts`, `interpreter.ts`?**
  _High betweenness centrality (0.086) - this node is a cross-community bridge._
- **Why does `Rng` connect `runtime.ts` to `index.ts`, `movement.ts`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Why does `Engine` connect `load.ts` to `Rng`, `index.ts`, `movement.ts`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **What connects `ROOT`, `doc`, `raw` to the rest of the system?**
  _60 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Rng` be split into smaller, more focused modules?**
  _Cohesion score 0.07080200501253132 - nodes in this community are weakly interconnected._
- **Should `index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12077294685990338 - nodes in this community are weakly interconnected._
- **Should `movement.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10256410256410256 - nodes in this community are weakly interconnected._