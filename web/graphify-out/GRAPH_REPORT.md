# Graph Report - web  (2026-07-23)

## Corpus Check
- 32 files · ~35,200 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 276 nodes · 494 edges · 10 communities
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.75)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `fb876ae7`
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
- backdrop.ts

## God Nodes (most connected - your core abstractions)
1. `Turn` - 18 edges
2. `createSession()` - 13 edges
3. `main()` - 11 edges
4. `Panel` - 10 edges
5. `renderPanel()` - 10 edges
6. `createComicView()` - 8 edges
7. `createMapper()` - 8 edges
8. `objectNameTable()` - 8 edges
9. `drawBalloon()` - 7 edges
10. `Session` - 7 edges

## Surprising Connections (you probably didn't know these)
- `loadCastFromDisk()` --calls--> `loadImage()`  [EXTRACTED]
  tools/render-panel.ts → src/comic/figure.ts
- `joinOnly()` --calls--> `figureFor()`  [EXTRACTED]
  test/figure.test.ts → src/comic/figure.ts
- `panels()` --calls--> `createMapper()`  [EXTRACTED]
  tools/render-panel.ts → src/comic/mapper.ts
- `main()` --calls--> `renderPanel()`  [EXTRACTED]
  tools/render-panel.ts → src/comic/render.ts
- `replayPanels()` --calls--> `createSession()`  [EXTRACTED]
  test/mapper.test.ts → src/session.ts

## Import Cycles
- None detected.

## Communities (10 total, 0 thin omitted)

### Community 0 - "inspector-view.ts"
Cohesion: 0.06
Nodes (33): createConsoleView(), required(), ALL_EVENT_KINDS, createMixTracker(), describeEvent(), EventKind, EventMix, MixTracker (+25 more)

### Community 1 - "status.ts"
Cohesion: 0.08
Nodes (18): ConsoleView, renderEvent(), trimTrailingNewline(), ADR-0002, ADR-0004, Session, SessionOptions, ADR-0004 (+10 more)

### Community 2 - "session.ts"
Cohesion: 0.06
Nodes (38): Affect, affectFor(), AffectInput, AffectMarker, matchedSentence(), NEUTRAL, sentences(), ADR-0002 (+30 more)

### Community 3 - "main.ts"
Cohesion: 0.17
Nodes (9): Mapper, objectNameTable(), edited(), options(), ROOT, ADR-0004, ADR-0005, WALKTHROUGHS (+1 more)

### Community 4 - "Turn"
Cohesion: 0.09
Nodes (32): AFFECT_MARKERS, drawFigure(), Figure, figureFor(), loadCast(), loadImage(), newCycle(), PoseCycle (+24 more)

### Community 5 - "serve.ts"
Cohesion: 0.22
Nodes (7): CONTENT_TYPES, PORT, REPO_ROOT, server, ADR-0002, WEB_ROOT, WORLD_ROOT

### Community 6 - "console-view.ts"
Cohesion: 0.09
Nodes (24): createDirector(), cellFor(), columnsFor(), LayoutOptions, layoutStrip(), StripLayout, ADR-0004, UNIT (+16 more)

### Community 7 - "MixTracker"
Cohesion: 0.33
Nodes (4): grid, PRESETS, SIZES, status

### Community 9 - "balloon.ts"
Cohesion: 0.16
Nodes (15): BalloonBox, bubbleTrail(), cloud(), drawBalloon(), greedyWrap(), measureBalloon(), roundedSpeech(), TailTarget (+7 more)

### Community 11 - "backdrop.ts"
Cohesion: 0.12
Nodes (18): backdropFor(), BackdropId, ROOM_BACKDROPS, ADR-0004, Cast, createSession(), here, roomIds (+10 more)

## Knowledge Gaps
- **101 isolated node(s):** `status`, `grid`, `PRESETS`, `SIZES`, `GUIDE_SCRIPT` (+96 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Turn` connect `inspector-view.ts` to `status.ts`, `session.ts`, `main.ts`, `console-view.ts`?**
  _High betweenness centrality (0.095) - this node is a cross-community bridge._
- **Why does `Panel` connect `session.ts` to `backdrop.ts`, `main.ts`, `Turn`, `console-view.ts`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Why does `Session` connect `status.ts` to `inspector-view.ts`, `backdrop.ts`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **What connects `status`, `grid`, `PRESETS` to the rest of the system?**
  _101 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `inspector-view.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06285714285714286 - nodes in this community are weakly interconnected._
- **Should `status.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0846774193548387 - nodes in this community are weakly interconnected._
- **Should `session.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.061224489795918366 - nodes in this community are weakly interconnected._