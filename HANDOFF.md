# HANDOFF.md

Cross-session state. **Read in full at session start; update at session end.**

**Scope rule — this file is a cost paid every session, so it holds only three things:** where the
project is, what to do next, and what is still undecided. Session narrative → `WORKLOG.md`. Durable
cautions → `docs/PITFALLS.md`. Deferred work → `docs/FUTURE_WORK.md`. **Adding to this file is the
exception; adding to one of those three is the rule.** If it will still be true in a year, it does
not belong here.

---

## Current Version
**0.24.3** · Platform: **macOS only** (2026-07-28)

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

## Last Session — ADR 0010 input, measured (v0.24.3)

**No code changed.** The user's command-as-table-talk proposal was measured before the ADR, per the
standing method note. Narrative in `WORKLOG.md` v0.24.3.

- **A — the commands are voiceable: 95.6%.** 611 commands, 183 distinct; an **86-entry** lexicon (22
  directions, 22 intransitive, 42 transitive templates) phrases 584 of them at a mean of 19 chars.
  Directions alone are **47.6%** of everything typed. The tail is **12 distinct commands / 27
  occurrences**, all known kinds: `y` ×11 (disambiguation answers — a reply with no verb), `take
  all` / `drop all`, `xyzzy` / `plugh`, bare `take` / `put`, four nouns typed alone.
- **B — one line per turn costs +42% panels** (722 → 1025, page level against the real fit test; the
  Director is outside the loop, so not the shipped 594 — the ratio is the point). 6.1d's limiters
  cost +68% and were accepted. Panels carrying both speakers 172 → 286.
- **C — the finding that re-shapes the proposal.** Its stated purpose was filling the 119 silent
  revisit walks. **All 116 in the full game are buffered into traversal runs, which the Director
  collapses to 56 panels** (ADR 0005 §3 keeps only a run's destination). **At most 56 can carry a
  line; 60 are discarded before anyone reads them.** Speaking the command does not fill the silent
  block unless the collapse also gives ground.

**So ADR 0010 is two decisions, not one** — *the Hero speaks his command*, and *the traversal
collapse opens up*. Taking the first alone buys conversation everywhere except the place the census
said was empty. The measurement tool was deleted (sessions 2–3 precedent); the lexicon is described
in the WORKLOG rather than kept, since 86 template lines are cheap to re-author and an unreferenced
tool would rot.

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
   the mapper's hands, so purity and parity hold).

   **Measured at v0.24.3, and the measurements say it is two decisions, not one:**

   - **Voiceable — 95.6%** with an 86-entry lexicon, mean 19 chars; the tail is 12 distinct commands
     (`y`, `take all`, `xyzzy`, bare nouns), all authorable by hand. **Not a blocker.**
   - **Costly but precedented — +42% panels** (722 → 1025 at page level), against 6.1d's accepted
     +68%. Panels carrying both speakers 172 → 286. **A price, not a blocker.**
   - **It does not do what it was proposed to do, on its own.** All 116 silent walks are buffered
     into traversal runs the Director collapses to **56 panels**; 60 are discarded before anyone
     reads them. **Filling the silent block needs the collapse to give ground too** — a second
     ADR-level change to ADR 0005 §3.

   **So the next decision is the user's, and it is which of the two to take:** (i) the Hero speaks
   his command everywhere the comic already has panels — conversation throughout, the silent
   revisit walks still silent; (ii) that plus opening the traversal collapse, which is what actually
   fills them and costs more panels again; (iii) neither, and fall back to the a/b/c choice below.
   **Then write ADR 0010** — superseding ADR 0005 §1, recasting 6.1g's `isOrphaned` on ask-vs-answer,
   and amending ADR 0005 §3 if (ii). The risk to name in it either way: "Let's head north." several
   hundred times is the play-log tell in costume, and the silent reaction panels are the pane's
   rhythm.

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
