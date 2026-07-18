# Grues in Comic Porting Strategy (v2)

## Overview

Grues in Comic is an AI-first software modernization project.

The goal is **not** to compile historical software into WebAssembly. The goal is to understand, modernize, and reimplement two historical open-source projects into a new browser-native adventure engine.

The project combines:

* **Zork I** — gameplay, parser, world simulation
* **Microsoft Comic Chat** — comic presentation and visual storytelling

The final result is a modern WebAssembly application running entirely inside a web browser.

---

## Project Philosophy

Grues in Comic prioritizes:

* behavioral compatibility
* semantic preservation
* modular architecture
* browser portability
* AI-assisted development
* long-term maintainability

The project intentionally separates **game semantics** from **runtime implementation**. Historical implementation details should not constrain the new architecture.

---

## Understanding the Source Projects

### Comic Chat

Comic Chat is a C++ application. Its source code can largely be analyzed and ported using conventional modernization techniques.
Within Grues in Comic, Comic Chat primarily contributes presentation concepts, including:

* comic panels
* speech bubbles
* character layout
* dialogue presentation
* visual storytelling

### Zork

The historical Zork repository does **not** contain C or C++ gameplay code. Instead, it contains source written in **ZIL (Zork Implementation Language)**.
ZIL is a Lisp-derived domain-specific language (DSL) describing the adventure world rather than a conventional application.

It defines:

* rooms
* objects
* parser rules
* verbs
* world state
* scripted behavior
* puzzles
* gameplay logic

Historically, ZIL was compiled into Z-code, which was executed by the Z-Machine. Grues in Comic intentionally does **not** recreate the original Z-Machine.
Instead, the project extracts gameplay semantics from the ZIL source and executes them using a completely new runtime.

---

## Why This Is Not a Traditional Port

Traditional Zork execution:

```text
ZIL
    ↓
ZIL Compiler
    ↓
Z-Code
    ↓
Z-Machine
```

Grues in Comic architecture:

```text
ZIL
    ↓
Semantic Analysis
    ↓
Intermediate Representation (IR)
    ↓
Grues in Comic Engine
    ↓
WebAssembly
    ↓
Browser
```

The objective is to preserve gameplay behavior while replacing the historical runtime.

---

## Intermediate Representation (IR)

The Intermediate Representation (IR) is the architectural foundation of Grues in Comic. The IR separates game semantics from historical implementation details.

The IR should describe concepts such as:

* rooms
* objects
* exits
* inventory
* parser rules
* actions
* scripted events
* world state
* puzzle logic

The IR must remain independent of:

* ZIL syntax
* Z-Machine implementation
* browser APIs
* rendering technology
* WebAssembly

The engine executes the IR rather than the original ZIL source.

---

## ZIL Semantic Analysis

ZIL should not be treated as plain text. Instead, AI agents should perform semantic analysis.
Typical entities include:

* ROOM
* OBJECT
* ROUTINE
* GLOBAL
* ACTION
* TABLE

The objective is to identify gameplay concepts rather than reproduce the original syntax.
For example:

```zil
<ROOM LIVING-ROOM
    (DESC "Living Room")
    (NORTH TO KITCHEN)>
```

should become an IR node representing a room with its properties and relationships.

---

## AI Knowledge Pipeline

Grues in Comic distinguishes between semantic understanding and structural understanding.
The recommended pipeline is:

```text
          ZIL
           │
           ▼
   Semantic Analyzer
           │
           ▼
 Intermediate Representation
      │               │
      ▼               ▼
 Graphify         OpenWiki
(structure)     (semantics)
      │               │
      └───────┬───────┘
              ▼
       AI Coding Agents
              ▼
      Grues in Comic Engine
```

This architecture allows AI agents to understand both the code structure and the gameplay semantics.

### Graphify

- Repository: https://github.com/Graphify-Labs/graphify

Graphify is responsible for structural knowledge.
Typical outputs include:

* dependency graphs
* call graphs
* module relationships
* object relationships
* architecture visualization

Graphify does not currently understand ZIL directly. Instead, Graphify should operate on the Intermediate Representation or other structured outputs generated during semantic analysis.

Generated artifacts belong in:

```
graph/
```

These files should never be edited manually.

### OpenWiki

- Repository: https://github.com/langchain-ai/openwiki

OpenWiki is responsible for semantic knowledge. Unlike Graphify, OpenWiki does not require language-specific parsing.
Large language models can explain ZIL source directly and generate documentation describing:

* gameplay systems
* parser behavior
* room architecture
* puzzle mechanics
* migration rationale
* browser integration
* design decisions

Documentation belongs in:

```
wiki/
```

OpenWiki complements Graphify. Graphify explains **how** the system is connected. OpenWiki explains **why** it behaves that way.

---

## Event-Driven Engine

The original Zork prints text directly to the terminal. Grues in Comic replaces console output with structured gameplay events.

Instead of:

```text
LOOK
↓
"You are standing in an open field."
```

the engine should generate:

```text
LOOK
↓
Narration Event
↓
Presentation Layer
↓
Comic Panel
↓
Speech Bubble
↓
Browser UI
```

This keeps gameplay independent from rendering.

---

## Browser Runtime

The browser runtime should only provide platform services:

* rendering
* animation
* user input
* audio
* persistence
* networking

Gameplay logic belongs exclusively inside the engine.

---

## Migration Phases

### Phase 1 — Repository Analysis

Analyze both historical repositories.
Produce:

* architecture documentation
* dependency analysis
* initial Graphify graph

### Phase 2 — ZIL Semantic Extraction

Analyze the ZIL source. Identify gameplay concepts.
Generate the first Intermediate Representation.

### Phase 3 — Engine Development

Implement a runtime capable of executing the IR.
Responsibilities include:

* parser
* game state
* inventory
* interactions
* events
* save/load

No browser-specific code should exist at this stage.

### Phase 4 — WebAssembly

Compile the engine using Emscripten. Integrate browser bindings.
Maintain platform-independent gameplay logic.

### Phase 5 — Comic Presentation

Replace terminal output with Comic Chat-inspired presentation.
Support:

* comic panels
* speech bubbles
* character portraits
* visual narration
* animated dialogue

Rendering should remain separate from gameplay.

### Phase 6 — Modernization

After feature parity:

* simplify legacy systems
* improve modularity
* improve testing
* improve documentation
* optimize performance

---

## Long-Term Vision

Grues in Comic is intended to become a reusable browser-native adventure engine rather than a single-game port.
The Intermediate Representation makes it possible to support additional interactive fiction systems in the future.

Potential future importers may include:

* additional Infocom titles
* other ZIL-based adventures
* Inform projects
* TADS
* Ink
* custom adventure DSLs

By separating semantic understanding from runtime implementation, Grues in Comic becomes a general-purpose AI-assisted modernization framework for historical adventure games rather than simply a WebAssembly version of Zork.
