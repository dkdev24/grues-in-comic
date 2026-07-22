# ADR 0007 — The Comic Pane's Port Boundary, and Fixed Panels in a Reflowing Pane

- **Status:** Accepted (recorded; implementation deferred — see Consequences)
- **Date:** 2026-07-23
- **Supersedes (in part):** ADR 0004 §4a's clause **"Panel width becomes an input to the Layout Manager, not a constant… this is the one place the port stops being a transcription."** That clause is reversed. The rest of §4a stands (panes stay fluid, both visible on mobile; dictation; responsiveness lives in the grid and chrome, not the figures).
- **Preserves (non-negotiable):** ADR 0002 (the event contract — consumed, not extended); ADR 0004 §1 (Comic Chat leads on identity — this ADR is that principle applied to the *mechanical* layer); the panel stream stays a deterministic pure function of the event stream (ADR 0004 §5, ADR 0005 testing contract); figures scale as a unit, composited in figure space before any viewport scale (ADR 0004 §8).
- **Related:** ADR 0004 (parent), `web/src/comic/layout.ts` (already the model port), `original-projects/comic-chat/v1.0-pre-modern/{balloon.cpp,panel.cpp}` (the source of truth for ported geometry), `wiki/comic-chat-presentation.md`.

## Context

The comic pane was built as a **reimplementation from analysis** of Comic Chat, not as a port of its C++. For the parts of the pane that encode *what a Zork turn means* — the channel mapping, emotion-from-narration, the camera ladder — that was correct and unavoidable: Comic Chat rendered a chat between several typing humans, Zork is one player and a narrator, and no line-by-line transcription bridges that (ADR 0004 §Context).

But "the chat→narration remap can't be transcribed" was silently generalized into "the pane is a reimplementation," and that over-reach cost us. The speech-balloon layout was re-derived from a mental model of the original rather than read from `balloon.cpp`, and it drifted: our layout parked the Hero's balloon in a **side margin** and slid it off the head, producing a sideways tail the original never draws. The real algorithm (`CBWoodringNormal::AddArrow`, `GetCloudEstimate`) always roots the tail on the balloon's bottom edge and **straddles the head from above**. The bug survived two iterations and was only fixed (v0.17.7) once we went back and read the C++. Nothing in the pipeline pins geometry against the source, so a prose summary of the original was trusted where the original itself should have been.

Separately, ADR 0004 §4a made panel width a **per-render variable** — `layoutStrip` stretches each panel to fill its column's share (`layout.ts:135`). The consequence is that the space available to a figure and its balloon slides continuously with the viewport, so the same shot composes differently at every width. That is an authoring instability, and it is the very thing that forced §4a to declare panel layout "the one place the port stops being a transcription."

These two problems share a root and a fix. Comic Chat's layout is written against a **known, fixed** panel width (`m_unitWidth`); restoring that both cures the compositional instability and removes the reason the mechanical layer couldn't be a port.

## Decision

### 1. The mechanical layer is a faithful port; the semantic layer is a reimplementation

The comic pane has two kinds of code, and they get built two different ways.

- **Mechanical (ported).** Behaviour decided by pixels and geometry, resolution-independent, carrying no Zork-specific meaning: the balloon spline and its arrow/tail, `AddLine` line-breaking and balancing, balloon overlap and route regions, `LayoutAvatars` zoom and placement, and the panel grid. These are **ports with a cited source site** (`balloon.cpp`/`panel.cpp:line`), exactly as `layout.ts` already does. A change to a ported routine is justified **against the source** — a named divergence with a reason (e.g. `columnsFor` collapsing the original's two-interstice typo, `layout.ts:94`) — not re-derived from taste.

- **Semantic (reimplemented).** Behaviour decided by what a Zork turn *means*, where chat and adventure genuinely diverge: channel mapping (ADR 0004 §2), emotion-from-narration (§9), the camera ladder (§7), the Narrative Director (ADR 0005), cast selection.

**The boundary test:** if a function's output is determined by geometry, it is a port and must cite its source; if by the meaning of an event, it is ours. When in doubt, read the C++ before writing the TypeScript.

This does not reopen ADR 0004 §1 — it is §1 taken literally. "Comic Chat leads on identity" includes its layout mechanics, not only its cast and balloon *classes*.

### 2. Panel size is fixed; the pane reflows the column count

Restore Comic Chat's model (`m_unitWidth` held constant, columns derived from the space available, `panel.cpp:1456`). Responsiveness moves **up** to the pane: the number of panels in a row varies with viewport width; a single panel's intrinsic size does not slide with it.

- A panel renders at its **native size** (`UNIT`, 400×340). The strip does **not** stretch a panel above native to fill leftover space; leftover becomes gutter and centred margin, which is what `PreparePrintDC` does with its own remainder (`panel.cpp:1471`). The strip-level upscale (`MAX_PANEL_SCALE`) is retired; figure-scale (`render.ts`'s own `MAX_SCALE`) is a different cap and is unaffected.

- **Shrink tolerance.** A bounded downscale — floor ≈ **0.85** of native — is permitted *only* to prefer more columns: a width that cannot hold two native panels but can hold two at ≥ 0.85 shows two, rather than one native panel marooned in margin. Below that band, and on a phone too narrow for even one native panel, the single column scales down to fit the viewport.

So a panel's rendered width is native, or within `[0.85·native, native]` when the extra column is worth it, or a straight fit-down on the narrowest phones — never a free stretch. Within that band the space a figure and balloon get is effectively constant, which is the property §7's framing and §2a's balloons were tuned against.

Because panel width is now (near-)constant, the ported layout routines no longer need per-render re-evaluation at an arbitrary width — the §4a caveat that "the port stops being a transcription" is removed. `render.ts` and `balloon.ts` still *take* a width; they simply receive a stable one.

## Consequences

- **Implementation is deferred** (this session records the decision only). The concrete change lives in `web/src/comic/layout.ts`: replace the stretch-to-share (`panelWidth = share`, capped at `MAX_PANEL_SCALE`) with fixed-native sizing plus the 0.85 shrink-tolerance column preference; the existing `MIN_PANEL_SCALE = 0.75` fit test is subsumed by the new floor (retune to 0.85, or keep 0.75 as the absolute fit floor and 0.85 as the *preference* threshold — decide when building). `MAX_COLUMNS = 2` stands (the live-strip reasoning at `layout.ts:26` is unchanged). Update `layout.test.ts` for the new width behaviour.

- **Very large viewports** land on two native panels, centred, with wide margins rather than two blown-up panels. This is the intended trade for stable composition and matches `PreparePrintDC`; raising `MAX_COLUMNS` on ultra-wide is a separate, later question and would reintroduce the "newest panel out of a glance" cost §5/`layout.ts:26` weighed.

- **Port backfill is a tracked follow-up.** Audit `render.ts`/`balloon.ts` geometry against `balloon.cpp`/`panel.cpp` and port the gaps with cited source sites; the v0.17.7 straddle + bottom-tail work is the reference standard for what "ported, with a named divergence" looks like. This is opportunistic, not a rewrite — existing geometry that already matches the original keeps its behaviour and gains a citation.

- **Standing rule going forward:** new mechanical-layer code reads the C++ first and cites it; only semantic-layer code is authored fresh. This is the process fix for the class of bug that produced the side tail.
