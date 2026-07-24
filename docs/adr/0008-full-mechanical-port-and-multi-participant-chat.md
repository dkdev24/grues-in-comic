# ADR 0008 — The Full Mechanical Port, and Multi-Participant Panels

- **Status:** Accepted — building. Supersedes the last of the "reimplementation from analysis" residue in the comic pane.
- **Date:** 2026-07-24
- **Supersedes (in part):** ADR 0004 §Context's generalization that "the pane is a reimplementation" (already narrowed by ADR 0007 §1; this ADR retires it for the *whole* mechanical layer); ADR 0004's implicit **two-speaker Panel-slot model** (fixed `hero`/`guide`/`caption` balloons, one panel per Turn) — the `Panel` seam becomes an N-participant line list; ADR 0004 §7's treatment of **panelization** (when a new panel starts) as semantic — it is ported.
- **Extends:** ADR 0007 §1 (the mechanical-layer port boundary) and §"Standing rule" (read the C++ first, cite it). ADR 0007 declared the *balloon* a port; this ADR carries the same boundary through **panel-forming** (`CUnitPanelPage::AddLine`) and **N-body avatar layout** (`CUnitPanel::LayoutAvatars`), the two mechanical routines ADR 0007 left as reimplementations.
- **Preserves (non-negotiable):** ADR 0002 (the event contract — consumed, not extended); ADR 0006's three invariants (Guide/DM presentation-only and removable; no engine internals in the panel stream; the panel stream is a **deterministic pure function of the event stream** so `replayPanels` still applies); ADR 0007 §2 fixed-panel sizing (`layout.ts` unchanged); figures scale as a unit in figure space before any viewport scale (ADR 0004 §8).
- **Related:** ADR 0006 (the recast that unblocks this), ADR 0007 (the boundary this extends), `original-projects/comic-chat/v1.0-pre-modern/{panel.cpp,balloon.cpp,avatar.cpp}` (source of truth), `web/src/comic/{mapper,render,figure,balloon,page}.ts`, `wiki/comic-chat-presentation.md`.

## Context

ADR 0007 reversed the "reimplement the pane" over-reach for one routine: it made the **balloon** a faithful, cited port of `balloon.cpp`/`panel.cpp`, and the class of drift that produced (a balloon layout re-derived from a mental model, wrong for two iterations) has not recurred since. But the port stopped at the balloon. Two mechanical routines were still reimplementations from analysis:

- **Figure placement** — `render.ts` hardcodes **Guide-left / Hero-right**. That is a two-figure special case of `CUnitPanel::LayoutAvatars` (`panel.cpp:528`), which orders and scales **N** bodies (`OrderAvatars`, per-body `GetDimInfo`, normalize to `unitHeight/1.9`, sum-width shrink or head-capped zoom).
- **Panelization** — `mapper.ts` folds "one Turn = one Panel." Comic Chat instead runs `CUnitPanelPage::AddLine` (`panel.cpp:362`) per utterance, deciding whether to append the line to the current panel or start a new one (the 5-element cap, the <2-panel rule, the *speaker-already-in-panel* rule, `SM_ACTION` forcing a box panel, and the overflow-split retry).

ADR 0004 justified leaving both as semantic with one argument: **chat → narration cannot be transcribed.** Comic Chat rendered a chat between several typing humans; Zork was one player and a narrator, so panel-forming and multi-body layout — routines that assume *several participants* — had nothing to bind to.

**ADR 0006 dissolves that argument.** The Guide is now a Dungeon Master, the Hero speaks back, and (this ADR's addition) **Grues and other mobs can participate in the exchange**. The scene is once again a genuine multi-party chat — exactly Comic Chat's native domain. The premise that made panelization and N-body layout un-portable is gone, and the reimplemented versions are the remaining source of the "fix it back and forth" churn ADR 0007's process fix was meant to end. So we finish the job ADR 0007 started: **the entire mechanical layer becomes a line-by-line port**, and the semantic layer shrinks to the job that is genuinely ours.

## Decision

### 1. The whole mechanical layer is a port; the semantic layer emits chat lines

ADR 0007 §1's boundary test is unchanged ("determined by geometry → port and cite; determined by the meaning of an event → ours"). We apply it to the two routines ADR 0007 exempted:

- **Panelization is mechanical.** `AddLine`/`AddPanel`/`MakeBalloon`/`AddReaction`/`StartNewPanel` (`panel.cpp:362,229,335,436`) decide panel boundaries from element counts and speaker identity — geometry and bookkeeping, no Zork meaning. Ported to a new `web/src/comic/page.ts`, cited.
- **N-body avatar layout is mechanical.** `LayoutAvatars` + `AdjustArtToCoord` (`panel.cpp:528,1435`) place and scale bodies from their dimensions. Ported into `render.ts`, replacing the Guide-left/Hero-right hardcode, cited.
- **The semantic layer's new, smaller job:** turn one Zork `Turn` into a **sequence of chat lines** — `{ avatarId, text, mode, emotion }` per line — plus scene context (`room`, `focus`, `camera`, `kind`, `marker`). Everything genuinely ours stays ours and unchanged in kind: channel mapping (ADR 0004 §2), emotion-from-narration (§9, `affect.ts`), the camera ladder (§7, the `SHOTS` table), the Narrative Director (ADR 0005), cast selection. The mapper stops *filling named balloon slots* and starts *emitting lines*; `page.ts` (ported) turns lines into panels.

### 2. The Panel seam generalizes from two slots to N participants

The `Panel` type loses its fixed `hero`/`guide`/`caption` balloons and its single panel-level `emotion`. A panel now carries a **list of lines**, each with its own speaker (`avatarId`) and its own `emotion`. `Cast` generalizes from a hero/guide pair to a map keyed by `avatarId`, so the DM, the Hero, and any mob resolve through one path. This is the data-model change that makes `LayoutAvatars` (N bodies) and `AddLine` (N speakers) express anything; it is the literal reading of ADR 0004 §1 "Comic Chat leads on identity," now including *how many* it can seat.

### 3. Figure geometry is ported; the `art/` assets stay

We port the **placement, scaling, and zoom** of `LayoutAvatars`/`GetBodyBox` (`panel.cpp:528`, `avatar.cpp`), but each body's *pixels* still come from this project's build-time `art/` pipeline (packed avatar sheets, `figureFor`/`drawFigure`, `selectComplexPose`), unchanged and still parity-checked against `art/composite.ts`. A full port of Comic Chat's live head+torso avatar-sheet decode is **deferred** — the geometry is the value; the assets already exist.

### 4. Scope boundary: the port makes the pane N-capable; it does not author mob dialogue

This ADR delivers the **capacity** to render N participants and to form panels from a line stream. Deciding *when a Grue speaks and what it says* is semantic authoring that lives upstream in the mapper/Director — a later ADR 0006 slice, not this work. Through this change the DM↔Hero content renders exactly as it does today; a third participant is proven by a test that injects a mob line, not by shipping mob dialogue.

### 5. Strategy: in-place, tests as the oracle

The rewrite lands in place behind the existing `renderPanel`/`layoutStrip`/`Panel` interface (AGENTS.md's "incremental" is honoured at the seam, not by keeping a dead parallel copy). The recorder-based tests (`balloon.test.ts` path ops, `figure.test.ts` byte-identical join vs `art/composite.ts`, `render.test.ts` geometry) are the behavioural spec: they stay green, or a change to a ported routine is justified against its C++ source as a named divergence. Because no pixel-diff gate exists today, we add one — committed `render:panel` PNGs (seed 1234) — so future balloon/layout drift is caught automatically rather than by eye.

## Consequences

- **The pane's mechanical layer is now, in full, a cited port.** New mechanical code reads the C++ first and cites it (ADR 0007's standing rule, now covering the last two routines). Only line-content, emotion, camera, and cast selection are authored fresh.
- **`mapper.test.ts` and `render.test.ts` are rewritten to the new contract** (line list, N-body layout). The `replayPanels` oracle and its dialogue-content assertions (ADR 0006) are preserved: `Turn[] → Panel[]` is still a deterministic pure function.
- **N-participant panels are enabled but idle.** Until a mapper slice authors mob lines, panels contain the DM and Hero as before; the layout simply no longer assumes exactly two.
- **Deferred:** the full avatar-sheet figure port (§3), and mob-dialogue authoring (§4). Both are revisited when a concrete need appears.

- **Panelization port (`page.ts`) sequenced after mobs — a measured decision.** The seam and N-body layout shipped (v0.18.0). The panelization port of `CUnitPanelPage::AddLine` (`panel.cpp:362`) was *decided* — the caption rides with its panel (a divergence from `SM_ACTION`, per ADR 0006 §2), a repeat caption or a repeat speaker starts a new panel, the 5-element cap holds, and a merged panel adopts its primary (last-speaking) turn's scene fields. But a measure over the walkthrough corpus (606 turns) found **captions on 96.7% of turns**, so cross-turn packing can only merge the **3.3% caption-less turns** while forcing a re-derivation of the 30 turn-indexed replay-oracle tests. The port's load-bearing value — the 5-element cap and packing discipline — is **latent until mobs produce multi-line turns**. It is therefore built **with the mob-dialogue slice**, not against a DM↔Hero stream where it changes almost nothing. This is the ADR 0004/0005 "measure before proposing rules" method applied to its own rollout.
