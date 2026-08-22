# HANDOFF.md

Cross-session state. **Read in full at session start; update at session end.**

**Scope rule — this file is a cost paid every session, so it holds only three things:** where the
project is, what to do next, and what is still undecided. Session narrative → `WORKLOG.md`. Durable
cautions → `docs/PITFALLS.md`. Deferred work → `docs/FUTURE_WORK.md`. **Hard cap: 50 lines.** If an
edit would cross it, cut narrative first — `WORKLOG.md` already has the story.

---

## Current Version
**0.28.4** · Platform: **macOS only** (2026-07-28)

## Project Status

**Grues in Comic** — repo `dkdev24/grues-in-comic`, not yet public. Zork I (ZIL) modernized to a
browser-native comic adventure via an IR the engine executes. **M1–M5 ✅** (parity 143/143 strict).
- **M6 ◐** road to 1.0.0 (repo public + website ships). Detail: `docs/DEVELOPMENT_PLAN.md` §6.
  - **6.1e** (dialogue authoring) open — 97/110 rooms gazetteered; the 13 others (maze + 2 dead ends)
    silent by design (user confirmed skip, 2026-08-22). **6.2/6.3/6.6/6.7/6.5-beta ✅**; **6.4, 6.5 ☐**.
- **ADR 0006 Slice 5** (session-recap PDF export) ☐ only open ADR slice.
**Tests:** 356 web · 54 art · 148 engine · 198 IR · parity 143/143 strict. Pixel gate: 24/24 accepted on macOS (clean), never re-accept on Windows.

## Last Session — v0.28.4 (F18): the comic finally notices when you die
Filed as "the victory draws six talking `reaction` panels"; the cause was larger. **The rung had
never fired on a death.** `game-over` fires on a quit, a win or a *final* death; an ordinary death
ends a life and emits nothing — so `reaction` and the SCARED `death` marker both fired on 11 quits
and no deaths. With a balloon over it nothing can be tighter than a `close-up`, so a tight rung must
be a *frame*: **§7 amended — rung 1 leaves the ladder**, `reaction` is a staged wordless frame naming
its own camera (new per-line `PageLine.camera`). **§10 amended — `death` fires on the outcome or
ZIL's banner** (no new event); a quit keeps the frame, loses the marker. Also turned on `panelRoom`'s
never-run death machinery and a latent `clonePanel` box bug. Gate +1 case, density +1 panel.

## Next Actions
Full detail: `docs/DEVELOPMENT_PLAN.md` §6.
1. **6.1e** dialogue authoring ◐ · **6.4** asset separation & neutral branding ☐ · **6.5** public
   release → tag `1.0.0` ☐ (needs 6.4 + the rest of 6.1) · **ADR 0006 Slice 5** PDF export ☐.
2. **No walkthrough dies.** ☐ The death beat now exists but no corpus row exercises it — only a
   synthetic fixture does. A death walkthrough would need a dfrotz golden; the user's call.
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
