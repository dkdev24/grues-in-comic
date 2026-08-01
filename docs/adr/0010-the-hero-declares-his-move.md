# ADR 0010 — The Hero Declares His Move: the command becomes table-talk and the exchange becomes the panel's unit

- **Status:** **Built** (2026-08-01, whole — both decisions, §1–§4, all four slices). Slices in
  `docs/DEVELOPMENT_PLAN.md` §6.1 as stages 6.1h–6.1k. D5′'s band is **25–60% of emitted panels carry
  both speakers**, set from the slice-4 measurement (43.7% — 477 of 1091), asserted in
  `web/test/density.test.ts`.
- **Date:** 2026-08-01
- **Supersedes (in part):** ADR 0005 §1 *as an exclusivity* — the Hero balloon is no longer **only** the resolved outcome; his **declaration of intent** is a second, primary utterance, and the outcome line becomes its garnish. §1's actual reason (the player is the author, and a balloon reading `n` is a play-log) is preserved and is the constraint this ADR is written under. ADR 0005 §3's traversal collapse *as an unconditional discard* — a collapsed run may no longer throw away every turn it swallowed. The M6.1g orphan rule (`page.ts` → `isOrphaned`) *as "no later turn may join a fragment"* — it becomes ask-vs-answer rather than same-turn.
- **Preserves (non-negotiable):** ADR 0002 (the event contract — consumed, **never extended**; this ADR needs no engine change, because `Turn.command` is already in the mapper's hands); the DM stays **presentation-only** — no game state, unaddressable, removable (ADR 0004 §3); the mapper stays a **deterministic pure function of the turn stream**, canvas-free, so `replayPanels` and the parity oracle still hold; **dialogue is authored at build time and committed as data, never generated at runtime** (`web/src/comic/script.ts`); `page.ts` stays a faithful port of the Comic Chat panelizer and keeps every panelization decision (ADR 0007, ADR 0008) — it also stays **cast-agnostic**, knowing nothing of the DM or the Hero.
- **Related:** `docs/DEVELOPMENT_PLAN.md` §6.1, `WORKLOG.md` v0.24.1 (the silent-turn census) and v0.24.3 (the three measurements this is built on), `web/tools/density.ts`, `wiki/the-hero.md`

## Context

M6.1 set out to make the pane read as a cartoon and got most of the way: the DM reads the room, the
beats answer back, and over a won playthrough the two converse once every 2.27 turns with 156 of 274
exchanges landing in a facing two-shot. What is left is a hole with a very specific shape, and the
user named the cause before the instruments did.

**The comic has no record of what the player decided.** In a tabletop session, the solo player
*tells* the DM what he is doing — "Let's go north", "I'll take the knife" — and the DM answers with
the result. The pane skips that half. ADR 0005 §1 removed it on purpose in v0.16.4, and was right to:
what it removed was `n` and `look` in a thought balloon, which is a control input pasted onto a
character and reads as a play-log. But "the raw string is not dialogue" was implemented as "the input
is not dialogue at all", and those are different claims. **A command re-voiced as speech across the
table is neither the raw string nor the outcome — it is the third option §1 never considered.**

Three measurements were taken before this was written (v0.24.3, the standing method note; five
earlier panel-grammar proposals died for want of exactly this):

| | |
|---|---|
| Commands over the corpus / distinct | **611 / 183** |
| Phrased by an 86-entry prototype lexicon | **584 — 95.6%**, mean 19 chars |
| …of which bare directions | **291 — 47.6% of everything typed** |
| The tail the lexicon cannot phrase | **12 distinct commands, 27 occurrences** |
| Panels, one declaration per turn (page level, real fit test) | **722 → 1025, +42%** |
| …panels carrying both speakers | **172 → 286** |
| Silent revisit walks in the full game | **116** |
| …that the Director collapses into | **56 panels — 60 discarded before anyone reads them** |

The first two say the proposal is buildable and affordable: the tail is 12 hand-authorable commands
(`y` ×11 — an answer to the parser's disambiguation question, a reply with no verb in it; `take all`;
`xyzzy`; four nouns typed alone), and +42% sits well under the +68% M6.1d already paid.

**The third is why this ADR has two decisions instead of one.** The proposal's stated purpose was to
fill the 119 silent turns the census (v0.24.1) found — and 116 of them are backtracking walks that
the Director buffers into traversal runs and collapses to 56 panels, keeping only each run's
destination. Sixty of them have no frame to speak in. *Giving the Hero a voice does not reach the
silence unless the collapse gives ground too*, and that is a separate decision about a different
subsystem, with its own cost.

## Decision

### 1. The Hero declares his move (supersedes ADR 0005 §1's exclusivity)

**Every turn whose command can be voiced produces a Hero declaration** — an utterance in his settled
register (`wiki/the-hero.md`) stating the intent the player authored, spoken across the table to the
DM. "Let's head north." Not `n`, and not "I went north."

- **The lexicon is data** (`web/src/comic/script.ts`, `COMMAND_SCRIPT`), like every other authored
  surface, and the trigger and cursor stay in `mapper.ts` (PITFALLS → Web). It is a pure function of
  `turn.command`, so the mapper stays the parity oracle and no engine change is needed.
- **Three tiers, because the measurement found three:** bare directions (47.6% — one small table
  carries half the corpus), intransitive verbs (one line each), and transitive templates over the
  command's own nouns. **The 4.4% tail is authored by hand or stays silent** — silence is a legal
  outcome, not a failure, and a nonsense command producing a nonsense declaration is *correct*: the
  DM then refuses him, which is a beat the pane already scripts.
- **Rotation from the first line, not after it wears.** This fires on nearly every turn, so the
  lesson of `routine-ack` (M6.1g) and of the Hero's `, then` tic (M6.1e session 4) is not something
  to rediscover here: no declaration may be a single fixed string, and a direction — which recurs
  hundreds of times — needs the deepest rotation in the game.
- **The resolved-action line becomes garnish and gains a cooldown.** `ACTION_SCRIPT` ("Worth the
  weight.") stays, but the declaration is now the Hero's primary utterance and the outcome line is a
  reaction to the DM's answer. **One Hero utterance per panel** (ADR 0009 §6's ordering, unchanged);
  where both would land in one frame, the declaration wins and the reaction is held.

### 2. The exchange, not the turn, is the panel's unit

The conversational beat straddles two turns and always did: the DM describes the room on turn *N*,
and the player's answer arrives on turn *N+1*. The panel must follow the conversation, not the turn
counter.

- **A declaration joins the panel it answers** — the frame the DM's line is already in — by
  clone-append (`PanelDelta.replacedLast`). The mechanism exists and ships today: it is how the
  traversal collapse works, and `comic-view.ts` already redraws a replaced panel.
- **The orphan rule is recast, not deleted** (M6.1g, `page.ts` → `isOrphaned`). It exists to stop the
  reader seeing the Hero answer a question asked *after* he spoke, and that failure is still real.
  What changes is the criterion: a fragment may accept a following utterance **when that utterance is
  an answer to it**, and never otherwise. `page.ts` must not learn the cast to decide this, so the
  **line carries the fact**: a declaration is marked as answering, and an unmarked line from a later
  turn is refused exactly as it is today.
- **The reader watches a drawn panel gain a balloon.** This is a real change to how the pane behaves
  in live play and is accepted deliberately: it is what makes the comic a conversation rather than a
  strip of turn-shaped frames. It must be visually settled (no reflow of earlier panels) and it
  interacts with M6.2 — a half-open panel is state, and save/restore has to say what happens to it.

### 3. The traversal collapse gives ground (amends ADR 0005 §3)

A collapsed run currently keeps one panel and discards every turn it swallowed. That was right when
the swallowed turns were silent; under §1 they are not. **The collapse stays — a comic edits out
backtracking, and ADR 0005 §3's reasoning is untouched — but it may no longer discard the run's
voice.**

- **A run emits one panel and one journey line**: the Hero's single declaration for the whole walk,
  naming where he ended up rather than each step ("Back down to the cellar."), authored as its own
  surface. Six steps become one line, not six.
- **A "run" starts at two.** A single traversal turn is not a run and is no longer collapsed; it is
  a panel like any other. This is where most of the 60 discarded turns come back.
- **The exact recovery is to be measured in the slice, not asserted here.** 116 walks against 56
  panels bounds it; what the two rules above actually return is a number the instrument will print.

### 4. D5 is restated, because its unit no longer means what it meant

D5 ("an exchange every 2–3 turns") was written when the Hero spoke occasionally. Under §1 he speaks
on nearly every turn, so measured as a turn rate D5 goes to ~1.0 by construction — not because the
pane got better but because the question stopped applying.

**D5 is superseded by D5′: the share of emitted panels in which both characters speak.** It is a
band, not a floor, and both ends fail — a comic where the two never stop talking fails as surely as
one where they never start (the rule §6.1 already learned at 1.6). **The band's numbers are set from
the first slice's measurement, not invented here**, and `density.test.ts` asserts both ends of it as
it does today. Today's page-level figure for reference: 172 of 722 panels carry both speakers, 286 of
1025 with declarations.

## Consequences

- **Panels grow ~42% before §3, and more after it.** The browser pane scrolls further per
  playthrough; `render.ts`'s column reflow and the fixed panel size (ADR 0007) are unaffected, but
  the pixel gate and the density baseline both move and must be re-accepted **after looking at the
  images**, as always.
- **The authoring bill is 86 lexicon entries plus the 12-command tail plus the journey lines** —
  small next to the gazetteer, and D1 sanctions it. The rotation depth is the real work: directions
  recur hundreds of times per playthrough and are the single most repetition-exposed surface the
  project has ever had.
- **The play-log risk is the thing to watch, and it is not hypothetical.** "Let's head north."
  several hundred times is exactly the failure ADR 0005 §1 removed, wearing a costume. The mitigation
  is rotation depth and the DM answering; the check is reading a playthrough, not a counter — the
  `, then` tic proved that no instrument here measures *shape*.
- **The silent reaction panel becomes rare.** ~20% of turns are currently a beat where the Hero poses
  and says nothing, and that silence is the pane's rhythm. If §1 lands and the pane reads as a wall
  of talk, the answer is a rule that lets him stay silent on purpose — not a retreat from the ADR.
- **No engine change, no parity risk, no new event.** `Turn.command` is already carried; the mapper
  stays pure and deterministic; 143/143 strict holds by construction.

## Alternatives considered

- **The raw command in a balloon** — what ADR 0005 §1 removed. Rejected for its original reason,
  which this ADR does not dispute.
- **Leave the input unspoken and fill the silence with room beats** (the census's a/b/c choice).
  Still viable and cheaper, but it buys ~38 exchanges inside D5's old band and leaves the comic with
  no record of the player's decisions. This ADR subsumes it.
- **Have the DM confirm each move** ("You go north"). Rejected: ZIL already narrates the destination,
  so it is the same sentence twice, and it puts the words in the wrong mouth — the *player* is the
  one whose voice is missing.
- **§1 without §3.** Explicitly available, and the two are separable by design. It buys conversation
  everywhere the comic already has panels and leaves the 60 collapsed walks silent — the place the
  census said was empty. Taking it alone is a legitimate decision; taking it *believing* it fills the
  silence is not, which is why the measurement is in this document.

## Slices

1. **The lexicon and the declaration**, with no change to panel flow — the declaration lands in the
   turn's own panel. Measures §1 alone: panels, D5′, and a read-through for the play-log tell.
2. **The cross-turn join** — declarations mark themselves as answering, `isOrphaned` recast on
   ask-vs-answer, the DM's frame accepting the reply that follows it.
3. **The collapse gives ground** — runs of one stop collapsing, longer runs earn a journey line.
   Measures the recovery against the 116/56 bound.
4. **Re-set D5′'s band from the measurements, re-pin both goldens, read a full playthrough.**

Slices 1 and 2 are independently shippable; 3 depends on neither but is what makes the ADR deliver
its stated purpose.
