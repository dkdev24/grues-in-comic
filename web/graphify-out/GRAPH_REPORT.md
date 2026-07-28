# Graph Report - web  (2026-07-28)

## Corpus Check
- 44 files · ~58,764 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 458 nodes · 943 edges · 16 communities (15 shown, 1 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 10 edges (avg confidence: 0.77)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0879ac77`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- main.ts
- persistence.ts
- session.ts
- Turn
- Turn
- serve.ts
- console-view.ts
- MixTracker
- backdrop.ts
- balloon.ts
- inspector-view.ts
- console-view.ts
- status.ts
- session.ts
- fit.ts
- MixTracker

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
- `options()` --calls--> `objectNameTable()`  [EXTRACTED]
  test/director.test.ts → src/status.ts
- `main()` --calls--> `backdropFor()`  [EXTRACTED]
  tools/render-panel.ts → src/comic/backdrop.ts
- `loadFixtureCast()` --calls--> `loadImage()`  [EXTRACTED]
  tools/cast-fixture.ts → src/comic/figure.ts
- `loadCastFromDisk()` --calls--> `loadImage()`  [EXTRACTED]
  tools/render-panel.ts → src/comic/figure.ts

## Import Cycles
- None detected.

## Communities (16 total, 1 thin omitted)

### Community 0 - "main.ts"
Cohesion: 0.21
Nodes (10): ComicView, createComicView(), requireChild(), fetchWorld(), main(), message(), requireEl(), ADR-0002 (+2 more)

### Community 1 - "persistence.ts"
Cohesion: 0.17
Nodes (6): createMixTracker(), PersistedTurn, rehydrate(), SessionStore, StorageFullError, ADR-0002

### Community 2 - "session.ts"
Cohesion: 0.06
Nodes (41): Affect, affectFor(), AffectInput, AffectMarker, matchedSentence(), NEUTRAL, sentences(), ADR-0002 (+33 more)

### Community 3 - "Turn"
Cohesion: 0.20
Nodes (6): Mapper, InspectorView, PersistedSession, Turn, save, turns

### Community 4 - "Turn"
Cohesion: 0.05
Nodes (60): AFFECT_MARKERS, drawFigure(), Figure, figureFor(), newCycle(), PoseCycle, rotate(), ADR-0004 (+52 more)

### Community 5 - "serve.ts"
Cohesion: 0.22
Nodes (7): CONTENT_TYPES, PORT, REPO_ROOT, server, ADR-0002, WEB_ROOT, WORLD_ROOT

### Community 6 - "console-view.ts"
Cohesion: 0.09
Nodes (23): BeatExchange, BeatScript, drawPortrait(), Portrait, portraitCrop(), ADR-0004, BEAT_SCRIPT, CAST_LABELS (+15 more)

### Community 7 - "MixTracker"
Cohesion: 0.33
Nodes (4): grid, PRESETS, SIZES, status

### Community 8 - "backdrop.ts"
Cohesion: 0.08
Nodes (32): backdropFor(), BackdropId, ROOM_BACKDROPS, ADR-0004, Cast, loadCast(), loadImage(), PanelTrace (+24 more)

### Community 9 - "balloon.ts"
Cohesion: 0.06
Nodes (45): BalloonBox, bubbleTrail(), chromeFor(), cloud(), drawBalloon(), goalWidth(), greedyWrap(), adjustRouteRgns() (+37 more)

### Community 10 - "inspector-view.ts"
Cohesion: 0.19
Nodes (12): ALL_EVENT_KINDS, describeEvent(), EventKind, EventMix, summarize(), ADR-0002, ADR-0004, createInspectorView() (+4 more)

### Community 11 - "console-view.ts"
Cohesion: 0.22
Nodes (7): ConsoleView, createConsoleView(), renderEvent(), required(), trimTrailingNewline(), ADR-0002, ADR-0004

### Community 12 - "status.ts"
Cohesion: 0.08
Nodes (27): lineOf(), createSession(), Session, SessionOptions, ADR-0004, createStatusTracker(), objectNameTable(), roomNameTable() (+19 more)

### Community 13 - "session.ts"
Cohesion: 0.06
Nodes (44): createDirector(), Director, DirectorOptions, ADR-0004, ADR-0005, ADR-0008, BalloonClass, CameraPreset (+36 more)

### Community 14 - "fit.ts"
Cohesion: 0.11
Nodes (23): BalloonInput, createFitTest(), stageSlots(), TextCanvas, ADR-0006, ADR-0007, cellFor(), columnsFor() (+15 more)

## Knowledge Gaps
- **166 isolated node(s):** `status`, `grid`, `PRESETS`, `SIZES`, `GUIDE_SCRIPT` (+161 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Turn` connect `Turn` to `main.ts`, `persistence.ts`, `session.ts`, `console-view.ts`, `inspector-view.ts`, `console-view.ts`, `status.ts`, `session.ts`?**
  _High betweenness centrality (0.071) - this node is a cross-community bridge._
- **Why does `Panel` connect `session.ts` to `session.ts`, `Turn`, `console-view.ts`, `backdrop.ts`, `status.ts`, `fit.ts`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Why does `createPage()` connect `session.ts` to `backdrop.ts`, `session.ts`, `status.ts`, `fit.ts`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **What connects `status`, `grid`, `PRESETS` to the rest of the system?**
  _166 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `session.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05714285714285714 - nodes in this community are weakly interconnected._
- **Should `Turn` be split into smaller, more focused modules?**
  _Cohesion score 0.05328218243819267 - nodes in this community are weakly interconnected._
- **Should `console-view.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09425287356321839 - nodes in this community are weakly interconnected._