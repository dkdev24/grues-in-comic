# HANDOFF.md

Cross-session state. **Read in full at session start; update at session end.**

**Scope rule — this file is a cost paid every session, so it holds only three things:** where the
project is, what to do next, and what is still undecided. Session narrative → `WORKLOG.md`. Durable
cautions → `docs/PITFALLS.md`. Deferred work → `docs/FUTURE_WORK.md`. **Hard cap: 50 lines.** If an
edit would cross it, cut narrative first — `WORKLOG.md` already has the story.

---

## Current Version
**0.28.5** · Platform: **macOS only** (2026-07-28)

## Project Status

**Grues in Comic** — repo `dkdev24/grues-in-comic`, not yet public. Zork I (ZIL) modernized to a
browser-native comic adventure via an IR the engine executes. **M1–M5 ✅** (parity 151/151 strict).
- **M6 ◐** road to 1.0.0 (repo public + website ships). Detail: `docs/DEVELOPMENT_PLAN.md` §6.
  - **6.1e** (dialogue authoring) open — 97/110 rooms gazetteered; the 13 others (maze + 2 dead ends)
    silent by design (user confirmed skip, 2026-08-22). **6.2/6.3/6.6/6.7/6.5-beta ✅**; **6.4, 6.5 ☐**.
- **ADR 0006 Slice 5** (session-recap PDF export) ☐ only open ADR slice.
**Tests:** 356 web · 54 art · 149 engine · 198 IR · parity 151/151 strict. Pixel gate: 24/24 accepted on macOS (clean), never re-accept on Windows.

## Last Session — v0.28.5: a walkthrough that dies
v0.28.4 built the death beat against a synthetic fixture — nothing in the corpus dies (11 scenes quit,
the oracle wins). `13-canyon-death.cmd` adds the row: Canyon View + `jump` is the **one death that can
be strict**, since every other one draws on `<RANDOM>` and ADR 0002 keeps our own PRNG. A first draft
took the leaflet and lost strictness one turn later — `RANDOMIZE-OBJECTS` scatters what you carried,
so **the Hero must die empty-handed to die strictly.** Two things it flushed out: the goldens pinned
the *capturing machine* (dfrotz's `Loading <path>`, so `check` had been failing on 2 of 12 for
everyone else, and a home directory was heading for a public repo), and the corpus was still defined
twice (density's hand-kept array vs `readdirSync`) — F17 in miniature. Parity 143/143 → **151/151**. See `WORKLOG.md`.

## Next Actions
Full detail: `docs/DEVELOPMENT_PLAN.md` §6.
1. **6.1e** dialogue authoring ◐ · **6.4** asset separation & neutral branding ☐ · **6.5** public
   release → tag `1.0.0` ☐ (needs 6.4 + the rest of 6.1) · **ADR 0006 Slice 5** PDF export ☐.
2. **Backdrop diversity pass.** ☐ Wire `docs/backdrop-generation-plan.md` § Image 4 into `backdrop.ts`.
**The M6 list is open.** Absence is not a scoping decision.
## Key Paths
| Path | Purpose |
|---|---|
| `importer/`, `ir/`, `engine/`, `web/` | ZIL→IR importer, IR schema, engine core, browser shell |
| `docs/DEVELOPMENT_PLAN.md` | Authority on what to do next |
| `docs/PITFALLS.md` | Durable cautions by subsystem — read before changing code |
| `docs/FUTURE_WORK.md` | Backlog, triaged in §2.0 (category/size/impact/priority) — F2 Hall of Fame is the open P1 |
| `docs/adr/`, `WORKLOG.md` | ADRs 0001–0010 · persistent history, newest first, never edited |
