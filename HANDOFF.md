# HANDOFF.md

Cross-session state. **Read in full at session start; update at session end.**

**Scope rule — this file is a cost paid every session, so it holds only three things:** where the
project is, what to do next, and what is still undecided. Narrative → `WORKLOG.md`. Cautions →
`docs/PITFALLS.md`. Deferred work → `docs/FUTURE_WORK.md`. **Hard cap: 50 lines** — cut narrative first.

---

## Current Version
**0.33.2** · Platform: **macOS only** (2026-07-28)

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

## Last Session — F19 fixed: static pages now actually render monospace
`--mono` declared in `tokens.css` (`"SF Mono", "Cascadia Mono", "DejaVu Sans Mono", Menlo, Consolas,
monospace` — the stack `play/style.css` already used), so `body`'s `font-family: var(--mono)` in
`site.css` no longer falls back to serif. `.hof-row`'s redundant explicit stack removed. Same pass
added a site-wide `:focus-visible` ring (`var(--accent)`) and `overflow-x: clip` on `html`/`body` —
both gaps DESIGN.md doesn't cover but leaves no reason not to close. `play/` untouched, per DESIGN.md
§6's "do not restyle the panes." **Not yet visually verified on a phone or in a browser** — do that
before treating this as fully closed. Full detail: `docs/FUTURE_WORK.md` F19 (now struck).
## Next Actions
Full detail: `docs/DEVELOPMENT_PLAN.md` §6.
1. **Visually verify the F19 fix** — load the static pages, confirm monospace + focus ring read
   right, at a phone width too.
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
