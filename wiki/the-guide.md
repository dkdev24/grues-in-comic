# The Dungeon Master

*(File name kept as `the-guide.md` so every `[[the-guide]]` link across the wiki still resolves.
The character's name is **Dungeon Master**; `guide` survives as a role id in the manifest and the
mapper, where it is a key and not a name.)*

The identity document `docs/adr/0004-presentation-mapping.md` defers ("The Guide's identity —
name, appearance, personality. A separate document."). This is that document. It settles **who the
Dungeon Master is and how he talks**, so that the one place authored text enters the system —
`GUIDE_SCRIPT` and `BEAT_SCRIPT` in `web/src/comic-view.ts` — has a single voice to answer to.

It settles nothing mechanical. The trigger, the cooldown and the two-shot are ADR 0004 §3/§6/§7 and
are not restated here.

## What the Dungeon Master is

- **The DM at the table, drawn as a carved idol.** ADR 0006 recast the character: he is the one
  running this module, and [[the-hero]] is his player. The *drawing* is unchanged — **tiki**
  (ADR 0004 §11, settled at 5.3), a wooden mask — and it survives the recast intact, because a
  carved DM at a dead table is still a carving. What retired is the idol as the whole of the
  concept: he was a thing that comments because commenting is all a carving can do; he is now
  someone who narrates and reacts because that is what the person running a table does.
- **Presentation-only, and it shows.** ADR 0004 §3 makes him unable to touch the world: no game
  state, unaddressable by the parser, removable without changing one bit of engine behaviour or the
  parity harness. ADR 0006 §1 keeps every word of that and gives it a *better* in-fiction reason —
  the DM narrates and reacts, he never resolves; the engine and the parser adjudicate, as the rules
  do at a real table.
- **He reads the module aloud.** *(Rewritten by ADR 0006 §2; this bullet formerly read "Not the
  Narrator".)* ADR 0004 forbade him the caption channel because Zork's narration already owned it
  and two narrators would collide. The table framing removes the collision: the caption channel
  **is** the module's boxed text and rules-as-written, and he is the one reading it. Zork's neutral
  narration and his table-talk are **one voice in two registers** — read-aloud (verbatim caption,
  unchanged) and authored table-talk (his balloon). The "Not the Narrator" boundary is retired, not
  violated: there is no rival narrator left to collide with.
- **The UI calls him "Dungeon Master."** *(Settled by ADR 0006 Slice 3; ADR 0004's "the Guide" is
  retired and its standing ban on "Narrator" is kept.)* A proper name, used without an article: you
  address a DM by name, not by job title, and a name stops the label reading as a *function the
  comic performs*. The label lives in `castLabel` (`comic-view.ts`) and is pinned by
  `test/cast-label.test.ts`; it reaches the cast bar and the panel alt text, and nothing else.

## How the Dungeon Master talks

The six opening lines shipped at 5.3 already fixed the register; this only names it. The rules below
are unchanged by the recast — a DM who has run this module too many times sounds exactly like an
idol that has watched it too many times, which is why ADR 0006 could change the fiction without
rewriting a single shipped line.

1. **Short. One or two clipped sentences.** He is running the table, not performing at it. If a line
   needs a comma splice to breathe, it is too long.
2. **Present tense, and never an instruction.** He observes; he does not say "you should."
   "That window is slightly ajar. That is an invitation." — not "climb through the window."
3. **First sentence sees; second sentence knows.** The opening states the scene plainly. The turn
   is the dry, world-weary aside — the part that has watched this happen before.
4. **It is atmosphere, not a hint system.** He may gesture at what a room is *for* the way someone
   who has seen every adventurer would, but he never hands over a solution. Puzzle answers live in
   the player's head, not in the DM's mouth — a DM who solves the puzzle for you is a bad DM, and
   he literally cannot act on it anyway (§3).
5. **Deadpan, faintly ominous, occasionally funny. Never melodramatic.** The empire is dead and he
   finds this mildly amusing. Grues are a punchline, not a scare.
6. **Address the beat, now — not only the scene.** *(Relaxed by ADR 0005 §4; this rule formerly
   read "address the scene, not the Hero.")* The trigger broadened: he also reacts to what the
   Hero just *did* — the §10 affect marker the action produced (a kill, a find, the dark), keyed in
   `BEAT_SCRIPT` beside the room gazetteer. So he is, at last, replying rather than narrating to no
   one. What changed is only who the line is *about*: the beat as often as the room. In a two-shot
   the Hero faces him (§4 facing), so the reply lands on someone looking.

   **It is now conversation, in the back-and-forth sense** *(ADR 0006 §4, Slice 2 — this rule
   formerly ended "the Hero thinks and does not speak")*. A `BEAT_SCRIPT` entry is a **pair**: his
   line and [[the-hero]]'s answer, keyed on the same beat, and on most beats both fire
   (94% of them, measured over the walkthrough corpus). The Hero answers only on turns he has no
   action of his own to report, so the exchange fills the quiet turns rather than competing with
   them. He is *still* unaddressable by the player, and the reply is still deadpan atmosphere,
   never a hint (rule 4 holds) — being answered is not the same as taking requests.

7. **He wears out, on purpose.** *(ADR 0006 §4, Slice 4.)* Each beat carries a **run** of lines, and
   the *n*th time it fires he is one line further along it: fresh reaction, then recognition, then the
   worn line he is left with — "Found. As arranged." He never loops back to sounding surprised by
   something he has now watched four times, because the last line of a run repeats forever. This is
   the only thing he remembers, it is counted off the play itself, and it is deliberately a small
   memory: a DM who has run this module too many times is characterised by what has stopped
   impressing him.

## Coverage

`GUIDE_SCRIPT` is keyed by **room id** and fires **once, on first entry** (ADR 0004 §6). So the
script is a gazetteer: at most one line per room, written for the moment the player first sees it.
Coverage runs the full main path — house, cellar, maze, reservoir and dam, the temples and Hades,
the Frigid River and the rainbow, the coal mine — plus the notable named rooms off it. Interchangeable
rooms (the maze cells, the dead ends, the stretch of identical forest) lean *into* the repetition:
the joke is that he is as tired of them as the player.

`BEAT_SCRIPT` is the second authored surface and a different shape: keyed by **affect marker**, each
entry a **pair** with [[the-hero]]'s answer (Slice 2) and, since Slice 4, a **run** of such pairs
walked one line per firing. Seven beats are scripted, two to four lines deep by how often each is
actually spoken in play — `reveal` is the workhorse (14 firings over the corpus) and earns the
longest arc; `death` and `parser-miss` are deliberately unscripted, for reasons recorded at the table
itself.

Rooms with no line are silent by design, not omission — the cooldown means not every first visit
should speak anyway. Adding a room to the map is the entire cost of giving it a voice; nothing else
changes ([[comic-chat-presentation]]).
