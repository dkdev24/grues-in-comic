# HANDOFF.md

Cross-session state. **Read in full at session start; update at session end.**

**Scope rule — this file is a cost paid every session, so it holds only three things:** where the
project is, what to do next, and what is still undecided. Session narrative → `WORKLOG.md`. Durable
cautions → `docs/PITFALLS.md`. Deferred work → `docs/FUTURE_WORK.md`. **Adding to this file is the
exception; adding to one of those three is the rule.** If it will still be true in a year, it does
not belong here.

---

## Current Version
**0.24.5** · Platform: **macOS only** (2026-07-28)

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
  `docs/DEVELOPMENT_PLAN.md` §6. **6.1a–6.1d, 6.1f and 6.1g are done; 6.1e is paused; 6.1h–6.1k are the ADR 0010 slices.** The
  corpus is repaired, so **D5 and the two-shot are both met over a game that is actually won** —
  every M6.1 figure quoted before v0.24.0 was measured over a losing replay and is void. **ADR 0010
  is Accepted (v0.24.5) and nothing is built against it yet**: the Hero will declare his command as
  table-talk, the exchange becomes the panel's unit, and the traversal collapse keeps a journey line.
  Work resumes at stage **6.1h**.

**Tests:** 280 web · 139 engine · 198 IR · parity 143/143 strict.

---

## Last Session — ADR 0010 accepted; next session starts slice 1 (v0.24.5)

**`docs/adr/0010-the-hero-declares-his-move.md` is Accepted whole** (2026-08-01, both decisions,
§1–§4) by the user. Its four slices are now plan stages **6.1h–6.1k** in `docs/DEVELOPMENT_PLAN.md`
§6.1, each with its own exit criteria. **No code has been written against it.**

What it changes, in one line each: the Hero **declares his command** as table-talk (§1, supersedes
ADR 0005 §1 *as an exclusivity*); the **exchange, not the turn, is the panel's unit** (§2, recasts
6.1g's `isOrphaned` on ask-vs-answer); the **traversal collapse keeps a journey line** instead of
discarding what it swallows (§3, amends ADR 0005 §3); **D5 → D5′**, both-speakers as a share of
panels (§4, band set from slice 1's measurement, not invented).

## Next Actions

**We are in M6.** Stage detail, the D1–D5 decision table and the 6.1 slices live in
`docs/DEVELOPMENT_PLAN.md` §6 — this is the index, not the plan.

1. **M6.1 — the comic pane becomes a cartoon.** ◐ **The most important item in M6** (user's
   weighting). 6.1a–6.1d ✅ · 6.1f ✅ · 6.1g ✅ · **6.1e ◐** (authoring, paused where ADR 0010
   subsumes it) · **6.1h–6.1k ☐ — the ADR 0010 slices, and where work resumes.**

   **The measurements are now trustworthy.** D5 is met at **one exchange every 2.27 turns** (band
   2–3) and the two-shot at **158 of 274 in one panel**, both over a game that reaches the barrow.
   The corpus is 623 turns, 12 rows, `12-full-game.cmd` sourced from `fullGameCommands()`.

   **⇒ NEXT SESSION STARTS HERE: 6.1h — ADR 0010 slice 1, the lexicon and the declaration.**
   `docs/adr/0010-the-hero-declares-his-move.md` is **Accepted whole**; read §1 and §4 before
   starting, and `docs/PITFALLS.md` → Web. Exit criteria are in `docs/DEVELOPMENT_PLAN.md` §6.1
   (stages 6.1h–6.1k). The build, in the order it wants doing:

   1. **`COMMAND_SCRIPT` in `web/src/comic/script.ts`** — content as data, like `ACTION_SCRIPT`
      beside it. Three tiers, sized by the v0.24.3 measurement: **directions (47.6% of all commands
      — the deepest rotation in the game), intransitive verbs (one line each), transitive templates
      over the command's own nouns.** ~86 entries covers 95.6%; the 12-command tail (`y` ×11, `take
      all`, `drop all`, `xyzzy`, `plugh`, bare `take`/`put`, four nouns typed alone) is authored by
      hand or left silent — **silence is a legal outcome.**
   2. **The trigger and cursor in `mapper.ts`**, beside `tookSaid`/`droppedSaid` — a pure function of
      `turn.command`, so purity and parity hold and no engine change is needed.
   3. **`ACTION_SCRIPT` becomes garnish**: give it a cooldown, and where a declaration and a reaction
      would land in one frame, the declaration wins (ADR 0010 §1, ADR 0009 §6's ordering unchanged).
   4. **No panel-flow change in this slice** — the declaration lands in the turn's own panel. The
      cross-turn join is 6.1i.

   **Then measure and re-pin:** `npm --prefix web run density` (expect large deliberate drift — page
   level predicted 722 → 1025, +42%), `npm --prefix web run gate` and **look at the drifted images**
   before `gate:accept`. Report D5′ (both-speakers as a share of panels) — **its band is set in
   6.1k from what these measurements say, not chosen now.**

   **The one thing no counter here can catch** (the `, then` tic proved it): **read a playthrough.**
   "Let's head north." several hundred times is the play-log tell ADR 0005 §1 removed, in costume.
   Rotation depth is the mitigation; a human read is the check.

   The remaining 6.1e work is what it always was: authored dialogue across 110 rooms, committed as
   data (D1 sanctions the volume). The gazetteer is at 88 rooms; `BEAT_SCRIPT` at 12 beats / 70
   authored exchanges.
2. **M6.2 — save / load / restart.** ☐ UI over the engine's existing save contract; three named
   slots, browser storage only. Independent — good filler for an idle session.
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
