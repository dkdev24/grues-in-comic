# ADR 0006 — The Dungeon Master and the Player: from Two Voices to a Table

- **Status:** Accepted (building — Slices 1–4 landed v0.17.5, v0.18.6, v0.18.7, v0.18.8; only
  Slice 5, the session-recap export, remains)
- **Date:** 2026-07-22
- **Supersedes (in part):** ADR 0004 §2/§2a (the Hero's channel is a *thought* balloon), §"Not the Narrator" boundary as stated in `wiki/the-guide.md`; ADR 0005 §4 ("the Hero keeps the *thought* balloon — he does not speak")
- **Preserves (non-negotiable):** ADR 0002 (the event contract — still consumed, still not extended); the Guide/DM stays **presentation-only** — no game state, unaddressable by the parser, removable without moving one bit of engine behaviour or the parity harness (ADR 0004 §3); the panel stream stays a **deterministic pure function of the event stream with no engine internals**, so `replayPanels` still applies (ADR 0004 §5, ADR 0005 testing contract)
- **Related:** `wiki/the-guide.md`, `wiki/the-hero.md` (both require rewrite — see Consequences), ADR 0005 (this builds on its Director and two-shot)

## Context

ADR 0005 turned the play-log into an edited retelling and gave the two figures a
two-shot, but it deliberately stopped short of a conversation: the Hero **thinks**, the
Guide **comments**, and the two never trade lines. That was the right conservative call at
the time. In review (2026-07-22) it is also the ceiling: a caption plus an aside is not a
comic, and the Comic pane — and especially the end-of-game PDF — will keep reading as an
annotated transcript until the two characters actually **talk to each other**.

We are choosing a change of direction that earlier ADRs explicitly closed off. **We accept
that it breaks settled decisions.** The framing:

> The Guide is the **Dungeon Master** of a one-player table. The Hero is his **player**.
> The Great Underground Empire is the module they are running.

This is not an arbitrary reskin. `wiki/the-hero.md` already fixes the Hero as a middle-aged
ex-tabletop player "revisiting, older," who reads the empire "the way he reads any system."
The DM/player relationship is the other half of a character we already wrote. What ADR 0005
lacked was a **generative model for dialogue**; the table supplies one, with built-in
asymmetry (one runs the world, one plays in it), built-in affection, and a licence for the
genre-literate meta-banter the Hero was already primed for.

### The objection this ADR must answer

A DM *runs the world*; the Guide provably **cannot touch game state**. Casting it as DM
looks like it lies about the mechanics — and the tiki-idol concept in `wiki/the-guide.md`
earned its keep precisely by making that constraint diegetic ("it cannot help, only
observe"). We are not waiving the constraint. We are resolving the objection, below, by
splitting *authority in fiction* from *authority in mechanics* — and the split turns out to
**dissolve** ADR 0004's awkward "Not the Narrator" boundary rather than fight it.

## Decision

### 1. The DM's authority is fiction; the mechanics are unchanged

The engine still runs the game. The parser still adjudicates. The DM **narrates and reacts;
it never resolves**. Concretely, nothing about the Guide's mechanical contract moves:
presentation-only, reads events, touches no state, unaddressable, removable. What changes is
only the **fiction wrapped around that surface** — from "a carving that comments" to "a DM
running a table." Both are things that *cannot help, only observe*; a DM who solved the
puzzle for you would be a bad DM, so the firewall (`the-guide.md` rule 4 / `the-hero.md`
rule 5 — **never a hint**) survives intact, now with a *stronger* in-fiction reason.

### 2. The caption channel is the DM reading the module aloud

ADR 0004 forbade the Guide from being "the Narrator" because Zork's room descriptions and
parser answers already own the caption channel, and two narrators would collide. The table
framing **removes the collision**: the caption channel *is* the module's boxed text and
rules-as-written, and the DM is the one reading it aloud. Zork's neutral narration and the
DM's table patter stop being two rival voices and become **one voice in two registers** —
read-aloud (verbatim caption, unchanged, still ADR 0004 §2) and table-talk (authored). The
"Not the Narrator" boundary is retired, not violated.

### 3. The Hero speaks

The Hero moves from a thought balloon to a **speech** balloon in the exchange. This is the
core break with ADR 0004 §2 and ADR 0005 §4. He is no longer narrating his life to no one;
he is answering the DM across a table. The **thought balloon is retained as a second
register** — interior asides the DM doesn't hear ("*classic false floor; I'd have run
that one*") — so the Hero has both a public voice (to the DM) and a private one (to the
reader). Balloon class is chosen per line, not per character.

The player's command remains **authorship of the action**, never the Hero's dialogue
(ADR 0005 §1 holds): what the Hero *says* is derived from the resolved events and the beat,
exactly as his balloon already is — the change is the balloon's tail and register, not its
source.

### 4. The two-shot becomes an exchange

ADR 0005 §4 built the two-shot as a framed reaction. It now carries a **dialogue pair**:
DM line ↔ Hero line, keyed on the beat, both figures facing each other (ADR 0004 §7 rungs,
ADR 0005 §4 facing). A beat may render as DM-only, Hero-only, or a true back-and-forth; the
Director (ADR 0005 §2/§3) still decides which beats earn a panel and still drops noise.

To keep banter from repeating over a long run, dialogue may depend on **bounded
conversational memory** — but only memory that is itself a **pure function of the event
stream** (e.g. "the *n*th grue beat," "first vs. repeat visit," a running kill count already
derivable from events). No engine internals, no wall-clock, no RNG. This is the load-bearing
constraint of the whole ADR (see Testing).

### 5. The end-of-game export is a session recap

The PDF is reframed as **the record of a session at the table**: module-style boxed text
(the read-aloud caption channel) with the DM/player exchange in the margins, past-tense by
nature. This is a presentation-only artifact with **zero engine or parity implications** and
is where the table aesthetic pays off most — it ships independently of the live-pane work.

## The testing contract

Unchanged in kind from ADR 0005, and this is the point that lets us break character decisions
without touching the guarded core. The panel stream — now including who says what — stays a
**deterministic pure function of the event stream holding only stream-derived memory**. The
parity oracle (`replayPanels`) still applies; golden panel-sequences per walkthrough extend
to **assert dialogue content**, not just panel count and shape. The one new risk surface is
§4's conversational memory: every counter it reads must be reconstructable from the event
stream alone, or the pure-function property (and with it the oracle) is lost. Any dialogue
variation that would need engine state is out of scope by construction.

## Consequences

- **Two wiki identity docs must be rewritten, not amended.** `wiki/the-guide.md` (idol →
  DM; "Not the Narrator" retired per §2) and `wiki/the-hero.md` (thought-only → dual
  register per §3, the pairing section). The idol *drawing* need not change — a carved DM at
  a dead table is still a carving — but the *concept* text does. Do this as part of the
  slice that lands each change, never ahead of it.
- **The UI label is reopened.** ADR 0004 mandated "the Guide"; the character is now a DM.
  Whether the surface label becomes "the DM," stays "the Guide" as the DM's name, or gets a
  proper name is an identity question deferred to the `the-guide.md` rewrite — not settled
  here. **Settled in Slice 3 (v0.18.7): the proper name "Dungeon Master."**
- **A new authored surface: DM↔Hero dialogue pairs.** Bounded the same way every authored
  table has been (ADR 0004 §3/§10, ADR 0005 §1): a miss degrades to a single balloon or no
  balloon, never to a wrong exchange.
- **Multi-slice change to the parity-guarded core**, shipped behind green tests one slice at
  a time. Never a single rewrite.
- **Reversibility.** The thought-only Hero and the idol framing remain recoverable from
  git and from ADRs 0004/0005; nothing here deletes the mechanical seams that made them
  possible.

## Implementation slices

1. **Hero speaks** (§3). ✅ **Done (v0.17.5).** Resolved-action balloon is now speech
   (`CBWoodringNormal`); the thought class is retained as the interior-aside register (type +
   renderer live, content authored in a later slice). Change local to `mapper.ts`
   (`heroBalloon`, `Balloon` doc) + `balloon.ts` header; render already class-driven, so no
   render change. Presentation-only — no engine/IR/parity impact. 113 web tests green.
2. **DM↔Hero dialogue pairs** (§4, without conversational memory). ✅ **Done (v0.18.6).**
   `BEAT_SCRIPT` entries are now `{ dm?, hero? }` pairs (a bare string stays the DM-only
   form); `mapper.ts`'s `guideFor` became `exchangeFor`. Seven beats scripted. Golden
   sequences extended to assert dialogue content (`mapper.test.ts` pins the exchange of
   walkthrough 01 line for line). Three rules settled, each a decision:
   - **One cooldown for the whole exchange**, consumed only when something is actually
     said. The pair is a single authored event; gating the halves apart would let the Hero
     answer a line the DM was too tired to say.
   - **The resolved action outranks the Hero's reply.** What he *did* is derived from the
     event stream and cannot be wrong; the reply is authored. So he never carries two
     balloons in one panel (panelization would split the two-shot the exchange exists to
     fill), and the replies land on the quiet turns — movement, examination, a refusal —
     where the comic had no Hero line at all. **Measured over the 606-turn corpus: the
     rule costs 2 replies; 33 of 35 DM lines are answered, an exchange on 5.4% of turns.**
   - **The gazetteer stays DM-only.** A room line is the idol narrating a place, not a
     beat the Hero caused, so there is nothing to answer.

   `death` and `parser-miss` are deliberately unscripted: the `reaction` rung carries no
   speech balloon by design, and `parser-miss` (12.7% of turns) would spend the whole
   cooldown budget and starve the rarer beats. Adding the latter is a measurement question,
   not an authoring one. **No conversational memory** — that is Slice 4, and nothing here
   reads state the event stream does not carry, so `replayPanels` still holds.
3. **Caption-as-read-aloud reframe + identity rewrite** (§2, wiki). ✅ **Done (v0.18.7).**
   - **The relabel is settled: the character's name is "Dungeon Master"** — a proper name,
     used without an article (the user's call, 2026-07-28, from the three options
     §Consequences left open). Reasoning recorded with it: you address a DM by name, not by
     job title, and a name stops the label reading as a *function the comic performs*.
     ADR 0004's "the Guide" is retired; its standing ban on "Narrator" is kept.
   - **The label is one seam, `castLabel` (`comic-view.ts`)**, reaching the cast bar and the
     panel alt text and nothing else. **Role ids do not move**: `guide`/`hero` stay as
     manifest keys and `Line.speaker` values, so the mapper, the panel stream, the cast
     manifest and the art pipeline are untouched and the parity oracle never sees this
     slice. `test/cast-label.test.ts` pins the name *and* that boundary — a relabel with no
     test reverts silently.
   - **§2 lands as fiction, not as behaviour.** The caption stays the same verbatim
     pull-quote, chosen the same way; `captionFor` is unchanged. What retires is the "Not
     the Narrator" boundary — with the caption channel *being* the module's read-aloud text
     in the DM's voice, there is no rival narrator left to collide with.
   - **Wiki rewritten, not amended:** `the-guide.md` is now *The Dungeon Master* (filename
     kept so every `[[the-guide]]` link resolves). The idol survives as the **drawing**; what
     retired is the idol as the whole of the concept. The voice rules 1–6 needed no
     rewriting, which is itself the finding: a DM who has run this module too many times
     sounds like an idol that has watched it too many times, so not one shipped line changed.
4. **Bounded conversational memory** (§4 memory half). ✅ **Done (v0.18.8).** A beat entry may
   now be a **run** of exchanges (`BeatEntry`); the *n*th firing takes the *n*th line and the
   last repeats. The whole memory is one `Map<marker, count>` folded over the turns already
   read, beside `visited` and `lastGuideTurn` — no engine state, no clock, no RNG, so
   `replayPanels` still holds. Two rules settled:
   - **The counter is over *spoken* firings, not marker occurrences.** A beat the cooldown
     swallowed was never on the page, so advancing past its line would retire a reply the
     reader never read. It advances at the same moment `lastGuideTurn` does.
   - **Past the end of a run, the last line repeats; nothing cycles.** A beat that looped back
     to its opening reaction would be a DM surprised by a room he has seen four times. The last
     line is therefore authored as the *settled* one.

   Run depths are measured, not chosen. Over the 606-turn corpus a beat is **spoken**
   `reveal` 14×, `effort` 9×, `scored` 5×, `uncanny` 3×, `combat-threat` 3×, `grue-threat` 1×,
   `combat-victory` 0× — so `reveal` earns four lines and the rest two or three, the fights
   scripted three deep because the walkthroughs avoid combat and real play does not.
   Six tests carry it, including a **determinism replay** (same seed, same walkthrough, twice →
   byte-identical dialogue), which is where anything reaching for state outside the stream
   fails first. **Deliberately not built:** cross-beat memory (a running kill count quoted in
   another beat's line) — legal under §4, but it needs line templating, which is an authoring
   surface, not this slice's mechanism.
5. **Session-recap export** (§5). Independent of 1–4; can be scheduled whenever.
