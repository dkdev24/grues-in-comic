# Graph Report - engine  (2026-07-20)

## Corpus Check
- 9 files · ~4,218 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 53 nodes · 125 edges · 7 communities
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `38b3e26e`
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
1. `loadWorld()` - 8 edges
2. `Rng` - 8 edges
3. `resolveExit()` - 6 edges
4. `hasFlag()` - 6 edges
5. `here()` - 6 edges
6. `goTo()` - 5 edges
7. `roomIsLit()` - 5 edges
8. `GameState` - 5 edges
9. `WorldIndex` - 5 edges
10. `move()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `goTo()` --calls--> `move()`  [EXTRACTED]
  src/movement.ts → src/state.ts
- `LoadedWorld` --references--> `GameState`  [EXTRACTED]
  src/load.ts → src/state.ts
- `LoadedWorld` --references--> `WorldIndex`  [EXTRACTED]
  src/load.ts → src/state.ts
- `loadWorld()` --calls--> `indexWorld()`  [EXTRACTED]
  src/load.ts → src/state.ts
- `resolveExit()` --calls--> `hasFlag()`  [EXTRACTED]
  src/movement.ts → src/state.ts

## Import Cycles
- None detected.

## Communities (7 total, 0 thin omitted)

### Community 0 - "load.ts"
Cohesion: 0.29
Nodes (10): containerFor(), elementValue(), link(), LoadedWorld, LoadOptions, loadWorld(), GameState, indexWorld() (+2 more)

### Community 1 - "Rng"
Cohesion: 0.22
Nodes (3): Rng, ADR-0002, ADR-0002

### Community 2 - "index.ts"
Cohesion: 0.33
Nodes (7): EngineEvent, NarrationChannel, transcriptText(), ADR-0002, TurnResult, ADR-0002, nextSibling()

### Community 3 - "movement.ts"
Cohesion: 0.52
Nodes (6): exitFor(), ExitResolution, resolveExit(), roomIsLit(), hasFlag(), truthy()

### Community 4 - "state.ts"
Cohesion: 0.40
Nodes (5): clearFlag(), firstChild(), locationOf(), move(), remove()

### Community 5 - "movement.test.ts"
Cohesion: 0.50
Nodes (4): goTo(), here(), setFlag(), doc

### Community 6 - "load.test.ts"
Cohesion: 0.40
Nodes (4): childrenOf(), isIn(), isWithin(), doc

## Knowledge Gaps
- **6 isolated node(s):** `ADR-0002`, `ADR-0002`, `ADR-0002`, `doc`, `doc` (+1 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Rng` connect `Rng` to `index.ts`?**
  _High betweenness centrality (0.217) - this node is a cross-community bridge._
- **Why does `loadWorld()` connect `load.ts` to `index.ts`, `movement.test.ts`, `load.test.ts`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Why does `here()` connect `movement.test.ts` to `index.ts`, `movement.ts`, `state.ts`, `load.test.ts`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **What connects `ADR-0002`, `ADR-0002`, `ADR-0002` to the rest of the system?**
  _6 weakly-connected nodes found - possible documentation gaps or missing edges._