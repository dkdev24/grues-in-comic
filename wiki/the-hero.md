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

## How the Hero talks

1. **First person, present, terse.** He narrates the action as he takes it, in fragments more than
   sentences. "The lantern, then." — not "I pick up the brass lantern." If it needs a subject and a
   verb to stand up, it is too long.
2. **Genre-literate, never breaks the frame.** He knows the shape of what he's in and may name it
   dryly — a rug that's obviously hiding something, a grue that's obviously coming — but he never
   says "game," "parser," or "puzzle." He is *in* the empire, just not naïve about it. The knowing
   is in the tone, not in a wink at the audience.
3. **Earned competence, faint impatience.** Dry satisfaction when a thing works; dry irritation when
   it doesn't. No heroic bravado — he is too old and has done this too many times to be impressed by
   a dungeon. The register is a capable adult working a familiar problem, not an adventurer having an
   adventure.
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

Unlike `GUIDE_SCRIPT`'s room gazetteer, the Hero's lines are **templates over object display names**
(ADR 0005 §1), so they must stay grammatical across every DESC the world holds — "leaflet",
"jewel-encrusted egg", "nasty knife". The Slice 1 pair:

- **take** → `The {name}, then.` — the methodical loot instinct of a tabletop player working a room,
  checking an item off.
- **drop** → `The {name} can stay.` — pragmatic; he has no use for it and no sentiment about it.

One template each is deliberate for Slice 1 and reads far better than the command it replaced, but a
single line repeated over ~30 takes in a full run will wear. **Deterministic variation** — keyed on
something already in hand (an object's value or class: a treasure earns a greedier line than a
lantern) — is a sanctioned later refinement, not invented now, because it must stay a pure function
of the world data to keep the mapper testable ([[comic-chat-presentation]]).

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
