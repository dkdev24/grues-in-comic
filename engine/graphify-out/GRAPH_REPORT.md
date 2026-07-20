# Graph Report - engine  (2026-07-20)

## Corpus Check
- 22 files · ~25,783 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 211 nodes · 627 edges · 7 communities
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.67)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0c685b0b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- load.ts
- Rng
- index.ts
- movement.ts
- state.ts
- engine.ts
- interpreter.ts

## God Nodes (most connected - your core abstractions)
1. `createBuiltins()` - 21 edges
2. `hasFlag()` - 21 edges
3. `parse()` - 19 edges
4. `evalExpr()` - 16 edges
5. `createEngine()` - 15 edges
6. `here()` - 15 edges
7. `truthy()` - 15 edges
8. `callRoutine()` - 12 edges
9. `emit()` - 12 edges
10. `GameState` - 12 edges

## Surprising Connections (you probably didn't know these)
- `fight()` --calls--> `normalize()`  [EXTRACTED]
  test/combat.test.ts → harness/golden.ts
- `replay()` --calls--> `createEngine()`  [EXTRACTED]
  harness/replay.ts → src/engine.ts
- `replay()` --calls--> `transcriptText()`  [EXTRACTED]
  harness/replay.ts → src/events.ts
- `fight()` --calls--> `createEngine()`  [EXTRACTED]
  test/combat.test.ts → src/engine.ts
- `text()` --calls--> `transcriptText()`  [EXTRACTED]
  test/engine.test.ts → src/events.ts

## Import Cycles
- None detected.

## Communities (7 total, 0 thin omitted)

### Community 0 - "load.ts"
Cohesion: 0.15
Nodes (23): diffTurns(), GoldenTranscript, normalize(), ParityMode, parseGolden(), parseWalkthrough(), stripBanner(), stripSessionEnd() (+15 more)

### Community 1 - "Rng"
Cohesion: 0.20
Nodes (4): Rng, ADR-0002, run(), ADR-0002

### Community 2 - "index.ts"
Cohesion: 0.08
Nodes (24): Engine, EngineEvent, NarrationChannel, transcriptText(), ADR-0002, TurnResult, Builtin, RuntimeContext (+16 more)

### Community 3 - "movement.ts"
Cohesion: 0.11
Nodes (38): SaveState, ADR-0002, containerFor(), elementValue(), link(), LoadedWorld, loadWorld(), ExitResolution (+30 more)

### Community 4 - "state.ts"
Cohesion: 0.16
Nodes (26): ALL_WORDS, allEligible(), askFor(), completeOrAsk(), isPrefixOf(), NounMatch, parse(), Phrase (+18 more)

### Community 7 - "engine.ts"
Cohesion: 0.20
Nodes (21): advancesTheClock(), createEngine(), dispatch(), EngineOptions, entityAction(), handled(), handleParse(), metaVerb() (+13 more)

### Community 8 - "interpreter.ts"
Cohesion: 0.12
Nodes (39): addScore(), createBuiltins(), describeContents(), describeRoom(), interruptRecord(), isBrief(), isLit(), resolveTable() (+31 more)

## Knowledge Gaps
- **40 isolated node(s):** `GoldenTranscript`, `Walkthrough`, `ADR-0002`, `ROOT`, `WALKTHROUGHS` (+35 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Rng` connect `Rng` to `index.ts`, `movement.ts`, `engine.ts`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **Why does `createEngine()` connect `engine.ts` to `load.ts`, `index.ts`, `movement.ts`, `state.ts`, `interpreter.ts`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **Why does `Engine` connect `index.ts` to `movement.ts`, `engine.ts`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **What connects `GoldenTranscript`, `Walkthrough`, `ADR-0002` to the rest of the system?**
  _40 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08067226890756303 - nodes in this community are weakly interconnected._
- **Should `movement.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11304347826086956 - nodes in this community are weakly interconnected._
- **Should `interpreter.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11517165005537099 - nodes in this community are weakly interconnected._