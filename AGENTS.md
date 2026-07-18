# AGENTS.md

## Purpose

This repository is designed for AI-assisted software modernization. Multiple AI coding agents may contribute to the project over its lifetime.
This document defines the expected workflow, architecture, and engineering principles.

---

## Project Objective

Comic-Zork modernizes two historical Microsoft open-source projects into a new browser-native adventure engine.

The project is **not** a traditional source port. The objective is to:

* preserve gameplay behavior
* modernize architecture
* improve maintainability
* support WebAssembly
* support AI-assisted development

---

## Core Principle

Do **not** attempt to recreate the historical runtime. Instead:

* understand the original software
* extract its semantics
* represent those semantics using the Intermediate Representation (IR)
* execute the IR using the Comic-Zork Engine

---

## AI Development Workflow

For any substantial task:

1. Read the relevant documentation in `docs/` and `wiki/`.
2. Review Graphify outputs in `graph/` if structural understanding is required.
3. Analyze the affected subsystem.
4. Implement changes incrementally.
5. Update documentation when behavior or architecture changes.
6. Regenerate Graphify artifacts if structural relationships have changed.

---

## Knowledge Separation

### Graphify

- Repository: https://github.com/Graphify-Labs/graphify
- Purpose: Structural understanding.
- Examples:
  * dependency graphs
  * module relationships
  * object graphs
  * architecture visualization

Graphify should operate on structured Intermediate Representation (IR) or modernized source code.
Generated files belong in:

```text
graph/
```

Never edit generated graph files manually.

---

### OpenWiki

- Repository: https://github.com/langchain-ai/openwiki
- Purpose: Semantic understanding.
- OpenWiki documentation explains:
  * architecture
  * gameplay systems
  * parser behavior
  * migration decisions
  * browser integration
  * design rationale

Documentation belongs in:

```text
wiki/
```

Graphify answers **how** the system is organized. OpenWiki answers **why** the system is designed that way.

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

The IR is the central abstraction of Comic-Zork. The engine should execute the IR rather than the original source language.
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

Comic-Zork is intended to become a reusable browser-native adventure engine and a reference implementation for AI-assisted modernization of legacy software.

Every contribution should improve:

* maintainability
* portability
* AI readability
* documentation quality
* architectural consistency
