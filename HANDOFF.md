# HANDOFF.md

Cross-session state. **Read in full at session start; update at session end.**

**Scope rule — this file is a cost paid every session, so it holds only three things:** where the
project is, what to do next, and what is still undecided. Narrative → `WORKLOG.md`. Cautions →
`docs/PITFALLS.md`. Deferred work → `docs/FUTURE_WORK.md`. **Hard cap: 50 lines** — cut narrative first.

---
## Current Version
**0.33.6** · Platform: **macOS only** (2026-07-28)

## Project Status
**Grues in Comic** — repo `dkdev24/grues-in-comic`, not yet public. Zork I (ZIL) modernized to a
browser-native comic adventure via an IR the engine executes. **M1–M5 ✅** (parity 151/151).
- **M6 ◐** road to 1.0.0 (repo public + website ships). Detail: `docs/DEVELOPMENT_PLAN.md` §6.
  Closed this cycle: **6.2/6.3/6.6/6.7/6.5-beta**, backdrops (110/110, ADR-backed), Hall of Fame
  (ADR 0011, deployed v0.29.0). Open: **6.1e** dialogue authoring (97/110 rooms gazetteered; the
  13 others silent by design for text), **6.4** asset separation & neutral branding, **6.5** public
  release → tag `1.0.0`.
- **ADR 0006 Slice 5** (session-recap PDF export) ☐ only open ADR slice.
**Tests:** 391 web · 54 art · 149 engine · 198 IR · parity 151/151. Pixel gate: 25/25 on macOS, never re-accept on Windows.

## Last Session — v0.33.5's fix wasn't enough; `stackBalloons` fallback also widened
User reported the toonstrip-embedded strip still looked narrow after v0.33.5. Root cause was
deeper: at real embed size (363×309, below this repo's own `UNIT` 400×340 gate fixtures), the
driver refuses most panels and falls back to `stackBalloons`, which had its own untouched
narrowing (`cap = width*0.66`, `WIDTH_BIAS = 0.5`) — v0.33.5's roll fix never reached it, and
even made one panel *worse* by making the fallback more likely. Widened both (`cap = width-20`,
`WIDTH_BIAS = 0.85`), named divergence ADR 0008 "2026-09-01b". No gate/density re-accept needed —
none of the 25 pinned cases hit this fallback. Full writeup: `WORKLOG.md` v0.33.6. Also wrote
`docs/TOONSTRIP_SYNC.md` (the cross-repo sync process) and a new pixel-gate PITFALLS note: the
gate's `UNIT`-sized fixtures don't prove the driver fits at every real embed size.
## Next Actions
Full detail: `docs/DEVELOPMENT_PLAN.md` §6.
1. **Verify the F19 fix at a phone width** — still open, carried from three sessions back.
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
