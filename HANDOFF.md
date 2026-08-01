# HANDOFF.md

Cross-session state. **Read in full at session start; update at session end.**

**Scope rule — this file is a cost paid every session, so it holds only three things:** where the
project is, what to do next, and what is still undecided. Session narrative → `WORKLOG.md`. Durable
cautions → `docs/PITFALLS.md`. Deferred work → `docs/FUTURE_WORK.md`. **Adding to this file is the
exception; adding to one of those three is the rule.** If it will still be true in a year, it does
not belong here.

---

## Current Version
**0.24.0** · Platform: **macOS only** (2026-07-28)

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
  `docs/DEVELOPMENT_PLAN.md` §6. **6.1a–6.1d, 6.1f and 6.1g are done; 6.1e is in progress.** The
  corpus is repaired, so **D5 and the two-shot are both met over a game that is actually won** —
  every M6.1 figure quoted before v0.24.0 was measured over a losing replay and is void.

**Tests:** 278 web · 139 engine · 198 IR · parity 143/143 strict.

---

## Last Session — M6.1g: the corpus is repaired (v0.24.0)

**6.1g ✅.** Narrative in `WORKLOG.md` v0.24.0. The repair landed and **took three of M6.1f's four
conclusions with it** — each finding was real, and three were about something other than what the
losing corpus made them look like.

- **The full-game row now wins.** `runFullGame` records what it typed (`RunResult.issued` /
  `fullGameCommands()`); `density.ts` replays that log instead of the raw `.cmd`. **423 turns,
  STONE-BARROW, 350/350**, corpus **606 → 623**. Every M6.1 figure quoted before this is void.
- **The two-shot's blocker was `BALLOON_HEADROOM`, not panelization.** The band is also the fit
  test's budget, and a location box eats `TITLE_HEIGHT` of it — one balloon's worth at 0.36, on
  exactly the arrival turns a flail never has. **0.36 → 0.44 (user's call, after renders): 70 → 158
  of 274 in one panel.** 6.1d's criterion is met on a won game for the first time.
- **The clustering was `routine-ack`, not the refusals** — "Taken." on consecutive turns, its tail
  recycling at a gap of one panel. Cooldown 3 + longer loops on `routine-ack` and `scored`: repeats
  within 20 panels **70 → 6**. D5 moved off the floor as a side effect, **2.0 → 2.3**.
- **The other three:** the split exchange no longer mis-pairs (`addScript` → `isOrphaned`); the
  "empty" panels were rendered, **looked at and kept** (they are the traversal collapse's own output
  — the *blank* frame is what is now pinned against); the death panel is set and titled where the
  death happened (`panelRoom`, pinned by a synthetic turn — nothing in the corpus dies any more).
- Both goldens deliberately re-accepted after looking at all 13 drifted gate images. 278 / 139 / 198
  green, parity 143/143.

## Next Actions

**We are in M6.** Stage detail, the D1–D5 decision table and the 6.1 slices live in
`docs/DEVELOPMENT_PLAN.md` §6 — this is the index, not the plan.

1. **M6.1 — the comic pane becomes a cartoon.** ◐ **The most important item in M6** (user's
   weighting). 6.1a–6.1d ✅ · 6.1f ✅ · 6.1g ✅ · **6.1e ◐** — the authoring slice, and the only one
   left open.

   **The measurements are now trustworthy.** D5 is met at **one exchange every 2.3 turns** (band
   2–3, mid-band) and the two-shot at **158 of 274 in one panel**, both over a game that reaches the
   barrow. The corpus is 623 turns, 12 rows, `12-full-game.cmd` sourced from `fullGameCommands()`.

   **The open question for the user, repriced by the repair:** turns that are still wholly silent
   cannot simply be given beats — D5 is a band and the corpus no longer has floor to spare in the
   direction it used to. **Re-take the silent-turn census before asking it again**: the 154-turn
   figure and its composition breakdown (69 bare walks, 22 container states, …) came from the losing
   replay and are void. That census is cheap — a `density.ts` variant — and is the natural first
   move of the next 6.1e session.

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
| `docs/adr/` | ADRs 0001–0009. **0009 governs the comic pane from 6.1c on** |
| `original-projects/`, `reference/` | Historical sources (tracked) · third-party reference (**gitignored**) |
| `wiki/` | Hand-authored semantic notes (`the-hero.md`, `the-guide.md`, …) |
| `WORKLOG.md` | Persistent history, one entry per version, never edited |
