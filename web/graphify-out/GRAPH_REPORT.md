# Graph Report - web  (2026-07-23)

## Corpus Check
- 32 files · ~37,395 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 284 nodes · 505 edges · 12 communities
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.75)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6705e845`
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
- layout.ts
- balloon.ts
- inspector-view.ts
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
- `main()` --calls--> `createComicView()`  [EXTRACTED]
  web/src/main.ts → web/src/comic-view.ts
- `drawBalloons()` --calls--> `measureBalloon()`  [EXTRACTED]
  web/src/comic/render.ts → web/src/comic/balloon.ts
- `drawBalloons()` --calls--> `drawBalloon()`  [EXTRACTED]
  web/src/comic/render.ts → web/src/comic/balloon.ts
- `createDirector()` --calls--> `createMapper()`  [EXTRACTED]
  web/src/comic/director.ts → web/src/comic/mapper.ts
- `joinOnly()` --calls--> `figureFor()`  [EXTRACTED]
  web/test/figure.test.ts → web/src/comic/figure.ts

## Import Cycles
- None detected.

## Communities (12 total, 0 thin omitted)

### Community 0 - "inspector-view.ts"
Cohesion: 0.07
Nodes (26): ConsoleView, createConsoleView(), renderEvent(), required(), trimTrailingNewline(), ADR-0002, ADR-0004, createMixTracker() (+18 more)

### Community 1 - "status.ts"
Cohesion: 0.11
Nodes (13): SessionOptions, ADR-0004, createStatusTracker(), roomNameTable(), StatusTracker, ADR-0002, ADR-0004, ADR-0005 (+5 more)

### Community 2 - "session.ts"
Cohesion: 0.06
Nodes (41): sentences(), Director, DirectorOptions, ADR-0004, ADR-0005, BalloonClass, captionFor(), createMapper() (+33 more)

### Community 3 - "main.ts"
Cohesion: 0.13
Nodes (12): Affect, AFFECT_MARKERS, affectFor(), AffectInput, AffectMarker, matchedSentence(), NEUTRAL, ADR-0002 (+4 more)

### Community 4 - "Turn"
Cohesion: 0.10
Nodes (27): Cast, drawFigure(), Figure, figureFor(), newCycle(), PoseCycle, rotate(), ADR-0004 (+19 more)

### Community 5 - "serve.ts"
Cohesion: 0.22
Nodes (7): CONTENT_TYPES, PORT, REPO_ROOT, server, ADR-0002, WEB_ROOT, WORLD_ROOT

### Community 6 - "console-view.ts"
Cohesion: 0.11
Nodes (18): createDirector(), loadCast(), drawPortrait(), Portrait, portraitCrop(), ADR-0004, BEAT_SCRIPT, ComicView (+10 more)

### Community 7 - "MixTracker"
Cohesion: 0.33
Nodes (4): grid, PRESETS, SIZES, status

### Community 8 - "layout.ts"
Cohesion: 0.24
Nodes (10): ADR-0007, cellFor(), columnsFor(), LayoutOptions, layoutStrip(), StripLayout, ADR-0004, ADR-0007 (+2 more)

### Community 9 - "balloon.ts"
Cohesion: 0.13
Nodes (20): BalloonBox, bubbleTrail(), cloud(), drawBalloon(), goalWidth(), greedyWrap(), measureBalloon(), roundedSpeech() (+12 more)

### Community 10 - "inspector-view.ts"
Cohesion: 0.13
Nodes (14): ALL_EVENT_KINDS, describeEvent(), EventKind, EventMix, MixTracker, summarize(), ADR-0002, ADR-0004 (+6 more)

### Community 11 - "backdrop.ts"
Cohesion: 0.16
Nodes (14): backdropFor(), BackdropId, ROOM_BACKDROPS, ADR-0004, loadImage(), here, roomIds, world (+6 more)

## Knowledge Gaps
- **107 isolated node(s):** `status`, `grid`, `PRESETS`, `SIZES`, `GUIDE_SCRIPT` (+102 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Turn` connect `inspector-view.ts` to `status.ts`, `session.ts`, `inspector-view.ts`, `console-view.ts`?**
  _High betweenness centrality (0.095) - this node is a cross-community bridge._
- **Why does `Panel` connect `session.ts` to `backdrop.ts`, `Turn`, `console-view.ts`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Why does `Session` connect `inspector-view.ts` to `status.ts`, `session.ts`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **What connects `status`, `grid`, `PRESETS` to the rest of the system?**
  _107 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `inspector-view.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06976744186046512 - nodes in this community are weakly interconnected._
- **Should `status.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11255411255411256 - nodes in this community are weakly interconnected._
- **Should `session.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05878084179970972 - nodes in this community are weakly interconnected._