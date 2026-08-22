# HANDOFF.md

Cross-session state. **Read in full at session start; update at session end.**

**Scope rule — this file is a cost paid every session, so it holds only three things:** where the
project is, what to do next, and what is still undecided. Session narrative → `WORKLOG.md`. Durable
cautions → `docs/PITFALLS.md`. Deferred work → `docs/FUTURE_WORK.md`. **Hard cap: 50 lines.** If an
edit would cross it, cut narrative first — `WORKLOG.md` already has the story.

---

## Current Version
**0.28.0** · Platform: **macOS only** (2026-07-28)

## Project Status

**Grues in Comic** — repo `dkdev24/grues-in-comic`, not yet public. Zork I (ZIL) modernized to a
browser-native comic adventure via an IR the engine executes. **M1–M5 ✅** (parity 143/143 strict).
- **M6 ◐** road to 1.0.0 (repo public + website ships). Detail: `docs/DEVELOPMENT_PLAN.md` §6.
  - **6.1e** (dialogue authoring) open — 97/110 rooms gazetteered; the other 13 (maze + 2 dead ends)
    silent by design (user confirmed skip, 2026-08-22).
  - **6.2, 6.3, 6.6, 6.7, 6.5-beta ✅** closed. **6.4, 6.5 (public release) ☐** not started.
- **ADR 0006 Slice 5** (session-recap PDF export) ☐ only open ADR slice.

**Tests:** 345 web · 54 art · 148 engine · 198 IR · parity 143/143 strict. Pixel gate: 24/24 accepted on macOS (clean), never re-accept on Windows.
## Last Session — v0.28.0 (F16 / stage 6.7): choose your cast
A new game opens on a picker — 8 Heroes, 7 DMs, validated at pack time against ADR 0004 §11. Roster
is code (`art/src/roster.ts` → `web/assets/comic/roster/`); a pick is a **runtime skin**, so
`cast.json` and the gate stay dan/tiki (24/24 clean). Cast rides in the save envelope as an *optional*
field (no version bump) plus a standing preference; `/cast` re-picks. NPCs stay with F15.

## Next Actions
Full stage detail in `docs/DEVELOPMENT_PLAN.md` §6 — this is the index, not the plan.
1. **6.1e — dialogue authoring.** ◐ Open-ended.
2. **6.4 asset separation & neutral branding.** ☐
3. **6.5 public release → tag `1.0.0`.** ☐ Needs 6.4 + rest of 6.1 done.
4. **ADR 0006 Slice 5 — PDF export.** ☐ Schedulable whenever.
5. **F4 — `SHOTS` framing for tall Heroes.** ☐ Lynnea reads fine at the opening's shots only.
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
