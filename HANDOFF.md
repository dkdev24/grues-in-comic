# HANDOFF.md

Cross-session state. **Read in full at session start; update at session end.**

**Scope rule — this file is a cost paid every session, so it holds only three things:** where the
project is, what to do next, and what is still undecided. Narrative → `WORKLOG.md`. Cautions →
`docs/PITFALLS.md`. Deferred work → `docs/FUTURE_WORK.md`. **Hard cap: 50 lines** — cut narrative first.

---
## Current Version
**0.33.11** (Node 24 toolchain) · Platform: macOS this session

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

## Last Session — AEO/SEO touch-ups (2026-10-31, pushed 15:17 KST per Daniel's approval)
Stale parity figure on the public site fixed to 151/151 strict turns (`web/index.html` thesis, `web/about.html` parity section — the old "143 walkthroughs" predates WORKLOG's 143→151 update); `web/sitemap.xml` regenerated via `web/tools/build-sitemap.ts` (run with node directly — package.json has no scripts, no tsx/node_modules on this VM); `web/play/index.html` got a meta description matching the other pages' tone. Historical 143/143 references in `docs/`, `CHANGELOG.md`, `WORKLOG.md`, `web/changelog.html` left alone (accurate for their versions). HTML tag balance + sitemap XML validity checked. Committed locally as `d9b02e6`; **push needs Daniel's approval** (main = production deploy).
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
