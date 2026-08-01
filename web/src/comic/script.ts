/**
 * The authored dialogue — the DM's gazetteer and the beat exchanges, as data.
 *
 * **Why this is a module of its own (M6.1a).** Both tables were written inside
 * `web/src/comic-view.ts`, which imports `document` and a canvas: the view is the
 * one place in the comic stack that cannot be replayed in Node. That put the
 * *content* out of reach of the corpus replay the rest of the pane is measured
 * with — `web/test/mapper.test.ts` and `web/tools/gate.ts` both had to invent
 * throwaway scripts — so the one number M6.1 turns on (how often the two actually
 * speak) could not be measured against what ships. Nothing here is DOM-coupled,
 * so `tools/density.ts` now reads the shipped tables and reports on them.
 *
 * This module is **data and nothing else**. The mechanism that consults it — the
 * first-visit trigger, the cooldown, the run cursor — stays in `comic/mapper.ts`,
 * which is where ADR 0004 §3 and ADR 0006 §4 put it, and which keeps the mapper a
 * deterministic pure function of the event stream (PITFALLS → Web: dialogue is
 * authored at build time and committed as data, never generated at runtime).
 */

import type { BeatEntry, BeatScript } from "./mapper.js";

/**
 * Turns between two firings of **the same beat** (`MapperOptions.guideCooldown`).
 *
 * M6.1d moved it, and changed what it counts. It was 3 turns between *any* two
 * authored lines, which is the budget that starved D5: one beat could silence
 * another, and either could silence a room's one gazetteer line for good. It is
 * now per beat, the gazetteer is uncooled, and what is left to protect is the
 * only thing that can actually wear out — a beat saying the *same* line twice.
 *
 * **0, and measured rather than chosen.** At 1 — the same beat kept off two
 * consecutive turns — the corpus reads one exchange every 3.8 turns and the
 * full-game oracle one every 5.8, both outside D5, because the markers that
 * carry a playthrough arrive in clusters and the clock deletes half of every
 * cluster. At 0 it is 2.4 and 2.6. What replaces the clock is the run
 * ({@link BEAT_SCRIPT}): consecutive firings say consecutive lines, which is a
 * conversation escalating rather than a record sticking. The exposure that
 * leaves is a beat *past the end of its run*, where the last line repeats — see
 * `BEAT_SCRIPT`'s note, and it is M6.1e's to close with depth.
 */
export const GUIDE_COOLDOWN = 0;

/**
 * The Dungeon Master's gazetteer — one line per room, spoken once on first entry.
 *
 * ADR 0004 §3 makes him presentation-only, and its Consequences bound the
 * project's authoring cost by his trigger rate. 5.3 committed the *mechanism* (a
 * first-visit trigger, a cooldown, a table keyed by room id) with six placeholder
 * lines; this is the authored script the ADR deferred. The identity and voice it
 * answers to are settled in `wiki/the-guide.md`: he is the DM running this module
 * (ADR 0006), drawn as the tiki idol (§11), and he talks in short, present-tense,
 * deadpan asides — first sentence sees the room, second sentence knows something
 * about it. It is atmosphere, never a hint: no line here gives a puzzle away, and
 * by §3 he could not act on one if it did. Keyed by room id (see
 * `zork1.world.json`), so adding a room is the whole cost of giving it a voice.
 * Rooms absent from the map are silent by design — the cooldown means not every
 * first visit should speak.
 */
export const GUIDE_SCRIPT = new Map<string, string>([
  // Above ground — the house and the forest that rings it.
  ["WEST-OF-HOUSE", "Boarded front door. Someone did not want visitors."],
  ["NORTH-OF-HOUSE", "The path goes on. It usually does."],
  ["SOUTH-OF-HOUSE", "The same white house, a different side. The boards are just as final."],
  ["EAST-OF-HOUSE", "That window is slightly ajar. That is an invitation."],
  ["FOREST-1", "Trees, and more trees. The forest keeps its one idea."],
  ["FOREST-2", "You have been among these trees before. They will not admit it."],
  ["FOREST-3", "More forest. It is patient in a way you are not."],
  ["MOUNTAINS", "The mountains forbid passage. They have had practice."],
  ["PATH", "A path worn by feet that mostly did not come back."],
  ["UP-A-TREE", "A nest, an egg, a long way down. Choose carefully."],
  ["CLEARING", "A clearing. The trees step back to watch."],
  ["GRATING-CLEARING", "Leaves, and something square beneath them. Not everything buried stays buried."],

  // Inside the house.
  ["KITCHEN", "A table, a sack, a bottle. Somebody left in a hurry."],
  ["ATTIC", "Dark, and full of the shapes of useful things. Bring your own light."],
  ["LIVING-ROOM", "Note the rug. Rugs in this house are load-bearing."],
  ["CELLAR", "It gets dark down here. Darker than you want."],

  // The first cave — troll country and the galleries.
  ["TROLL-ROOM", "The troll blocks the way and grins. He has done this to better than you."],
  ["EAST-OF-CHASM", "A chasm, and a narrow ledge. The empire keeps its treasures behind inconveniences."],
  ["GALLERY", "A painting worth more than its frame. Take one, leave the other."],
  ["STUDIO", "Someone worked here once. The chimney still remembers the way up."],

  // The maze, which is its own joke and knows it.
  ["MAZE-1", "A maze of twisty little passages, all alike. It means that literally."],
  ["MAZE-2", "Another twist. The maze does not care which."],
  ["MAZE-5", "Still the maze. Landmarks are a luxury it does not offer."],
  ["MAZE-8", "The passages keep their faces turned away. Count your steps or lose them."],
  ["DEAD-END-1", "A dead end. The maze offers several. It is generous that way."],
  ["DEAD-END-2", "Another wall where a way should be. The maze is consistent, at least."],
  ["CYCLOPS-ROOM", "The cyclops is hungry and you are on the menu. There is a name he would rather not hear."],
  ["STRANGE-PASSAGE", "A passage that connects what should not connect. Use it anyway."],
  ["TREASURE-ROOM", "The thief's own hoard. He will want it back, and he is not far."],
  ["GRATING-ROOM", "A grating overhead, and daylight past it. Locked, of course."],

  // Mirrors and the round hub of the middle empire.
  ["MIRROR-ROOM-1", "A mirror you could step through. The empire's shortcuts had style."],
  ["MIRROR-ROOM-2", "The same mirror from the other side. It kept its promise."],
  ["ROUND-ROOM", "Every passage meets here. A hub, or a snare, depending on your errand."],
  ["EW-PASSAGE", "East to west, and nothing to see between. Some rooms are only distance."],
  ["NS-PASSAGE", "North to south. The empire built corridors the way it built everything: to outlast you."],
  ["LOUD-ROOM", "The room is very loud. The room is very loud."],
  ["DAMP-CAVE", "Water somewhere close, and the smell of it older than the walls."],
  ["DEEP-CANYON", "A canyon that goes down further than your light. Down is a direction here, not a plan."],
  ["CHASM-ROOM", "A chasm too wide to argue with. Go around."],

  // The dam and the reservoir it holds.
  ["DAM-ROOM", "A dam, and a control panel. The manual is elsewhere, on purpose."],
  ["DAM-LOBBY", "Guidebooks and matches. The empire believed in signage."],
  ["MAINTENANCE-ROOM", "Buttons in four colors. Only some of them regret being pressed."],
  ["RESERVOIR-SOUTH", "The south bank. The water decides whether this is a shore or a floor."],
  ["RESERVOIR", "A reservoir, drained or full by a bolt you turned upstream. Cause, then effect."],
  ["RESERVOIR-NORTH", "The far bank, and a pump for a boat you do not yet own."],
  ["STREAM-VIEW", "A stream, viewed. The empire liked to be looked at."],
  ["DAM-BASE", "The river begins here. So does the part of the empire with no walls."],

  // Hades and the temples.
  ["ENTRANCE-TO-HADES", "The gate to the land of the dead. The dead are in."],
  ["LAND-OF-LIVING-DEAD", "Spirits, and a bell, a book, a candle. The rite is older than the empire that fears it."],
  ["ENGRAVINGS-CAVE", "Ancient carvings. They flatter no one who stops to read them."],
  ["EGYPT-ROOM", "A gold coffin, too heavy to be wise. Everyone takes it anyway."],
  ["DOME-ROOM", "A railing, a long drop, and a rope you did not think to bring. Improvise."],
  ["TORCH-ROOM", "A torch that burns without fuel. The empire had good years."],
  ["NORTH-TEMPLE", "A temple, quiet the way only abandoned holy places are."],
  ["SOUTH-TEMPLE", "An altar, and a way down. Somewhere to leave what you cannot carry further."],
  ["ATLANTIS-ROOM", "An ancient hall, and a trident in it. Atlantis kept better souvenirs than it kept itself."],

  // The Frigid River and Aragain Falls.
  ["RIVER-1", "The current has you now. It knows where it is going, which is more than you can say."],
  ["RIVER-2", "The banks slide past. Downstream is the only vote that counts here."],
  ["RIVER-3", "Still drifting. The river is in no hurry and neither, now, are you."],
  ["RIVER-4", "The water quickens. A buoy rides ahead of you, red and deliberate."],
  ["RIVER-5", "The last calm stretch. Beyond it the river stops being scenery."],
  ["WHITE-CLIFFS-NORTH", "Cliffs too sheer to land against. Keep to the water."],
  ["WHITE-CLIFFS-SOUTH", "More white cliff, no more welcoming. The river chose your route for you."],
  ["SHORE", "The far shore. The river sets you down, this once."],
  ["SANDY-BEACH", "Sand, and a buoy that rode the river before you did."],
  ["SANDY-CAVE", "A cave that wants digging. Bring a shovel and low expectations."],
  ["ARAGAIN-FALLS", "A waterfall, and a rainbow you might yet be able to walk on."],
  ["ON-RAINBOW", "You are standing on a rainbow. Do not think about it too hard."],
  ["END-OF-RAINBOW", "The end of the rainbow, and the pot they promised. For once they meant it."],
  ["CANYON-BOTTOM", "The bottom of the canyon. Everything rolls down here eventually, including you."],
  ["CLIFF-MIDDLE", "A ledge halfway up. Halfway is the worst place to stop and think."],
  ["CANYON-VIEW", "A long look down the canyon. The vertigo is complimentary."],

  // The coal mine.
  ["MINE-ENTRANCE", "The coal mine yawns. It has swallowed better-equipped men."],
  ["SQUEEKY-ROOM", "Something small lives here and does not like company."],
  ["BAT-ROOM", "A bat, and it likes shiny things. Garlic, it likes considerably less."],
  ["SHAFT-ROOM", "A shaft, a basket, a chain. Load it before you regret the weight on your back."],
  ["SMELLY-ROOM", "A smell with a warning inside it. The next room is where it comes true."],
  ["GAS-ROOM", "Gas, and an open flame in your hand. Think."],
  ["MINE-1", "Coal, and dark, and more of both. The mine repeats like the maze, but dirtier."],
  ["MINE-2", "The same coal from a different angle. Down here, angles are all you get."],
  ["MINE-4", "Deeper in. The mine gives up nothing it was not paid for in advance."],
  ["LADDER-TOP", "A ladder down. The bottom is further than the rung suggests."],
  ["LADDER-BOTTOM", "The foot of the ladder, and the mine proper. Mind your light."],
  ["TIMBER-ROOM", "Old timbers, and a gap too narrow for a full pack. Travel light or not at all."],
  ["LOWER-SHAFT", "A draft from nowhere, and pressure of the diamond-making kind. Something valuable is close."],
  ["MACHINE-ROOM", "A machine, a lid, a switch. Coal goes in; something better is supposed to come out."],
  ["SLIDE-ROOM", "A chute back to the cellar. Faster down than up, as these things always are."],

  // The end.
  ["STONE-BARROW", "The barrow, at last. The way in opens once, and only forward."],
]);

/**
 * Beat **exchanges** (ADR 0005 §4, ADR 0006 §4 Slice 2): keyed by the affect
 * marker the Hero's action produced, so the two *reply to what just happened*
 * rather than narrating a room on a timer — the whole of "the two characters
 * talk to each other." The DM's half keeps the gazetteer's voice
 * (`wiki/the-guide.md`, rule 6 relaxed to address the beat); the Hero's half is
 * his settled voice (`wiki/the-hero.md`) — terse, dry, genre-literate, and
 * never a hint (his rule 5: the reply reacts, it does not tell him what to do).
 *
 * Since M6.1d the Hero's line fires on any turn the beat does, **including one
 * where he also reports an action** (ADR 0009 §6): "The lantern, then." and his
 * answer are two balloons in the order the mapper pushes them, and `page.ts`
 * decides whether that is one panel or two.
 *
 * **`death` is still deliberately absent.** The `reaction` rung is tight on the
 * Hero's face and carries no speech balloon by design (`render.ts`'s
 * `BALLOON_HEADROOM`). The idol does not crowd a death, and neither does a quip.
 *
 * **`parser-miss` and `routine-ack` are scripted as of M6.1d**, and that was the
 * stage's largest lever. They were held back because the beat table consumed one
 * shared cooldown with the gazetteer, so scripting the biggest marker in the game
 * would have starved the rarer beats. The cooldown is per beat now
 * (`MapperOptions.guideCooldown`), so the argument no longer holds — and the
 * measurement it was waiting on says these two are 26.4% and 4.3% of all turns.
 *
 * **Slice 4: every beat is now a run, not a line.** Each entry is the beat's
 * lines in the order they are spoken, and the *n*th time the beat speaks it takes
 * the *n*th line, the last repeating from then on (`mapper.ts`'s `variantOf`).
 * The run is written as a small arc — fresh reaction, then recognition, then the
 * worn line the pair are left with — because the beat that fires fourteen times
 * in a playthrough is the one that read as a stuck record before this slice.
 *
 * Run depths are measured, not chosen: over the 606-turn corpus a beat is
 * *spoken* (cooldown survivors, not marker occurrences) `reveal` 14×, `effort`
 * 9×, `scored` 5×, `uncanny` 3×, `combat-threat` 3×, `grue-threat` 1×,
 * `combat-victory` 0×. So `reveal` earns four lines and the rest two or three;
 * the fights are scripted three deep on the corpus's account being the poorer
 * evidence there — the walkthroughs avoid combat, real play does not.
 *
 * `parser-miss` occurs on 160 turns of the corpus, which no run can cover: the
 * last line of a run repeats, by rule, so a ten-deep run still ends in one line
 * said a hundred and fifty times. Ten is what M6.1d writes — enough that the arc
 * reads as an arc and the report can be measured — and **going deeper is M6.1e's
 * problem, together with the question of whether a beat this frequent wants a
 * rotating tail rather than a settled last line** (that would amend ADR 0006 §4
 * rule 4, so it is a decision, not a content edit).
 */
export const BEAT_SCRIPT: BeatScript = new Map<string, BeatEntry>([
  ["combat-victory", [
    {
      dm: "Something that wanted you dead is dead instead. The empire keeps count.",
      hero: "Still standing. That's the whole of the review.",
    },
    {
      dm: "Again. It will send another; it always has another.",
      hero: "Then it can keep sending. I've got the arm for it now.",
    },
    {
      dm: "The empire is running low on volunteers.",
      hero: "Good.",
    },
  ]],
  ["combat-threat", [
    {
      dm: "The blade knows before you do. It usually does.",
      hero: "I noticed. It always tells me early and unhelpfully.",
    },
    {
      dm: "It is glowing again. You are learning what that means.",
      hero: "I learned it the first time. I just don't like the lesson.",
    },
  ]],
  ["grue-threat", [
    {
      dm: "The dark is not empty. It is only patient.",
      hero: "Then it can be patient a little longer.",
    },
    {
      dm: "It is still down here with you. It has nowhere else to be.",
      hero: "Neither do I, apparently.",
    },
    {
      dm: "You know what lives here. You keep coming back anyway.",
      hero: "That's the part I'd have written differently.",
    },
  ]],
  ["scored", [
    {
      dm: "The empire notices what leaves it. It always sends someone.",
      hero: "That one counts, then.",
    },
    {
      dm: "Another one out of the ground. It is keeping a list.",
      hero: "Let it. I'm keeping one too.",
    },
    {
      dm: "The list is getting long on both sides.",
      hero: "Mine's longer.",
    },
  ]],
  ["reveal", [
    {
      dm: "There. It was waiting to be found, the way everything here is.",
      hero: "Of course it was. They always are.",
    },
    {
      dm: "Another one that was only ever waiting.",
      hero: "Somebody hid these with a schedule in mind.",
    },
    {
      dm: "You are not surprised any more. That took four rooms.",
      hero: "Three. I was humouring you.",
    },
    {
      dm: "Found. As arranged.",
      hero: "As arranged.",
    },
  ]],
  ["effort", [
    {
      dm: "They built it heavier than it needed to be. They built everything heavier than it needed to be.",
      hero: "It shows.",
    },
    {
      dm: "Heavier again. They had a house style.",
      hero: "The style is 'lean on it until something gives'.",
    },
    {
      dm: "You have stopped reading the room and started reading the hinges.",
      hero: "The hinges have been more honest.",
    },
  ]],
  // The largest beat in the game (26.4% of turns) and the one the pane was
  // quietest on: the parser said no, and until M6.1d nobody said anything about
  // it. The DM is the one holding the rulebook, so the refusal is his to explain
  // away; the Hero is the player who knows exactly what he meant. Neither may
  // name a noun — the marker knows a refusal happened, not what was refused.
  ["parser-miss", [
    {
      dm: "That is not a thing the world knows how to be asked.",
      hero: "It knew a minute ago. I'll try smaller words.",
    },
    {
      dm: "The module is quite specific about its vocabulary.",
      hero: "The module could try meeting me halfway.",
    },
    {
      dm: "No.",
      hero: "You could tell me why.",
    },
    {
      dm: "I could. It would not help.",
      hero: "It would help me.",
    },
    {
      dm: "You are arguing with a book.",
      hero: "The book started it.",
    },
    {
      dm: "Rephrase. It costs you nothing but a turn.",
      hero: "It costs me the turn. That's the part I mind.",
    },
    {
      dm: "Still no. It is consistent, if nothing else.",
      hero: "Consistency is what it has instead of manners.",
    },
    {
      dm: "There is a way to say that. This is not it.",
      hero: "Then we'll find it the slow way.",
    },
    {
      dm: "We have had this conversation.",
      hero: "We'll have it again. I'm nothing if not thorough.",
    },
    {
      dm: "No.",
      hero: "Noted.",
    },
  ]],
  // The engine's own one-word receipts — "Taken.", "Dropped.", "Opened." — which
  // are the turns the Hero already has an action balloon on. Scriptable only
  // since ADR 0009 §6 let him report *and* answer; before that the reply was
  // suppressed on exactly these turns.
  ["routine-ack", [
    {
      dm: "The empire logs every one of these, you know.",
      hero: "Let it. The paperwork is the only thing it's good at.",
    },
    {
      dm: "Another entry in a very long inventory.",
      hero: "It's a job.",
    },
    {
      dm: "You have stopped looking at these before you take them.",
      hero: "I look. I've just stopped being surprised.",
    },
    {
      dm: "Noted, filed, forgotten.",
      hero: "That's the arrangement.",
    },
  ]],
  ["uncanny", [
    {
      dm: "Not all of this is only stone.",
      hero: "I heard it. I'm going to keep not thinking about it.",
    },
    {
      dm: "There it is again. You did not imagine it the first time either.",
      hero: "I was doing so well at imagining it.",
    },
    {
      dm: "You have stopped flinching.",
      hero: "I've started counting instead. That's worse.",
    },
  ]],
]);
