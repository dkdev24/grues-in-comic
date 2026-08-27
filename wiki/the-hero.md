# The Hero

The sibling of [[the-guide]]. That document settles the idol's voice because `GUIDE_SCRIPT` is the
one place Guide text enters the system; this one settles the Hero's, because ADR 0005 §1 gave the
Hero a second such place — the `heroBalloon` templates in `web/src/comic/mapper.ts`. It settles
**who the Hero is and how he talks**, so that authored surface has a single voice to answer to.

It settles nothing mechanical. The balloon trigger (a resolved take/drop event), the thought-vs-speech
class, and the future two-shot are ADR 0005 §1/§4 and ADR 0004 §11, and are not restated here.

## What the Hero is

- **The player's self-insert, and deliberately unnamed.** The Hero is *you*. A proper name would put
  a stranger between the player and the avatar, so there isn't one; the UI label is **"the Hero,"**
  the way the idol's is "the Guide."
- **And "you" is a specific person.** The target player is middle-aged, tech-savvy, and cut his teeth
  on tabletop D&D a few decades back. That fixes the character without a biography: he is
  **systems-minded and genre-literate.** He reads the Great Underground Empire the way he reads any
  system — something with rules to be worked — and he recognizes every adventuring trope in it
  (the load-bearing rug, the too-obvious trap, the red herring) because he *ran* them, at a table,
  long ago. He is not discovering the dungeon-crawl; he is revisiting it, older.
- **He acts; the Guide observes.** The whole architectural split is diegetic: the Hero is the only
  one of the two who can touch the world (the parser answers to him, not the idol). His balloon is
  therefore always about something he *did*.
- **Appearance is not settled here.** The avatar — the BORED face and SHRUG torso recast at 5.3 —
  is ADR 0004 §11 and the cast manifest's. This document owns the voice, nothing drawn.
- **Since F16 (v0.28.0, stage 6.7) he is not one drawing.** The player picks which of eight packed
  Heroes plays the part — the cast picker is a *runtime skin*, swapping one manifest and one sheet
  per role (`art/src/roster.ts`, `web/src/cast-picker.ts`). Every rule in this document is the voice
  all eight of them share; "the Hero" names the part, not any one actor cast in it. What the picker
  changed is drawn identity, never voice — `ACTION_SCRIPT` and `BEAT_SCRIPT` are not keyed on which
  Hero is on stage.

## How the Hero talks

1. **First person, present, terse.** He narrates the action as he takes it, in fragments more than
   sentences. "Worth the weight." — not "I pick up the brass lantern." If it needs a subject and a
   verb to stand up, it is too long.

   **No signature suffix, and this rule is the reason the last one had to go.** The fragments
   themselves are right; a *fixed* way of ending them is not. Written as "The lantern, then." this
   rule produced one shape on every take — 59 firings a playthrough in the identical cadence, plus
   six authored lines that copied it from here — and read as a verbal tic rather than a voice
   (user's call, M6.1e session 4). **Vary the shape**: name the object sometimes, react to it
   sometimes, and never let one construction become the way he talks. Anything authored here that
   fires often needs the rotation treatment its table gives it.
2. **Genre-literate, never breaks the frame.** He knows the shape of what he's in and may name it
   dryly — a rug that's obviously hiding something, a grue that's obviously coming — but he never
   says "game," "parser," or "puzzle." He is *in* the empire, just not naïve about it. The knowing
   is in the tone, not in a wink at the audience.
3. **Earned competence, faint impatience.** Dry satisfaction when a thing works; dry irritation when
   it doesn't. No heroic bravado — he is too old and has done this too many times to be impressed by
   a dungeon. The register is a capable adult working a familiar problem, not an adventurer having an
   adventure.

   **The claimed frequency behind this rule was wrong, and is corrected here so the retracted number
   doesn't get re-cited.** ADR 0004 §10 originally measured "exasperation at the parser" as the
   Hero's most common marked emotion and adopted it as characterisation. F17 (v0.28.3) found the
   corpus that measurement was taken over was a Hero stuck replaying a lost combat for 375 of 405
   remaining turns — a bug in the test harness, not a property of play — and re-measured over runs
   that actually finish: the most common marked emotion is the **flat acknowledgement**, then
   **satisfaction at scoring**; `parser-miss` drops from 12.3% to 1.6%. The *shape* of rule 3 (dry
   in both directions) is unaffected — it was never derived from the frequency — but "impatience" is
   not, in fact, his dominant note. He is more often quietly getting on with it.
4. **Understated, not quippy.** Middle-aged, not a wisecracking kid: one dry beat, never a routine.
   (The Guide's rule 5, from the other side of the panel — deadpan, occasionally funny, never
   mugging.)
5. **He authors actions; he never hints.** Same firewall the Guide keeps (its rule 4): the balloon
   reports what he just did, or reacts to it — it never tells him what to do *next*. Puzzle answers
   live in the player's head, not in a balloon over his own avatar. He would find being told the
   answer insulting anyway.

## The pairing

Kept here because [[the-guide]] and the Hero share a panel the moment ADR 0005 §4 (Slice 5) lands
the two-shot. They are built to converse: **both dry, from opposite ends of time.** The Guide is
sincere and ominous about a dead empire it has watched for centuries; the Hero is ironic and
competent because he has seen this *shape* of dungeon before, at a folding table, with dice. They
agree on tone and disagree on everything else, which is the whole engine of a buddy comic.

**Settled by ADR 0005 §4:** the Guide reacts to the beats the Hero causes and the two face each
other in a shared panel. That ADR left the Hero **thought-only** — the exchange was the idol
commenting on what the Hero *did*, not dialogue.

**Superseded by ADR 0006 (Slices 1–2): the Hero speaks, and the two now converse.** Slice 1 made
his resolved action a spoken line; Slice 2 makes the beat table a **pair** — the DM's line and the
Hero's answer on the same beat. The earlier reasoning (his competence reads louder as private
thought) lost to the premise of ADR 0006: at a table, the player answers the DM out loud, and a
comic in which one character speaks and the other thinks is not a buddy comic. Rule 5 is unchanged
and does the work the thought balloon used to: he answers the beat, he never performs, and he never
hints. The **thought register stays live** in the type and the renderer for interior asides, whose
content is not authored yet.

## Coverage

**As of M6.1e session 2 he also answers the gazetteer.** Every one of the 88 rooms in `GUIDE_SCRIPT`
now carries his reply beside the idol's line, so an arrival is an exchange rather than a monologue.
These are the easiest of his lines to write and the safest to make specific: a room is entered for
the first time exactly once, so unlike a beat reply they can never repeat. They react to the room —
they never tell him what to do in it (rule 5), which matters more here than anywhere else, because a
first visit is exactly when a hint would land.

Unlike `GUIDE_SCRIPT`'s room gazetteer, his *action* lines are **templates over object display names**
(ADR 0005 §1), so they must stay grammatical across every DESC the world holds — "leaflet",
"jewel-encrusted egg", "nasty knife" — and since M6.1e session 4 they are a **rotation, authored as
data** in `web/src/comic/script.ts` (`ACTION_SCRIPT`), not a template in the mapper. `{name}` is
substituted; a line without the token is one that does not need it, because the panel already shows
what he picked up.

Slice 1 shipped one template each — `The {name}, then.` and `The {name} can stay.` — and this
document predicted the outcome exactly: *"a single line repeated over ~30 takes in a full run will
wear."* It wore at **59 firings**, and the user called it before the corpus did. The fix is the same
one the beat tables use: several lines, walked by a cursor in the mapper's fold, so the rotation is
still a pure function of the event stream and the oracle is unaffected.

**Deterministic variation keyed on the object** — a treasure earning a greedier line than a lantern,
read off the world data — remains a sanctioned refinement on top of the rotation, not a replacement
for it ([[comic-chat-presentation]]).

**Slice 2 adds a second, differently-shaped surface: the beat replies.** These are not templates —
they are written once per beat, in `BEAT_SCRIPT` beside the DM's half, and they answer *what just
happened* rather than name an object. Seven beats are scripted (`combat-victory`, `combat-threat`,
`grue-threat`, `scored`, `reveal`, `effort`, `uncanny`); `death` and `parser-miss` are deliberately
unscripted, for reasons recorded at the table itself.

The rule that shapes the writing: **a reply fires only on a turn with no resolved action.** He never
holds two balloons in one panel, so a reply is always the *quiet* turn's line — he has just moved,
looked, or been refused — and it should read as an answer to the idol, never as a report on
something he did. Measured over the walkthrough corpus, the exchange fires on 5.4% of turns and 94%
of the DM's lines are answered.

**Slice 4 makes each of those replies a run rather than a line.** The *n*th time a beat fires he is
one line further along it, and the arc is his half of getting used to the place: the first reply is
still doing the joke, the last one has stopped bothering — "As arranged." It suits him better than it
suits the DM. He is a man who has run this system before and whose competence shows up as
*decreasing* commentary; the run gives that an actual gradient instead of asking one line to imply
it. He never resets to the first reply, because a man who is surprised again by the fourth false
floor is a different character.

## Dying

`death` stayed on the unscripted list above through Slice 4 and stays there now — dying gets no
`BEAT_SCRIPT` line, on purpose. **The reason is the same one that ends rule 1's fragments: a fixed
thing said every time a man dies reads as a tic, and death is the one beat guaranteed to recur across
a full run.** So the comic answers it a different way, not with a line: the turn he dies is
**wordless**. `reaction` (F18, v0.28.4; ADR 0004 §7 amended) is a frame the mapper stages on its own
— a body, no balloon — camera-controlled to a close-up nothing else in the ladder can reach, because
a straddling balloon pins the head-top and a wordless panel doesn't. Rendered: wide-eyed, the
backdrop washed out, still labelled the room he died in even though the very next panel has already
resurrected him elsewhere.

**This did not actually draw for four milestones, and finding out why is its own small lesson in
measurement.** `game-over` fires on a quit, a win, or a *final* death — but an ordinary Zork death
ends a life, not the game (ZIL narrates the blow, prints the banner, resurrects you, all one turn),
and emits no event of its own. So `reaction` fired on every `quit` in the corpus and never once on an
actual death, because the corpus — eleven scene walkthroughs — never died; it only ever chose to
stop. F18 (v0.28.4) reads `death` off the same banner the DM was already voicing —
`**** You have died ****`, the read-aloud register [[the-guide]] owns, not a new authored line and no
new ADR 0002 event — so no line had to be written for the Hero to finally get a face when it happens.

**Proving it took a walkthrough that actually dies (v0.28.5), and the walkthrough found a second
rule.** Zork scatters whatever you were carrying into a random forest tile on death
(`RANDOMIZE-OBJECTS`), which this engine cannot reproduce turn-for-turn against a fixed golden
transcript (ADR 0002 declined the Z-machine's PRNG on principle). The scene that proves the death
frame dies **holding nothing** — Canyon View, chosen because its one fatal move draws on no random
table at all — so the corpus's only authored death is also, necessarily, an empty-handed one. Dying
deterministically was not enough; the Hero had to die with nothing left to lose.
