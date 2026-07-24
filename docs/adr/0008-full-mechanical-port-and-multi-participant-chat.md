# ADR 0008 — The Full Mechanical Port, and Multi-Participant Panels

- **Status:** Accepted — building. Supersedes the last of the "reimplementation from analysis" residue in the comic pane.
- **Date:** 2026-07-24
- **Supersedes (in part):** ADR 0004 §Context's generalization that "the pane is a reimplementation" (already narrowed by ADR 0007 §1; this ADR retires it for the *whole* mechanical layer); ADR 0004's implicit **two-speaker Panel-slot model** (fixed `hero`/`guide`/`caption` balloons, one panel per Turn) — the `Panel` seam becomes an N-participant line list; ADR 0004 §7's treatment of **panelization** (when a new panel starts) as semantic — it is ported.
- **Extends:** ADR 0007 §1 (the mechanical-layer port boundary) and §"Standing rule" (read the C++ first, cite it). ADR 0007 declared the *balloon* a port; this ADR carries the same boundary through **panel-forming** (`CUnitPanelPage::AddLine`) and **N-body avatar layout** (`CUnitPanel::LayoutAvatars`), the two mechanical routines ADR 0007 left as reimplementations.
- **Preserves (non-negotiable):** ADR 0002 (the event contract — consumed, not extended); ADR 0006's three invariants (Guide/DM presentation-only and removable; no engine internals in the panel stream; the panel stream is a **deterministic pure function of the event stream** so `replayPanels` still applies); ADR 0007 §2 fixed-panel sizing (`layout.ts` unchanged); figures scale as a unit in figure space before any viewport scale (ADR 0004 §8).
- **Related:** ADR 0006 (the recast that unblocks this), ADR 0007 (the boundary this extends), `web/src/comic/{mapper,render,figure,balloon,page}.ts`, `wiki/comic-chat-presentation.md`.
- **Port source of truth (re-pinned, see Amendment 2026-07-24b):** the **modern variant of v2.5-beta-1** (consistent with this ADR's earlier use of the `-modern` convention for v1.0-pre-modern).
  - **Tracked/durable source (cite against this):** `original-projects/comic-chat/v2.5-beta-1-modern/{panel,balloon,avatar,avatario,spline,format}.{cpp,h}` — version-controlled, survives clones. Line-identical to the raw `v2.5-beta-1/` for the pipeline files, so the anchor table below is valid against both.
  - **Local graphed working copy (navigation aid):** `reference/comic-chat-v2.5-beta-1-modern/` with its offline knowledge graph at `reference/comic-chat-v2.5-beta-1-modern/graphify-out/` (`graph.json`, `GRAPH_REPORT.md`). Use `graphify query/path/explain --graph reference/comic-chat-v2.5-beta-1-modern/graphify-out/graph.json` to navigate the C++ call graph during the port. This tree is **gitignored** (local, not committed — AGENTS.md forbids committing graphs of raw historical C++); regenerate with `graphify extract . --code-only --no-label` (offline, no LLM). If lost, the tracked source above is the fallback.

## Amendment — 2026-07-24b (canonical version re-pinned to v2.5-beta-1; panelization un-deferred)

The original text of this ADR cited `v1.0-pre-modern`. We re-pin the port's source of truth to the **later v2.5-beta-1 (modern variant)** — tracked at `original-projects/comic-chat/v2.5-beta-1-modern/`, with an offline navigation graph over a local copy at `reference/comic-chat-v2.5-beta-1-modern/graphify-out/` (see the source-of-truth pointers above). **Every `panel.cpp`/`avatar.cpp` line number in the sections below predates this re-pin and is superseded by the anchor table here** (the modern variant is line-identical to the raw `v2.5-beta-1/` for the pipeline files — verified 2026-07-24b). Four factual findings from the later source, three of which *remove* scope:

| Routine | v2.5-beta-1 anchor | Note |
|---|---|---|
| `CUnitPanel::LayoutAvatars` | `panel.cpp:726` | N-body placement — the port target |
| `maxBodyHeight = unitHeight/1.9` | `panel.cpp:738` | the single fill target |
| shrink-to-fit (row overrun) | `panel.cpp:777` | already ported |
| equal margins `(w−Σw)/(n+1)` | `panel.cpp:807` | already ported |
| `bZoomIn` close-up branch | `panel.cpp:788` | camera; owned by our SHOTS ladder |
| `OrderAvatars`/`UpdateHistoresis` | `panel.cpp:753,818` | **stable cross-panel slots — not yet ported** |
| `IsSpeaker` on-stage gating | `panel.cpp:743,822` | who is drawn = speakers + `m_requested` |
| `CBody*::GetDimInfo` | `avatar.cpp:55,77` | dimensions |
| `CUnitPanelPage::AddLine` | `panel.cpp:1058` | panelization — the port target |
| `BM_ACTION → StartNewPanel` | `panel.cpp:1064` | captions force a new panel |
| 5-cap / `<2` / `AvatarInPanel` | `panel.cpp:1079` | clone-append vs new-panel test |
| `MakeBalloon` (balloon taxonomy) | `panel.cpp:1036` | SAY/WHISPER/THINK/ACTION → Woodring class |
| `AddReaction` (`<Chr>`) | `panel.cpp:1142` | body-only reaction line |
| `RearrangeBalloons` | `panel.cpp:959` | **empty `{ }` — no port target** |

1. **`normHeight` is disabled in v2.5-beta-1** — hardcoded `100` (`avatar.cpp:64,110`: *"we're assuming characters are the same height … Fix?!"*), so `newHeight = maxBodyHeight·(normHeight/maxNorm)` (`panel.cpp:765`) collapses to `maxBodyHeight` for every body. **Our common-height `shot.fill` target is therefore the faithful behavior, not a divergence.** §3/§Context's "per-body `GetDimInfo`, normalize" is retired; we do **not** add a per-avatar `normHeight` to the manifest.
2. **`RearrangeBalloons` is an empty stub** (`panel.cpp:959`). The "full `RearrangeBalloons` port" listed as deferred elsewhere in the project docs targets nothing and is dropped.
3. **Faithful caption rule: `BM_ACTION` unconditionally starts a new panel** (`panel.cpp:1064`). This **retires the "caption rides with its panel" divergence** recorded in §5 below. Captions get their own panel, as in Comic Chat.
4. **Panelization is un-deferred and built now.** §5's decision to sequence `page.ts` "with the mob-dialogue slice" is **superseded**. Rationale: (a) the comic pane is deliberately a *multi-party* comic (GM + NPCs as participants — the whole premise of this ADR), so packing is the **target** architecture, not a DM↔Hero edge case; (b) the panel/layout stack is a **pure function of `(bodies, speakers)`**, so it is built and **pixel-verified now against real `.avb` avatar fixtures** (2–4 bodies), fully decoupled from *when* the mapper begins authoring mob lines. The accepted cost — re-deriving the ~30 turn-indexed oracle tests to the line-stream contract — is paid here rather than deferred.

**Preserved unchanged by this amendment:** the **camera ladder** (SHOTS table, ADR 0004 §7) stays *ours* — it is semantic (chosen from event meaning), and it feeds the ported layout the fill/framing to execute; ADR 0007 §2 **fixed-panel sizing, the reflowing pane, and column count as a function of viewport width** stay as-is (confirmed 2026-07-24). The port replaces the hardcoded 2-body placement and adds panelization; it does **not** touch the pane/column model or the camera ladder.

### Coverage audit — full v2.5-beta-1 render pipeline (2026-07-24b)

A whole-pipeline enumeration (`panel.cpp`, `balloon.cpp`, `avatar.cpp`, headers) was run so the port has no silent gaps. Classification:

- **To port — panelization (`page.ts`, Phase 2):** `AddLine:1058`, `AddReaction:1142`, `MakeBalloon:1036`, `StartNewPanel`(panel.h:91), `FetchSpeaker:606`, `ReplaceBody:626`, `AvatarInPanel:655`, `Clone:562`, `RemoveLastPanel:993`, `AddPanel:1029` (append only — repaint is out of scope).
- **To port — avatar layout (`render.ts`, Phase 1):** `LayoutAvatars:726`, `IsSpeaker:822`. `OrderAvatars`/`UpdateHistoresis:753,818` stubbed stable-by-insertion-order now, ported in full with mobs.
- **Already ported (verified):** emotion→pose selection — `GetBodyFromEmotion:222,252,354,386`, `GetHeadAndBodyFromEmotion:298`, `CEmotionOpts::Add:725`, `SetNeutral` (`pose.ts` wheel + `figure.ts` join, parity vs `art/composite.ts`); single-balloon geometry — `DockAtTop`, `QueryRouteRgn`, `Overlap`, `ComputeCloudBBox`, spline/arrow (ADR 0007). `GetDimInfo`(avatar.cpp:55,77) = our `Figure` dims.
- **⚠ GAPS FOUND — fold into this port (Phase 2b), not defer:** the **multi-balloon layout driver** `LayoutBalloons:855`/`GetCloudEstimate:885`/`LayoutBalloon:925` and its helpers `GetInterveningBBox`, `AdjustRouteRgns`, `LowestPreviousBottom` (our code vertical-stacks and deferred collision, `render.ts:252,310`); and **overflow-split** `ForceFitBalloon:877`/`SplitHeight`(balloon.cpp:777,1533), absent today (`AddLine`'s overflow recursion depends on it). Both were safe to omit only under the "1–2 balloons per panel" assumption, which multi-party retires — so they are load-bearing here.
- **Named divergence:** `LayoutBalloons` seeds layout with `srand(m_seed):867`. We port the *structure* (tail-anchor to `m_arrowX`, `GetInterveningBBox` collision, shrinking `freeRect`, overflow-split) but keep a **deterministic seeded roll** rather than reproduce Comic Chat's RNG stream — the parity oracle needs determinism, and matching a 1996 chat's exact balloon pixels carries no value.
- **Out of scope (reason):** `AdjustArtToCoord:948`/`bZoomIn:788` (backdrop-zoom; camera is our SHOTS); all `Draw(CDC*)` GDI blitting (→ canvas `drawImage`), `Refresh*`/`GetScrollPage` (repaint/scroll), `OnClickHotLink`/`OnLButtonDown`/`bURLHit` (chat URL interactivity), `AddTitle`/`UpdateTitle`/`ShowInfo`/`AddStars` (chat chrome), `PageSizeInPanels`/`PreparePrintDC`/`GetPhysicalPageCount` (Windows printing; our PDF export is a separate ADR), `avatario.cpp`/`avatardl.cpp` (avatar file IO + network download), `CPose` decode/`IndexAvatar`/`CAvatarDIB` (avatar-sheet decode → this project's `art/` pipeline, §3 deferred).

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
