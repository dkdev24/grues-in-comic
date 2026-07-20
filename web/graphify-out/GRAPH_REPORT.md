# Graph Report - web  (2026-07-21)

## Corpus Check
- 22 files · ~20,819 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 197 nodes · 339 edges · 9 communities
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.7)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6cc30e22`
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

## God Nodes (most connected - your core abstractions)
1. `Turn` - 16 edges
2. `main()` - 10 edges
3. `createSession()` - 10 edges
4. `renderPanel()` - 8 edges
5. `createComicView()` - 7 edges
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

## Communities (9 total, 0 thin omitted)

### Community 0 - "inspector-view.ts"
Cohesion: 0.07
Nodes (26): ALL_EVENT_KINDS, createMixTracker(), describeEvent(), EventKind, EventMix, MixTracker, summarize(), ADR-0002 (+18 more)

### Community 1 - "status.ts"
Cohesion: 0.18
Nodes (8): createStatusTracker(), roomNameTable(), StatusTracker, ADR-0002, ADR-0004, names, ADR-0002, ADR-0004

### Community 2 - "session.ts"
Cohesion: 0.08
Nodes (27): Affect, affectFor(), AffectInput, AffectMarker, matchedSentence(), NEUTRAL, sentences(), ADR-0002 (+19 more)

### Community 3 - "main.ts"
Cohesion: 0.10
Nodes (18): ConsoleView, createConsoleView(), renderEvent(), required(), trimTrailingNewline(), ADR-0002, ADR-0004, fetchWorld() (+10 more)

### Community 4 - "Turn"
Cohesion: 0.11
Nodes (25): AFFECT_MARKERS, BalloonBox, Cast, drawFigure(), Figure, figureFor(), loadCast(), loadImage() (+17 more)

### Community 5 - "serve.ts"
Cohesion: 0.22
Nodes (7): CONTENT_TYPES, PORT, REPO_ROOT, server, ADR-0002, WEB_ROOT, WORLD_ROOT

### Community 6 - "console-view.ts"
Cohesion: 0.16
Nodes (9): createMapper(), Mapper, ComicView, createComicView(), frozen, GUIDE_SCRIPT, PANEL, requireChild() (+1 more)

### Community 7 - "MixTracker"
Cohesion: 0.26
Nodes (12): bubbleTrail(), clampReach(), cloud(), drawBalloon(), greedyWrap(), measureBalloon(), roundedSpeech(), TailTarget (+4 more)

### Community 8 - "backdrop.ts"
Cohesion: 0.24
Nodes (8): backdropFor(), BackdropId, OUTDOOR_BACKDROPS, OUTDOORS, ADR-0004, here, roomIds, world

## Knowledge Gaps
- **64 isolated node(s):** `PANEL`, `GUIDE_SCRIPT`, `frozen`, `ADR-0004`, `AffectInput` (+59 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Turn` connect `inspector-view.ts` to `session.ts`, `main.ts`, `console-view.ts`?**
  _High betweenness centrality (0.129) - this node is a cross-community bridge._
- **Why does `Session` connect `main.ts` to `inspector-view.ts`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Why does `backdropFor()` connect `backdrop.ts` to `console-view.ts`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **What connects `PANEL`, `GUIDE_SCRIPT`, `frozen` to the rest of the system?**
  _64 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `inspector-view.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06976744186046512 - nodes in this community are weakly interconnected._
- **Should `session.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07899159663865546 - nodes in this community are weakly interconnected._
- **Should `main.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10098522167487685 - nodes in this community are weakly interconnected._