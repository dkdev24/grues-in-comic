# Graph Report - web  (2026-07-24)

## Corpus Check
- 32 files · ~39,142 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 295 nodes · 532 edges · 11 communities
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.75)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b4fd7d08`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- inspector-view.ts
- status.ts
- session.ts
- main.ts
- Turn
- serve.ts
- console-view.ts
- MixTracker
- balloon.ts
- inspector-view.ts
- backdrop.ts

## God Nodes (most connected - your core abstractions)
1. `Turn` - 18 edges
2. `createSession()` - 13 edges
3. `main()` - 11 edges
4. `Panel` - 10 edges
5. `renderPanel()` - 10 edges
6. `lineOf()` - 9 edges
7. `createComicView()` - 8 edges
8. `createMapper()` - 8 edges
9. `objectNameTable()` - 8 edges
10. `drawBalloon()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `joinOnly()` --calls--> `figureFor()`  [EXTRACTED]
  test/figure.test.ts → src/comic/figure.ts
- `caption()` --calls--> `lineOf()`  [EXTRACTED]
  test/mapper.test.ts → src/comic/mapper.ts
- `guide()` --calls--> `lineOf()`  [EXTRACTED]
  test/mapper.test.ts → src/comic/mapper.ts
- `hero()` --calls--> `lineOf()`  [EXTRACTED]
  test/mapper.test.ts → src/comic/mapper.ts
- `main()` --calls--> `lineOf()`  [EXTRACTED]
  tools/render-panel.ts → src/comic/mapper.ts

## Import Cycles
- None detected.

## Communities (11 total, 0 thin omitted)

### Community 0 - "inspector-view.ts"
Cohesion: 0.07
Nodes (26): ConsoleView, createConsoleView(), renderEvent(), required(), trimTrailingNewline(), ADR-0002, ADR-0004, createMixTracker() (+18 more)

### Community 1 - "status.ts"
Cohesion: 0.12
Nodes (14): createSession(), SessionOptions, ADR-0004, createStatusTracker(), roomNameTable(), StatusTracker, ADR-0002, ADR-0004 (+6 more)

### Community 2 - "session.ts"
Cohesion: 0.06
Nodes (43): Affect, affectFor(), AffectInput, AffectMarker, matchedSentence(), NEUTRAL, sentences(), ADR-0002 (+35 more)

### Community 3 - "main.ts"
Cohesion: 0.27
Nodes (9): cellFor(), columnsFor(), LayoutOptions, layoutStrip(), StripLayout, ADR-0004, ADR-0007, UNIT (+1 more)

### Community 4 - "Turn"
Cohesion: 0.09
Nodes (32): AFFECT_MARKERS, Cast, drawFigure(), Figure, figureFor(), newCycle(), PoseCycle, rotate() (+24 more)

### Community 5 - "serve.ts"
Cohesion: 0.22
Nodes (7): CONTENT_TYPES, PORT, REPO_ROOT, server, ADR-0002, WEB_ROOT, WORLD_ROOT

### Community 6 - "console-view.ts"
Cohesion: 0.09
Nodes (24): createDirector(), Director, DirectorOptions, ADR-0004, ADR-0005, loadCast(), MapperOptions, Panel (+16 more)

### Community 7 - "MixTracker"
Cohesion: 0.33
Nodes (4): grid, PRESETS, SIZES, status

### Community 9 - "balloon.ts"
Cohesion: 0.12
Nodes (21): BalloonBox, bubbleTrail(), cloud(), drawBalloon(), goalWidth(), greedyWrap(), measureBalloon(), Pt (+13 more)

### Community 10 - "inspector-view.ts"
Cohesion: 0.13
Nodes (14): ALL_EVENT_KINDS, describeEvent(), EventKind, EventMix, MixTracker, summarize(), ADR-0002, ADR-0004 (+6 more)

### Community 11 - "backdrop.ts"
Cohesion: 0.09
Nodes (24): backdropFor(), BackdropId, ROOM_BACKDROPS, ADR-0004, loadImage(), Mapper, objectNameTable(), here (+16 more)

## Knowledge Gaps
- **110 isolated node(s):** `status`, `grid`, `PRESETS`, `SIZES`, `GUIDE_SCRIPT` (+105 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Turn` connect `inspector-view.ts` to `status.ts`, `session.ts`, `console-view.ts`, `inspector-view.ts`, `backdrop.ts`?**
  _High betweenness centrality (0.091) - this node is a cross-community bridge._
- **Why does `Panel` connect `console-view.ts` to `session.ts`, `backdrop.ts`, `Turn`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Why does `Session` connect `inspector-view.ts` to `status.ts`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **What connects `status`, `grid`, `PRESETS` to the rest of the system?**
  _110 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `inspector-view.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06868686868686869 - nodes in this community are weakly interconnected._
- **Should `status.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11857707509881422 - nodes in this community are weakly interconnected._
- **Should `session.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05725490196078432 - nodes in this community are weakly interconnected._