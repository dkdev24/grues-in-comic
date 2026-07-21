# Graph Report - web  (2026-07-22)

## Corpus Check
- 29 files · ~28,935 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 244 nodes · 426 edges · 11 communities
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.7)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9fbc25d1`
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

## God Nodes (most connected - your core abstractions)
1. `Turn` - 18 edges
2. `main()` - 11 edges
3. `createSession()` - 11 edges
4. `createComicView()` - 8 edges
5. `renderPanel()` - 8 edges
6. `Panel` - 7 edges
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
- `createComicView()` --calls--> `createDirector()`  [EXTRACTED]
  src/comic-view.ts → src/comic/director.ts

## Import Cycles
- None detected.

## Communities (11 total, 0 thin omitted)

### Community 0 - "inspector-view.ts"
Cohesion: 0.12
Nodes (9): createMixTracker(), PersistedSession, PersistedTurn, rehydrate(), SessionStore, StorageFullError, ADR-0002, save (+1 more)

### Community 1 - "status.ts"
Cohesion: 0.12
Nodes (14): createSession(), SessionOptions, ADR-0004, createStatusTracker(), roomNameTable(), StatusTracker, ADR-0002, ADR-0004 (+6 more)

### Community 2 - "session.ts"
Cohesion: 0.06
Nodes (41): Affect, affectFor(), AffectInput, AffectMarker, matchedSentence(), NEUTRAL, sentences(), ADR-0002 (+33 more)

### Community 3 - "main.ts"
Cohesion: 0.10
Nodes (19): Mapper, ConsoleView, createConsoleView(), renderEvent(), required(), trimTrailingNewline(), ADR-0002, ADR-0004 (+11 more)

### Community 4 - "Turn"
Cohesion: 0.11
Nodes (26): AFFECT_MARKERS, BalloonBox, Cast, drawFigure(), Figure, figureFor(), loadCast(), loadImage() (+18 more)

### Community 5 - "serve.ts"
Cohesion: 0.22
Nodes (7): CONTENT_TYPES, PORT, REPO_ROOT, server, ADR-0002, WEB_ROOT, WORLD_ROOT

### Community 6 - "console-view.ts"
Cohesion: 0.09
Nodes (22): backdropFor(), BackdropId, ROOM_BACKDROPS, ADR-0004, drawPortrait(), Portrait, portraitCrop(), ADR-0004 (+14 more)

### Community 7 - "MixTracker"
Cohesion: 0.33
Nodes (4): grid, PRESETS, SIZES, status

### Community 8 - "backdrop.ts"
Cohesion: 0.15
Nodes (13): ALL_EVENT_KINDS, describeEvent(), EventKind, EventMix, MixTracker, summarize(), ADR-0002, ADR-0004 (+5 more)

### Community 9 - "balloon.ts"
Cohesion: 0.26
Nodes (12): bubbleTrail(), clampReach(), cloud(), drawBalloon(), greedyWrap(), measureBalloon(), roundedSpeech(), TailTarget (+4 more)

### Community 10 - "layout.ts"
Cohesion: 0.36
Nodes (7): cellFor(), columnsFor(), LayoutOptions, layoutStrip(), StripLayout, ADR-0004, UNIT

## Knowledge Gaps
- **83 isolated node(s):** `status`, `grid`, `PRESETS`, `SIZES`, `GUIDE_SCRIPT` (+78 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Turn` connect `main.ts` to `inspector-view.ts`, `status.ts`, `session.ts`, `console-view.ts`, `backdrop.ts`?**
  _High betweenness centrality (0.110) - this node is a cross-community bridge._
- **Why does `Session` connect `main.ts` to `status.ts`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **What connects `status`, `grid`, `PRESETS` to the rest of the system?**
  _83 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `inspector-view.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12280701754385964 - nodes in this community are weakly interconnected._
- **Should `status.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11857707509881422 - nodes in this community are weakly interconnected._
- **Should `session.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05660377358490566 - nodes in this community are weakly interconnected._
- **Should `main.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09885057471264368 - nodes in this community are weakly interconnected._