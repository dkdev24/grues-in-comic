# Graph Report - engine  (2026-07-20)

## Corpus Check
- 13 files · ~8,072 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 85 nodes · 233 edges · 7 communities
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.6)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3c33ff5f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- load.ts
- Rng
- index.ts
- movement.ts
- state.ts
- movement.test.ts
- load.test.ts

## God Nodes (most connected - your core abstractions)
1. `parse()` - 11 edges
2. `hasFlag()` - 11 edges
3. `loadWorld()` - 9 edges
4. `scope()` - 9 edges
5. `Rng` - 8 edges
6. `GameState` - 8 edges
7. `WorldIndex` - 8 edges
8. `here()` - 8 edges
9. `truncate()` - 8 edges
10. `resolveWord()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `run()` --calls--> `parse()`  [EXTRACTED]
  test/parser.test.ts → src/parser.ts
- `resolveExit()` --calls--> `hasFlag()`  [EXTRACTED]
  src/movement.ts → src/state.ts
- `roomIsLit()` --calls--> `hasFlag()`  [EXTRACTED]
  src/movement.ts → src/state.ts
- `parse()` --calls--> `scope()`  [EXTRACTED]
  src/parser.ts → src/scope.ts
- `resolveNoun()` --calls--> `hasFlag()`  [EXTRACTED]
  src/parser.ts → src/state.ts

## Import Cycles
- None detected.

## Communities (7 total, 0 thin omitted)

### Community 0 - "load.ts"
Cohesion: 0.29
Nodes (10): containerFor(), elementValue(), link(), LoadedWorld, LoadOptions, loadWorld(), GameState, indexWorld() (+2 more)

### Community 1 - "Rng"
Cohesion: 0.20
Nodes (4): Rng, ADR-0002, run(), ADR-0002

### Community 2 - "index.ts"
Cohesion: 0.39
Nodes (6): EngineEvent, NarrationChannel, transcriptText(), ADR-0002, TurnResult, ADR-0002

### Community 3 - "movement.ts"
Cohesion: 0.18
Nodes (17): exitFor(), ExitResolution, goTo(), resolveExit(), roomIsLit(), clearFlag(), firstChild(), here() (+9 more)

### Community 4 - "state.ts"
Cohesion: 0.23
Nodes (15): describeCandidates(), NounMatch, parse(), ParsedCommand, ParsedTravel, ParseFailure, Phrase, prepositionsAgree() (+7 more)

### Community 5 - "movement.test.ts"
Cohesion: 0.31
Nodes (8): ParseResult, setFlag(), buildLexicon(), index(), Lexicon, prepCount(), specificityFirst(), doc

### Community 6 - "load.test.ts"
Cohesion: 0.43
Nodes (7): containerIsPermeable(), inScope(), LOCATION_OPTIONS, scope(), ScopeOrigin, childrenOf(), hasFlag()

## Knowledge Gaps
- **10 isolated node(s):** `ADR-0002`, `ADR-0002`, `Phrase`, `NounMatch`, `ADR-0002` (+5 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Rng` connect `Rng` to `index.ts`?**
  _High betweenness centrality (0.132) - this node is a cross-community bridge._
- **Why does `loadWorld()` connect `load.ts` to `index.ts`, `movement.ts`, `movement.test.ts`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Why does `parse()` connect `state.ts` to `Rng`, `index.ts`, `movement.test.ts`, `load.test.ts`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **What connects `ADR-0002`, `ADR-0002`, `Phrase` to the rest of the system?**
  _10 weakly-connected nodes found - possible documentation gaps or missing edges._