# Graph Report - web  (2026-07-28)

## Corpus Check
- 44 files · ~60,802 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 460 nodes · 945 edges · 18 communities (17 shown, 1 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 10 edges (avg confidence: 0.77)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2e4c0436`
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
- SessionStore
- session.test.ts

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
- `gateCases()` --calls--> `backdropFor()`  [EXTRACTED]
  tools/gate.ts → src/comic/backdrop.ts
- `loadShippedCast()` --calls--> `loadImage()`  [EXTRACTED]
  tools/gate.ts → src/comic/figure.ts
- `loadCastFromDisk()` --calls--> `loadImage()`  [EXTRACTED]
  tools/render-panel.ts → src/comic/figure.ts
- `joinOnly()` --calls--> `figureFor()`  [EXTRACTED]
  test/figure.test.ts → src/comic/figure.ts

## Import Cycles
- None detected.

## Communities (18 total, 1 thin omitted)

### Community 0 - "main.ts"
Cohesion: 0.22
Nodes (9): fetchWorld(), main(), message(), requireEl(), ADR-0002, ADR-0005, createSessionStore(), createSession() (+1 more)

### Community 1 - "persistence.ts"
Cohesion: 0.16
Nodes (8): createMixTracker(), PersistedSession, PersistedTurn, rehydrate(), StorageFullError, ADR-0002, save, turns

### Community 2 - "session.ts"
Cohesion: 0.08
Nodes (29): Affect, affectFor(), AffectInput, AffectMarker, matchedSentence(), NEUTRAL, sentences(), ADR-0002 (+21 more)

### Community 3 - "Turn"
Cohesion: 0.09
Nodes (26): backdropFor(), BackdropId, ROOM_BACKDROPS, ADR-0004, createDirector(), createMapper(), createPage(), objectNameTable() (+18 more)

### Community 4 - "Turn"
Cohesion: 0.05
Nodes (61): AFFECT_MARKERS, drawFigure(), Figure, figureFor(), loadImage(), newCycle(), PoseCycle, rotate() (+53 more)

### Community 5 - "serve.ts"
Cohesion: 0.22
Nodes (7): CONTENT_TYPES, PORT, REPO_ROOT, server, ADR-0002, WEB_ROOT, WORLD_ROOT

### Community 6 - "console-view.ts"
Cohesion: 0.08
Nodes (28): loadCast(), BeatEntry, BeatScript, lineOf(), drawPortrait(), Portrait, portraitCrop(), ADR-0004 (+20 more)

### Community 7 - "MixTracker"
Cohesion: 0.33
Nodes (4): grid, PRESETS, SIZES, status

### Community 8 - "backdrop.ts"
Cohesion: 0.11
Nodes (24): Cast, PanelTrace, golden, ADR-0008, ACTUAL_DIR, ASSETS, fittedPage(), GateCase (+16 more)

### Community 9 - "balloon.ts"
Cohesion: 0.07
Nodes (34): BalloonBox, adjustRouteRgns(), BalloonInput, BalloonMetrics, forceFitBalloon(), getCloudEstimate(), getInterveningBBox(), LaidBalloon (+26 more)

### Community 10 - "inspector-view.ts"
Cohesion: 0.15
Nodes (13): ALL_EVENT_KINDS, describeEvent(), EventKind, EventMix, MixTracker, summarize(), ADR-0002, ADR-0004 (+5 more)

### Community 11 - "console-view.ts"
Cohesion: 0.15
Nodes (11): Mapper, ConsoleView, createConsoleView(), renderEvent(), required(), trimTrailingNewline(), ADR-0002, ADR-0004 (+3 more)

### Community 12 - "status.ts"
Cohesion: 0.14
Nodes (11): SessionOptions, ADR-0004, createStatusTracker(), roomNameTable(), StatusTracker, ADR-0002, ADR-0004, ADR-0005 (+3 more)

### Community 13 - "session.ts"
Cohesion: 0.05
Nodes (46): Director, DirectorOptions, ADR-0004, ADR-0005, ADR-0008, Balloon, BalloonClass, BeatExchange (+38 more)

### Community 14 - "fit.ts"
Cohesion: 0.27
Nodes (9): cellFor(), columnsFor(), LayoutOptions, layoutStrip(), StripLayout, ADR-0004, ADR-0007, UNIT (+1 more)

### Community 15 - "MixTracker"
Cohesion: 0.12
Nodes (25): bubbleTrail(), chromeFor(), cloud(), drawBalloon(), goalWidth(), greedyWrap(), canvasMetrics(), measureAtWidth() (+17 more)

### Community 17 - "session.test.ts"
Cohesion: 0.50
Nodes (3): text(), ADR-0004, WORLD

## Knowledge Gaps
- **167 isolated node(s):** `status`, `grid`, `PRESETS`, `SIZES`, `GUIDE_SCRIPT` (+162 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Turn` connect `console-view.ts` to `main.ts`, `persistence.ts`, `session.ts`, `console-view.ts`, `inspector-view.ts`, `status.ts`, `session.ts`, `SessionStore`?**
  _High betweenness centrality (0.071) - this node is a cross-community bridge._
- **Why does `Panel` connect `session.ts` to `session.ts`, `Turn`, `Turn`, `console-view.ts`, `backdrop.ts`, `balloon.ts`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Why does `createPage()` connect `Turn` to `backdrop.ts`, `balloon.ts`, `session.ts`, `session.ts`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **What connects `status`, `grid`, `PRESETS` to the rest of the system?**
  _167 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `session.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07899159663865546 - nodes in this community are weakly interconnected._
- **Should `Turn` be split into smaller, more focused modules?**
  _Cohesion score 0.09475806451612903 - nodes in this community are weakly interconnected._
- **Should `Turn` be split into smaller, more focused modules?**
  _Cohesion score 0.0525879917184265 - nodes in this community are weakly interconnected._