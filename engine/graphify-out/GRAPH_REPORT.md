# Graph Report - engine  (2026-07-20)

## Corpus Check
- 21 files · ~18,813 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 180 nodes · 557 edges · 7 communities (6 shown, 1 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.68)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `92194bb7`
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
2. `hasFlag()` - 18 edges
3. `evalExpr()` - 16 edges
4. `truthy()` - 15 edges
5. `createEngine()` - 13 edges
6. `parse()` - 13 edges
7. `here()` - 13 edges
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
- `run()` --calls--> `parse()`  [EXTRACTED]
  test/parser.test.ts → src/parser.ts
- `createBuiltins()` --indirect_call--> `tableRef()`  [INFERRED]
  src/builtins.ts → src/interpreter.ts

## Import Cycles
- None detected.

## Communities (7 total, 1 thin omitted)

### Community 0 - "load.ts"
Cohesion: 0.16
Nodes (21): diffTurns(), GoldenTranscript, normalize(), parseGolden(), parseWalkthrough(), stripBanner(), stripSessionEnd(), ADR-0002 (+13 more)

### Community 1 - "Rng"
Cohesion: 0.11
Nodes (16): EngineEvent, NarrationChannel, transcriptText(), ADR-0002, Rng, ADR-0002, Builtin, emitOn() (+8 more)

### Community 3 - "movement.ts"
Cohesion: 0.14
Nodes (33): isLit(), ADR-0002, containerFor(), elementValue(), link(), LoadedWorld, loadWorld(), exitFor() (+25 more)

### Community 4 - "state.ts"
Cohesion: 0.16
Nodes (22): NounMatch, parse(), ParsedCommand, ParsedTravel, ParseFailure, ParseResult, Phrase, prepositionsAgree() (+14 more)

### Community 7 - "engine.ts"
Cohesion: 0.21
Nodes (18): createEngine(), dispatch(), EngineOptions, entityAction(), handled(), handleParse(), metaVerb(), restore() (+10 more)

### Community 8 - "interpreter.ts"
Cohesion: 0.12
Nodes (35): addScore(), createBuiltins(), describeContents(), describeRoom(), interruptRecord(), isBrief(), resolveTable(), ADR-0001 (+27 more)

## Knowledge Gaps
- **29 isolated node(s):** `GoldenTranscript`, `ADR-0002`, `ROOT`, `WALKTHROUGHS`, `GOLDEN` (+24 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Rng` connect `Rng` to `movement.ts`, `state.ts`, `engine.ts`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **Why does `createEngine()` connect `engine.ts` to `load.ts`, `Rng`, `movement.ts`, `state.ts`, `interpreter.ts`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Why does `Engine` connect `index.ts` to `Rng`, `movement.ts`, `engine.ts`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **What connects `GoldenTranscript`, `ADR-0002`, `ROOT` to the rest of the system?**
  _29 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Rng` be split into smaller, more focused modules?**
  _Cohesion score 0.11384615384615385 - nodes in this community are weakly interconnected._
- **Should `movement.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.14487179487179488 - nodes in this community are weakly interconnected._
- **Should `interpreter.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12010796221322537 - nodes in this community are weakly interconnected._