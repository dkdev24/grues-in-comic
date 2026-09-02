# HANDOFF.md

Cross-session state. **Read in full at session start; update at session end.**

**Scope rule — this file is a cost paid every session, so it holds only three things:** where the
project is, what to do next, and what is still undecided. Narrative → `WORKLOG.md`. Cautions →
`docs/PITFALLS.md`. Deferred work → `docs/FUTURE_WORK.md`. **Hard cap: 50 lines** — cut narrative first.

---
## Current Version
**0.33.7** · Platform: **macOS only** — this commit shipped from Windows, user-directed (below)

## Project Status
**Grues in Comic** — repo `dkdev24/grues-in-comic`, not yet public. Zork I (ZIL) modernized to a
browser-native comic adventure via an IR the engine executes. **M1–M5 ✅** (parity 151/151).
- **M6 ◐** road to 1.0.0 (repo public + website ships). Detail: `docs/DEVELOPMENT_PLAN.md` §6.
  Closed this cycle: **6.2/6.3/6.6/6.7/6.5-beta**, backdrops (110/110, ADR-backed), Hall of Fame
  (ADR 0011, deployed v0.29.0). Open: **6.1e** dialogue authoring (97/110 rooms gazetteered; the
  13 others silent by design for text), **6.4** asset separation & neutral branding, **6.5** public
  release → tag `1.0.0`.
- **ADR 0006 Slice 5** (session-recap PDF export) ☐ only open ADR slice.
**Tests:** 391 web · 54 art · 149 engine · 198 IR · parity 151/151. Pixel gate: 25/25 on macOS
(geometry verified clean on Windows this session; pixel hashes need a macOS re-run — see below).

## Last Session — two more balloon-layout fixes ported from `toonstrip`, one reverted
**On Windows** (dev machine is normally macOS-only). Ported: (1) `stackBalloons`' straddling
speech balloon could overlap a *neighbour's* head/tail (not just its own, v0.33.6's bug) — fixed
w/ `speakerCorridor`. (2) every balloon-layout constant was fixed CSS px at native size regardless
of actual panel size — scaled by `uiScale = width/UNIT.width` throughout. **Reverted:**
`toonstrip`'s corridor-preallocation fix (v0.7.10) regressed `density.test.ts` here (`fit.ts`
shares `layoutBalloons` w/ the renderer) for no benefit — this repo already has zero
`stackBalloons` fallbacks. Full reasoning: ADR 0008 "2026-09-02", `WORKLOG.md` v0.33.7. `npm
test`: every rule test green, gate geometry clean (zero pinned diff), density clean; only pixel
hashes differ (expected off macOS). **Committed + pushed from Windows on explicit user
instruction, skipping the macOS render-check** — nothing pinned moved so there's nothing for
`gate:accept`/`density:accept` to do, but items 1–2 have still never been visually confirmed.
## Next Actions
1. **Render-check items 1–2 above on macOS** when next on that machine — never visually confirmed.
2. **Verify the F19 fix at a phone width** — still open, carried from three sessions back.
3. **6.1e** dialogue authoring ◐ · **6.4** asset separation & neutral branding ☐ · **6.5** public
   release → tag `1.0.0` ☐ (needs 6.4 + the rest of 6.1) · **ADR 0006 Slice 5** PDF export ☐.
**The M6 list is open.** Absence is not a scoping decision.
## Key Paths
| Path | Purpose |
|---|---|
| `importer/`, `ir/`, `engine/`, `web/` | ZIL→IR importer, IR schema, engine core, browser shell |
| `docs/DEVELOPMENT_PLAN.md` | Authority on what to do next |
| `docs/PITFALLS.md` | Durable cautions by subsystem — read before changing code |
| `docs/FUTURE_WORK.md` | Backlog, triaged in §2.0 (category/size/impact/priority) — F3 is the open P2 |
| `docs/adr/`, `WORKLOG.md` | ADRs 0001–0011 · persistent history, newest first, never edited |
