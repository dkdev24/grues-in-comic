# Graph Report - engine  (2026-07-20)

## Corpus Check
- 22 files · ~27,942 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 219 nodes · 644 edges · 7 communities
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 8 edges (avg confidence: 0.65)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `53716a38`
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
9. `loadWorld()` - 12 edges
10. `emit()` - 12 edges

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
Cohesion: 0.08
Nodes (24): Engine, EngineEvent, transcriptText(), ADR-0002, TurnResult, APPROACH, COMBAT_ROUTINES, discriminating() (+16 more)

### Community 2 - "index.ts"
Cohesion: 0.11
Nodes (19): NarrationChannel, adjacencyTableId(), containerFor(), elementValue(), link(), LoadedWorld, loadWorld(), ADR-0002 (+11 more)

### Community 3 - "movement.ts"
Cohesion: 0.12
Nodes (40): addScore(), createBuiltins(), interruptRecord(), isBrief(), isLit(), resolveTable(), ADR-0001, ADR-0002 (+32 more)

### Community 4 - "state.ts"
Cohesion: 0.12
Nodes (33): ALL_WORDS, allEligible(), askFor(), completeOrAsk(), isPrefixOf(), NounMatch, parse(), ParsedCommand (+25 more)

### Community 7 - "engine.ts"
Cohesion: 0.21
Nodes (23): describeContents(), describeRoom(), advancesTheClock(), createEngine(), dispatch(), EngineOptions, entityAction(), handled() (+15 more)

### Community 8 - "interpreter.ts"
Cohesion: 0.15
Nodes (21): applyRoutine(), BreakSignal, ContinueSignal, displayName(), entityId(), evalExpr(), execBody(), execStmt() (+13 more)

## Knowledge Gaps
- **45 isolated node(s):** `GoldenTranscript`, `Walkthrough`, `ADR-0002`, `ROOT`, `WALKTHROUGHS` (+40 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createEngine()` connect `engine.ts` to `load.ts`, `Rng`, `index.ts`, `movement.ts`, `state.ts`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **Why does `Rng` connect `index.ts` to `movement.ts`, `state.ts`, `engine.ts`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Why does `Engine` connect `Rng` to `movement.ts`, `engine.ts`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **What connects `GoldenTranscript`, `Walkthrough`, `ADR-0002` to the rest of the system?**
  _45 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Rng` be split into smaller, more focused modules?**
  _Cohesion score 0.0784313725490196 - nodes in this community are weakly interconnected._
- **Should `index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11396011396011396 - nodes in this community are weakly interconnected._
- **Should `movement.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12395929694727105 - nodes in this community are weakly interconnected._