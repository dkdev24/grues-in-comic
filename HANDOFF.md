# HANDOFF.md

Cross-session state. **Read in full at session start; update at session end.**

**Scope rule — this file is a cost paid every session, so it holds only three things:** where the
project is, what to do next, and what is still undecided. Narrative → `WORKLOG.md`. Cautions →
`docs/PITFALLS.md`. Deferred work → `docs/FUTURE_WORK.md`. **Hard cap: 50 lines** — cut narrative first.

---
## Current Version
**0.33.4** · Platform: **macOS only** (2026-07-28)

## Project Status
**Grues in Comic** — repo `dkdev24/grues-in-comic`, not yet public. Zork I (ZIL) modernized to a
browser-native comic adventure via an IR the engine executes. **M1–M5 ✅** (parity 151/151).
- **M6 ◐** road to 1.0.0 (repo public + website ships). Detail: `docs/DEVELOPMENT_PLAN.md` §6.
  Closed this cycle: **6.2/6.3/6.6/6.7/6.5-beta**, backdrops (110/110, ADR-backed), Hall of Fame
  (ADR 0011, deployed v0.29.0). Open: **6.1e** dialogue authoring (97/110 rooms gazetteered; the
  13 others silent by design for text), **6.4** asset separation & neutral branding, **6.5** public
  release → tag `1.0.0`.
- **ADR 0006 Slice 5** (session-recap PDF export) ☐ only open ADR slice.
**Tests:** 385 web · 54 art · 149 engine · 198 IR · parity 151/151. Pixel gate: 24/24 on macOS, never re-accept on Windows.

## Last Session — TL;DR comic-strip harness + derived "toonstrip" OSS plan
Built `web/tools/render-tldr{,-core,-font}.ts` (dev-only): hand-authored `Panel`s straight into
`renderPanel`, bypassing `mapper.ts`, for a 4-panel EN/KO TL;DR strip from the shipped cast/backdrops
(`npm run render:tldr [en|ko]`, `web/`). Fixed a Korean tofu bug along the way — aliasing a Hangul
font onto the *existing* "Comic Sans MS" family silently loses to macOS's Latin-only face
(legible-looking tofu, only caught by OCR, not by eye) — by having the tool patch
`BALLOON_FONT`/`TITLE_FONT` to an uncollided name only for a `ko` child-process run, reverting via
`git checkout` in a `finally`; `comic/{balloon,render}.ts` carry no diff at rest.
Then scoped a **separate OSS project** ("toonstrip") generalizing this repo's comic renderer
(`comic/*` minus `mapper.ts`/`affect.ts`, `comic-view.ts`'s canvas-pool, `art/`'s asset pipeline)
into an embeddable Astro-first widget, no AI/inference in scope. Dev plan drafted here, then
**moved by the user into toonstrip's own repo** — nothing left to reference in this one.
v0.33.4 (no bump — dev tooling only, no product change).
## Next Actions
Full detail: `docs/DEVELOPMENT_PLAN.md` §6.
1. **Verify the F19 fix at a phone width** — still open, carried from two sessions back.
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
