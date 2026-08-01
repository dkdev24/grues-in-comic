# HANDOFF.md

Cross-session state. **Read in full at session start; update at session end.**

**Scope rule — this file is a cost paid every session, so it holds only three things:** where the
project is, what to do next, and what is still undecided. Session narrative → `WORKLOG.md`. Durable
cautions → `docs/PITFALLS.md`. Deferred work → `docs/FUTURE_WORK.md`. **Adding to this file is the
exception; adding to one of those three is the rule.** If it will still be true in a year, it does
not belong here.

---

## Current Version
**0.24.9** · Platform: **macOS only** (2026-07-28)

## Project Status

**Grues in Comic** (was Comic-Zork) — repo `dkdev24/grues-in-comic`, not yet public. Zork I (ZIL)
modernized to a browser-native comic adventure via an IR the engine executes.

- **M1–M4 ✅** `importer/` (ZIL parser) · `ir/` (schema, validator, extraction — 110 rooms, 137
  objects, 267 parser rules, 360 routines) · `engine/` (world runtime, parser, dispatch,
  save/restore, combat + thief). **Parity 143/143 strict** over 11 walkthroughs. Gates A and C
  cleared.
- **M5 ✅** (closed 2026-07-28) Comic presentation. **The game is completable in the browser** —
  350/350, ends in `STONE-BARROW`, pinned by `engine/test/completion.test.ts` (seed 1234). Gate D
  cleared. ADRs 0004–0008 all built; 0008 is a cited port of the Comic Chat layout stack with a
  pixel gate.
- **M6 ◐** — the road to 1.0.0 (repo public + website ships). Stages and the decision table are in
  `docs/DEVELOPMENT_PLAN.md` §6. **6.1a–6.1d and 6.1f–6.1k are done; 6.1e is paused, the only open
  item under M6.1.** The corpus is repaired, so **D5 and the two-shot are both met over a game that is
  actually won** — every M6.1 figure quoted before v0.24.0 was measured over a losing replay and is
  void. **ADR 0010 is Built (v0.24.9) — all four slices done.** The Hero declares his command as
  table-talk on 98.3% of turns, that declaration answers the DM's still-open frame across the turn
  boundary, a collapsed traversal run of two or more speaks its destination as one journey line, and
  **D5′ (the share of emitted panels carrying both speakers) has a band, 25–60%, set from today's
  43.7% measurement** and asserted in `density.test.ts`. This closes M6.1's stated purpose — the
  remaining M6.1 work is 6.1e's authoring volume, which was always open-ended.

**Tests:** 292 web · 139 engine · 198 IR · parity 143/143 strict.

---

## Last Session — room-order bug fixed; M6.2's UI shape decided (not built)

**Fixed a real bug in ADR 0010's declaration, found by the user in play (commit `7e2405c`).**
`page.ts`'s `addScript()` stamped every line in a turn's script — including the Hero's declaration —
with the *destination* room's `PanelContext`, so the declaration's own panel showed the new room's
backdrop before the DM had said anything about it: the location visibly changed under his line instead
of after it. Fixed with a per-line `PageLine.room` override (mapper.ts sets it to `roomAtEntry` on the
declaration only when it differs from the turn's destination); `<Brk>` was already splitting these into
two panels, so the fix is a relabeling, not a panel-count change — zero drift on either golden. Caught
one `exactOptionalPropertyTypes` build error the first pass missed (`tsc --noEmit` alone doesn't use
`tsconfig.build.json`; `npm run build` does) — fixed with a conditional spread, not `: undefined`.
292/292 web tests green, build clean, dev server confirmed serving on `:8080`.

**M6.2 (save/load/restart): the UI shape is decided, nothing is built yet.** The user proposed slash
commands (`/save`, `/load`, `/restart`) in the existing text input rather than separate buttons —
keeps Zork's text interface as the sole input surface. Feasibility check found the interception point
already exists and is already load-bearing: `main.ts:164`'s `handleShellCommand()` intercepts bare
`save`/`restore` before `session.command()` reaches the engine, today. Two decisions recorded in
`docs/DEVELOPMENT_PLAN.md` §6.2 (2026-08-02): slash commands extend that exact interception point (no
engine change, no new mechanism), and `/load`/`/restart` are **reload-based** — write/clear storage
then `location.reload()`, letting boot-time `resume()` do the actual state rebuild — rather than a live
in-place swap, because `comic-view.ts`/`console-view.ts` have no `reset()` today and a live restart
would have to reset the Director's pose cycles and beat counters itself (the plan's existing hazard
note) to avoid the new game opening with the old game's conversation state.

## Next Actions

**We are in M6.** Stage detail, the D1–D5 decision table and the 6.1 slices live in
`docs/DEVELOPMENT_PLAN.md` §6 — this is the index, not the plan.

1. **M6.2 — save / load / restart.** ☐, **decided, ready to build — read `docs/DEVELOPMENT_PLAN.md`
   §6.2 for both 2026-08-02 decisions before starting.** UI over the engine's existing save contract:
   `/save [slot]`, `/load <slot>`, `/restart` in `main.ts`'s `handleShellCommand`, three named slots via
   `persistence.ts`'s already-parametrized `createSessionStore(key, storage)`, reload-based (no new
   `comic-view`/`console-view` reset methods needed for this pass). Left to the implementer per the
   plan: derived vs typed slot names (derived recommended), whether `/restart` confirms (it should).

   **⇒ NEXT SESSION STARTS HERE: implement M6.2 as scoped above.**
2. **M6.1 — the comic pane becomes a cartoon.** ◐ Mechanics closed (ADR 0010 fully built, v0.24.9).
   **6.1e ◐ is the only open item**: authored dialogue across 110 rooms, committed as data (D1
   sanctions the volume). The gazetteer is at 88 rooms; `BEAT_SCRIPT` at 12 beats / 70 authored
   exchanges. No exit criterion beyond "the user says the product is ready" — pick up when there's
   appetite for more authoring.
3. **M6.3 — the static site** (landing, about, public changelog as separate static pages). ☐
   **Blocked on the user's `DESIGN.md` + mockups.**
4. **M6.4 asset separation & neutral branding** (☐, independent of everything) · **M6.5 public
   release** → tag `1.0.0` (☐, needs the rest).
5. **ADR 0006 Slice 5 — session-recap PDF export.** ☐ The only open ADR slice, schedulable whenever.
   **The PDF is deliberately not WYSIWYG.**

**The M6 list is open.** More items land as work proceeds; absence is not a scoping decision. **M6.1
ends when the user says the product is ready, not when a list empties.**

---

## Standing Rules

Three that apply to most sessions. Everything else is in `docs/PITFALLS.md`.

- **Read `docs/PITFALLS.md` for the subsystem you are about to change, before you change it.** Each
  entry was paid for by a bug or a wrong released build.
- **Measure before proposing rules.** Five plausible panel-grammar proposals died that way. The
  harness replay and the `art/` corpus answer questions cheaply.
- **New mechanical-layer code reads the C++ first and cites it** (ADR 0007). Canonical source is
  `original-projects/comic-chat/v2.5-beta-1-modern/`; the offline navigation graph is at
  `reference/comic-chat-v2.5-beta-1-modern/graphify-out/` (gitignored, rebuild *inside* that copy
  with `graphify extract . --code-only --no-label`).

---

## Key Paths
| Path | Purpose |
|---|---|
| `importer/`, `ir/` | ZIL parser → AST; IR schema, validator, extraction → `ir/artifacts/zork1.world.json` |
| `engine/` | Engine core. Zero-dep TS; `src/events.ts` is the ADR 0002 contract as code |
| `engine/harness/` | `replay.ts` (parity oracle), `golden.ts` (normalizer + directives), `complete.ts` (`runFullGame`) |
| `verification/` | `walkthroughs/*.cmd` + `golden/*.txt` from dfrotz |
| `web/` | Browser shell + comic renderer. `npm --prefix web run dev` → :8080. No bundler, by decision (`web/README.md`) |
| `web/tools/` | `gate.ts` (pixel gate), `density.ts` (M6.1 dialogue-density report), `cast-fixture.ts` (N≥3 bodies), `render-panel.ts`, `serve.ts` |
| `web/src/comic/script.ts` | The authored dialogue as data — DOM-free so the corpus replay can measure it |
| `art/` | Comic Chat art tooling (decode, pose, pack). Format spec: `docs/AVB_FORMAT.md` (**normative**) |
| `docs/DEVELOPMENT_PLAN.md` | Milestones, stages, gates — **the authority on what to do next** |
| `docs/PITFALLS.md` | Durable cautions by subsystem — read the relevant section before changing code |
| `docs/FUTURE_WORK.md` | The deferred backlog + the pre-1.0.0 iteration protocol |
| `docs/adr/` | ADRs 0001–0010. **0009 governs the comic pane from 6.1c on; 0010 (Accepted) governs the Hero's channel and the panel's unit from 6.1h on** |
| `original-projects/`, `reference/` | Historical sources (tracked) · third-party reference (**gitignored**) |
| `wiki/` | Hand-authored semantic notes (`the-hero.md`, `the-guide.md`, …) |
| `WORKLOG.md` | Persistent history, one entry per version, never edited |
