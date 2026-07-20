# Graph Report - web  (2026-07-20)

## Corpus Check
- 9 files · ~4,154 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 76 nodes · 120 edges · 8 communities (7 shown, 1 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.65)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `56da8c17`
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

## God Nodes (most connected - your core abstractions)
1. `main()` - 8 edges
2. `createSession()` - 8 edges
3. `Turn` - 7 edges
4. `Session` - 7 edges
5. `Status` - 6 edges
6. `ConsoleView` - 4 edges
7. `createConsoleView()` - 4 edges
8. `EventMix` - 4 edges
9. `MixTracker` - 4 edges
10. `describeEvent()` - 4 edges

## Surprising Connections (you probably didn't know these)
- `main()` --calls--> `createConsoleView()`  [EXTRACTED]
  src/main.ts → src/console-view.ts
- `main()` --calls--> `createInspectorView()`  [EXTRACTED]
  src/main.ts → src/inspector-view.ts
- `main()` --calls--> `createSession()`  [EXTRACTED]
  src/main.ts → src/session.ts
- `Session` --references--> `Status`  [EXTRACTED]
  src/session.ts → src/status.ts
- `createSession()` --calls--> `roomNameTable()`  [EXTRACTED]
  src/session.ts → src/status.ts

## Import Cycles
- None detected.

## Communities (8 total, 1 thin omitted)

### Community 0 - "inspector-view.ts"
Cohesion: 0.20
Nodes (11): ALL_EVENT_KINDS, describeEvent(), EventKind, summarize(), ADR-0002, ADR-0004, createInspectorView(), renderLast() (+3 more)

### Community 1 - "status.ts"
Cohesion: 0.18
Nodes (7): roomNameTable(), StatusTracker, ADR-0002, ADR-0004, names, ADR-0002, ADR-0004

### Community 2 - "session.ts"
Cohesion: 0.24
Nodes (7): createMixTracker(), createSession(), SessionOptions, ADR-0004, createStatusTracker(), ADR-0004, WORLD

### Community 3 - "main.ts"
Cohesion: 0.25
Nodes (6): fetchWorld(), main(), message(), requireEl(), ADR-0002, Session

### Community 4 - "Turn"
Cohesion: 0.25
Nodes (5): ConsoleView, EventMix, InspectorView, Turn, Status

### Community 5 - "serve.ts"
Cohesion: 0.22
Nodes (7): CONTENT_TYPES, PORT, REPO_ROOT, server, ADR-0002, WEB_ROOT, WORLD_ROOT

### Community 6 - "console-view.ts"
Cohesion: 0.38
Nodes (6): createConsoleView(), renderEvent(), required(), trimTrailingNewline(), ADR-0002, ADR-0004

## Knowledge Gaps
- **24 isolated node(s):** `ADR-0004`, `ADR-0002`, `EventKind`, `ADR-0004`, `ADR-0002` (+19 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Session` connect `main.ts` to `session.ts`, `Turn`?**
  _High betweenness centrality (0.078) - this node is a cross-community bridge._
- **Why does `Turn` connect `Turn` to `inspector-view.ts`, `session.ts`, `console-view.ts`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Why does `MixTracker` connect `MixTracker` to `inspector-view.ts`, `session.ts`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **What connects `ADR-0004`, `ADR-0002`, `EventKind` to the rest of the system?**
  _24 weakly-connected nodes found - possible documentation gaps or missing edges._