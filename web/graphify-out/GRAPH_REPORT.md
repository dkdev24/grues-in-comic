# Graph Report - web  (2026-07-28)

## Corpus Check
- 41 files · ~53,939 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 423 nodes · 846 edges · 16 communities
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.76)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `951d5759`
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

## God Nodes (most connected - your core abstractions)
1. `Turn` - 19 edges
2. `Panel` - 14 edges
3. `renderPanel()` - 13 edges
4. `createSession()` - 13 edges
5. `createPage()` - 12 edges
6. `addScript()` - 11 edges
7. `main()` - 11 edges
8. `canvasMetrics()` - 10 edges
9. `createComicView()` - 9 edges
10. `layoutBalloons()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `canvasMetrics()` --indirect_call--> `text()`  [INFERRED]
  src/comic/balloon-layout.ts → test/session.test.ts
- `loadCastFromDisk()` --calls--> `loadImage()`  [EXTRACTED]
  tools/render-panel.ts → src/comic/figure.ts
- `joinOnly()` --calls--> `figureFor()`  [EXTRACTED]
  test/figure.test.ts → src/comic/figure.ts
- `Shot` --references--> `Panel`  [EXTRACTED]
  test/mapper.test.ts → src/comic/mapper.ts
- `lineIn()` --calls--> `lineOf()`  [EXTRACTED]
  test/mapper.test.ts → src/comic/mapper.ts

## Import Cycles
- None detected.

## Communities (16 total, 0 thin omitted)

### Community 0 - "inspector-view.ts"
Cohesion: 0.12
Nodes (9): createMixTracker(), PersistedSession, PersistedTurn, rehydrate(), SessionStore, StorageFullError, ADR-0002, save (+1 more)

### Community 1 - "status.ts"
Cohesion: 0.21
Nodes (10): fetchWorld(), main(), message(), requireEl(), ADR-0002, ADR-0005, createSessionStore(), createSession() (+2 more)

### Community 2 - "session.ts"
Cohesion: 0.06
Nodes (44): Affect, affectFor(), AffectInput, AffectMarker, matchedSentence(), NEUTRAL, sentences(), ADR-0002 (+36 more)

### Community 3 - "main.ts"
Cohesion: 0.15
Nodes (11): Mapper, ConsoleView, createConsoleView(), renderEvent(), required(), trimTrailingNewline(), ADR-0002, ADR-0004 (+3 more)

### Community 4 - "Turn"
Cohesion: 0.05
Nodes (63): AFFECT_MARKERS, Cast, drawFigure(), Figure, figureFor(), loadCast(), loadImage(), newCycle() (+55 more)

### Community 5 - "serve.ts"
Cohesion: 0.22
Nodes (7): CONTENT_TYPES, PORT, REPO_ROOT, server, ADR-0002, WEB_ROOT, WORLD_ROOT

### Community 6 - "console-view.ts"
Cohesion: 0.10
Nodes (19): createDirector(), drawPortrait(), Portrait, portraitCrop(), ADR-0004, BEAT_SCRIPT, ComicView, createComicView() (+11 more)

### Community 7 - "MixTracker"
Cohesion: 0.33
Nodes (4): grid, PRESETS, SIZES, status

### Community 8 - "backdrop.ts"
Cohesion: 0.16
Nodes (15): backdropFor(), BackdropId, ROOM_BACKDROPS, ADR-0004, lineOf(), describe(), here, roomIds (+7 more)

### Community 9 - "balloon.ts"
Cohesion: 0.06
Nodes (46): BalloonBox, bubbleTrail(), chromeFor(), cloud(), drawBalloon(), goalWidth(), greedyWrap(), adjustRouteRgns() (+38 more)

### Community 10 - "inspector-view.ts"
Cohesion: 0.15
Nodes (13): ALL_EVENT_KINDS, describeEvent(), EventKind, EventMix, MixTracker, summarize(), ADR-0002, ADR-0004 (+5 more)

### Community 11 - "backdrop.ts"
Cohesion: 0.07
Nodes (33): Director, DirectorOptions, ADR-0004, ADR-0005, ADR-0008, BalloonClass, CameraPreset, MapperOptions (+25 more)

### Community 12 - "status.ts"
Cohesion: 0.14
Nodes (11): SessionOptions, ADR-0004, createStatusTracker(), roomNameTable(), StatusTracker, ADR-0002, ADR-0004, ADR-0005 (+3 more)

### Community 13 - "session.ts"
Cohesion: 0.50
Nodes (3): text(), ADR-0004, WORLD

### Community 14 - "fit.ts"
Cohesion: 0.11
Nodes (22): createFitTest(), stageSlots(), TextCanvas, ADR-0006, ADR-0007, cellFor(), columnsFor(), LayoutOptions (+14 more)

### Community 15 - "director.test.ts"
Cohesion: 0.20
Nodes (8): objectNameTable(), options(), ROOT, ADR-0004, ADR-0005, ADR-0008, WALKTHROUGHS, WORLD

## Knowledge Gaps
- **152 isolated node(s):** `status`, `grid`, `PRESETS`, `SIZES`, `GUIDE_SCRIPT` (+147 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Turn` connect `main.ts` to `inspector-view.ts`, `status.ts`, `session.ts`, `console-view.ts`, `inspector-view.ts`, `backdrop.ts`, `status.ts`?**
  _High betweenness centrality (0.085) - this node is a cross-community bridge._
- **Why does `Panel` connect `backdrop.ts` to `session.ts`, `Turn`, `console-view.ts`, `backdrop.ts`, `fit.ts`, `director.test.ts`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Why does `createPage()` connect `backdrop.ts` to `status.ts`, `session.ts`, `console-view.ts`, `backdrop.ts`, `fit.ts`, `director.test.ts`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **What connects `status`, `grid`, `PRESETS` to the rest of the system?**
  _152 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `inspector-view.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12280701754385964 - nodes in this community are weakly interconnected._
- **Should `session.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05587808417997097 - nodes in this community are weakly interconnected._
- **Should `Turn` be split into smaller, more focused modules?**
  _Cohesion score 0.051643192488262914 - nodes in this community are weakly interconnected._