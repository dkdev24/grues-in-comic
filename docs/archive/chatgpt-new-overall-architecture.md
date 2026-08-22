# Grues in Comic Architecture
**Version:** 1.0 (MVP Architecture)  
**Status:** Living Document  
**Project:** Grues in Comic

---

# 1. Overview

## Vision

**Grues in Comic** is a browser-based interactive fiction engine that recreates the experience of classic ZIL games (starting with Zork) using a Comic Chat–inspired visual presentation.

Unlike a traditional text adventure, the game is presented as an evolving sequence of comic panels while preserving the original gameplay mechanics.

The project is implemented entirely in **TypeScript** and runs completely on the **client side** without requiring any backend services.

---

# 2. Project Goals

## MVP Goal

> Build a playable TypeScript implementation of Zork with a Comic Chat–inspired visual interface.

This goal intentionally limits the project's scope.

The objective is **not** to build a generic storytelling framework during the MVP.

---

## Long-term Vision

After the MVP proves successful, the architecture may evolve into a reusable visual narrative framework capable of supporting:

- other Interactive Fiction systems
- original games
- alternative presentation styles
- different rendering themes

However, this future evolution must not complicate the MVP implementation.

---

# 3. Core Design Principles

## 3.1 Incremental Development

The architecture should evolve together with the implementation.

Avoid designing systems that are not immediately useful for the current milestone.

Good architecture is achieved through iterative refinement rather than speculative abstraction.

---

## 3.2 Separation of Responsibilities

Every layer should have a single responsibility.

| Layer | Responsibility |
|---------|---------------|
| Parser | Parse ZIL |
| IR | Intermediate program representation |
| Adventure Engine | Execute game logic |
| Presentation Mapper | Convert gameplay into visual presentation |
| Layout Manager | Arrange panels |
| Renderer | Draw UI |

---

## 3.3 Deterministic Behavior

Every visual output should be reproducible.

The project intentionally avoids runtime AI inference.

Given identical:

- game state
- player input

the presentation should always be identical.

This makes debugging and testing significantly easier.

---

## 3.4 Client-side Only

The game should run entirely inside a web browser.

There should be:

- no backend
- no database
- no cloud rendering
- no server API
- no authentication
- no LLM integration

Everything should work offline.

---

## 3.5 Responsive Presentation

The game does **not** render comic pages.

Instead, it generates an ordered stream of comic panels.

Different devices display the same panel stream using different layouts.

---

# 4. High-Level Architecture

```text
                 ZIL Source
                      │
                      ▼
                ZIL Parser
                      │
                      ▼
              Intermediate IR
                      │
                      ▼
            Adventure Engine
                      │
                      ▼
          Presentation Mapper
                      │
                      ▼
               Panel Stream
                      │
                      ▼
             Layout Manager
                      │
                      ▼
                 Renderer
                      │
                      ▼
                 Browser UI
```

---

# 5. Layer Responsibilities

## 5.1 ZIL Parser

Responsibilities

- Parse original ZIL source
- Validate syntax
- Build IR

The parser should not contain gameplay logic.

---

## 5.2 Intermediate Representation (IR)

The IR separates ZIL language implementation from the runtime engine.

Benefits:

- cleaner architecture
- easier debugging
- future language support
- independent testing

The Adventure Engine only understands IR.

It never directly executes ZIL.

---

## 5.3 Adventure Engine

Responsibilities

- execute player commands
- maintain world state
- execute object logic
- inventory
- NPC behavior
- scoring
- save/load

The engine knows nothing about comics.

It only produces gameplay events.

Example:

```text
LOOK

↓

Room:
    Living Room

Description:
    You are standing in the living room.

Objects:
    Lamp
    Rug
```

---

## 5.4 Presentation Mapper

This is the bridge between gameplay and comics.

Its purpose is **not** to create stories.

Its purpose is to deterministically transform gameplay events into presentation elements.

Example

Engine Event

```text
LOOK
```

↓

Presentation

```text
Establishing Panel

Caption

Object Focus
```

Unlike an AI system, this transformation is entirely rule-based.

No runtime inference is performed.

---

## 5.5 Panel Stream

The mapper outputs a chronological stream of panels.

Example

```
Panel 1
Panel 2
Panel 3
Panel 4
...
```

This stream represents the complete comic history.

It is independent from:

- screen size
- device
- orientation

---

## 5.6 Layout Manager

The Layout Manager decides:

- how many panels are visible
- grid arrangement
- scrolling
- orientation changes
- responsive behavior

Example

Desktop

```
2 × 2
```

Tablet

```
2 × 3
```

Phone Portrait

```
1 × N
```

Phone Landscape

```
2 × N
```

The Layout Manager never creates content.

It only arranges existing panels.

---

## 5.7 Renderer

The Renderer is responsible for drawing.

It does not decide:

- camera
- emotions
- pacing
- layout

Those decisions have already been made.

The renderer simply displays the visual components.

---

# 6. Why Comic Chat Needs Adaptation

Comic Chat assumes conversation.

Classic Interactive Fiction primarily contains:

- narration
- exploration
- descriptions
- object interaction

Many scenes contain no dialogue.

Therefore, Grues in Comic extends the presentation vocabulary beyond speech bubbles.

---

# 7. Panel Types

The MVP should support multiple panel types.

## Establishing

Introduce a location.

Example

```
Wide view of the room
```

---

## Narration

Display descriptions.

Example

```
Caption

"You are standing in a forest."
```

---

## Thought

Display player observations.

Example

```
"I should take the lantern."
```

---

## Dialogue

Traditional Comic Chat style conversation.

```
Hero

"Hello."

Troll

"Go away."
```

---

## Action

Player interactions.

```
Take lamp

Open door

Attack troll
```

---

## Focus

Highlight important objects.

Example

```
Close-up

Brass Lantern
```

---

## Transition

Scene changes.

Examples

- entering room
- climbing stairs
- sleeping

---

# 8. Why Panels Instead of Pages

Traditional comics produce pages.

Grues in Comic produces panels.

Advantages:

- responsive
- infinite history
- mobile friendly
- orientation independent
- easier incremental rendering

The Layout Manager decides how those panels appear.

---

# 9. Camera Language

Although deterministic, the presentation should support basic comic cinematography.

Possible camera presets:

- Establishing
- Wide
- Medium
- Close-up
- Extreme Close-up
- Over-the-Shoulder
- First Person

These are selected by presentation rules.

The renderer simply executes them.

---

# 10. Current Scope

Included

- ZIL compatibility
- browser gameplay
- Comic-inspired presentation
- deterministic rendering
- responsive UI
- client-side only

Not Included

- multiplayer
- AI-generated art
- LLM prompting
- backend services
- online synchronization

---

# 11. Future Evolution

After the MVP, the architecture can evolve gradually.

Possible future directions:

### Presentation Themes

- Comic Chat
- Manga
- Pixel Art
- Visual Novel

---

### Alternative IF Languages

Support for additional adventure formats.

---

### Generic Narrative Framework

The Presentation Mapper may eventually become independent from interactive fiction.

---

### Plugin Architecture

Allow external renderers and themes.

---

# 12. Implementation Roadmap

## Phase 1 ✅ (with known gaps)

- ZIL Parser
- IR
- Adventure Engine

Status:

⚑ **Gate C claimed at v0.9.0** — the engine is complete in the sense the gate defines, but not
gap-free. Known limitations carried forward:

- `V-CLIMB-UP` is still stubbed (stalls on `GETPT`); no walkthrough diverges on it
- 143/143 strict turns (100%), **155/161 overall**
- multi-object lists unimplemented beyond `ALL`

See `HANDOFF.md` for the current list. Do not read this ✅ as "nothing left to do here."

---

## Phase 2

- Presentation Mapper
- Basic Panel model
- Initial Renderer

Goal:

Playable comic version of Zork.

---

## Phase 3

- Multiple panel types
- Responsive Layout Manager
- Character expressions
- Camera presets

---

## Phase 4

- Animations
- Sound
- Visual polish

---

## Phase 5

Evaluate future evolution toward a reusable narrative framework.

No implementation work for this phase should begin before the MVP is complete.

---

# 13. Architecture Philosophy

The architecture intentionally prioritizes:

- simplicity
- determinism
- incremental development
- maintainability
- portability

Rather than designing a universal storytelling platform from the beginning, Grues in Comic focuses on solving one problem exceptionally well:

> **Transform a classic text adventure into an engaging comic-reading experience while remaining entirely client-side and deterministic.**

If that goal is achieved successfully, the architecture provides a solid foundation for future evolution without having sacrificed the simplicity of the MVP.
