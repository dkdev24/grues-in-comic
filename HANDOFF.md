# HANDOFF.md

Cross-session state. **Read in full at session start; update at session end.**

**Scope rule — this file is a cost paid every session, so it holds only three things:** where the
project is, what to do next, and what is still undecided. Session narrative → `WORKLOG.md`. Durable
cautions → `docs/PITFALLS.md`. Deferred work → `docs/FUTURE_WORK.md`. **Hard cap: 50 lines.** If an
edit would cross it, cut narrative first — `WORKLOG.md` already has the story.

---

## Current Version
**0.28.3** · Platform: **macOS only** (2026-07-28)

## Project Status

**Grues in Comic** — repo `dkdev24/grues-in-comic`, not yet public. Zork I (ZIL) modernized to a
browser-native comic adventure via an IR the engine executes. **M1–M5 ✅** (parity 143/143 strict).
- **M6 ◐** road to 1.0.0 (repo public + website ships). Detail: `docs/DEVELOPMENT_PLAN.md` §6.
  - **6.1e** (dialogue authoring) open — 97/110 rooms gazetteered; the 13 others (maze + 2 dead ends)
    silent by design (user confirmed skip, 2026-08-22). **6.2/6.3/6.6/6.7/6.5-beta ✅**; **6.4, 6.5 ☐**.
- **ADR 0006 Slice 5** (session-recap PDF export) ☐ only open ADR slice.
**Tests:** 354 web · 54 art · 148 engine · 198 IR · parity 143/143 strict. Pixel gate: 24/24 accepted on macOS (clean), never re-accept on Windows.

## Last Session — v0.28.3 (F17): the Hero is not, in fact, mostly annoyed
`12-full-game.cmd` does not stop short, it **dies on command 29** — a fixed list authored against
dfrotz's draw, replayed under our own PRNG (ADR 0002), so the troll wins and 254 of the next 375
commands bounce off walls — 60% of the corpus. `density.ts` fixed this at M6.1f and **nothing else
shared the fix**, so `mapper.test.ts` asserted every corpus-wide claim over a flail. It cost an ADR
claim: **ADR 0004 §10 is amended** — "the Hero's most common emotion is exasperation at the parser"
withdrawn (`parser-miss` 12.3%→1.6% per turn, `blocked-exit` 24.7%→**0%**); table, priorities and
ordering untouched. `commandsOf` now exported from `density.ts`; F14 re-rated. See `WORKLOG.md`.

## Next Actions
Full detail: `docs/DEVELOPMENT_PLAN.md` §6.
1. **6.1e** dialogue authoring ◐ · **6.4** asset separation & neutral branding ☐ · **6.5** public
   release → tag `1.0.0` ☐ (needs 6.4 + the rest of 6.1) · **ADR 0006 Slice 5** PDF export ☐.
2. **F18 — the victory draws six `reaction` panels, none wordless.** ☐ Pinned by a test. A framing
   call: a portrait *after* the speech, or rung 1 yields to prose on victory only?
3. **Backdrop diversity pass.** ☐ Wire `docs/backdrop-generation-plan.md` § Image 4 into `backdrop.ts`.

**The M6 list is open.** Absence is not a scoping decision.
## Key Paths
| Path | Purpose |
|---|---|
| `importer/`, `ir/`, `engine/`, `web/` | ZIL→IR importer, IR schema, engine core, browser shell |
| `docs/DEVELOPMENT_PLAN.md` | Authority on what to do next |
| `docs/PITFALLS.md` | Durable cautions by subsystem — read before changing code |
| `docs/FUTURE_WORK.md` | Backlog, triaged in §2.0 (category/size/impact/priority) — F2 Hall of Fame is the open P1 |
| `docs/adr/`, `WORKLOG.md` | ADRs 0001–0010 · persistent history, newest first, never edited |
