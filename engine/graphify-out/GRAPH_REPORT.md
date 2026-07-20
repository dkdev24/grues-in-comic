# Graph Report - engine  (2026-07-20)

## Corpus Check
- 22 files · ~27,292 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 215 nodes · 639 edges · 7 communities
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 8 edges (avg confidence: 0.65)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `34ba79a4`
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
2. `createEngine()` - 21 edges
3. `hasFlag()` - 21 edges
4. `parse()` - 19 edges
5. `evalExpr()` - 16 edges
6. `here()` - 16 edges
7. `truthy()` - 15 edges
8. `callRoutine()` - 13 edges
9. `emit()` - 12 edges
10. `GameState` - 12 edges

## Surprising Connections (you probably didn't know these)
- `Fight` --calls--> `normalize()`  [EXTRACTED]
  test/combat.test.ts → harness/golden.ts
- `replay()` --calls--> `createEngine()`  [EXTRACTED]
  harness/replay.ts → src/engine.ts
- `replay()` --calls--> `transcriptText()`  [EXTRACTED]
  harness/replay.ts → src/events.ts
- `Fight` --calls--> `createEngine()`  [EXTRACTED]
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
Cohesion: 0.14
Nodes (15): APPROACH, COMBAT_ROUTINES, discriminating(), doc, escape(), legalPatterns, legalTurn, literalLength() (+7 more)

### Community 2 - "index.ts"
Cohesion: 0.09
Nodes (17): Engine, EngineEvent, NarrationChannel, transcriptText(), ADR-0002, TurnResult, Rng, ADR-0002 (+9 more)

### Community 3 - "movement.ts"
Cohesion: 0.11
Nodes (41): isLit(), EngineOptions, SaveState, ADR-0002, containerFor(), elementValue(), link(), LoadedWorld (+33 more)

### Community 4 - "state.ts"
Cohesion: 0.14
Nodes (29): ALL_WORDS, askFor(), completeOrAsk(), isPrefixOf(), NounMatch, parse(), ParsedCommand, ParseResult (+21 more)

### Community 7 - "engine.ts"
Cohesion: 0.24
Nodes (20): describeContents(), describeRoom(), advancesTheClock(), createEngine(), dispatch(), entityAction(), handled(), handleParse() (+12 more)

### Community 8 - "interpreter.ts"
Cohesion: 0.12
Nodes (34): addScore(), createBuiltins(), interruptRecord(), isBrief(), resolveTable(), ADR-0001, ADR-0002, vehicleCarrying() (+26 more)

## Knowledge Gaps
- **42 isolated node(s):** `GoldenTranscript`, `Walkthrough`, `ADR-0002`, `ROOT`, `WALKTHROUGHS` (+37 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createEngine()` connect `engine.ts` to `load.ts`, `Rng`, `index.ts`, `movement.ts`, `state.ts`, `interpreter.ts`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **Why does `Rng` connect `index.ts` to `movement.ts`, `state.ts`, `engine.ts`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Why does `Engine` connect `index.ts` to `movement.ts`, `engine.ts`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **What connects `GoldenTranscript`, `Walkthrough`, `ADR-0002` to the rest of the system?**
  _42 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Rng` be split into smaller, more focused modules?**
  _Cohesion score 0.13970588235294118 - nodes in this community are weakly interconnected._
- **Should `index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0907258064516129 - nodes in this community are weakly interconnected._
- **Should `movement.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10904255319148937 - nodes in this community are weakly interconnected._