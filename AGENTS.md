# AGENTS.md

Workflow rules for AI agents contributing to this repository. Loaded every session — kept short on
purpose. Anything that is reference rather than rule lives in the documents named below.

## What this project is

**Grues in Comic** modernizes two historical Microsoft open-source projects (Zork I ZIL, MS Comic
Chat) into a browser-native comic adventure engine. It is **not** a source port and does **not**
recreate the historical runtime. The method is: understand the original → extract its semantics →
represent them in the **Intermediate Representation** → execute the IR in the engine.

The IR is the central abstraction and stays independent of ZIL, browser APIs, WebAssembly and
rendering technology. Game logic never becomes browser-specific.

## System documents

| Document | When | Rule |
|---|---|---|
| `HANDOFF.md` | **Read in full at session start; update at session end.** | Current state, next actions, live decisions — nothing else. Replace Last Session (moving the outgoing one to `WORKLOG.md` first); never stack "Prior Session" entries. **Revise stale claims rather than appending around them. Hard cap: 100 lines** — if a session's update would cross it, cut narrative (compress Project Status to one clause per closed milestone, point at `WORKLOG.md`) before cutting facts. |
| `WORKLOG.md` | Do not load at session start. | Persistent history, newest first, **one entry per version, never edited.** Add one when a version milestone is reached. |
| `docs/DEVELOPMENT_PLAN.md` | Read when choosing work. | Milestones, stages, gates. **The authority on what to do next.** Mark stages done here as they finish. |
| `docs/PITFALLS.md` | **Read the section for the subsystem you are about to change.** | Durable cautions, by subsystem. Each entry was paid for by a bug or a wrong released build. New long-lived rules go here, not into `HANDOFF.md`. |
| `docs/FUTURE_WORK.md` | Read when deferring something, or when the user defines an iteration. | The deferred backlog. **Not a work queue** — nothing in it is scheduled until the user names it. Every entry records *why* it was deferred. |
| `docs/adr/` | Read before changing what one governs. | Binding decisions. Amend the ADR, never a discussion document. |

**Versioning:** `0.x.y` while pre-public — patch for small changes, minor for new subsystems.
**`1.0.0` is reserved for public launch** (repo goes public + website ships). Do not bump into `1.x`
before then.

## Workflow

For any substantial task: read `HANDOFF.md` → read the relevant `docs/` and `wiki/` → query the
knowledge graph if structure matters → implement incrementally → update the docs that the change
makes stale → run `graphify update .` if structure moved → update `HANDOFF.md`, and `WORKLOG.md` if a
version milestone was reached.

Prefer incremental, modular, platform-independent changes that preserve behavior. Avoid unnecessary
rewrites, browser-specific game logic, undocumented architectural changes, and formatting-only
commits.

## Knowledge separation

Structural knowledge is **Graphify** (per-module `<module>/graphify-out/`, generated — never edited
by hand; regenerate with `graphify update .`). Semantic knowledge is the hand-authored `wiki/`.
Graphify answers *how* the system is organized; `wiki/` answers *why* it is that way. The canonical
description of the pipeline is `docs/AI_KNOWLEDGE_INFRASTRUCTURE_DECISION.md` — do not duplicate it.

**OpenWiki is not adopted** (2026-07-18: reliable operation needs a paid LLM, and there is no budget
for one). Do not install or run OpenWiki tooling here.

For codebase questions, prefer `graphify query "<question>"` over grep — it returns a scoped
subgraph. `graphify path "<A>" "<B>"` for relationships, `graphify explain "<concept>"` for focused
concepts, `graphify-out/wiki/index.md` for broad navigation, `graphify-out/GRAPH_REPORT.md` only for
architecture review. Dirty `graphify-out/` files are expected and are not a reason to skip it.

## Repository rules

- **macOS is the only supported development machine** (2026-07-28). The engine, IR and importer stay
  platform-independent; the *tooling* is not held to that bar. See `docs/PITFALLS.md` → Tooling for
  the two places that are knowingly macOS-shaped, including the pixel gate.
- `original-projects/` holds imported historical source as reference implementations, version-
  controlled with this repository.
- **No nested Git repositories and no submodules.**
