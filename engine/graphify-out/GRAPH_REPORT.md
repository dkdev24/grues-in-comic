# Graph Report - engine  (2026-07-21)

## Corpus Check
- 27 files · ~35,119 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 254 nodes · 744 edges · 9 communities
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 14 edges (avg confidence: 0.61)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `88662e11`
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
- engine.ts
- interpreter.ts

## God Nodes (most connected - your core abstractions)
1. `createEngine()` - 26 edges
2. `createBuiltins()` - 21 edges
3. `hasFlag()` - 21 edges
4. `parse()` - 19 edges
5. `here()` - 18 edges
6. `truthy()` - 17 edges
7. `evalExpr()` - 16 edges
8. `tell()` - 14 edges
9. `callRoutine()` - 13 edges
10. `transcriptText()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `Fight` --calls--> `normalize()`  [EXTRACTED]
  test/combat.test.ts → harness/golden.ts
- `vigil()` --calls--> `normalize()`  [EXTRACTED]
  test/thief.test.ts → harness/golden.ts
- `replay()` --calls--> `createEngine()`  [EXTRACTED]
  harness/replay.ts → src/engine.ts
- `replay()` --calls--> `transcriptText()`  [EXTRACTED]
  harness/replay.ts → src/events.ts
- `Fight` --calls--> `createEngine()`  [EXTRACTED]
  test/combat.test.ts → src/engine.ts

## Import Cycles
- None detected.

## Communities (9 total, 0 thin omitted)

### Community 0 - "replay.ts"
Cohesion: 0.15
Nodes (23): diffTurns(), GoldenTranscript, normalize(), ParityMode, parseGolden(), parseWalkthrough(), stripBanner(), stripSessionEnd() (+15 more)

### Community 1 - "Rng"
Cohesion: 0.13
Nodes (24): APPROACH, COMBAT_ROUTINES, legalTurn, MELEE_TABLES, ADR-0002, ADR-0003, villains, discriminating() (+16 more)

### Community 2 - "index.ts"
Cohesion: 0.15
Nodes (25): addScore(), createBuiltins(), describeContents(), describeRoom(), interruptRecord(), isBrief(), isLit(), resolveTable() (+17 more)

### Community 3 - "movement.ts"
Cohesion: 0.10
Nodes (40): EngineOptions, SaveState, ADR-0002, FatalSignal, adjacencyTableId(), containerFor(), elementValue(), link() (+32 more)

### Community 4 - "state.ts"
Cohesion: 0.13
Nodes (33): ALL_WORDS, allEligible(), askFor(), completeOrAsk(), isPrefixOf(), NounMatch, parse(), Phrase (+25 more)

### Community 5 - "load.ts"
Cohesion: 0.09
Nodes (20): commands, crashes, doc, engine, misses, raw, ROOT, VILLAIN (+12 more)

### Community 6 - "runtime.ts"
Cohesion: 0.20
Nodes (4): Rng, ADR-0002, run(), ADR-0002

### Community 7 - "engine.ts"
Cohesion: 0.25
Nodes (20): advancesTheClock(), createEngine(), dispatch(), endIfFinished(), entityAction(), handled(), handleParse(), metaVerb() (+12 more)

### Community 8 - "interpreter.ts"
Cohesion: 0.16
Nodes (22): applyRoutine(), BreakSignal, callRoutine(), ContinueSignal, displayName(), entityId(), evalExpr(), execBody() (+14 more)

## Knowledge Gaps
- **60 isolated node(s):** `ROOT`, `doc`, `raw`, `commands`, `engine` (+55 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createEngine()` connect `engine.ts` to `replay.ts`, `Rng`, `index.ts`, `movement.ts`, `state.ts`, `load.ts`, `interpreter.ts`?**
  _High betweenness centrality (0.084) - this node is a cross-community bridge._
- **Why does `Rng` connect `runtime.ts` to `index.ts`, `movement.ts`, `engine.ts`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Why does `Engine` connect `load.ts` to `movement.ts`, `engine.ts`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **What connects `ROOT`, `doc`, `raw` to the rest of the system?**
  _60 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Rng` be split into smaller, more focused modules?**
  _Cohesion score 0.13105413105413105 - nodes in this community are weakly interconnected._
- **Should `index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.14814814814814814 - nodes in this community are weakly interconnected._
- **Should `movement.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1026827012025902 - nodes in this community are weakly interconnected._