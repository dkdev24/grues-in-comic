# Panel Grammar — Design Discussion

**Status:** Discussion complete for the mapping half. **Output written: `docs/adr/0004-presentation-mapping.md` (Proposed).**
The ADR is now the decision of record; this document is the reasoning behind it and the measurements
that produced it. Amend the ADR, not this file, when a decision changes.
**Started:** 2026-07-20 · **Last extended:** 2026-07-20 (§9–§13, measured)
**Feeds:** Next Action #5 in `HANDOFF.md`; the two open decisions in `wiki/comic-chat-presentation.md`
**Intended output:** `docs/adr/0004-presentation-mapping.md`

This document records an ongoing design discussion. It is not a decision record — it captures
where the argument got to, what was settled, what was not, and the reasoning behind each, so the
discussion can resume without being re-derived.

§1–§8 are the first session (design reasoning). §9–§12 are the second, and differ in kind: each
answers a question by **measuring** the Comic Chat source, the `art/` corpus, or a replay of the
11 walkthroughs. Three plausible proposals died that way — see §13.

---

## 1. What this discussion is about

Stage 5.3 needs a rule connecting engine events to comic panels. Stage 5.1 established that
Comic Chat has no equivalent to inherit: measured over all 11 walkthroughs (189 turns), the event
stream carries **192 `narration`, 0 `speech`**. Comic Chat's composition algorithm is
parameterized on conversation; Zork never produces any.

The discussion began as a review of `docs/archive/chatgpt-new-overall-architecture.md`, an
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

**Resolved 2026-07-20: retro-styled-but-fluid.** Responsiveness outranks retro fidelity where they
conflict; §1's "Comic Chat leads" survives intact because cast, balloons and composition are all
resolution-independent — only the fixed-pixel window furniture gives. Recorded as **ADR 0004 §4a**,
which is now the decision of record for this. The interaction noted below resolved in the expected
direction: decision #6's phone-portrait stream policy assumed fluid, and that assumption now holds.

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

**This is in tension with §8 of `docs/archive/chatgpt-new-overall-architecture.md` ("Why Panels Instead of
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

## 8. Review notes on `docs/archive/chatgpt-new-overall-architecture.md`

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
  already verifies randomized turns by membership rather than text parity (see `docs/PITFALLS.md` → Engine / IR).
- **§9 camera presets need a selection rule** tied to the event contract (Establishing on room
  change, Close-up when a target is present, Over-the-Shoulder on addressed dialogue). As written
  they are a list with no consumer.
- **§12 "Phase 1 ✅" is true but overstated — resolved.** Phase 1 covers parser + IR + engine,
  which `HANDOFF.md` records as M1–M4 with **Gate C claimed at v0.9.0 *with known gaps***:
  `V-CLIMB-UP` still stubbed on `GETPT`, and 155/161 overall against 143/143 strict. That is what
  "not complete" meant in session — not that the milestone is unmet. A bare ✅ hides the gaps from
  anyone reading only the roadmap, so §12 should carry the qualifier.
- Suggested disposition: once ADR 0004 exists, **fold §6 and §7 down to a pointer at it**, since
  they currently carry more weight than their content supports.

---

## 9. Recoverability of the composition algorithm (answered — measured)

The question §9 previously stopped on: **how much of Comic Chat's composition algorithm is
recoverable?** Answer: recoverable in full, but **mostly degenerate at our cast size**, which is a
more useful result than "yes".

Only `v2.5-beta-1` (and `v1.0-pre`) ship source; `v1.0` and `v2.1b` are binaries. Stage 5.1
already located every component with file:line, so nothing was hidden.

| Component | Where | Behaviour at cast size 2 (Hero + Guide) |
|---|---|---|
| Placement cost (`EvalPair`) | `panel.cpp:278` | **Collapses.** The 4n between-characters penalty is always 0; the consistency penalty (cost 1) pins Hero left / Guide right permanently. Eight candidates, one obvious winner, every panel. |
| Zoom (`LayoutAvatars`) | `panel.cpp:717` | **Near-constant.** Below 1.1× snaps to 1.0, and two fixed-height avatars never drive it off 1.0. |
| Establishing (`Establishing`) | `pageview.cpp:821` | First one or two panels of the session only. No arrival trigger, no periodic refresh. |
| Panel break (`AddLine`) | `panel.cpp:1033` | **Still works — and yields the panel budget.** |
| Routing channels | `balloon.cpp` | Transferable as an idea: layout failure is the break signal. |

The load-bearing consequence: the placement cost function — the machinery the paper spends its
pages on — **returns a constant for us**, because it is precisely the part parameterized on the
social graph §2 says Zork never populates. It can be ported faithfully and will produce no
variation.

### The panel budget falls out of `AddLine` (answers the §6 question)

`AddLine` breaks the panel when the speaker already holds a balloon in it — at most one balloon
per character per panel. The §5 three-channel panel is Hero + caption + Guide, each at most once,
so **one panel per turn is the structural default**. The only other trigger is balloon-layout
failure on long text, which §7 already removed by demoting the caption to a pull-quote.

So: **~1 panel/turn, ~189 panels for a full playthrough.** That also sharpens the export-size
worry in §7 — the PDF is ~189 panels, not the 200–500 feared there.

---

## 10. Camera preset selection (settled — measured over the 11 walkthroughs)

Comic Chat's own variation machinery is dead at cast size 2 (§9), so the variation has to come
from the event stream instead. That makes camera selection tied to the ADR 0002 contract not a
refinement but the *replacement* for what went dead.

Grounded in the real contract (`engine/src/events.ts:22-34`) — seven event types, three narration
channels — not the flat enumeration in `docs/archive/chatgpt-new-overall-architecture.md` §9.

### The salience filter, which is load-bearing

The obvious rule — "close-up when an event names a target" — is wrong here, and 5.1's measurement
is what exposes it. There are 187 `object-moved` events across 189 turns: **the thief's wander
daemon, one per turn.** A camera keyed naively on `object-moved` fires every turn, on an object
the player usually cannot see. Comic Chat never faced this because chat has no offscreen actors.

So the mapper applies a **salience test** before any preset rule: an `object-moved` counts only if
`object`, `from`, or `to` is the player, the player's inventory, or the player's current room. The
mapper tracks that already, since it must follow `player-moved` regardless.

**Measured: 31 of 187 `object-moved` are salient (16.6%).** Without the filter, 156 turns would
have fired a close-up on an unseen thief — it would have been the most common shot in the film and
every instance would be wrong. The filter survives contact.

### The ladder

One panel per turn (§9), so one camera decision per turn over the turn's whole event set;
priority-ordered, first match wins.

| # | Condition | Preset |
|---|---|---|
| 1 | `game-over` | Reaction — tight on Hero |
| 2 | `player-moved` where `to` is **first-visited** | Establishing (emphatic if the turn also scored) |
| 3 | `player-moved` to an already-visited room | Wide two-shot |
| 4 | salient `object-moved` | Close-up on that object |
| 5 | Guide balloon present | Over-the-shoulder, Guide → Hero |
| 6 | default | Medium two-shot |

**Rule 2 is the preset Comic Chat could not write.** `Establishing()` is dead in spirit — it
counts the first panels of a session and never fires again, because a chat room has no *places* to
establish. Zork has 110 rooms and the engine emits the transition. Novelty-gated establishing
shots are a preset Comic Chat's architecture wanted and its domain could not supply: the clearest
case so far of the collision paying out in our favour rather than costing us.

**Rule 5 sits low deliberately**, inverting the instinct in the ChatGPT doc §9. Over-the-shoulder
on addressed dialogue is Comic Chat's signature, but the Guide is budgeted and usually absent
(§5), so a high-ranked Guide rule would make the rare Guide turn look identical to nothing
happening. Better that the Guide inherits whatever the world is already doing.

### A `score-changed` rule was proposed and killed by measurement

An earlier draft ranked `score-changed` third, on the reasoning that it is Zork's own declaration
that a turn mattered. Measured: **14 scoring turns, all 14 also first-visits, zero standalone.**
Rule 2 shadows it completely. That is not a sampling artifact — it is Zork I's design, where
scoring is overwhelmingly room-entry scoring. `score-changed` therefore survives as a *modifier*
on rule 2 (an establishing shot that also scored gets the emphatic treatment), not as its own
rank. Recorded because it is exactly the kind of plausible rule a later session would re-propose.

### Measured distribution

Replay of all 11 walkthroughs, classifying each turn by the ladder:

```
turns: 189      object-moved: 187 total, 31 salient (16.6%)

medium           99   52.4%
establishing     50   26.5%
closeup          24   12.7%
reaction         11    5.8%
wide              5    2.6%
beat              0    0.0%   (the killed score rule)
```

Full event census: `object-moved` 187, `narration:prose` 171, `player-moved` 55, `game-over` 22,
`narration:system` 21, `score-changed` 14, `question` 2, **`speech` 0**.

**Read these with the corpus shape in mind.** The 11 walkthroughs average 17 turns each — they are
scenario tests, not playthroughs. That inflates `establishing` (each opens by exploring virgin
rooms) and pins `reaction` at exactly one per walkthrough (each ends). Real play revisits known
rooms constantly, so `establishing` collapses toward `wide` and `medium` absorbs the difference:
**the true default-shot share is higher than 52%, likely 65–75%.**

Incidental, not investigated: the census shows **22 `game-over` events across 11 walkthroughs**,
two per walkthrough in the same turn. May be legitimate (a death then a quit) or a double-emit.
Harmless to per-turn classification, but worth a look before a UI reacts to that event.

---

## 11. Jitter axes for the default shot (settled — measured against the `art/` corpus)

If the default shot is 52%+ of panels, what varies within it? An earlier draft of this section
assumed the axes were thin and proposed crop/distance/background jitter as the main event. **That
premise was wrong**, and the corpus is what corrected it.

### The figure space is a product, not a sum

Complex avatars store **faces and torsos separately and composite them**, so the figure count
multiplies. Measured over the 25-avatar corpus:

```
25 avatars   mean faces=10.7  torsos=9.0  bodies=1.4

lynnea     faces=17 torsos=18 gestures=3     ->  306 figures
margaret   faces=20 torsos=13 gestures=3     ->  260
tiki       faces=20 torsos=12 gestures=3     ->  240
susan      faces=20 torsos=11 gestures=4     ->  220
anna       faces=18 torsos=16 gestures=3     ->  288
lance      faces=11 torsos=11 gestures=7     ->  121
connor     faces= 0 torsos= 0 bodies=15      ->   15  (simple avatar)
jordan     faces= 0 torsos= 0 bodies=14      ->   14  (simple avatar)
glenda / pedagog / rainbow / tux / waf   bodies=1     (logo mascots, not characters)
```

Roughly 100 default-shot panels per playthrough drawn from 240+ figures. **The default shot is not
visually starved; it is oversupplied.** Crop and background jitter are not needed to solve a
monotony problem that does not exist at the figure layer.

Casting consequence: Hero and Guide should both be *complex* avatars. That rules out 7 of 25
outright and makes lynnea / anna / margaret / tiki / susan the practical shortlist (open question
#4).

### Monotony moves up a layer, into selection

`nearestByAngle` (`art/src/pose.ts:53`) is deterministic: the same requested emotion returns the
same pose every time. With 240 figures available and an argmax selector, one drawing renders
repeatedly while 239 alternatives sit unused. **The corpus is not the constraint; the selector
is.**

Comic Chat solved this and 5.1 documented it (`wiki/comic-chat-presentation.md` §2): cycle through
tied variants rather than freezing on one. The wheel has 8 segments (`NEMOTIONS`) and a strong
avatar has ~20 faces — ~2.5 faces per segment, so real ties exist by construction. **Port the
cycling, not just the nearest-neighbour.**

### The axis that needs design: where emotion comes from

This is the one genuinely new problem, and it is a data-flow inversion.

Comic Chat derives emotion from **the speaker's own typed text** (`textpose.cpp` — smileys,
punctuation, keywords). Our Hero's balloon is the player's verbatim command (§5): `OPEN MAILBOX`,
`N`, `TAKE LAMP`. Permanently flat. Feed that to Comic Chat's algorithm and the Hero renders
neutral for the entire game — 240 figures, one ever used.

The affect lives in the **narration**, which is the *world's reply*, not the Hero's line:

> *It is pitch black. You are likely to be eaten by a grue.*

So the Hero's emotion must be driven by the narration channel and the turn's event set, not by the
Hero's own balloon. That is backwards from Comic Chat and it is correct: Zork's prose is
second-person and already describes the Hero's situation and implied reaction. The engine supplies
affect markers cheaply — `game-over`, darkness, parser refusal (`You can't…`), `score-changed`,
combat events.

**Gestures are the scarce resource**: 3–4 per avatar against 240 figure combinations. They should
be event-gated, never sampled — reserved for `game-over`, first-visit establishing shots, and
combat. Spending one on a routine `EXAMINE` wastes the rarest asset in the corpus.

### Axes, ranked by what the measurement supports

1. **Face × torso cycling** — solves monotony outright; needs only a port of Comic Chat's existing
   tie-cycling behaviour.
2. **Emotion derived from narration + events** — the real design work, and the inversion is the
   interesting part.
3. **Crop / distance / background** — *demoted* from "the main event" to a garnish.

---

## 12. The affect-marker table (drafted — measured over the 189 turns)

Answers open question #11. §11 established *that* Hero emotion must come from the narration rather
than from the Hero's own balloon; this is the table that does it.

### What the table feeds

Not a single emotion — a **`CEmotionOpts` set**. `selectComplexPose` (`art/src/pose.ts:146`)
consumes weighted options highest-priority first, and lets the first option that yields a face fix
the face while the first that yields a torso fixes the torso. Two consequences:

- Markers do **not** compete winner-take-all. A marker outranked on the face can still claim the
  torso. The "wins" column below is therefore a **lower bound** on each marker's contribution.
- A marker may legitimately emit a gesture and an expression at once — that is the mechanism that
  lets the Hero shrug while looking annoyed.

### The markers

Priority descending. Angles are `EMOTION_ANGLES` indices (`art/src/format.ts:83`); intensity 0–1.

| Pri | Marker | Fires on | Emotion | Fires | Wins |
|---|---|---|---|---|---|
| 100 | `death` | `game-over` event | SCARED 1.0 | 11 | 11 |
| 90 | `grue-threat` | `/pitch black\|grue/` | SCARED 0.9 | 3 | 3 |
| 80 | `combat-victory` | `/fatal blow\|slumps to the floor\|breathes his last/` | SHOUT 0.9 | 2 | 2 |
| 70 | `combat-threat` | `/sword (is\|has) glow/` | ANGRY 0.7 | 4 | 4 |
| 60 | `scored` | `score-changed`, `delta > 0` | HAPPY 0.8 | 14 | 11 |
| 50 | `reveal` | `/reveal(s\|ing)\|sluice gates open/` | HAPPY 0.6 + POINTOTHER | 24 | 4 |
| 45 | `effort` | `/great effort\|reluctantly\|crashes shut/` | SHOUT 0.5 | 25 | 20 |
| 40 | `uncanny` | `/hollow voice\|strange gothic\|nothing special/` | COY 0.6 | 13 | 13 |
| 30 | `parser-miss` | `/I beg your pardon\|isn't one I recognize\|can't see any\|don't have that/` | BORED 0.5 + SHRUG | 24 | 24 |
| 10 | `routine-ack` | `/^(Taken\|Dropped\|Opened\|Click)\.$/` | NEUTRAL 0.0 | 20 | 20 |
| — | *(none)* | room descriptions, inventory listings | NEUTRAL 0.0 | — | 77 |

**77 turns (40.7%) match no marker at all**, and that is the correct outcome, not a coverage gap:
they are room descriptions and inventory listings, where a neutral Hero is right. Combined with
`routine-ack`, **51% of turns are deliberately affectless** — which is what keeps the 5.8% death
reaction from being wallpaper.

### Three findings that change the design

**1. The Hero's most common emotion is exasperation at the parser.** `parser-miss` is the largest
single marker (24 turns, 12.7%), and nothing outranks it in practice. The Hero of this comic is,
statistically, a person being told "I beg your pardon?" This is period-honest — arguing with the
parser *is* the 1977 experience — but it is a strong characterisation to arrive at by accident, so
the ADR should adopt it deliberately or damp it. Recommendation: adopt it. It is funnier than
neutral and it is true.

**2. HAPPY and NEUTRAL are the same angle, so happiness is carried entirely by intensity.**
`EMOTION_ANGLES` puts NEUTRAL at 0.0, identical to HAPPY (`format.ts:93`), separated only by
intensity 0. Measured across the Guide shortlist: HAPPY *faces* exist at graded intensities
(0.1–1.0), but **not one avatar in the shortlist has a HAPPY torso** — every angle-0 torso is
NEUTRAL@0.00. Joy is a face-only emotion in this corpus. A `scored` marker will always draw a
neutral body under a smiling face, and no amount of table tuning changes that.

**3. SHRUG constrains Hero casting.** The natural gesture for `parser-miss` — the largest marker —
is SHRUG, and only **5 of 18 complex avatars own a shrug torso**: dan, lance, mike, susan,
tongtyed. If the Hero shrugs at the parser, the Hero is cast from those five. Note susan appears on
both this list and the §11 Guide shortlist, so the two roles can collide; resolve casting for both
at once.

### Caveat on the frequencies

The same walkthrough-shape caveat as §10, and it bites harder here. All 11 walkthroughs open at
West of House and replay the same first moves, so `effort` at 25 fires is largely **three sentences
repeated** — the window (8), the rug (6), the trap door (6). These are opening-sequence frequencies,
not the frequencies of real play. The *ordering* of the markers is sound; the percentages are not
projectable.

---

## 13. Where the discussion stands

§9–§11 answered the research question the discussion was previously blocked on, plus the panel
budget and the camera rules. Method note worth carrying: **three proposals died on measurement in
this session** (the naive `object-moved` close-up, the `score-changed` beat rule, and the
thin-jitter premise). Measure against the corpus and the walkthroughs before committing a rule to
the ADR.

Caution from 5.1 that still applies: `wiki/comic-chat-presentation.md` documents **five places
where the paper describes a system the shipped code does not have** (semantic elements `#if 0`'d
behind an unmatchable `"OXio"`, the shout balloon, character heights, the 15% panel break,
periodic establishing shots). **Read the code, not the paper.**

### Open questions carried forward

1. ~~How much composition logic is recoverable from the Comic Chat source?~~ **Answered — §9.**
2. ~~Exact panel budget formula~~ **answered — §9, ~1 panel/turn.** Guide trigger/cooldown table
   still open.
3. The Guide's identity — name, appearance, personality. Deferred to a separate document, but the
   ADR should note the slot exists. Agreed: **do not call them "Narrator" in the UI.**
4. Which Comic Chat cast members play the Guide **and the Hero** — **narrowed by §11** to the
   complex avatars (Guide shortlist lynnea / anna / margaret / tiki / susan) and **further
   constrained by §12**: a shrugging Hero must come from dan / lance / mike / susan / tongtyed.
   Cast both roles at once — susan is on both lists.
5. ~~Retro fidelity vs. responsive (§7.1)~~ — **settled 2026-07-20: responsiveness wins when the
   two conflict. Recorded as ADR 0004 §4a**, which also measures why the cost is lower than this
   discussion assumed (parts are 236×296–385×355, so scaling is mostly downward).
6. Where the player types — terminal only, with Comic Chat's input strip inert or absent (§7.1).
7. How faithful the IRC framing goes: channel name, nick list, `/`-commands? A nick list of two
   may be more odd than charming.
8. Page composition rules, and how pull-quote selection picks the line that lands.
9. ~~Measured PDF export size~~ — **panel count now bounded at ~189 (§9)**; byte size still
   unmeasured.
10. Scroll relationship between the two panes.
11. ~~The affect-marker table~~ — **drafted and measured, §12.** What remains is a judgement call,
    not a measurement: whether to adopt or damp the Hero's parser-exasperation (§12 finding 1).
12. **New:** the `game-over` double-emit observation (§10) — verify before a UI consumes it.

*Closed: whether the shell leans away from or into the ChatGPT resemblance — §7.1 makes it moot.*

### Decisions to lock in ADR 0004

1. Comic Chat leads on identity — with §4's consequence spelled out, so a future session does not
   quietly re-litigate it into paraphrase
2. Guide is presentation-only — stated as testable constraints
3. Narration accompanied, never replaced. Full verbatim text in the console pane; the comic's
   caption is a verbatim **pull-quote** from it (amended by §7 — was "caption = full narration")
4. Hero channel = the player's command in canonical form — **and it is a `CBWoodringThink`
   *thought* balloon, never speech.** See §16; ADR 0004 §2a is the decision of record.
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
7. **Panel budget: ~1 panel/turn**, derived from `AddLine`'s one-balloon-per-character rule (§9),
   not chosen. Guide speech budget per turn still to set.
8. Trigger priority, cooldowns, no-repeat pools
9. Three-tier authoring, Tier 0 first
10. **Camera preset selection — the six-rung ladder in §10**, tied to the ADR 0002 event contract,
    with the **salience filter** stated as a precondition rather than a detail (16.6% of
    `object-moved` are salient; without it the most common shot in the film is wrong). Record that
    the `score-changed` beat rule was proposed and killed by measurement, so it is not re-proposed.
11. **Pose variation is a selector change, not an asset problem** (§11): port Comic Chat's
    tie-cycling on top of `nearestByAngle`, because the corpus supplies 240+ figures per complex
    avatar and a deterministic argmax would use one.
12. **Emotion is derived from the narration and the turn's events, never from the Hero's balloon**
    (§11) — the inversion of Comic Chat's data flow, and the constraint most likely to be
    implemented backwards. Gestures are event-gated, never sampled (3–4 exist per avatar).
13. **Hero and Guide must be complex avatars** (§11) — simple and mascot avatars cannot carry the
    default shot.
14. **The affect-marker table (§12)**, emitted as a weighted `CEmotionOpts` set rather than one
    winning emotion — so a marker outranked on the face can still claim the torso. Lock the
    priority *ordering*; do not lock the measured percentages, which are opening-sequence-shaped.
15. **Roughly half of all turns are deliberately affectless** (§12) — 51% resolve to NEUTRAL. State
    this as intent, or a later session will read it as missing coverage and "fix" it.
16. **Casting is constrained by gesture inventory, not only by avatar type** (§12) — a Hero who
    shrugs at the parser must come from the 5 complex avatars that own a SHRUG torso. Cast Hero and
    Guide together; susan is on both shortlists.

---

## 14. Mockup review and the cmx.js assessment (2026-07-20)

Two pieces of external material landed in `reference/` (gitignored, so the findings live here):
AI-generated desktop and mobile mockups (`grues-in-comic-mockup-*-v3`), explicitly **exploratory,
not a design of record**, and a copy of **cmx.js**, an MIT xkcd-style comic library.

### What the mockups get right

Both are closer to ADR 0004 than not, and two things in them are better than what the ADR says.

- The **two-pane split** (§4) reads immediately: comic left, terminal right on desktop, stacked on
  mobile. The period reconstruction lands without explanation.
- The **IRC framing** (open question #7) is answered well and quietly: a title bar reading
  `irc://comic.zork.net #grues-in-comic` with a user count. It is present without a nick list,
  which was the part feared to be more odd than charming.
- The console **status line** exists, which is the `room-title` consumer decision 6a depends on.
- On mobile the panels are legible at four-per-screen, which independently corroborates the §4a
  measurement that this art downscales comfortably.

### Three conflicts with ADR 0004

**1. The caption channel is missing entirely.** Every panel in both mockups carries balloons only.
ADR §2 specifies three channels, and the caption — a verbatim pull-quote from the narration — is
the one doing the most work, because it is what keeps the comic tied to Zork's actual prose rather
than to invented dialogue. A design without it is a different product. **The ADR should win here.**

**2. The on-screen comic renders as a page grid** (3×3 desktop, 2×2 mobile). ADR §5 makes the
on-screen policy the Comic Chat *window* — a vertical stream — and pages an **export**-only policy.
This is exactly the decision §5 predicted would be quietly reverted by someone reading the
divergence as a bug. Two readings are possible and they are not equally good: if the grid is merely
how a fluid stream reflows at desktop width, there is no conflict and §5 holds; if it is a paginated
view, it contradicts §5. **Worth settling explicitly rather than letting the implementation decide.**

**3. On mobile both panes are shown shrunken**, where ADR §4a originally said the console becomes a
collapsible drawer. **The mockup was right and §4a was wrong.** The drawer was written to protect
screen space for the comic, but §2's real invariant is that narration is *accompanied, never
replaced* — and a visible transcript honours that more directly than a drawer does. The mockup keeps
roughly 40/45 comic-to-console and both remain readable.

**Resolved 2026-07-20: ADR §4a amended.** Both panes stay visible in the default portrait layout;
the drawer survives only as a fallback below the narrowest workable width. The mockup won this one
against the ADR, which is the point of building mockups.

The same amendment adds an **optional dictation input** for portrait: the software keyboard is the
largest single consumer of a phone viewport, and speech-to-text with the keyboard dismissed is the
only way to reclaim that space without taking it from either pane. Recorded with three constraints —
it fills the input field rather than auto-submitting (Zork's parser is unforgiving and its
vocabulary defeats general recognizers; "grue" is not a word they know), it is strictly additive to
text entry, and "on-device" must be verified rather than assumed, since browser `SpeechRecognition`
has historically streamed audio to vendor servers and this project has a standing no-cloud
constraint.

Minor, and only worth noting so they are not mistaken for decisions: the status line shows the game
title where decision 6a wants the **room** name, and the desktop mockup has two `>` prompts (one in
the transcript, one in a dedicated input strip), which bears on open question #6.

### cmx.js: reference only, not adopted

MIT, so licensing is not the obstacle. Two other things are.

**The figure model does not bridge.** cmx.js draws procedural vector stick figures posed by a
14-joint skeleton (`pose="-11,9|-5,117|…"`) rendered through an xkcd hand-jitter interpolator. Ours
composites pre-drawn bitmap faces onto bitmap torsos from `.avb`. The skeleton, bone and pose code
is most of the library and none of it applies.

**It is an authoring tool, not a generator.** cmx.js renders a comic a human wrote by hand in HTML.
It contains no composition logic whatsoever — no camera, no emotion, no layout decisions. That is
the entire half of the problem §9–§12 exist to solve, and it is precisely why Comic Chat's C++
remains the better source: it *decides*. Adopting cmx's balloon look would also cut against §1,
since that look is deliberately xkcd.

Stack cost compounds it: CoffeeScript, D3 v2/v3, jQuery, underscore, RequireJS AMD and a
Yeoman/Grunt/Bower toolchain, all 2013.

Two files are worth reading for ideas and nothing else: `app/lib/cmx/renderer.coffee`, for treating
a balloon as an SVG path through a handful of control points, and `app/lib/cmx/scene.coffee`, for a
layered fluid-scaling SVG scene — adjacent to §4a. **Read; do not vendor.**

---

## 15. "Easy mode" — a SCUMM-style command picker (proposed, measured, not yet decided)

The idea: alongside typing, let the player assemble commands by choosing from what is available —
the Monkey Island verb grid plus clickable objects — as an option, most valuable on mobile.

### The data already exists

This is the cheap half, and it is cheaper than expected. The world document already carries
everything a picker needs:

| Source | Content |
|---|---|
| `vocabulary.syntax` | **267 rules** — verb, object slots with prepositions, action routine |
| `vocabulary.directions` | 13 |
| `vocabulary.synonyms` | 75 groups |
| `objects[]` | 137, each with `synonyms`, `adjectives`, `flags`, `location` |
| `engine/src/scope.ts` | `scope()` and `inScope()` — the engine **already computes** what is reachable |

Arity split of the 267 rules: 50 take no object, 139 take one, 78 take two. So a verb-then-object
picker covers the whole grammar with no new parsing.

### The problem: Zork's verb list is itself a spoiler table

**135 distinct verbs.** Reading them is enough to see the difficulty:

> ECHO · ODYSSEUS · PRAY · EXORCISE · PLUGH · INCANT · TREASURE · WIND · DIG · WAVE …

`ECHO` *is* the solution to the Loud Room. `ODYSSEUS` *is* the solution to the cyclops. `PRAY`,
`EXORCISE`, `TREASURE` and `WIND` are likewise the answers to puzzles whose difficulty is entirely
"work out what to type". A menu listing them converts several of Zork's signature puzzles into a
scan of a dropdown.

**This is the structural difference from Monkey Island and it is not a detail.** SCUMM games have
~9 fixed verbs and put the difficulty in *object combination*; the verb menu gives nothing away
because the verbs are mundane. Zork puts a large share of its difficulty in *verb discovery*. The
same UI pattern has opposite consequences in the two games.

### The design that survives that

A **small fixed core verb set** — roughly take, drop, open, close, examine, read, push, pull, turn,
attack, put-in, plus the directions — with objects drawn from `scope()`. Everything mundane becomes
tappable; every puzzle verb stays **typed-only** and undiscoverable from the UI. That preserves the
puzzles while removing the friction that easy mode exists to remove, and it happens to match where
the friction actually is: §12 measured `parser-miss` at 12.7% of turns, and those misses are
overwhelmingly mundane, not puzzle-critical.

The core set must be derived by filtering the 267 rules, not hand-listed, or it silently drifts from
the grammar the engine accepts.

### The non-obvious cost: easy mode flattens the comic

**`parser-miss` is the single largest affect marker (12.7%, §12) and easy mode structurally
prevents it.** A player who picks from valid options cannot issue an unparseable command, so the
Hero's most common emotion simply stops occurring. ADR 0004 §10 warns that "improving coverage"
here will flatten the comic; easy mode does exactly that, not by accident but by construction.

This is not a reason to reject it. It is a reason to decide *in advance* what replaces that affect —
a hesitation or deliberation marker on long option scans, say — rather than discovering later that
easy-mode comics are visibly duller than typed ones and not knowing why.

### What it costs architecturally

**It needs something ADR 0002 does not have.** The event contract is push-only and carries no
notion of what is *available*; ADR 0004 opens by promising not to extend it. A picker needs to know
the current scope.

Recommended shape, if this proceeds: a **read-only query API** — `availableVerbs()`,
`objectsInScope()` — rather than a new event type. Queries are pull, not push; the event stream and
its 1.0.0 contract version stay untouched, and the parity harness is unaffected because queries have
no effect on state. `scope.ts` already computes the answer, so this is a projection over existing
internals, not new engine logic. It is still an **ADR 0002 amendment** and should be argued there
rather than smuggled in through the UI.

**ADR 0004 §2 also needs a word.** The Hero balloon is defined as the player's typed command,
verbatim — in easy mode nothing is typed. The balloon should be redefined as the **canonical command
form**, which equals the typed text in typed mode and the assembled command in easy mode.

### Recommendation

**Build it, as an option, with the fixed core verb set — but not before 5.3.** It is well-supported
by the data, it is the right answer for mobile, and typing stays the default so §1's retro identity
is untouched. The two prerequisites are an ADR 0002 amendment for the query API and a decision about
what replaces the lost `parser-miss` affect. Neither is hard; both are worse discovered late.

Naming: **"easy mode" undersells it and is a little insulting to the player.** It is not an easier
game — the puzzles are identical — it is a different input method. Prefer *assisted input*, *point
and click*, or similar.

---

## 16. The Hero speaks in the wrong voice — corrected (2026-07-20)

Raised against the ADR after it was accepted, and correct. Recorded because the failure mode is
instructive: the decision was not wrong so much as **underspecified**, and the natural way to fill
the gap was wrong.

### The observation

ADR 0004 §2 said "Hero balloon = the player's typed command, verbatim" and never fixed the balloon
*class*. The obvious reading is a speech balloon — and a speech balloon containing `open the door`
makes the Hero appear to be **ordering the Guide** to open it. The Guide is the only other body on
stage in the default two-shot, so the instruction has an addressee whether we intend one or not.

### Why it is a real defect and not a nitpick

Three independent things break, which is what raised this from a style question to an amendment:

1. **Grammatical direction is inverted.** The player's command is an imperative *addressed to* the
   Hero — Zork answers in the second person, "**You** are standing…". Putting it in the Hero's
   mouth makes the Hero the issuer rather than the recipient, and visually promotes the Guide to an
   agent in the world. That contradicts §3 (Guide is presentation-only) at exactly the layer a
   reader actually perceives, while the code stays correct — the worst kind of divergence.
2. **It asserts something the contract denies.** The engine emits **0 `speech` events** across all
   11 walkthroughs. A comic whose most frequent element is a speech balloon claims speech on every
   panel that the event stream never contained.
3. **It fights the §11 emotion inversion.** Hero affect is derived from the *narration*, not from
   the balloon's words. A face reacting to something other than what it is visibly saying reads as
   a bug; a face reacting while the Hero *thinks* reads as intention.

Point 2 is the one worth dwelling on. It was available from the §10 census the whole time and was
missed, because the census was being read for camera rules rather than for balloon classes. The same
measurement answers more questions than the one it was taken for.

### The fix

**`CBWoodringThink`** — a shipped Comic Chat balloon class (`balloon.h`), so this is a port and §1
is satisfied. `open the door` as a thought reads as terse intention, which is what it is. No
authoring is introduced, verbatim survives, and Hero and Guide become distinguishable by balloon
*class* rather than only by position.

Recorded as **ADR 0004 §2a**, together with the generalization of "typed command" to **canonical
form**, which §15 needed anyway for assisted input.

### Alternatives that were worse

- **Rewrite to first person** ("I'll open the door"). Breaks verbatim and introduces authored text
  outside the Guide, which §2 deliberately confines to one channel.
- **Put the command in a caption box.** §2 already spends the caption on the narration pull-quote,
  and `CBWoodringBox` has no tail, so attribution to the Hero would be lost entirely.
- **Drop the Hero channel when the Guide is on stage.** Silently discards the player's own input
  from the canonical record — the one thing in the panel that is unambiguously theirs.
