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
**0.27.3** · Platform: **macOS only** (2026-07-28)

## Project Status

**Grues in Comic** (was Comic-Zork) — repo `dkdev24/grues-in-comic`, not yet public. Zork I (ZIL)
modernized to a browser-native comic adventure via an IR the engine executes.

- **M1–M5 ✅** Importer, IR, engine, comic presentation. Game is completable in the browser (parity
  143/143 strict, Gates A/C/D cleared, ADRs 0004–0008 built). Detail in `WORKLOG.md`.
- **M6 ◐** — road to 1.0.0 (repo public + website ships). Detail table: `docs/DEVELOPMENT_PLAN.md` §6.
  - **6.1 (comic pane) ◐** — mechanics closed, ADR 0010 fully built (v0.24.9). **6.1e is the only open
    item**: authored dialogue, 88/110 rooms gazetteered. Open-ended; pick up on appetite.
  - **6.2, 6.3, 6.6 ✅** closed. **6.5-beta ✅** private Pages beta at `grues.danielkimdev.com`.
  - **6.4 (asset separation), 6.5 (public 1.0.0 release) ☐** not started.
- **ADR 0006 Slice 5 (session-recap PDF export) ☐** the only open ADR slice, schedulable whenever.

**Tests:** 331 web · 147 engine · 198 IR · parity 143/143 strict. Pixel gate: 24/24 accepted on macOS
(clean), never re-accept on Windows.

---

## Last Session — v0.27.3, Umami events for game-over and score milestones (in `WORKLOG.md`)

**Two new events beyond the existing "start playing" click.** `web/src/analytics.ts` (new):
`track()` wraps `window.umami?.track()` (no-op if blocked/unloaded — can't affect gameplay);
`crossedMilestones(prevScore, newScore)` is pure, tests in `web/test/analytics.test.ts`. Wired into
`play()` in `main.ts` (never `replay()`, so a resumed session's history can't double-count on
reload): `game-over` carries `{ outcome, score, moves }`; `score-milestone` fires at 25/50/75/100%
of Zork I's 350-point max, carrying `{ score, moves }`. `trackedScore` syncs to the resumed score
right after `resume()` so a reload past an already-crossed milestone can't refire it. 331/331 web
tests pass, `tsc`/`build` clean. Live-browser check blocked by this sandbox's network restrictions
(external Umami script hung headless Chrome) — not a code concern.

**Prior session (v0.27.2): `robots.txt`, `sitemap.xml`, real `/changelog` detail** — full account in
`WORKLOG.md`. Still open from it: Cloudflare "Markdown for Agents" needs a paid zone plan — check
`danielkimdev.com`'s tier before revisiting.

## Next Actions

**We are in M6.** Stage detail, the D1–D5 decision table and the 6.1 slices live in
`docs/DEVELOPMENT_PLAN.md` §6 — this is the index, not the plan.

1. **6.1e — dialogue authoring.** ◐ Open-ended; no exit criterion beyond "user says it's ready."
2. **6.4 asset separation & neutral branding.** ☐ Independent of everything else.
3. **6.5 public release → tag `1.0.0`.** ☐ Needs 6.4 and the rest of M6.1's stated purpose done.
4. **ADR 0006 Slice 5 — PDF export.** ☐ Schedulable whenever. Deliberately not WYSIWYG.

**The M6 list is open.** More items land as work proceeds; absence is not a scoping decision.

---

## Standing Rules

Four that apply to most sessions. Everything else is in `docs/PITFALLS.md`.

- **Token discipline — every machine, Windows included.** Locate with `graphify`/Grep, then Read with
  `offset`+`limit`. Never whole-file to find something, never re-read context; wide sweeps → Explore.
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
