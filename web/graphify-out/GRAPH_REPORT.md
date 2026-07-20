# Graph Report - web  (2026-07-21)

## Corpus Check
- 26 files · ~26,703 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 217 nodes · 374 edges · 11 communities
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.7)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `762a2853`
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
- Turn
- layout.ts

## God Nodes (most connected - your core abstractions)
1. `Turn` - 16 edges
2. `main()` - 10 edges
3. `createSession()` - 10 edges
4. `createComicView()` - 8 edges
5. `renderPanel()` - 8 edges
6. `Session` - 7 edges
7. `drawBalloon()` - 6 edges
8. `figureFor()` - 6 edges
9. `Status` - 6 edges
10. `replayPanels()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `joinOnly()` --calls--> `figureFor()`  [EXTRACTED]
  test/figure.test.ts → src/comic/figure.ts
- `replayPanels()` --calls--> `createMapper()`  [EXTRACTED]
  test/mapper.test.ts → src/comic/mapper.ts
- `replayPanels()` --calls--> `createSession()`  [EXTRACTED]
  test/mapper.test.ts → src/session.ts
- `createComicView()` --calls--> `loadCast()`  [EXTRACTED]
  src/comic-view.ts → src/comic/figure.ts
- `main()` --calls--> `createComicView()`  [EXTRACTED]
  src/main.ts → src/comic-view.ts

## Import Cycles
- None detected.

## Communities (11 total, 0 thin omitted)

### Community 0 - "inspector-view.ts"
Cohesion: 0.13
Nodes (14): ALL_EVENT_KINDS, describeEvent(), EventKind, EventMix, MixTracker, summarize(), ADR-0002, ADR-0004 (+6 more)

### Community 1 - "status.ts"
Cohesion: 0.12
Nodes (12): SessionOptions, ADR-0004, createStatusTracker(), roomNameTable(), StatusTracker, ADR-0002, ADR-0004, ADR-0004 (+4 more)

### Community 2 - "session.ts"
Cohesion: 0.08
Nodes (27): Affect, affectFor(), AffectInput, AffectMarker, matchedSentence(), NEUTRAL, sentences(), ADR-0002 (+19 more)

### Community 3 - "main.ts"
Cohesion: 0.09
Nodes (17): createMixTracker(), fetchWorld(), main(), message(), requireEl(), ADR-0002, createSessionStore(), PersistedSession (+9 more)

### Community 4 - "Turn"
Cohesion: 0.11
Nodes (26): AFFECT_MARKERS, BalloonBox, Cast, drawFigure(), Figure, figureFor(), loadCast(), loadImage() (+18 more)

### Community 5 - "serve.ts"
Cohesion: 0.22
Nodes (7): CONTENT_TYPES, PORT, REPO_ROOT, server, ADR-0002, WEB_ROOT, WORLD_ROOT

### Community 6 - "console-view.ts"
Cohesion: 0.13
Nodes (15): createMapper(), drawPortrait(), Portrait, portraitCrop(), ADR-0004, ComicView, createComicView(), drawCastBar() (+7 more)

### Community 7 - "MixTracker"
Cohesion: 0.29
Nodes (11): bubbleTrail(), clampReach(), cloud(), drawBalloon(), greedyWrap(), measureBalloon(), roundedSpeech(), TailTarget (+3 more)

### Community 8 - "backdrop.ts"
Cohesion: 0.24
Nodes (8): backdropFor(), BackdropId, OUTDOOR_BACKDROPS, OUTDOORS, ADR-0004, here, roomIds, world

### Community 9 - "Turn"
Cohesion: 0.18
Nodes (10): Mapper, ConsoleView, createConsoleView(), renderEvent(), required(), trimTrailingNewline(), ADR-0002, ADR-0004 (+2 more)

### Community 10 - "layout.ts"
Cohesion: 0.36
Nodes (7): cellFor(), columnsFor(), LayoutOptions, layoutStrip(), StripLayout, ADR-0004, UNIT

## Knowledge Gaps
- **70 isolated node(s):** `GUIDE_SCRIPT`, `frozen`, `ADR-0004`, `AffectInput`, `Affect` (+65 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Turn` connect `Turn` to `inspector-view.ts`, `status.ts`, `session.ts`, `main.ts`, `console-view.ts`?**
  _High betweenness centrality (0.121) - this node is a cross-community bridge._
- **Why does `Session` connect `main.ts` to `status.ts`, `Turn`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `backdropFor()` connect `backdrop.ts` to `console-view.ts`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **What connects `GUIDE_SCRIPT`, `frozen`, `ADR-0004` to the rest of the system?**
  _70 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `inspector-view.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.13157894736842105 - nodes in this community are weakly interconnected._
- **Should `status.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11904761904761904 - nodes in this community are weakly interconnected._
- **Should `session.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07899159663865546 - nodes in this community are weakly interconnected._