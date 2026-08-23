# HANDOFF.md

Cross-session state. **Read in full at session start; update at session end.**

**Scope rule — this file is a cost paid every session, so it holds only three things:** where the
project is, what to do next, and what is still undecided. Session narrative → `WORKLOG.md`. Durable
cautions → `docs/PITFALLS.md`. Deferred work → `docs/FUTURE_WORK.md`. **Hard cap: 50 lines.** If an
edit would cross it, cut narrative first — `WORKLOG.md` already has the story.

---

## Current Version
**0.29.0** · Platform: **macOS only** (2026-07-28)

## Project Status

**Grues in Comic** — repo `dkdev24/grues-in-comic`, not yet public. Zork I (ZIL) modernized to a browser-native comic adventure via an IR the engine executes. **M1–M5 ✅** (parity 151/151).
- **M6 ◐** road to 1.0.0 (repo public + website ships). Detail: `docs/DEVELOPMENT_PLAN.md` §6.
  - **6.1e** (dialogue authoring) open — 97/110 rooms gazetteered; the 13 others (maze + 2 dead ends)
    silent by design (user confirmed skip, 2026-08-22). **6.2/6.3/6.6/6.7/6.5-beta ✅**; **6.4, 6.5 ☐**.
  - **6.8 ☑ built** Hall of Fame board — **ADR 0011**; all five substages done (D1 `grues-hof`,
    `functions/api/hof.ts`, picker fields, client, board). **Not deployed** — see Next Actions.
- **ADR 0006 Slice 5** (session-recap PDF export) ☐ only open ADR slice.
**Tests:** 385 web · 54 art · 149 engine · 198 IR · parity 151/151 strict. Pixel gate: 24/24 accepted on macOS (clean), never re-accept on Windows.

## Last Session — v0.29.0: the Hall of Fame
F2 was re-shaped before it was built: **nobody has finished the game**, so a winners-only board would
render empty forever and read as a dead site. It is a **recent-runs** board — every started run is a
row, live ones badged `PLAYING NOW`, winners on top by moves — and the name moves to the **cast
picker**, optional and `Anonymous` by default, which inverts the consent shape and buys three
obligations (non-identifying row, one line of disclosure, a real opt-out). **ADR 0011** holds all
six decisions; 6.8a–6.8e are built and read in a browser against a local D1. Released as **v0.29.0**; the push is what deploys it.
Also filed: **F19** — every static page has rendered serif since it shipped.

## Next Actions
Full detail: `docs/DEVELOPMENT_PLAN.md` §6.
1. **6.1e** dialogue authoring ◐ · **6.4** asset separation & neutral branding ☐ · **6.5** public
   release → tag `1.0.0` ☐ (needs 6.4 + the rest of 6.1) · **ADR 0006 Slice 5** PDF export ☐.
2. **Deploy 6.8** — commit, push, then **watch that first build**: the root `wrangler.toml` now
   owns build output + bindings, and the D1 binding must reach the Pages project for `/api/hof`.
3. **Backdrop diversity pass.** ☐ Wire `docs/backdrop-generation-plan.md` § Image 4 into `backdrop.ts`.
**The M6 list is open.** Absence is not a scoping decision.
## Key Paths
| Path | Purpose |
|---|---|
| `importer/`, `ir/`, `engine/`, `web/` | ZIL→IR importer, IR schema, engine core, browser shell |
| `docs/DEVELOPMENT_PLAN.md` | Authority on what to do next |
| `docs/PITFALLS.md` | Durable cautions by subsystem — read before changing code |
| `docs/FUTURE_WORK.md` | Backlog, triaged in §2.0 (category/size/impact/priority) — F3 is the open P2 |
| `docs/adr/`, `WORKLOG.md` | ADRs 0001–0011 · persistent history, newest first, never edited |
