# Graph Report - engine  (2026-07-21)

## Corpus Check
- 24 files · ~32,016 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 229 nodes · 683 edges · 7 communities
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 12 edges (avg confidence: 0.62)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6cc30e22`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- load.ts
- Rng
- index.ts
- movement.ts
- state.ts
- load.ts
- interpreter.ts

## God Nodes (most connected - your core abstractions)
1. `createEngine()` - 23 edges
2. `createBuiltins()` - 21 edges
3. `hasFlag()` - 21 edges
4. `parse()` - 19 edges
5. `evalExpr()` - 16 edges
6. `here()` - 16 edges
7. `truthy()` - 15 edges
8. `callRoutine()` - 13 edges
9. `loadWorld()` - 12 edges
10. `emit()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `replay()` --calls--> `createEngine()`  [EXTRACTED]
  harness/replay.ts → src/engine.ts
- `Fight` --calls--> `createEngine()`  [EXTRACTED]
  test/combat.test.ts → src/engine.ts
- `vigil()` --calls--> `createEngine()`  [EXTRACTED]
  test/thief.test.ts → src/engine.ts
- `text()` --calls--> `transcriptText()`  [EXTRACTED]
  test/engine.test.ts → src/events.ts
- `Fight` --calls--> `normalize()`  [EXTRACTED]
  test/combat.test.ts → harness/golden.ts

## Import Cycles
- None detected.

## Communities (7 total, 0 thin omitted)

### Community 0 - "load.ts"
Cohesion: 0.09
Nodes (29): diffTurns(), GoldenTranscript, normalize(), ParityMode, parseGolden(), parseWalkthrough(), stripBanner(), stripSessionEnd() (+21 more)

### Community 1 - "Rng"
Cohesion: 0.13
Nodes (24): APPROACH, COMBAT_ROUTINES, legalTurn, MELEE_TABLES, ADR-0002, ADR-0003, villains, discriminating() (+16 more)

### Community 2 - "index.ts"
Cohesion: 0.11
Nodes (28): advancesTheClock(), dispatch(), EngineOptions, entityAction(), handled(), handleParse(), metaVerb(), runClock() (+20 more)

### Community 3 - "movement.ts"
Cohesion: 0.13
Nodes (33): isLit(), vehicleCarrying(), SaveState, ADR-0002, exitFor(), ExitResolution, goTo(), resolveExit() (+25 more)

### Community 4 - "state.ts"
Cohesion: 0.12
Nodes (32): ALL_WORDS, allEligible(), askFor(), completeOrAsk(), isPrefixOf(), NounMatch, parse(), ParsedCommand (+24 more)

### Community 5 - "load.ts"
Cohesion: 0.36
Nodes (8): adjacencyTableId(), containerFor(), elementValue(), link(), loadWorld(), ADR-0002, ADR-0003, indexWorld()

### Community 8 - "interpreter.ts"
Cohesion: 0.11
Nodes (38): addScore(), createBuiltins(), describeContents(), describeRoom(), interruptRecord(), isBrief(), resolveTable(), ADR-0001 (+30 more)

## Knowledge Gaps
- **47 isolated node(s):** `GoldenTranscript`, `Walkthrough`, `ADR-0002`, `ROOT`, `WALKTHROUGHS` (+42 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createEngine()` connect `interpreter.ts` to `load.ts`, `Rng`, `index.ts`, `movement.ts`, `state.ts`, `load.ts`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **Why does `Rng` connect `index.ts` to `movement.ts`, `state.ts`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **Why does `Engine` connect `load.ts` to `index.ts`, `movement.ts`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **What connects `GoldenTranscript`, `Walkthrough`, `ADR-0002` to the rest of the system?**
  _47 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `load.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09446693657219973 - nodes in this community are weakly interconnected._
- **Should `Rng` be split into smaller, more focused modules?**
  _Cohesion score 0.13105413105413105 - nodes in this community are weakly interconnected._
- **Should `index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._