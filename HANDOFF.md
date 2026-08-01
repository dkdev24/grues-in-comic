# HANDOFF.md

Cross-session state. **Read in full at session start; update at session end.**

**Scope rule — this file is a cost paid every session, so it holds only three things:** where the
project is, what to do next, and what is still undecided. Session narrative → `WORKLOG.md`. Durable
cautions → `docs/PITFALLS.md`. Deferred work → `docs/FUTURE_WORK.md`. **Adding to this file is the
exception; adding to one of those three is the rule.** If it will still be true in a year, it does
not belong here.

---

## Current Version
**0.24.4** · Platform: **macOS only** (2026-07-28)

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

## Last Session — ADR 0010 written, both decisions (v0.24.4)

**`docs/adr/0010-the-hero-declares-his-move.md`, Status: Proposed.** It records **two separable
decisions**, per v0.24.3's measurements: **§1 the Hero declares his move** (the command re-voiced as
table-talk — supersedes ADR 0005 §1 *as an exclusivity*, keeping §1's actual reason as its
constraint; the resolved-outcome line becomes garnish with a cooldown) and **§3 the traversal
collapse gives ground** (amends ADR 0005 §3 — a run still collapses to one panel but keeps a
*journey line*, and a single traversal turn stops being a "run"). Also **§2** the exchange, not the
turn, becomes the panel's unit — declarations clone-append into the frame they answer, and 6.1g's
`isOrphaned` is recast on **ask-vs-answer**, with the line carrying the marker so `page.ts` stays
cast-agnostic. **§4 retires D5 for D5′** — both-speakers as a share of *panels*, band set from the
first slice's measurement rather than invented.

Back-references added to ADR 0005; **ADR 0009 carries a correction header** — every figure in it
predates the corpus repair and is void, the decisions are not.

**Nothing is built.** Four slices are listed; 1 and 2 are independently shippable, 3 is what makes
the ADR deliver its stated purpose. The ADR needs the user's acceptance before any of it starts.

## Next Actions

**We are in M6.** Stage detail, the D1–D5 decision table and the 6.1 slices live in
`docs/DEVELOPMENT_PLAN.md` §6 — this is the index, not the plan.

1. **M6.1 — the comic pane becomes a cartoon.** ◐ **The most important item in M6** (user's
   weighting). 6.1a–6.1d ✅ · 6.1f ✅ · 6.1g ✅ · **6.1e ◐** — the authoring slice, and the only one
   left open.

   **The measurements are now trustworthy.** D5 is met at **one exchange every 2.27 turns** (band
   2–3) and the two-shot at **158 of 274 in one panel**, both over a game that reaches the barrow.
   The corpus is 623 turns, 12 rows, `12-full-game.cmd` sourced from `fullGameCommands()`.

   **⇒ The stage's biggest open item is now an ADR awaiting acceptance: `docs/adr/0010-the-hero-
   declares-his-move.md` (Proposed).** The Hero re-voices his command as table-talk ("Let's head
   north"), the exchange rather than the turn becomes the panel's unit, and — separably — the
   traversal collapse gives ground so the walks it swallows keep a voice. Measured before it was
   written (v0.24.3): **95.6% voiceable** with an 86-entry lexicon, **+42% panels** against 6.1d's
   accepted +68%, and **116 silent walks collapsing into 56 panels**, which is why §1 alone does not
   reach the silence and §3 exists.

   **What the user decides:** accept the ADR whole, accept §1/§2 without §3 (conversation everywhere
   the comic already has panels; the collapsed walks stay silent), or decline it for the narrower
   a/b/c choice below. **Nothing is built either way** — slices 1–4 are listed at the foot of the
   ADR, 1 and 2 independently shippable. The risk the ADR names and cannot measure: "Let's head
   north." several hundred times is the play-log tell ADR 0005 §1 removed, in costume — it is caught
   by reading a playthrough, not by a counter.

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
| `docs/adr/` | ADRs 0001–0010. **0009 governs the comic pane from 6.1c on; 0010 (Proposed) is the command-as-table-talk decision** |
| `original-projects/`, `reference/` | Historical sources (tracked) · third-party reference (**gitignored**) |
| `wiki/` | Hand-authored semantic notes (`the-hero.md`, `the-guide.md`, …) |
| `WORKLOG.md` | Persistent history, one entry per version, never edited |
