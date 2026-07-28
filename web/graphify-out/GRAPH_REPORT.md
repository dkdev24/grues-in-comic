# Graph Report - web  (2026-07-28)

## Corpus Check
- 44 files · ~57,527 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 449 nodes · 927 edges · 21 communities (20 shown, 1 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 10 edges (avg confidence: 0.77)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b7e21a1d`
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
- status.ts
- session.ts
- fit.ts
- director.test.ts
- Session
- createPage
- Turn
- addScript
- SessionStore

## God Nodes (most connected - your core abstractions)
1. `Turn` - 19 edges
2. `Panel` - 16 edges
3. `renderPanel()` - 15 edges
4. `createSession()` - 15 edges
5. `createPage()` - 14 edges
6. `addScript()` - 13 edges
7. `main()` - 11 edges
8. `canvasMetrics()` - 10 edges
9. `createFitTest()` - 10 edges
10. `createMapper()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `canvasMetrics()` --indirect_call--> `text()`  [INFERRED]
  src/comic/balloon-layout.ts → test/session.test.ts
- `main()` --calls--> `backdropFor()`  [EXTRACTED]
  tools/render-panel.ts → src/comic/backdrop.ts
- `GateCase` --references--> `Cast`  [EXTRACTED]
  tools/gate.ts → src/comic/figure.ts
- `loadShippedCast()` --calls--> `loadImage()`  [EXTRACTED]
  tools/gate.ts → src/comic/figure.ts
- `joinOnly()` --calls--> `figureFor()`  [EXTRACTED]
  test/figure.test.ts → src/comic/figure.ts

## Import Cycles
- None detected.

## Communities (21 total, 1 thin omitted)

### Community 0 - "inspector-view.ts"
Cohesion: 0.25
Nodes (5): createMixTracker(), PersistedTurn, rehydrate(), StorageFullError, ADR-0002

### Community 1 - "status.ts"
Cohesion: 0.23
Nodes (9): ComicView, createComicView(), fetchWorld(), main(), message(), requireEl(), ADR-0002, ADR-0005 (+1 more)

### Community 2 - "session.ts"
Cohesion: 0.08
Nodes (31): Affect, affectFor(), AffectInput, AffectMarker, matchedSentence(), NEUTRAL, sentences(), ADR-0002 (+23 more)

### Community 3 - "main.ts"
Cohesion: 0.38
Nodes (6): createConsoleView(), renderEvent(), required(), trimTrailingNewline(), ADR-0002, ADR-0004

### Community 4 - "Turn"
Cohesion: 0.05
Nodes (60): AFFECT_MARKERS, Cast, drawFigure(), Figure, figureFor(), loadCast(), loadImage(), newCycle() (+52 more)

### Community 5 - "serve.ts"
Cohesion: 0.22
Nodes (7): CONTENT_TYPES, PORT, REPO_ROOT, server, ADR-0002, WEB_ROOT, WORLD_ROOT

### Community 6 - "console-view.ts"
Cohesion: 0.13
Nodes (16): drawPortrait(), Portrait, portraitCrop(), ADR-0004, BEAT_SCRIPT, drawCastBar(), frozen, GUIDE_SCRIPT (+8 more)

### Community 7 - "MixTracker"
Cohesion: 0.33
Nodes (4): grid, PRESETS, SIZES, status

### Community 8 - "backdrop.ts"
Cohesion: 0.09
Nodes (28): backdropFor(), BackdropId, ROOM_BACKDROPS, ADR-0004, PanelTrace, here, roomIds, world (+20 more)

### Community 9 - "balloon.ts"
Cohesion: 0.06
Nodes (49): BalloonBox, bubbleTrail(), chromeFor(), cloud(), drawBalloon(), goalWidth(), greedyWrap(), adjustRouteRgns() (+41 more)

### Community 10 - "inspector-view.ts"
Cohesion: 0.15
Nodes (13): ALL_EVENT_KINDS, describeEvent(), EventKind, EventMix, MixTracker, summarize(), ADR-0002, ADR-0004 (+5 more)

### Community 11 - "backdrop.ts"
Cohesion: 0.15
Nodes (11): CameraPreset, panelKind, TurnScript, MutablePanel, PageLine, PageOptions, PanelContext, ADR-0004 (+3 more)

### Community 12 - "status.ts"
Cohesion: 0.07
Nodes (31): createDirector(), createMapper(), createSession(), SessionOptions, ADR-0004, createStatusTracker(), objectNameTable(), roomNameTable() (+23 more)

### Community 13 - "session.ts"
Cohesion: 0.11
Nodes (16): Balloon, BalloonClass, GUIDE_EMOTION, GuideScript, KindInput, LadderInput, Line, Mapper (+8 more)

### Community 14 - "fit.ts"
Cohesion: 0.11
Nodes (23): BalloonInput, createFitTest(), stageSlots(), TextCanvas, ADR-0006, ADR-0007, cellFor(), columnsFor() (+15 more)

### Community 15 - "director.test.ts"
Cohesion: 0.21
Nodes (10): Director, DirectorOptions, ADR-0004, ADR-0005, ADR-0008, MapperOptions, Panel, FitTest (+2 more)

### Community 16 - "Session"
Cohesion: 0.20
Nodes (3): ConsoleView, Session, Status

### Community 17 - "createPage"
Cohesion: 0.28
Nodes (8): ALWAYS_FITS(), createPage(), CONTEXT, line(), ADR-0006, ADR-0007, ADR-0008, warmPage()

### Community 18 - "Turn"
Cohesion: 0.25
Nodes (5): InspectorView, PersistedSession, Turn, save, turns

### Community 19 - "addScript"
Cohesion: 0.33
Nodes (4): addScript(), mergeDelta(), Page, edited()

## Knowledge Gaps
- **162 isolated node(s):** `status`, `grid`, `PRESETS`, `SIZES`, `GUIDE_SCRIPT` (+157 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Turn` connect `Turn` to `inspector-view.ts`, `status.ts`, `session.ts`, `main.ts`, `console-view.ts`, `inspector-view.ts`, `status.ts`, `session.ts`, `director.test.ts`, `Session`, `SessionStore`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **Why does `Panel` connect `director.test.ts` to `session.ts`, `Turn`, `console-view.ts`, `backdrop.ts`, `backdrop.ts`, `status.ts`, `session.ts`, `fit.ts`, `addScript`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Why does `createPage()` connect `createPage` to `session.ts`, `backdrop.ts`, `backdrop.ts`, `status.ts`, `fit.ts`, `director.test.ts`, `addScript`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **What connects `status`, `grid`, `PRESETS` to the rest of the system?**
  _162 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `session.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07507507507507508 - nodes in this community are weakly interconnected._
- **Should `Turn` be split into smaller, more focused modules?**
  _Cohesion score 0.052429667519181586 - nodes in this community are weakly interconnected._
- **Should `console-view.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12554112554112554 - nodes in this community are weakly interconnected._