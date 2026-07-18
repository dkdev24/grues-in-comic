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

### WORKLOG.md

- Location: `WORKLOG.md`
- Purpose: Persistent project history.
- Contains: one entry per version milestone, with date, changes, and status.
- **Do not load at session start.** Read only when version history is directly relevant to the current task.
- **Append a new entry when a version milestone is reached.** Never edit past entries.
- Version format: `x.x.x` — increment the patch for small changes, minor for new subsystems, major for engine-complete milestones.

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

The project separates structural knowledge (**Graphify** → `graph/`) from semantic knowledge (**OpenWiki** → `wiki/`). Graphify answers **how** the system is organized; OpenWiki answers **why** it is designed that way. Both consume the Intermediate Representation or modernized source, never raw ZIL.

The canonical description of this pipeline — tool responsibilities, repositories, and the architecture diagram — is `docs/AI_KNOWLEDGE_INFRASTRUCTURE_DECISION.md`. Do not duplicate it here or elsewhere.

Operational rules:

* Generated files in `graph/` are never edited manually.
* Human- and AI-authored documentation belongs in `wiki/`.
* Neither tool is installed yet — validation happens at plan stage 2.4 (see `docs/DEVELOPMENT_PLAN.md`, Gate A).

---

## Working with ZIL

The Zork repository contains ZIL source code. Do not treat ZIL as plain text. Instead, perform semantic analysis.
Identify concepts such as:

* ROOM
* OBJECT
* ROUTINE
* ACTION
* GLOBAL
* TABLE

Convert these concepts into the Intermediate Representation whenever practical. Avoid introducing browser-specific behavior into imported historical source files.

---

## Repository Organization

```
original-projects/
```

Contains imported historical source code. These directories are reference implementations. They are version-controlled as part of this repository.

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
