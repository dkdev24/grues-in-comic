# The Guide

The identity document `docs/adr/0004-presentation-mapping.md` defers ("The Guide's identity —
name, appearance, personality. A separate document."). This is that document. It settles **who the
Guide is and how the Guide talks**, so that the one place authored text enters the system —
`GUIDE_SCRIPT` in `web/src/comic-view.ts` — has a single voice to answer to.

It settles nothing mechanical. The trigger, the cooldown and the two-shot are ADR 0004 §3/§6/§7 and
are not restated here.

## What the Guide is

- **A carved idol.** The Guide is drawn as **tiki** (ADR 0004 §11, settled at 5.3): a wooden mask,
  not a person. This is the whole of the concept. The Guide is a thing that was in the Great
  Underground Empire before the player arrived and will be there after, and it comments because
  commenting is all a carving can do.
- **Presentation-only, and it shows.** ADR 0004 §3 makes the Guide unable to touch the world:
  no game state, unaddressable by the parser, removable without changing one bit of engine
  behaviour or the parity harness. A tiki idol is the diegetic form of exactly that constraint —
  it *cannot* help, only observe — so the character and the architecture say the same thing.
- **Not the Narrator.** The room descriptions, the parser's answers, the "You are standing…" — that
  is Zork's narration, on the caption channel. The Guide is a second voice beside it, dry where the
  narration is neutral. The ADR forbids the UI label "Narrator" for exactly this reason; the UI
  says **"the Guide."**

## How the Guide talks

The six opening lines shipped at 5.3 already fixed the register; this only names it.

1. **Short. One or two clipped sentences.** The Guide is a carving, not a raconteur. If a line needs
   a comma splice to breathe, it is too long.
2. **Present tense, and never an instruction.** The Guide observes; it does not say "you should."
   "That window is slightly ajar. That is an invitation." — not "climb through the window."
3. **First sentence sees; second sentence knows.** The opening states the scene plainly. The turn
   is the dry, world-weary aside — the part that has watched this happen before.
4. **It is atmosphere, not a hint system.** The Guide may gesture at what a room is *for* the way a
   thing that has seen every adventurer would, but it never hands over a solution. Puzzle answers
   live in the player's head, not the idol's mouth. (It also literally cannot act on them — §3.)
5. **Deadpan, faintly ominous, occasionally funny. Never melodramatic.** The empire is dead and the
   Guide finds this mildly amusing. Grues are a punchline, not a scare.
6. **Address the scene, not the Hero.** The Guide is not in conversation with the player. It talks
   *about* the room, over the Hero's shoulder (§7 rung 5), the way a statue would narrate to no one
   in particular.

## Coverage

`GUIDE_SCRIPT` is keyed by **room id** and fires **once, on first entry** (ADR 0004 §6). So the
script is a gazetteer: at most one line per room, written for the moment the player first sees it.
Coverage runs the full main path — house, cellar, maze, reservoir and dam, the temples and Hades,
the Frigid River and the rainbow, the coal mine — plus the notable named rooms off it. Interchangeable
rooms (the maze cells, the dead ends, the stretch of identical forest) lean *into* the repetition:
the joke is that the Guide is as tired of them as the player.

Rooms with no line are silent by design, not omission — the cooldown means not every first visit
should speak anyway. Adding a room to the map is the entire cost of giving it a voice; nothing else
changes ([[comic-chat-presentation]]).
