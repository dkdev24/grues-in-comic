# HANDOFF.md

Cross-session state. **Read in full at session start; update at session end.**

**Scope rule — this file is a cost paid every session, so it holds only three things:** where the
project is, what to do next, and what is still undecided. Narrative → `WORKLOG.md`. Cautions →
`docs/PITFALLS.md`. Deferred work → `docs/FUTURE_WORK.md`. **Hard cap: 50 lines** — cut narrative first.

---

## Current Version
**0.33.3** · Platform: **macOS only** (2026-07-28)

## Project Status

**Grues in Comic** — repo `dkdev24/grues-in-comic`, not yet public. Zork I (ZIL) modernized to a browser-native comic adventure via an IR the engine executes. **M1–M5 ✅** (parity 151/151).
- **M6 ◐** road to 1.0.0 (repo public + website ships). Detail: `docs/DEVELOPMENT_PLAN.md` §6.
  - **6.1e** (dialogue authoring) open — 97/110 rooms gazetteered; the 13 others (maze + 2 dead ends)
    silent by design **for text** (confirmed 2026-08-22 — unaffected by the backdrop art now being
    1:1). **6.2/6.3/6.6/6.7/6.5-beta ✅**; **6.4, 6.5 ☐**.
  - **6.8 ✅** Hall of Fame board — **ADR 0011**; **deployed and working** (v0.29.0), column
    headings and one CTA per screenful at v0.29.1.
  - **Backdrops ✅ 110/110, zero sharing** (v0.33.0), including the maze — see
    `docs/backdrop-generation-plan.md`; nothing left here unless new rooms are added.
- **ADR 0006 Slice 5** (session-recap PDF export) ☐ only open ADR slice.
**Tests:** 385 web · 54 art · 149 engine · 198 IR · parity 151/151. Pixel gate: 24/24 on macOS, never re-accept on Windows.

## Last Session — Hall of Fame sweep fixed: capacity-based, not age-based
User reported the board emptying ~a day after every playtest. Cause: the sweep deleted any `playing`
row past a 24h `last_seen`, and with ~0 wins ever recorded, every row is `playing` — so the whole
board reliably emptied a day after each session (not a Cloudflare/D1 deploy reset). Amended ADR 0011
§2: `playing` rows now sweep only past `PLAYING_CAP` (20), oldest-first, and only if also older than
`SWEEP_SECONDS` (30 days, was 24h) — `functions/api/hof-core.ts` + `hof.ts`. `won` rows still never
swept. Tests + typecheck pass (pixel-gate failure on Windows is pre-existing/expected). v0.33.3.
## Next Actions
Full detail: `docs/DEVELOPMENT_PLAN.md` §6.
1. **Verify the F19 fix at a phone width** — still open from last session.
2. **6.1e** dialogue authoring ◐ · **6.4** asset separation & neutral branding ☐ · **6.5** public
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
