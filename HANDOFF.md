# HANDOFF.md

Cross-session state. **Read in full at session start; update at session end.**

**Scope rule — this file is a cost paid every session, so it holds only three things:** where the
project is, what to do next, and what is still undecided. Narrative → `WORKLOG.md`. Cautions →
`docs/PITFALLS.md`. Deferred work → `docs/FUTURE_WORK.md`. **Hard cap: 50 lines** — cut narrative first.

---
## Current Version
**0.33.9** · Platform: Windows this session

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
(this session ran everything on Windows — pixel hashes untouched, see below).

## Last Session — npm → pnpm migration across all six packages (v0.33.9)
All six independent npm projects (`art`, `art/vector`, `engine`, `importer`, `ir`, `web` — no
workspace linkage between them) moved to pnpm: `pnpm import` per package preserved exact resolved
versions, `packageManager: pnpm@11.1.1` pinned, native postinstalls approved via
`pnpm-workspace.yaml` (new, one per package — keep committed). `art/vector` nesting inside `art/`
silently broke its install once `art/` got a workspace file; fixed by giving `art/vector` its own.
Also added `tsx` as an explicit devDependency there (was implicit via `npx` auto-download).
Updated every operational doc/script's `npm`/`npx` → `pnpm` (`-C <dir>` for `--prefix`). Full
detail and verification results: `WORKLOG.md` v0.33.9. **Pushed.** Cloudflare Pages dashboard
build command updated to the pnpm form by the user (confirmed correct against §6.5-beta below).
## Next Actions
1. **Render-check v0.33.7 items 1–2 on macOS** — never visually confirmed (shipped from Windows).
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
