# Panel Grammar — Design Discussion

**Status:** Unfinished discussion. No ADR written yet.
**Started:** 2026-07-20
**Feeds:** Next Action #5 in `HANDOFF.md`; the two open decisions in `wiki/comic-chat-presentation.md`
**Intended output:** `docs/adr/0004-presentation-mapping.md`

This document records a design discussion that was cut short by a session limit. It is not a
decision record — it captures where the argument got to, what was settled, what was not, and the
reasoning behind each, so the discussion can resume without being re-derived.

---

## 1. What this discussion is about

Stage 5.3 needs a rule connecting engine events to comic panels. Stage 5.1 established that
Comic Chat has no equivalent to inherit: measured over all 11 walkthroughs (189 turns), the event
stream carries **192 `narration`, 0 `speech`**. Comic Chat's composition algorithm is
parameterized on conversation; Zork never produces any.

The discussion began as a review of `docs/gemini-new-overall-architecure.md`, an
externally-drafted architecture document, and moved to the specific question that document leaves
open.

---

## 2. The gap, stated precisely

The framing that made the rest of the discussion tractable:

> The gap is not "Zork lacks dialogue." It is that **Comic Chat's composition algorithm is
> parameterized on a social graph that Zork never populates.**

Comic Chat's pipeline consumes, per utterance: speaker, addressee(s), text, emotion, gesture
intent. From that tuple it derives character placement, left-to-right ordering by speaking turn,
zoom level from participant count, balloon tail routing, and backdrop. **Most of those
derivations are functions of who is speaking to whom.**

Zork's turn produces: actor (nearly always the player), verb + objects, a world-state delta, and
narration text with no speaker at all. Comic Chat's steady state needs two participants and a turn
order; Zork's steady state is one participant and zero turns.

Three ways to close it were considered:

- **A — Populate the social graph.** Promote narration to an on-panel speaking character, so
  Comic Chat's algorithm runs on real conversational input.
- **B — Substitute a different composition driver.** Keep Comic Chat's rendering vocabulary,
  discard its algorithm; drive composition from the world model instead.
- **C — Enumerate panel types and hand-write rules per type.** What the Gemini document does
  implicitly. Rejected: produces an unbounded rule table with no organizing principle.

**A was chosen**, on the grounds that it is the only option that gets leverage from the imported
Comic Chat composition code rather than reimplementing composition while keeping only the sprites.

---

## 3. The Guide

Option A was refined (via a parallel ChatGPT discussion, quoted into the session) from "Narrator
as character" to a **Guide**: a named companion with an identity, appearance and personality, who
speaks *to* the Hero.

The structural reason this is better than a bare narrator — and the reason to keep it:

> A bare narrator is a speaker with no addressee, which still leaves half of Comic Chat's
> algorithm inputs empty. A Guide who talks *to the Hero* populates the full tuple.

The Guide also supplies the reaction material (surprise, alarm, delight) that Comic Chat's
expression system renders well and that a silent Zork turn otherwise leaves empty.

**Hard invariant, to be stated in the ADR:** the Guide is presentation-layer only. No world
position, no inventory, not referenceable by the parser, never affects a state delta. The
Adventure Engine remains faithful to Zork. If that line blurs, the project has forked Zork.

---

## 4. The identity decision (settled)

The underlying question behind most of the disagreement was **which of the two source projects
carries the project's identity**. Daniel decided: **Comic Chat leads.**

> "'Comic Chat can play Zork!' would be a better impression than 'Zork can become comic!'"

Rationale, agreed: "Zork with pictures" is a familiar category with decades of prior art and
competes on execution. "Microsoft Comic Chat is playing Zork" is a category of one. Comic Chat is
the scarcer, stranger artifact and carries an instantly recognizable visual signature.

### The consequence that is easy to get backwards

Comic-Chat-forward positioning is an argument **for verbatim Zork narration, not against it**.

The hook is a collision, and a collision needs both halves recognizable. If narration is
paraphrased into companion chatter, the result is Comic Chat playing a *generic* adventure game —
the setup survives, the punchline does not. Zork's recognizability lives almost entirely in its
prose: *west of a white house*, *a maze of twisty little passages, all alike*, and *it is pitch
black; you are likely to be eaten by a grue*. **The project is named after that last sentence.**
Paraphrase it and the title stops referring to anything the player has seen.

So: narration is **accompanied, never replaced**. Engine text renders verbatim as a caption; the
Guide reacts to it but never restates it. Under a fidelity framing captions would be a
preservation duty; under the chosen framing they are the *payload* — the recognizable Zork text is
what the Comic Chat rendering is being funny about. This also avoids the caption-box-slideshow
failure mode, because the balloon layer gives each panel a reason to exist visually.

---

## 5. The three-channel panel (settled)

The synthesis the discussion arrived at, and the main thing to carry forward:

| Channel | Source | Authoring cost |
|---|---|---|
| **Hero balloon** | The player's own typed command, rendered as speech (`take lamp` → "Take the lamp.") | Zero |
| **Guide balloon** | Authored reaction, budgeted, frequently absent | The only authored content |
| **Caption** | Engine narration, verbatim | Zero |

The Hero-balloon mechanism resolved an earlier objection. A silent Hero makes it half a chat,
which undercuts a Comic-Chat-forward premise; but *authored* Hero dialogue would evict the player
from a protagonist Zork deliberately left blank. Rendering the player's own input as their balloon
gives a genuine two-party conversation at zero authoring cost, perfectly deterministically, using
words that are literally the player's. It also makes the parser visible as dialogue, which suits
the premise.

This directly answers the first open decision in `wiki/comic-chat-presentation.md` (the player's
on-screen representation) and takes a position on the second (caption cadence: every turn,
inverting Comic Chat's rare-interruption cadence while inheriting `CBWoodringBox` geometry).

---

## 6. Mechanisms still to specify

These were identified as necessary but not designed in detail.

### Panel budget and Guide speech budget
Nothing yet says how many panels one turn produces. A `LOOK` in a six-object room could be one
panel or seven; without a budget the stream will be wildly uneven. Sketch: 1 panel baseline, +1
for a room transition, +1 per newly-seen notable object capped at 2, +1 for state-changing verbs.
Comic-Chat-forward positioning argues for **chat-paced rather than book-paced** rhythm — short
exchanges and reaction shots rather than illustrated paragraphs — which means a tighter budget
than would otherwise be chosen.

Guide speech budget: **0–1 balloons per turn, silent by default.** The Guide must earn a line.

### Repetition control
"Don't make the companion chatty" is a caution, not a mechanism. Needed:
- **Trigger priority with cooldowns** per trigger class (new room, notable object, death, puzzle
  solved, repeated failed command); only the winning trigger speaks.
- **No-repeat line pools** per trigger; drawn lines don't return until the pool exhausts.
- **Silence as a valid and common output.**

This is testable: assert Guide line density over a scripted 200-turn playthrough.

### Authoring economics
Hand-authored + deterministic + no LLM means every Guide line is written by hand. Per-room
authoring across ~110 rooms and 137 objects is not a side-project-sized budget and is how a
project stalls at 30% coverage. Proposed tiering:

- **Tier 0 — generic templates** keyed off IR structure, not specific rooms (e.g. fires from
  *object has door property*). Written once, covers everything. Ships first, in 5.2/5.3.
- **Tier 1 — class-specific**, keyed off room/object categories (underground, dark, water,
  container, treasure). Roughly 40–60 lines.
- **Tier 2 — hand-authored set pieces** for the ~15 memorable moments: mailbox, trap door, troll,
  grue death, thief, dam.

Coverage is complete from day one; quality concentrates where players remember it.

---

## 7. Review notes on `docs/gemini-new-overall-architecure.md`

The document's layering is sound — the boundaries it draws (engine knows nothing about comics,
Layout Manager never creates content, Renderer decides nothing) are correct and crisply stated.
Its weaknesses:

- **§6 states the Zork↔Comic Chat gap in three sentences and declares it solved** by "extend the
  presentation vocabulary beyond speech bubbles," which restates the problem. §7's panel types and
  §9's camera presets are flat enumerations with no rule connecting an engine event to a panel
  choice. **The Presentation Mapper is the least specified layer in the document and the only one
  carrying the project's novelty.**
- **The engine↔mapper seam is undefined.** §5.3 emits an informal blob and §5.4 consumes one. All
  the difficulty lives at that seam. Note that ADR 0002 already defines a real JSON event
  contract — the ADR should build on that rather than inventing the `PresentationEvent` shape
  sketched in discussion.
- **§3.3 determinism vs. Zork's RNG.** Settled in discussion: randomness is *desirable* for
  replayability and not in conflict with determinism, provided the **seed is an explicit part of
  save state**. "Deterministic" means deterministic given seed; tests pin seeds. Note the engine
  already verifies randomized turns by membership rather than text parity (see Open Issues).
- **§9 camera presets need a selection rule** tied to the event contract (Establishing on room
  change, Close-up when a target is present, Over-the-Shoulder on addressed dialogue). As written
  they are a list with no consumer.
- **§12 "Phase 1 ✅" is true but overstated — resolved.** Phase 1 covers parser + IR + engine,
  which `HANDOFF.md` records as M1–M4 with **Gate C claimed at v1.0.0 *with known gaps***:
  `V-CLIMB-UP` still stubbed on `GETPT`, and 155/161 overall against 143/143 strict. That is what
  "not complete" meant in session — not that the milestone is unmet. A bare ✅ hides the gaps from
  anyone reading only the roadmap, so §12 should carry the qualifier.
- Suggested disposition: once ADR 0004 exists, **fold §6 and §7 down to a pointer at it**, since
  they currently carry more weight than their content supports.

---

## 8. Where the discussion stopped

The immediate next step was blocked on research, not on decisions: **read
`original-projects/comic-chat/` to determine how much of the composition algorithm is actually
recoverable.** That materially affects the panel budget and the degree to which Comic Chat's
algorithm can genuinely drive composition rather than being reimplemented.

Caution from 5.1 that applies directly: `wiki/comic-chat-presentation.md` documents **five places
where the paper describes a system the shipped code does not have** (semantic elements are
`#if 0`'d behind an unmatchable `"OXio"`, the shout balloon, character heights, the 15% panel
break, periodic establishing shots). **Read the code, not the paper.**

### Open questions carried forward

1. How much composition logic is recoverable from the Comic Chat source?
2. Exact panel budget formula, and Guide trigger/cooldown table.
3. The Guide's identity — name, appearance, personality. Deferred to a separate document, but the
   ADR should note the slot exists. Agreed: **do not call them "Narrator" in the UI.**
4. Which Comic Chat cast member (or new asset) plays the Guide, given the `art/` corpus.

### Decisions to lock in ADR 0004

1. Comic Chat leads on identity — with §4's consequence spelled out, so a future session does not
   quietly re-litigate it into paraphrase
2. Guide is presentation-only — stated as testable constraints
3. Narration accompanied, never replaced; caption channel is verbatim engine text
4. Hero balloon = the player's typed command
5. Panel budget + Guide speech budget per turn
6. Trigger priority, cooldowns, no-repeat pools
7. Three-tier authoring, Tier 0 first
8. Camera preset selection rules tied to the ADR 0002 event contract
