# Graph Report - web  (2026-07-28)

## Corpus Check
- 43 files · ~58,071 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 453 nodes · 933 edges · 11 communities
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 10 edges (avg confidence: 0.77)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f86e2148`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- session.ts
- Turn
- serve.ts
- console-view.ts
- MixTracker
- backdrop.ts
- balloon.ts
- inspector-view.ts
- status.ts
- session.ts
- fit.ts

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

## Communities (11 total, 0 thin omitted)

### Community 2 - "session.ts"
Cohesion: 0.08
Nodes (29): Affect, affectFor(), AffectInput, AffectMarker, matchedSentence(), NEUTRAL, sentences(), ADR-0002 (+21 more)

### Community 4 - "Turn"
Cohesion: 0.05
Nodes (63): AFFECT_MARKERS, drawFigure(), Figure, figureFor(), loadCast(), loadImage(), newCycle(), PoseCycle (+55 more)

### Community 5 - "serve.ts"
Cohesion: 0.22
Nodes (7): CONTENT_TYPES, PORT, REPO_ROOT, server, ADR-0002, WEB_ROOT, WORLD_ROOT

### Community 6 - "console-view.ts"
Cohesion: 0.09
Nodes (22): createDirector(), BeatExchange, BeatScript, drawPortrait(), Portrait, portraitCrop(), ADR-0004, BEAT_SCRIPT (+14 more)

### Community 7 - "MixTracker"
Cohesion: 0.33
Nodes (4): grid, PRESETS, SIZES, status

### Community 8 - "backdrop.ts"
Cohesion: 0.10
Nodes (25): Cast, createFitTest(), createPage(), PanelTrace, golden, ADR-0008, ACTUAL_DIR, ASSETS (+17 more)

### Community 9 - "balloon.ts"
Cohesion: 0.06
Nodes (45): BalloonBox, bubbleTrail(), chromeFor(), cloud(), drawBalloon(), goalWidth(), greedyWrap(), adjustRouteRgns() (+37 more)

### Community 10 - "inspector-view.ts"
Cohesion: 0.05
Nodes (42): ConsoleView, createConsoleView(), renderEvent(), required(), trimTrailingNewline(), ADR-0002, ADR-0004, ALL_EVENT_KINDS (+34 more)

### Community 12 - "status.ts"
Cohesion: 0.06
Nodes (39): backdropFor(), BackdropId, ROOM_BACKDROPS, ADR-0004, createMapper(), lineOf(), describe(), createSession() (+31 more)

### Community 13 - "session.ts"
Cohesion: 0.05
Nodes (47): Director, DirectorOptions, ADR-0004, ADR-0005, ADR-0008, Balloon, BalloonClass, CameraPreset (+39 more)

### Community 14 - "fit.ts"
Cohesion: 0.11
Nodes (21): BalloonInput, stageSlots(), TextCanvas, ADR-0006, ADR-0007, cellFor(), columnsFor(), LayoutOptions (+13 more)

## Knowledge Gaps
- **164 isolated node(s):** `status`, `grid`, `PRESETS`, `SIZES`, `GUIDE_SCRIPT` (+159 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Turn` connect `inspector-view.ts` to `session.ts`, `session.ts`, `console-view.ts`?**
  _High betweenness centrality (0.072) - this node is a cross-community bridge._
- **Why does `Panel` connect `session.ts` to `session.ts`, `Turn`, `console-view.ts`, `backdrop.ts`, `status.ts`, `fit.ts`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Why does `createPage()` connect `backdrop.ts` to `session.ts`, `console-view.ts`, `status.ts`, `session.ts`, `fit.ts`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **What connects `status`, `grid`, `PRESETS` to the rest of the system?**
  _164 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `session.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07899159663865546 - nodes in this community are weakly interconnected._
- **Should `Turn` be split into smaller, more focused modules?**
  _Cohesion score 0.051643192488262914 - nodes in this community are weakly interconnected._
- **Should `console-view.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09032258064516129 - nodes in this community are weakly interconnected._