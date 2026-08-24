# HANDOFF.md

Cross-session state. **Read in full at session start; update at session end.**

**Scope rule — this file is a cost paid every session, so it holds only three things:** where the
project is, what to do next, and what is still undecided. Narrative → `WORKLOG.md`. Cautions →
`docs/PITFALLS.md`. Deferred work → `docs/FUTURE_WORK.md`. **Hard cap: 50 lines** — cut narrative first.

---

## Current Version
**0.31.0** · Platform: **macOS only** (2026-07-28)

## Project Status

**Grues in Comic** — repo `dkdev24/grues-in-comic`, not yet public. Zork I (ZIL) modernized to a browser-native comic adventure via an IR the engine executes. **M1–M5 ✅** (parity 151/151).
- **M6 ◐** road to 1.0.0 (repo public + website ships). Detail: `docs/DEVELOPMENT_PLAN.md` §6.
  - **6.1e** (dialogue authoring) open — 97/110 rooms gazetteered; the 13 others (maze + 2 dead ends)
    silent by design (user confirmed skip, 2026-08-22). **6.2/6.3/6.6/6.7/6.5-beta ✅**; **6.4, 6.5 ☐**.
  - **6.8 ✅** Hall of Fame board — **ADR 0011**; **deployed and working** (v0.29.0), column
    headings and one CTA per screenful at v0.29.1.
- **ADR 0006 Slice 5** (session-recap PDF export) ☐ only open ADR slice.
**Tests:** 385 web · 54 art · 149 engine · 198 IR · parity 151/151. Pixel gate: 24/24 on macOS, never re-accept on Windows.

## Last Session — early-game vector backdrops + A/B harness
Built `art/vector/kit.mjs` (Scene, `hatch()`, trunks, walls, tufts, rocks) on the v0.30.0 engine and
drew **ten early-game scenes** (white house ×4, forest ×4, clearing/grating, barrow) in
`art/vector/scenes/`. 1-bit at 512/264, ink **.251–.378** vs originals' .261–.526; `ab.ts` builds
the blind A/B against the shipped plates (published as an Artifact).
A composition-led retune (vignette framing, stipple skies, conifers, 3/4 house) was **rejected as
worse and reverted** — do not redo it without a new brief. Nothing wired into `backdrop.ts`; no
shipped asset changed. Draw-order rule → `PITFALLS.md`.
## Next Actions
Full detail: `docs/DEVELOPMENT_PLAN.md` §6.
1. **6.1e** dialogue authoring ◐ · **6.4** asset separation & neutral branding ☐ · **6.5** public
   release → tag `1.0.0` ☐ (needs 6.4 + the rest of 6.1) · **ADR 0006 Slice 5** PDF export ☐.
2. **Watch the board fill, then decide F19** — `--mono` is undefined in `tokens.css`, so every
   static page renders serif; the one-line fix re-types the whole site and wants a look.
3. **Backdrop diversity pass.** ☐ 11 backdrops + wiring `§ Image 4` into `backdrop.ts`. Vector route
   unproven — next session checks more cases first. Run `npm --prefix art run dump:bgb` before
   judging: `reference/` is gitignored, so the originals are not in a fresh clone.
**The M6 list is open.** Absence is not a scoping decision.
## Key Paths
| Path | Purpose |
|---|---|
| `importer/`, `ir/`, `engine/`, `web/` | ZIL→IR importer, IR schema, engine core, browser shell |
| `docs/DEVELOPMENT_PLAN.md` | Authority on what to do next |
| `docs/PITFALLS.md` | Durable cautions by subsystem — read before changing code |
| `docs/FUTURE_WORK.md` | Backlog, triaged in §2.0 (category/size/impact/priority) — F3 is the open P2 |
| `docs/adr/`, `WORKLOG.md` | ADRs 0001–0011 · persistent history, newest first, never edited |
