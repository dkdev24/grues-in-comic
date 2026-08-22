# HANDOFF.md

Cross-session state. **Read in full at session start; update at session end.**

**Scope rule — this file is a cost paid every session, so it holds only three things:** where the
project is, what to do next, and what is still undecided. Session narrative → `WORKLOG.md`. Durable
cautions → `docs/PITFALLS.md`. Deferred work → `docs/FUTURE_WORK.md`. **Hard cap: 50 lines.** If an
edit would cross it, cut narrative first — `WORKLOG.md` already has the story.

---

## Current Version
**0.28.2** · Platform: **macOS only** (2026-07-28)

## Project Status

**Grues in Comic** — repo `dkdev24/grues-in-comic`, not yet public. Zork I (ZIL) modernized to a
browser-native comic adventure via an IR the engine executes. **M1–M5 ✅** (parity 143/143 strict).
- **M6 ◐** road to 1.0.0 (repo public + website ships). Detail: `docs/DEVELOPMENT_PLAN.md` §6.
  - **6.1e** (dialogue authoring) open — 97/110 rooms gazetteered; the 13 others (maze + 2 dead ends)
    silent by design (user confirmed skip, 2026-08-22). **6.2/6.3/6.6/6.7/6.5-beta ✅**; **6.4, 6.5 ☐**.
- **ADR 0006 Slice 5** (session-recap PDF export) ☐ only open ADR slice.
**Tests:** 353 web · 54 art · 148 engine · 198 IR · parity 143/143 strict. Pixel gate: 24/24 accepted on macOS (clean), never re-accept on Windows.

## Last Session — v0.28.2 (F4, the `reaction` rung): the death frame is its own frame
The rung read as a `close-up` because it drew the *previous turn's exchange*: `addReaction`
clone-appends and only the forward `<Brk>` was ported, so the staging body joined the open panel
(6 of 11 walkthroughs). A break on both sides fixes it; guarding `reactions` on `lines.length > 0`
stops the ending closing on a wordless shrug. Behind it: **with a speech balloon present no rung can
be tighter than a `close-up`** (headroom + head cap), so a tight rung must be wordless. `SHOTS` rungs
are now `fill`+`reveal` or `headFill`+`headTop`; `reaction` is head-framed, same for all 8 Heroes.
Gate 24/24 re-accepted (two renamed), density +6 panels, both D5 targets in band. See `WORKLOG.md`.

## Next Actions
Full detail: `docs/DEVELOPMENT_PLAN.md` §6.
1. **6.1e** dialogue authoring ◐ · **6.4** asset separation & neutral branding ☐ · **6.5** public
   release → tag `1.0.0` ☐ (needs 6.4 + the rest of 6.1) · **ADR 0006 Slice 5** PDF export ☐.
2. **F17 — corpus tests replay the full game naively; it dies on command 29** (60% of the corpus).
   ☐ **P1.** One-line fix, but it falsifies ADR 0004 §10's parser-miss claim → needs an amendment.
3. **F18 — the victory draws four talking `reaction` panels.** ☐ Exposed by F17. A framing call.
4. **Backdrop diversity pass.** ☐ Wire `docs/backdrop-generation-plan.md` § Image 4 into `backdrop.ts`.

**The M6 list is open.** Absence is not a scoping decision.
## Key Paths
| Path | Purpose |
|---|---|
| `importer/`, `ir/`, `engine/`, `web/` | ZIL→IR importer, IR schema, engine core, browser shell |
| `docs/DEVELOPMENT_PLAN.md` | Authority on what to do next |
| `docs/PITFALLS.md` | Durable cautions by subsystem — read before changing code |
| `docs/FUTURE_WORK.md` | Backlog, triaged in §2.0 (category/size/impact/priority) — F2 Hall of Fame is the open P1 |
| `docs/adr/`, `WORKLOG.md` | ADRs 0001–0010 · persistent history, newest first, never edited |
