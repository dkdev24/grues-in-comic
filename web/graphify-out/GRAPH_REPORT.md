# Graph Report - web  (2026-07-27)

## Corpus Check
- 37 files · ~47,092 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 369 nodes · 713 edges · 14 communities
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 9 edges (avg confidence: 0.77)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ff310898`
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

## God Nodes (most connected - your core abstractions)
1. `Turn` - 19 edges
2. `Panel` - 13 edges
3. `renderPanel()` - 13 edges
4. `createSession()` - 13 edges
5. `addScript()` - 12 edges
6. `createPage()` - 11 edges
7. `main()` - 11 edges
8. `createComicView()` - 8 edges
9. `drawBalloon()` - 8 edges
10. `figureFor()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `addScript()` --indirect_call--> `line()`  [INFERRED]
  src/comic/page.ts → test/page.test.ts
- `options()` --calls--> `objectNameTable()`  [EXTRACTED]
  test/director.test.ts → src/status.ts
- `measureBalloon()` --indirect_call--> `line()`  [INFERRED]
  src/comic/balloon.ts → test/page.test.ts
- `drawBalloon()` --indirect_call--> `line()`  [INFERRED]
  src/comic/balloon.ts → test/page.test.ts
- `loadFixtureCast()` --calls--> `loadImage()`  [EXTRACTED]
  tools/cast-fixture.ts → src/comic/figure.ts

## Import Cycles
- None detected.

## Communities (14 total, 0 thin omitted)

### Community 0 - "inspector-view.ts"
Cohesion: 0.12
Nodes (9): createMixTracker(), PersistedSession, PersistedTurn, rehydrate(), SessionStore, StorageFullError, ADR-0002, save (+1 more)

### Community 1 - "status.ts"
Cohesion: 0.21
Nodes (11): fetchWorld(), main(), message(), requireEl(), ADR-0002, ADR-0005, createSessionStore(), createSession() (+3 more)

### Community 2 - "session.ts"
Cohesion: 0.05
Nodes (45): Affect, affectFor(), AffectInput, AffectMarker, matchedSentence(), NEUTRAL, sentences(), ADR-0002 (+37 more)

### Community 3 - "main.ts"
Cohesion: 0.18
Nodes (10): ConsoleView, createConsoleView(), renderEvent(), required(), trimTrailingNewline(), ADR-0002, ADR-0004, InspectorView (+2 more)

### Community 4 - "Turn"
Cohesion: 0.05
Nodes (60): AFFECT_MARKERS, Cast, drawFigure(), Figure, figureFor(), newCycle(), PoseCycle, rotate() (+52 more)

### Community 5 - "serve.ts"
Cohesion: 0.22
Nodes (7): CONTENT_TYPES, PORT, REPO_ROOT, server, ADR-0002, WEB_ROOT, WORLD_ROOT

### Community 6 - "console-view.ts"
Cohesion: 0.08
Nodes (28): createDirector(), loadCast(), cellFor(), columnsFor(), LayoutOptions, layoutStrip(), StripLayout, ADR-0004 (+20 more)

### Community 7 - "MixTracker"
Cohesion: 0.33
Nodes (4): grid, PRESETS, SIZES, status

### Community 8 - "backdrop.ts"
Cohesion: 0.15
Nodes (16): backdropFor(), BackdropId, ROOM_BACKDROPS, ADR-0004, loadImage(), lineOf(), describe(), here (+8 more)

### Community 9 - "balloon.ts"
Cohesion: 0.11
Nodes (23): BalloonBox, bubbleTrail(), cloud(), drawBalloon(), goalWidth(), greedyWrap(), measureBalloon(), Pt (+15 more)

### Community 10 - "inspector-view.ts"
Cohesion: 0.19
Nodes (12): ALL_EVENT_KINDS, describeEvent(), EventKind, EventMix, summarize(), ADR-0002, ADR-0004, createInspectorView() (+4 more)

### Community 11 - "backdrop.ts"
Cohesion: 0.06
Nodes (39): Director, DirectorOptions, ADR-0004, ADR-0005, ADR-0008, BalloonClass, CameraPreset, MapperOptions (+31 more)

### Community 12 - "status.ts"
Cohesion: 0.16
Nodes (9): createStatusTracker(), roomNameTable(), StatusTracker, ADR-0002, ADR-0004, ADR-0005, names, ADR-0002 (+1 more)

### Community 13 - "session.ts"
Cohesion: 0.18
Nodes (5): MixTracker, SessionOptions, ADR-0004, ADR-0004, WORLD

## Knowledge Gaps
- **137 isolated node(s):** `status`, `grid`, `PRESETS`, `SIZES`, `GUIDE_SCRIPT` (+132 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Turn` connect `main.ts` to `inspector-view.ts`, `status.ts`, `session.ts`, `console-view.ts`, `inspector-view.ts`, `backdrop.ts`, `session.ts`?**
  _High betweenness centrality (0.093) - this node is a cross-community bridge._
- **Why does `Panel` connect `backdrop.ts` to `backdrop.ts`, `session.ts`, `Turn`, `console-view.ts`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Why does `Session` connect `status.ts` to `main.ts`, `session.ts`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **What connects `status`, `grid`, `PRESETS` to the rest of the system?**
  _137 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `inspector-view.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12280701754385964 - nodes in this community are weakly interconnected._
- **Should `session.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0531986531986532 - nodes in this community are weakly interconnected._
- **Should `Turn` be split into smaller, more focused modules?**
  _Cohesion score 0.05456095481670929 - nodes in this community are weakly interconnected._