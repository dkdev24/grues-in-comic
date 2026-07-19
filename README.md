# Grues in Comic

> Reimagining two historical Microsoft open-source projects as a browser-native comic adventure using AI-assisted software modernization.

## Overview

Grues in Comic is an experimental software modernization project that combines two historical open-source projects:
* **Zork I** (gameplay, parser, and world simulation)
* **Microsoft Comic Chat** (comic-style visual presentation)

The objective is not to reproduce the original runtime environments.
Instead, Grues in Comic extracts gameplay semantics from the original source code into a runtime-independent Intermediate Representation, executed by a TypeScript engine that runs natively in the browser.

The project also serves as a reference implementation for AI-assisted modernization of legacy software.

---

## Vision

Grues in Comic aims to demonstrate how AI coding agents can assist with:
* understanding legacy source code
* extracting software semantics
* building intermediate representations (IR)
* modernizing historical software
* creating maintainable browser-native applications

Rather than building a Z-Machine emulator, Grues in Comic builds a new runtime inspired by the original gameplay.

---

## Architecture

```text
Historical Source Code
        │
        ▼
 Semantic Analysis
        │
        ▼
Intermediate Representation (IR)
        │
        ▼
 Grues in Comic Engine  (TypeScript, zero runtime deps)
        │
        ▼  JSON event stream (versioned engine↔UI contract)
        │
 Browser Application  (text UI · comic renderer)
```

The engine is a pure, deterministic, synchronous state machine — no DOM, no
timers, no rendering vocabulary. It emits semantic events (`narration`,
`speech`, `player-moved`, …) that a UI layer maps to text or comic panels.
"Browser-native" is achieved by being JavaScript, not by compiling to
WebAssembly; see ADR 0002 for the reasoning and the full contract.

---

## Repository Structure

```text
grues-in-comic/

├── original-projects/     historical source, version-controlled
│   ├── zork1/             ZIL source (MIT, Microsoft)
│   └── comic-chat/        Comic Chat source + art (MIT, Microsoft)
│
├── importer/              ZIL parser → AST artifacts
├── ir/                    IR schema, validator, extraction → world document
├── verification/          ZILF build + dfrotz golden transcripts
├── docs/                  ADRs, plans, decision records
├── reference/             third-party reference material (gitignored)
│
├── engine/                planned — IR runtime (Milestone 4)
└── web/                   planned — text UI, then comic renderer (Milestone 5)
```

Each TypeScript module carries its own Graphify knowledge graph in
`<module>/graphify-out/`.

---

## AI Knowledge System

Grues in Comic separates two different kinds of project knowledge.

### Structural Knowledge

Generated using Graphify. Examples:

* dependency graphs
* call graphs
* architecture graphs

### Semantic Knowledge

Maintained using OpenWiki-compatible documentation. Examples:

* gameplay rules
* parser behavior
* design rationale
* migration strategy

---

## Provenance and Licensing

Grues in Comic is released under the **Apache License 2.0**. Imported historical
projects retain their original licenses. `LICENSE`, `NOTICE`, and
`THIRD_PARTY.md` carry the authoritative details; this section is the map.

### What is in this repository

| Source | License | Why it is here |
|---|---|---|
| [Zork I](https://github.com/historicalsource/zork1) — `original-projects/zork1/` | MIT (Copyright (c) 2025 Microsoft) | The ZIL corpus every artifact is derived from. `importer/` parses it, `ir/` extracts from it, `verification/` compiles it |
| [Microsoft Comic Chat](https://github.com/microsoft/comic-chat) — `original-projects/comic-chat/` | MIT (Copyright (c) Microsoft Corporation) | Presentation reference for the comic renderer (Milestone 5): source, documentation, and character art |

Both are redistributed here under the terms of their MIT grants. They are
version-controlled deliberately — the pipeline reads from them, so a checkout
without them cannot reproduce the artifacts in `importer/artifacts/` or
`ir/artifacts/`.

### What is deliberately absent

**Comic Chat build outputs.** Compiled `.exe`, `.dll`, `.ocx`, `.lib`,
`.class`, `.map`, and `.sym` files were untracked in v0.5.17, along with a
vendored copy of Sun's JDK 1.1.4 (`artifacts/jchat/jdk114/lib/classes.zip`)
that Microsoft's MIT grant does not extend to. All are build products of source
that remains in the tree. Source, documentation, and comic art
(`.avb`, `.bmp`, `.gif`, `.jpg`, `.ico`) are untouched. They remain in the
upstream repository if you need them.

**Third-party reference material** (`reference/`, gitignored). Local-only
copies of the Z-Machine Standards Document, the Comic Chat SIGGRAPH '96 paper,
and the ZILF/ZLR sources. Not redistributed: the paper is an ACM publication,
ZILF is GPL-3.0, and ZLR ships no license at all. Nothing in the build depends
on this directory. See `THIRD_PARTY.md` and ADR 0002.

### Build tools

The verification pipeline invokes **ZILF/ZAPF 0.11.1** (GPL-3.0) and
**Frotz/dfrotz 2.55** (GPL-2.0-or-later) as external executables to compile the
ZIL source and generate golden transcripts. Neither is vendored, linked, or
redistributed here, so their copyleft terms do not extend to this project's
source. Install them separately; see `verification/build.sh`.

### Relationship to existing Z-machine tooling

This project is **not** a Z-machine implementation and does not reimplement
one. A compiled story file is an opaque memory image; this project extracts the
*semantics* of the original ZIL into a runtime-independent IR so the engine can
emit events a comic renderer can draw. ZILF is used as the build oracle rather
than reinvented. ADR 0002 records the full reasoning, including why an existing
interpreter such as ZLR or ZVM would not serve the goal.
