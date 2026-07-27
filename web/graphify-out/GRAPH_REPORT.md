# Graph Report - web  (2026-07-27)

## Corpus Check
- 35 files · ~41,739 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 324 nodes · 595 edges · 12 communities
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.76)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `bc8c1f1f`
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
- backdrop.ts
- balloon.ts
- inspector-view.ts
- backdrop.ts

## God Nodes (most connected - your core abstractions)
1. `Turn` - 18 edges
2. `createSession()` - 13 edges
3. `renderPanel()` - 12 edges
4. `Panel` - 11 edges
5. `main()` - 11 edges
6. `lineOf()` - 9 edges
7. `createComicView()` - 8 edges
8. `figureFor()` - 8 edges
9. `createMapper()` - 8 edges
10. `objectNameTable()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `main()` --calls--> `backdropFor()`  [EXTRACTED]
  tools/render-panel.ts → src/comic/backdrop.ts
- `loadCastFromDisk()` --calls--> `loadImage()`  [EXTRACTED]
  tools/render-panel.ts → src/comic/figure.ts
- `joinOnly()` --calls--> `figureFor()`  [EXTRACTED]
  test/figure.test.ts → src/comic/figure.ts
- `caption()` --calls--> `lineOf()`  [EXTRACTED]
  test/mapper.test.ts → src/comic/mapper.ts
- `guide()` --calls--> `lineOf()`  [EXTRACTED]
  test/mapper.test.ts → src/comic/mapper.ts

## Import Cycles
- None detected.

## Communities (12 total, 0 thin omitted)

### Community 0 - "inspector-view.ts"
Cohesion: 0.06
Nodes (27): ComicView, ConsoleView, createConsoleView(), renderEvent(), required(), trimTrailingNewline(), ADR-0002, ADR-0004 (+19 more)

### Community 1 - "status.ts"
Cohesion: 0.11
Nodes (13): SessionOptions, ADR-0004, createStatusTracker(), roomNameTable(), StatusTracker, ADR-0002, ADR-0004, ADR-0005 (+5 more)

### Community 2 - "session.ts"
Cohesion: 0.06
Nodes (42): Balloon, BalloonClass, createMapper(), GUIDE_EMOTION, GuideScript, heroBalloon(), KindInput, LadderInput (+34 more)

### Community 3 - "main.ts"
Cohesion: 0.18
Nodes (10): Affect, affectFor(), AffectInput, AffectMarker, matchedSentence(), NEUTRAL, sentences(), ADR-0002 (+2 more)

### Community 4 - "Turn"
Cohesion: 0.05
Nodes (61): AFFECT_MARKERS, Cast, drawFigure(), Figure, figureFor(), loadImage(), newCycle(), PoseCycle (+53 more)

### Community 5 - "serve.ts"
Cohesion: 0.22
Nodes (7): CONTENT_TYPES, PORT, REPO_ROOT, server, ADR-0002, WEB_ROOT, WORLD_ROOT

### Community 6 - "console-view.ts"
Cohesion: 0.09
Nodes (26): createDirector(), loadCast(), cellFor(), columnsFor(), LayoutOptions, layoutStrip(), StripLayout, ADR-0004 (+18 more)

### Community 7 - "MixTracker"
Cohesion: 0.33
Nodes (4): grid, PRESETS, SIZES, status

### Community 8 - "backdrop.ts"
Cohesion: 0.31
Nodes (7): backdropFor(), BackdropId, ROOM_BACKDROPS, ADR-0004, here, roomIds, world

### Community 9 - "balloon.ts"
Cohesion: 0.12
Nodes (21): BalloonBox, bubbleTrail(), cloud(), drawBalloon(), goalWidth(), greedyWrap(), measureBalloon(), Pt (+13 more)

### Community 10 - "inspector-view.ts"
Cohesion: 0.13
Nodes (14): ALL_EVENT_KINDS, describeEvent(), EventKind, EventMix, MixTracker, summarize(), ADR-0002, ADR-0004 (+6 more)

### Community 11 - "backdrop.ts"
Cohesion: 0.13
Nodes (13): Director, DirectorOptions, ADR-0004, ADR-0005, MapperOptions, Panel, objectNameTable(), options() (+5 more)

## Knowledge Gaps
- **126 isolated node(s):** `status`, `grid`, `PRESETS`, `SIZES`, `GUIDE_SCRIPT` (+121 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Turn` connect `inspector-view.ts` to `status.ts`, `session.ts`, `console-view.ts`, `inspector-view.ts`, `backdrop.ts`?**
  _High betweenness centrality (0.090) - this node is a cross-community bridge._
- **Why does `Panel` connect `backdrop.ts` to `session.ts`, `Turn`, `console-view.ts`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Why does `Session` connect `inspector-view.ts` to `status.ts`, `session.ts`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **What connects `status`, `grid`, `PRESETS` to the rest of the system?**
  _126 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `inspector-view.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06294326241134751 - nodes in this community are weakly interconnected._
- **Should `status.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11255411255411256 - nodes in this community are weakly interconnected._
- **Should `session.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06377551020408163 - nodes in this community are weakly interconnected._