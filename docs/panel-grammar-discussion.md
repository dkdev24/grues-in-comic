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

The discussion began as a review of `docs/chatgpt-new-overall-architecture.md`, an
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
| **Caption** | Engine narration — **pull-quote, not the full paragraph** (see §7) | Zero |

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

## 7. Presentation shell — two panes, and the comic as a book (settled)

Daniel's proposal, and the piece that makes the rest cohere: the gameplay UI splits **Comic Chat**
back into its two halves.

- A **console pane** carrying the text adventure: engine narration and the player's typed input,
  in the familiar shape of a modern chat transcript.
- A **comic pane** beside it, refreshed as play progresses — the relationship an LLM artifact has
  to the conversation that produced it.

**Superseded in the same session by §7.1**: the modern-chat framing was the route to the two-pane
split, not the final skin. The panes are now period reconstructions. The split itself, the
comic-primary inversion and the pull-quote amendment all survive unchanged.

### Why this is the right shell

It dissolves a problem no earlier option solved. Zork's room descriptions run 40–80 words; a
Comic Chat balloon holds roughly 15. Every prior option compromised — paraphrase (loses the prose)
or caption-heavy panels (the slideshow failure mode). With a console pane, **long prose lives
where long prose is native and the comic stops having to be self-sufficient.**

**Consequent amendment to §5:** the comic's caption becomes a **pull-quote**, not the full
paragraph. Just the line that lands — *It is pitch black. You are likely to be eaten by a grue.* —
while the complete text sits in the console. Verbatim either way, so §4's fidelity argument holds
in full; the balloon-length problem is removed rather than worked around.

### The comic is primary; the console is subordinate

The failure mode is real and severe: if all information is in the console, the comic becomes
decorative and players read left, glancing right. That would be worse here than in most designs,
because original Comic Chat's premise was that **the comic *is* the conversation view**, not an
accompaniment to one. It shipped a plain-text toggle, but the comic was primary. A text-primary
shell would demote Comic Chat's identity while appearing to preserve it — the opposite of §4.

So the split is deliberately inverted against its ChatGPT reference: the **comic gets the space**;
the console is narrower, quieter, closer to a terminal than to a chat app. Agreed in session.

### Do not read as an LLM app — resolved by §7.1

*(Retained for the reasoning; the concern itself is closed.)*

The achievement here is that the whole system is **deterministic** — a 1977 parser rendered
through a 1996 engine, no inference anywhere. A ChatGPT-shaped UI invites the assumption that a
model is behind it, which reads as "another wrapper" and buries exactly what is impressive.

Two acceptable resolutions: lean away from the resemblance visually, or lean into it as a joke
that is **made legible** ("no model was consulted — this is a 48-year-old parser"). The bad
outcome is landing in between, where it merely looks like an LLM app. Agreed in session; which of
the two is unresolved.

## 7.1 Both panes are period reconstructions (settled — supersedes the modern-chat skin)

Daniel's revision, and the version to build:

- The **comic pane** is a **Comic Chat window on IRC** — not a paper comic book.
- The **console pane** is the **terminal Zork was actually played on**.

### Why this is stronger than a stylistic choice

**Comic Chat genuinely was an IRC client.** Microsoft Chat connected to real IRC servers; the
comic view *was* the channel view. So this is not a retro skin applied over a modern app — it is
the historical artifact reconstructed. The same holds for the console: a terminal is not a
nostalgic frame around Zork, it is how Zork was played.

That yields two authentic artifacts, 1977 and 1996, side by side, running for real. It is a
materially better story than a generic split-pane, and it is the most direct possible expression
of §4's "Comic Chat can play Zork."

**It also closes the LLM-app concern outright.** The open question in §7 — lean away from the
ChatGPT resemblance or lean into it as a joke — is moot: nothing mistakes a VT100-style console for
a chat app. Struck from the open questions.

### What it disturbs, and how each resolves

**The PDF book (§7) survives, and the earlier reconciliation is why.** On screen there are no
longer accreting pages; there is a Comic Chat window. But the stream is canonical and a page is a
*layout policy*, so:

- on-screen policy → Comic Chat window
- export policy → pages

The export is simply **no longer WYSIWYG**, which is arguably better: the PDF becomes a bonus
artifact generated *from* a playthrough rather than the thing already on screen.
**Worth noting for the ADR — the panel-stream abstraction absorbed a direction change one turn
after it was written, with no rework. That is the evidence it is the right seam,** and the reason
decision #6 should be held firmly.

**Two input affordances — needs deciding.** Comic Chat shipped its own text input at the bottom of
its window, and a terminal obviously has a prompt. Both present is ambiguous. Proposal: the
**terminal owns input**; Comic Chat's input strip is rendered decoratively (present, inert) or
omitted. Unresolved.

**Retro fidelity vs. responsive — the real tension, decide before 5.3.** A faithful Comic Chat
window is fixed-size 90s chrome at low resolution; §3.5 of the Gemini doc wants responsive down to
phone portrait. These genuinely conflict. Pick deliberately rather than discovering it mid-build:

- **authentic-but-fixed** — pixel-faithful window chrome, letterboxed on mobile
- **retro-styled-but-fluid** — period visual language, modern responsive layout

Unresolved. Note this interacts with decision #6: the phone-portrait stream policy assumed fluid.

### A bonus: the status line gives `room-title` a consumer

An authentic Infocom console wants the **status line — room name, score, moves**. That is real
Zork chrome, not decoration.

It also settles a standing Open Issue in `HANDOFF.md`, which asks whether the `room-title` channel
stays in the ADR 0002 contract given it is "unused in practice." **This is its consumer: keep the
channel.** The workaround recorded there (read `player-moved`.to and look the name up in the world
document) remains available, but a status line refreshing every turn is a real reason for the
channel to exist.

---

### The comic pane is a book, and it exports

*(§7's book direction, as revised by §7.1: export-only, no longer the on-screen presentation.)*

Daniel's direction: the comic pane should read as a **paper comic book, with new pages added
during play**, and the player should be able to **download the finished book as a PDF**, generated
client-side.

**This is in tension with §8 of `docs/chatgpt-new-overall-architecture.md` ("Why Panels Instead of
Pages"), which justified the panel stream on responsive, mobile, orientation-independence and
incremental-rendering grounds. Those reasons are still valid. The reconciliation — which must be
stated in the ADR, because it is the thing a future session will get wrong:**

> **The panel stream remains the canonical model. A page is a *layout*, not a data structure.**

That is not a compromise; it is what the existing architecture already says. The Layout Manager
"never creates content — it only arranges existing panels." Page-based layout is simply one layout
policy among the responsive ones §5.6 already lists. Which means:

- **Desktop / tablet** — page-view policy: panels flowed into fixed page geometry, gutters,
  spreads, page turns. This is the "comic book" reading.
- **Phone portrait** — stream policy, as §8 intended. A fixed page is unreadable at that size.
  Same stream, different policy; no separate content model.
- **PDF export** — re-run the layout at fixed page geometry over the *entire* stream. Export is
  therefore not a special feature; it is the page-view policy applied offline to the whole
  history. This is the strongest argument that the reconciliation is correct rather than
  convenient.

The export also aligns with §3.4 (client-side only, works offline): PDF generation is
library-level work in the browser, no backend involved.

### Open problems with the book direction

- **Export size.** A full playthrough is ~189 turns; at 1–3 panels per turn that is 200–500
  panels of raster art decoded from `.avb`. The resulting PDF may be very large. Needs a measured
  answer, and possibly downsampling or a chapter-scoped export.
- **"At the ending" is the wrong trigger.** Zork playthroughs frequently do not end — players
  quit, die, or stop. Export should be available at any point, over whatever history exists.
- **Page breaks are a pacing decision the stream does not carry.** Comic Chat's shipped code has
  no equivalent (5.1 found its 15% panel-break rule described in the paper but absent from the
  code). Page composition rules are new work.
- **Scroll relationship between the panes** is unspecified. If the comic appends rather than
  replaces, scroll-syncing — scroll the console, the book follows to that moment — is a strong
  affordance and worth designing deliberately rather than inheriting by accident.

---

## 8. Review notes on `docs/chatgpt-new-overall-architecture.md`

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

## 9. Where the discussion stopped

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
5. **Retro fidelity vs. responsive (§7.1)** — authentic-but-fixed chrome, or retro-styled-but-
   fluid? Genuinely conflicting; decide before 5.3. Interacts with decision #6.
6. Where the player types — terminal only, with Comic Chat's input strip inert or absent (§7.1).
7. How faithful the IRC framing goes: channel name, nick list, `/`-commands? A nick list of two
   may be more odd than charming.
8. Page composition rules, and how pull-quote selection picks the line that lands.
9. Measured PDF export size, and whether a full-history export is viable at all.
10. Scroll relationship between the two panes.

*Closed: whether the shell leans away from or into the ChatGPT resemblance — §7.1 makes it moot.*

### Decisions to lock in ADR 0004

1. Comic Chat leads on identity — with §4's consequence spelled out, so a future session does not
   quietly re-litigate it into paraphrase
2. Guide is presentation-only — stated as testable constraints
3. Narration accompanied, never replaced. Full verbatim text in the console pane; the comic's
   caption is a verbatim **pull-quote** from it (amended by §7 — was "caption = full narration")
4. Hero balloon = the player's typed command
5. **Two-pane shell**, comic primary and console subordinate — deliberately *not* text-primary.
   Both panes are **period reconstructions** (§7.1): the comic pane is a Comic Chat window on
   IRC, the console is the terminal Zork was played on. Not skins — Comic Chat *was* an IRC
   client, so this is the artifact rebuilt.
6. **Panel stream stays canonical; a page is a Layout Manager policy, not a data structure** —
   on-screen policy is the Comic Chat window, export policy is pages, so **PDF export is
   deliberately not WYSIWYG**. This is the reconciliation with §8 of the Gemini doc and the item
   most likely to be got wrong later; it already survived one direction change unchanged.
6a. **Keep the `room-title` channel** in the ADR 0002 contract — the console status line
   (room, score, moves) is its consumer. Settles a standing Open Issue in `HANDOFF.md`.
7. Panel budget + Guide speech budget per turn
8. Trigger priority, cooldowns, no-repeat pools
9. Three-tier authoring, Tier 0 first
10. Camera preset selection rules tied to the ADR 0002 event contract
