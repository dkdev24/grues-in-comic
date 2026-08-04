# HANDOFF.md

Cross-session state. **Read in full at session start; update at session end.**

**Scope rule — this file is a cost paid every session, so it holds only three things:** where the
project is, what to do next, and what is still undecided. Session narrative → `WORKLOG.md`. Durable
cautions → `docs/PITFALLS.md`. Deferred work → `docs/FUTURE_WORK.md`. **Adding to this file is the
exception; adding to one of those three is the rule.** If it will still be true in a year, it does
not belong here. **Hard cap: 100 lines.** If an edit would cross it, cut narrative first — a fact
condensed to one clause outranks a fact told as a story. `WORKLOG.md` already has the story.

---

## Current Version
**0.26.6** · Platform: **macOS only** (2026-07-28)

## Project Status

**Grues in Comic** (was Comic-Zork) — repo `dkdev24/grues-in-comic`, not yet public. Zork I (ZIL)
modernized to a browser-native comic adventure via an IR the engine executes.

- **M1–M5 ✅** Importer, IR, engine, comic presentation. Game is completable in the browser (parity
  143/143 strict, Gates A/C/D cleared, ADRs 0004–0008 built). Detail in `WORKLOG.md`.
- **M6 ◐** — road to 1.0.0 (repo public + website ships). Detail table: `docs/DEVELOPMENT_PLAN.md` §6.
  - **6.1 (comic pane) ◐** — mechanics closed, ADR 0010 fully built (v0.24.9). **6.1e is the only open
    item**: authored dialogue, 88/110 rooms gazetteered. Open-ended; pick up on appetite.
  - **6.2 (save/load/restart), 6.3 (static site), 6.6 (`/hint`/`/help`) ✅** all closed.
  - **6.5-beta ✅** private Cloudflare Pages beta live at `grues.danielkimdev.com`, repo stays private.
  - **6.4 (asset separation), 6.5 (public 1.0.0 release) ☐** not started.
- **ADR 0006 Slice 5 (session-recap PDF export) ☐** the only open ADR slice, schedulable whenever.

**Tests:** 299 web (3 new) · 142 engine · 198 IR · parity 143/143 strict. Pixel gate: 2 geometry
diffs pending macOS re-accept (below) — 17/17 pixel hashes unaffected beyond the known non-macOS
platform mismatch.

---

## Last Session — Two mobile-UX bugs fixed (unreleased)

**Desktop lost input focus on submit.** v0.26.4's keyboard-dismiss `blur()` (`main.ts`) fired on
every layout. Gated behind `matchMedia("(max-width: 720px)")`, the breakpoint that stacks `#shell`.

**`inventory`/`look` truncated the DM's balloon to its header line.** `readAloud` (`mapper.ts`) only
read a full narration on `player-moved`; otherwise one sentence, and the engine's list format
(`"You are carrying:\n  A leaflet\n"`) splits on the newline, dropping every item. Widened the
trigger to bare `inventory`/`i`/`look`/`l` too — ADR 0009 §4 amended. `density` baseline re-accepted
(D5′ still 42.8%, in band). **Pixel gate's `wk01-p02`/`wk01-p09` geometry now differ — expected, from
`01-west-of-house.cmd`'s bare `look`s — needs `gate:accept` on macOS**, never this Windows session.
Not yet versioned or logged to `WORKLOG.md`.

## Next Actions

**We are in M6.** Stage detail, the D1–D5 decision table and the 6.1 slices live in
`docs/DEVELOPMENT_PLAN.md` §6 — this is the index, not the plan.

1. **Mobile UX ✅** — all known issues closed, including this session's desktop-focus regression. Left:
   finding a *moment* rather than an end (room markers, paged history, `Panel.turn` linking), in
   `docs/FUTURE_WORK.md`, not scheduled.
2. **6.1e — dialogue authoring.** ◐ Open-ended; no exit criterion beyond "user says it's ready."
3. **6.4 asset separation & neutral branding.** ☐ Independent of everything else.
4. **6.5 public release → tag `1.0.0`.** ☐ Needs 6.4 and the rest of M6.1's stated purpose done.
5. **ADR 0006 Slice 5 — PDF export.** ☐ Schedulable whenever. Deliberately not WYSIWYG.

**The M6 list is open.** More items land as work proceeds; absence is not a scoping decision.

---

## Standing Rules

Three that apply to most sessions. Everything else is in `docs/PITFALLS.md`.

- **Read `docs/PITFALLS.md` for the subsystem you are about to change, before you change it.** Each
  entry was paid for by a bug or a wrong released build.
- **Measure before proposing rules.** Five plausible panel-grammar proposals died that way. The
  harness replay and the `art/` corpus answer questions cheaply.
- **New mechanical-layer code reads the C++ first and cites it** (ADR 0007). Canonical source is
  `original-projects/comic-chat/v2.5-beta-1-modern/`; offline nav graph at
  `reference/comic-chat-v2.5-beta-1-modern/graphify-out/` (gitignored, rebuild *inside* that copy).

---

## Key Paths
| Path | Purpose |
|---|---|
| `importer/`, `ir/` | ZIL parser → AST; IR schema, validator, extraction → `ir/artifacts/zork1.world.json` |
| `engine/` | Engine core. Zero-dep TS; `src/events.ts` is the ADR 0002 contract as code |
| `engine/harness/` | `replay.ts` (parity oracle), `golden.ts` (normalizer), `complete.ts` (`runFullGame`) |
| `verification/` | `walkthroughs/*.cmd` + `golden/*.txt` from dfrotz |
| `web/` | Browser shell + comic renderer. `npm --prefix web run dev` → :8080. No bundler, by decision |
| `web/tools/` | `gate.ts` (pixel gate), `density.ts` (dialogue-density report), `cast-fixture.ts`, `serve.ts` |
| `art/` | Comic Chat art tooling. Format spec: `docs/AVB_FORMAT.md` (**normative**) |
| `docs/DESIGN.md` | Look & feel for site + gameplay screen — the sole visual reference |
| `docs/DEVELOPMENT_PLAN.md` | Milestones, stages, gates — **the authority on what to do next** |
| `docs/PITFALLS.md` | Durable cautions by subsystem — read the relevant section before changing code |
| `docs/FUTURE_WORK.md` | The deferred backlog + the pre-1.0.0 iteration protocol |
| `docs/adr/` | ADRs 0001–0010. 0009 governs comic pane from 6.1c; 0010 governs Hero's channel from 6.1h |
| `original-projects/`, `reference/` | Historical sources (tracked) · third-party reference (gitignored) |
| `wiki/` | Hand-authored semantic notes (`the-hero.md`, `the-guide.md`, …) |
| `WORKLOG.md` | Persistent history, one entry per version, never edited |
