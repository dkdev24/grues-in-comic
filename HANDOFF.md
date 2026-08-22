# HANDOFF.md

Cross-session state. **Read in full at session start; update at session end.**

**Scope rule — this file is a cost paid every session, so it holds only three things:** where the
project is, what to do next, and what is still undecided. Session narrative → `WORKLOG.md`. Durable
cautions → `docs/PITFALLS.md`. Deferred work → `docs/FUTURE_WORK.md`. **Hard cap: 50 lines.** If an
edit would cross it, cut narrative first — `WORKLOG.md` already has the story.

---

## Current Version
**0.28.1** · Platform: **macOS only** (2026-07-28)

## Project Status

**Grues in Comic** — repo `dkdev24/grues-in-comic`, not yet public. Zork I (ZIL) modernized to a
browser-native comic adventure via an IR the engine executes. **M1–M5 ✅** (parity 143/143 strict).
- **M6 ◐** road to 1.0.0 (repo public + website ships). Detail: `docs/DEVELOPMENT_PLAN.md` §6.
  - **6.1e** (dialogue authoring) open — 97/110 rooms gazetteered; the 13 others (maze + 2 dead ends)
    silent by design (user confirmed skip, 2026-08-22). **6.2/6.3/6.6/6.7/6.5-beta ✅**; **6.4, 6.5 ☐**.
- **ADR 0006 Slice 5** (session-recap PDF export) ☐ only open ADR slice.
**Tests:** 349 web · 54 art · 148 engine · 198 IR · parity 143/143 strict. Pixel gate: 24/24 accepted on macOS (clean), never re-accept on Windows.

## Last Session — v0.28.1 (F4, tall-Hero half): a close-up means the same thing for everyone
`SHOTS.fill` scales by *body* height; a reader reads closeness off the *head*, which the roster
varies far more. `MAX_HEAD_HEIGHT` caps the head *after* layout (`applyHeadroom`): `close-up` chins
went from 81–91% of the panel (tiki's jaw at 107%, off-frame) to 81–82% roster-wide, packed Hero
byte-identical, 6 gate cases re-accepted after looking, density unchanged. New harness
`web/tools/shots-grid.ts` — one rung across every Hero, geometry printed. Full story: `WORKLOG.md`.

## Next Actions
Full stage detail in `docs/DEVELOPMENT_PLAN.md` §6 — this is the index, not the plan.
1. **6.1e — dialogue authoring.** ◐ Open-ended.
2. **6.4 asset separation & neutral branding.** ☐
3. **6.5 public release → tag `1.0.0`.** ☐ Needs 6.4 + rest of 6.1 done.
4. **ADR 0006 Slice 5 — PDF export.** ☐ Schedulable whenever.
5. **F4 — `reaction` is not a reaction shot.** ◐ fill 2.1 never survives two bodies (row shrink pins
   it ~1.05), so game-over renders as `close-up`. Wants a decision, not a number.
6. **Backdrop diversity pass.** ☐ Wire `docs/backdrop-generation-plan.md` § Image 4 into `backdrop.ts`.

**The M6 list is open.** More items land as work proceeds; absence is not a scoping decision.
## Key Paths
| Path | Purpose |
|---|---|
| `importer/`, `ir/`, `engine/`, `web/` | ZIL→IR importer, IR schema, engine core, browser shell |
| `docs/DEVELOPMENT_PLAN.md` | Authority on what to do next |
| `docs/PITFALLS.md` | Durable cautions by subsystem — read before changing code |
| `docs/FUTURE_WORK.md` | Backlog, triaged in §2.0 (category/size/impact/priority) — F2 Hall of Fame is the open P1 |
| `docs/adr/`, `WORKLOG.md` | ADRs 0001–0010 · persistent history, newest first, never edited |
