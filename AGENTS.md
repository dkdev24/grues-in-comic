# AGENTS.md

## Purpose

This repository is designed for AI-assisted software modernization. Multiple AI coding agents may contribute to the project over its lifetime.
This document defines the expected workflow, architecture, and engineering principles.

---

## Project Objective

Grues in Comic modernizes two historical Microsoft open-source projects into a new browser-native adventure engine.

The project is **not** a traditional source port. The objective is to:

* preserve gameplay behavior
* modernize architecture
* improve maintainability
* run natively in the browser (TypeScript engine + web UI — see `docs/adr/0002-engine-runtime.md`)
* support AI-assisted development

---

## Core Principle

Do **not** attempt to recreate the historical runtime. Instead:

* understand the original software
* extract its semantics
* represent those semantics using the Intermediate Representation (IR)
* execute the IR using the Grues in Comic Engine

---

## System Documents

Two documents maintain cross-session state. Read them at the start of every session. Update them at the end.

### HANDOFF.md

- Location: `HANDOFF.md`
- Purpose: Cross-session context memory.
- Contains: current version, project status, last session summary, next actions, open issues, key paths.
- **Read at the start of every session.**
- **Update at the end of every session.** Replace the Last Session and Next Actions sections. Append to Open Issues as needed.
- **Keep only what the next session needs.** This file is read in full at every session start, so its length is a recurring cost. Completed session narrative belongs in `WORKLOG.md` and must not be duplicated here — **do not accumulate a "Prior Session" stack.** Before writing the new Last Session, move the outgoing one to the WORKLOG if it is not already there, then delete it.
- Revise stale claims rather than appending around them: figures, stage status, and "next step" items go out of date silently.

### WORKLOG.md

- Location: `WORKLOG.md`
- Purpose: Persistent project history.
- Contains: one entry per version milestone, with date, changes, and status.
- **Do not load at session start.** Read only when version history is directly relevant to the current task.
- **Add a new entry at the top (newest first) when a version milestone is reached.** Never edit past entries.
- Version format: `0.x.y` while pre-public — patch for small changes, minor for new subsystems. **`1.0.0` is reserved for public launch** (repo goes public + website ships); do not bump into `1.x` before then. The engine-complete milestone (Gate C) is `v0.9.0`, not a major bump.

---

### docs/FUTURE_WORK.md

- Purpose: the **non-critical backlog** — good-to-have work that is deliberately unscheduled — plus the
  pre-`1.0.0` improvement-iteration protocol.
- **Do not load at session start.** Read it when deferring something, or when the user defines an iteration.
- **Deferred work goes here, never into `HANDOFF.md`.** HANDOFF holds what the *next* session needs; an
  item nobody will act on next session belongs in FUTURE_WORK. Every entry records **why it was deferred**
  — without that, the item cannot be judged later and gets re-proposed or re-litigated.
- **It is not a work queue.** Nothing in it is scheduled until the user names it in an iteration; do not
  start a backlog item without asking.

---

## AI Development Workflow

For any substantial task:

1. Read `HANDOFF.md` for current status and next actions.
2. Read the relevant documentation in `docs/` and `wiki/`.
3. Review Graphify outputs in `graph/` if structural understanding is required.
4. Analyze the affected subsystem.
5. Implement changes incrementally.
6. Update documentation when behavior or architecture changes.
7. Regenerate Graphify artifacts if structural relationships have changed.
8. Update `HANDOFF.md` and `WORKLOG.md` (if a milestone was reached) before ending the session.

---

## Knowledge Separation

The project separates structural knowledge (**Graphify** → per-module `<module>/graphify-out/`) from semantic knowledge (**hand-authored `wiki/`**). Graphify answers **how** the system is organized; `wiki/` answers **why** it is designed that way. Both consume the Intermediate Representation or modernized source, never raw ZIL.

The canonical description of this pipeline — tool responsibilities, repositories, the architecture diagram, and the stage 2.4 validation findings — is `docs/AI_KNOWLEDGE_INFRASTRUCTURE_DECISION.md`. Do not duplicate it here or elsewhere.

Operational rules:

* **Graphify is adopted** (Gate A, structural half). One graph per module (`importer/`, `ir/`, later `engine/`), corpus governed by `.graphifyignore`. Generated files in `graphify-out/` are never edited manually — regenerate with `graphify update .` after code changes.
* Human- and AI-authored documentation belongs in `wiki/`.
* **OpenWiki is not adopted** (decided 2026-07-18: reliable operation requires a paid LLM; no budget for this side project — findings in the decision doc). `wiki/` is hand-authored. Do not install or run OpenWiki tooling in this repository.

---

## Development Platform

**macOS is the only supported development machine** (decided 2026-07-28). The engine, IR and importer
are platform-independent and must stay that way; the *tooling* is not held to that bar, and two places
are knowingly macOS-shaped:

* the pixel gate's golden (`web/test/golden/panel-gate.json`) is macOS-rendered — **never run
  `npm --prefix web run gate:accept` on another OS**, see `docs/adr/0008-*.md` §Phase 3 amendment;
* anything reading a path may assume POSIX separators. Where it must not — the dev server's URL
  routing — the reason is written at the call site.

Do not spend effort making tooling cross-platform on speculation. Fix a platform bug when a real run
hits one, and record it.

## Repository Organization

`original-projects/` contains imported historical source code. These directories are reference implementations. They are version-controlled as part of this repository.

Do not create nested Git repositories. Do not use Git submodules.

---

## Intermediate Representation

The IR is the central abstraction of Grues in Comic. The engine should execute the IR rather than the original source language.
The IR should remain independent of:

* ZIL
* Browser APIs
* WebAssembly
* rendering technology

---

## Engineering Principles

Prefer:

* incremental changes
* modular architecture
* platform-independent code
* behavioral compatibility
* clear documentation

Avoid:

* unnecessary rewrites
* browser-specific game logic
* undocumented architectural changes
* formatting-only commits

---

## Long-Term Vision

Grues in Comic is intended to become a reusable browser-native adventure engine and a reference implementation for AI-assisted modernization of legacy software.

Every contribution should improve:

* maintainability
* portability
* AI readability
* documentation quality
* architectural consistency

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
