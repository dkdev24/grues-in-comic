# HANDOFF.md

Cross-session state. **Read in full at session start; update at session end.**

**Scope rule — this file is a cost paid every session, so it holds only three things:** where the
project is, what to do next, and what is still undecided. Session narrative → `WORKLOG.md`. Durable
cautions → `docs/PITFALLS.md`. Deferred work → `docs/FUTURE_WORK.md`. **Adding to this file is the
exception; adding to one of those three is the rule.** If it will still be true in a year, it does
not belong here.

---

## Current Version
**0.24.2** · Platform: **macOS only** (2026-07-28)

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
  every M6.1 figure quoted before v0.24.0 was measured over a losing replay and is void. The silent
  block has been re-censused (v0.24.1) and is **119 revisit walks**, waiting on a user decision.

**Tests:** 280 web · 139 engine · 198 IR · parity 143/143 strict.

---

## Last Session — M6.1e session 4: the Hero stops saying ", then" (v0.24.2)

**A read, not a measurement.** The user read his dialogue back and objected to the cadence: ~1 in 5
of the Hero's lines ended `, then`, because one hardcoded template in `mapper.ts` (`The {name},
then.`) fired **59 times a playthrough** and `wiki/the-hero.md` gave that exact string as *the*
example of his register — so six authored lines copied it out of the spec. Now `ACTION_SCRIPT` in
`script.ts` (5 take / 3 drop, `{name}` substituted) with a cursor per kind in the mapper's fold; the
spec rewritten to describe a register, never a construction; the six lines reworded. Voice picked by
the user: reaction over report. **Cost, looked at and accepted:** two-shot **158 → 156 of 274**,
panels 593 → 594, D5 holds at 2.3. Both affected gate panels rendered and read before accepting.
Narrative in `WORKLOG.md` v0.24.2.

**No instrument would have caught this** — every counter measures firings and gaps, not shape. The
durable rule is in `PITFALLS.md` → Web.

## Next Actions

**We are in M6.** Stage detail, the D1–D5 decision table and the 6.1 slices live in
`docs/DEVELOPMENT_PLAN.md` §6 — this is the index, not the plan.

1. **M6.1 — the comic pane becomes a cartoon.** ◐ **The most important item in M6** (user's
   weighting). 6.1a–6.1d ✅ · 6.1f ✅ · 6.1g ✅ · **6.1e ◐** — the authoring slice, and the only one
   left open.

   **The measurements are now trustworthy.** D5 is met at **one exchange every 2.27 turns** (band
   2–3) and the two-shot at **158 of 274 in one panel**, both over a game that reaches the barrow.
   The corpus is 623 turns, 12 rows, `12-full-game.cmd` sourced from `fullGameCommands()`.

   **⇒ First, the bigger question on the table (raised by the user, v0.24.2 session): should the
   Hero speak his *command* as table-talk?** — "Let's go north", the way a player declares an action
   to a DM, with the DM's result closing the exchange, and the conversational unit therefore
   **straddling two turns** (DM describes on turn N, Hero answers on turn N+1). Analysed, not
   decided. It would **supersede ADR 0005 §1** (the Hero balloon is the resolved *outcome*, never the
   input — the decision that got the pane out of play-log territory), **recast 6.1g's `isOrphaned`
   rule** (which forbids exactly the cross-turn joining this needs, on a different criterion:
   ask-vs-answer rather than same-turn), and **subsume the a/b/c choice below** — every turn has a
   command, so D5 goes to ~1.0 by construction, which is option (c) with a reason attached.
   Mechanically the panel-update half is nearly free (`PanelDelta.replacedLast` already clone-appends
   and `comic-view.ts` already redraws), and no engine change is needed (`Turn.command` is already in
   the mapper's hands, so purity and parity hold). **Recommended next move: measure first** (the
   standing rule — five panel-grammar proposals died for want of it): (1) what share of the corpus's
   commands a phrasing lexicon can voice naturally, and what the tail looks like; (2) what one extra
   Hero line per turn does to panel count against the current fit test. **Then write ADR 0010.** The
   open risk to name in it: "Go north." several hundred times is the play-log tell in costume, and
   the ~20% silent reaction panels are the pane's rhythm.

   **The narrower open question, measured and priced — still live if the above is declined, and not
   a task an agent should take unasked.** The census (v0.24.1) says the silent block is **one
   surface**: 119 revisit walks over 35 rooms, skewed (Cellar 13, Kitchen 11, Coal Mine 10). Giving
   them all a beat would take D5 to **1.59**, far under the band; **~38 is what the 2.0 floor
   allows.** So the choice is between three, and it is the user's:

   - **a) Voice the top rooms only** — the ~10 rooms carrying most of the 119, inside the headroom.
     Cheapest, and the skew means it covers most silent turns a reader actually meets.
   - **b) Trade** — voice more revisit walks and cool the refusal beats to pay for it.
   - **c) Move the band** — decide 2–3 was the wrong target now that a won game is what is measured.

   The design hazard to weigh with it: a revisit line is on the one surface that **wears out** (same
   room, many entries), the exact inverse of the first-visit gazetteer, so anything written here
   needs a run + cycling tail and its own cooldown from the start.

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
