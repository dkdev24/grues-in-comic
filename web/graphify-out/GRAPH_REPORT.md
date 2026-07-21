# Graph Report - web  (2026-07-22)

## Corpus Check
- 29 files · ~31,250 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 253 nodes · 440 edges · 12 communities
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.73)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `59aafc6f`
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
- layout.ts
- backdrop.ts

## God Nodes (most connected - your core abstractions)
1. `Turn` - 18 edges
2. `main()` - 11 edges
3. `createSession()` - 11 edges
4. `Panel` - 9 edges
5. `createComicView()` - 8 edges
6. `renderPanel()` - 8 edges
7. `Session` - 7 edges
8. `replayPanels()` - 7 edges
9. `drawBalloon()` - 6 edges
10. `figureFor()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `joinOnly()` --calls--> `figureFor()`  [EXTRACTED]
  test/figure.test.ts → src/comic/figure.ts
- `replayPanels()` --calls--> `createSession()`  [EXTRACTED]
  test/mapper.test.ts → src/session.ts
- `options()` --calls--> `objectNameTable()`  [EXTRACTED]
  test/director.test.ts → src/status.ts
- `replayPanels()` --calls--> `createMapper()`  [EXTRACTED]
  test/mapper.test.ts → src/comic/mapper.ts
- `createComicView()` --calls--> `loadCast()`  [EXTRACTED]
  src/comic-view.ts → src/comic/figure.ts

## Import Cycles
- None detected.

## Communities (12 total, 0 thin omitted)

### Community 0 - "inspector-view.ts"
Cohesion: 0.13
Nodes (10): createMixTracker(), PersistedSession, PersistedTurn, rehydrate(), SessionStore, StorageFullError, ADR-0002, Turn (+2 more)

### Community 1 - "status.ts"
Cohesion: 0.07
Nodes (30): ConsoleView, createConsoleView(), renderEvent(), required(), trimTrailingNewline(), ADR-0002, ADR-0004, fetchWorld() (+22 more)

### Community 2 - "session.ts"
Cohesion: 0.08
Nodes (30): Affect, affectFor(), AffectInput, AffectMarker, matchedSentence(), NEUTRAL, sentences(), ADR-0002 (+22 more)

### Community 3 - "main.ts"
Cohesion: 0.11
Nodes (15): Director, DirectorOptions, ADR-0004, ADR-0005, Mapper, MapperOptions, Panel, objectNameTable() (+7 more)

### Community 4 - "Turn"
Cohesion: 0.10
Nodes (28): AFFECT_MARKERS, BalloonBox, Cast, drawFigure(), Figure, figureFor(), loadCast(), loadImage() (+20 more)

### Community 5 - "serve.ts"
Cohesion: 0.22
Nodes (7): CONTENT_TYPES, PORT, REPO_ROOT, server, ADR-0002, WEB_ROOT, WORLD_ROOT

### Community 6 - "console-view.ts"
Cohesion: 0.11
Nodes (17): createDirector(), drawPortrait(), Portrait, portraitCrop(), ADR-0004, BEAT_SCRIPT, ComicView, createComicView() (+9 more)

### Community 7 - "MixTracker"
Cohesion: 0.33
Nodes (4): grid, PRESETS, SIZES, status

### Community 8 - "backdrop.ts"
Cohesion: 0.13
Nodes (14): ALL_EVENT_KINDS, describeEvent(), EventKind, EventMix, MixTracker, summarize(), ADR-0002, ADR-0004 (+6 more)

### Community 9 - "balloon.ts"
Cohesion: 0.26
Nodes (12): bubbleTrail(), clampReach(), cloud(), drawBalloon(), greedyWrap(), measureBalloon(), roundedSpeech(), TailTarget (+4 more)

### Community 10 - "layout.ts"
Cohesion: 0.36
Nodes (7): cellFor(), columnsFor(), LayoutOptions, layoutStrip(), StripLayout, ADR-0004, UNIT

### Community 11 - "backdrop.ts"
Cohesion: 0.31
Nodes (7): backdropFor(), BackdropId, ROOM_BACKDROPS, ADR-0004, here, roomIds, world

## Knowledge Gaps
- **88 isolated node(s):** `status`, `grid`, `PRESETS`, `SIZES`, `GUIDE_SCRIPT` (+83 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Turn` connect `inspector-view.ts` to `status.ts`, `session.ts`, `main.ts`, `console-view.ts`, `backdrop.ts`?**
  _High betweenness centrality (0.107) - this node is a cross-community bridge._
- **Why does `Panel` connect `main.ts` to `session.ts`, `Turn`, `console-view.ts`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **What connects `status`, `grid`, `PRESETS` to the rest of the system?**
  _88 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `inspector-view.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.13157894736842105 - nodes in this community are weakly interconnected._
- **Should `status.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06648936170212766 - nodes in this community are weakly interconnected._
- **Should `session.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07681365576102418 - nodes in this community are weakly interconnected._
- **Should `main.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11255411255411256 - nodes in this community are weakly interconnected._