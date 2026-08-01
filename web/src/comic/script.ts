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

import type { BeatEntry, BeatExchange, BeatScript } from "./mapper.js";

/**
 * The lexicon behind the Hero's **declaration** (ADR 0010 §1) — his re-voicing of
 * the player's own command as table-talk. "Let's head north." for `n`, not `n`
 * itself and not "I went north."
 *
 * **Three tiers, because the measurement found three** (ADR 0010, v0.24.3):
 * bare directions are 47.6% of everything typed and get the deepest rotation in
 * the game; intransitive verbs (`look`, `wait`, …) get one line each, because
 * each fires far less often than a direction; transitive verbs get templates
 * over the command's own noun phrase, the same `{name}`-style substitution
 * `ACTION_SCRIPT` already uses. **A command this lexicon cannot phrase produces
 * no declaration — silence is a legal outcome**, not a failure: the 4.4% tail
 * (`y`, `take all`, `xyzzy`, four bare nouns, …) is either hand-authored
 * elsewhere or left quiet rather than forced into an ungrammatical line.
 */
export interface CommandScript {
  /** Direction word or abbreviation (as typed, lowercased) → its canonical form. */
  readonly directionWords: ReadonlyMap<string, string>;
  /**
   * Rotation of templates over a canonical direction (`{dir}`/`{Dir}`). This is
   * the lexicon's one deep rotation: a direction recurs hundreds of times over a
   * playthrough, so a shallow table here is the play-log tell in costume
   * (`docs/PITFALLS.md` → Web, the `, then` tic).
   */
  readonly directions: readonly string[];
  /** Bare intransitive verb (single word, as typed) → rotation of lines. */
  readonly verbs: ReadonlyMap<string, readonly string[]>;
  /**
   * Verb (one word, or two for a phrasal verb like `turn on`) → rotation of
   * templates over the rest of the command as `{noun}`. The noun phrase is
   * substituted verbatim (lowercased, untranslated), so a template must stay
   * grammatical across whatever the player typed.
   */
  readonly templates: ReadonlyMap<string, readonly string[]>;
}

const DIRECTION_WORDS: ReadonlyMap<string, string> = new Map([
  ["n", "north"], ["north", "north"],
  ["s", "south"], ["south", "south"],
  ["e", "east"], ["east", "east"],
  ["w", "west"], ["west", "west"],
  ["ne", "northeast"], ["northeast", "northeast"],
  ["nw", "northwest"], ["northwest", "northwest"],
  ["se", "southeast"], ["southeast", "southeast"],
  ["sw", "southwest"], ["southwest", "southwest"],
  ["u", "up"], ["up", "up"],
  ["d", "down"], ["down", "down"],
  ["in", "in"], ["enter", "in"],
  ["out", "out"], ["exit", "out"],
]);

/** The rotation a bare direction draws from — the deepest table in the lexicon. */
const DIRECTION_LINES: readonly string[] = [
  "Let's head {dir}.",
  "{Dir}, then.",
  "I'll try {dir}.",
  "{Dir} looks right.",
  "Let's see what's {dir}.",
  "Onward — {dir}.",
  "{Dir} it is.",
  "Worth a look, {dir}.",
  "Let's go {dir}.",
  "{Dir}. Why not.",
  "This way — {dir}.",
  "Off we go, {dir}.",
];

const LOOK_LINES = ["Let's see where we are.", "Worth a proper look."];
const WAIT_LINES = ["Let's give it a moment.", "No rush."];
const INVENTORY_LINES = ["Let's see what I'm carrying.", "Quick check of the pockets."];

const VERB_LINES: ReadonlyMap<string, readonly string[]> = new Map([
  ["look", LOOK_LINES], ["l", LOOK_LINES],
  ["wait", WAIT_LINES], ["z", WAIT_LINES],
  ["inventory", INVENTORY_LINES], ["i", INVENTORY_LINES],
  ["jump", ["Here goes nothing."]],
  ["listen", ["Let's listen a moment."]],
  ["smell", ["Something's in the air."]],
  ["pray", ["Couldn't hurt."]],
  ["yell", ["Worth a shout."]],
  ["scream", ["Worth a shout."]],
  ["shout", ["Worth a shout."]],
  ["wave", ["A wave, for what it's worth."]],
  ["sing", ["Not my strong suit, but here goes."]],
  ["dance", ["When in doubt."]],
  ["diagnose", ["Let's see how banged up I am."]],
  ["score", ["Let's check the tally."]],
  ["sleep", ["Tempting, but no."]],
]);

const TAKE_LINES = ["Let's grab the {noun}.", "That {noun}'s coming with me.", "I'll take the {noun}."];
const ATTACK_LINES = ["Time to deal with the {noun}.", "Let's take on the {noun}."];
const EXAMINE_LINES = ["Let's have a look at the {noun}.", "Worth examining the {noun}."];

const TEMPLATE_LINES: ReadonlyMap<string, readonly string[]> = new Map([
  ["take", TAKE_LINES], ["get", TAKE_LINES],
  ["drop", ["I'll leave the {noun}.", "The {noun} can stay.", "Let it go — the {noun}."]],
  ["open", ["Let's open the {noun}.", "See what's in the {noun}."]],
  ["close", ["Better shut the {noun}."]],
  ["examine", EXAMINE_LINES], ["x", EXAMINE_LINES],
  ["read", ["Let's read the {noun}.", "What's the {noun} say?"]],
  ["attack", ATTACK_LINES], ["kill", ATTACK_LINES],
  ["light", ["Let's light the {noun}."]],
  ["extinguish", ["Better put out the {noun}."]],
  ["put", ["Let's put it with the {noun}."]],
  ["give", ["Let's hand over the {noun}."]],
  ["throw", ["Here goes the {noun}."]],
  ["unlock", ["Let's get the {noun} open."]],
  ["lock", ["Better lock the {noun}."]],
  ["move", ["Let's shift the {noun}."]],
  ["push", ["Give the {noun} a push."]],
  ["pull", ["Let's pull the {noun}."]],
  ["tie", ["Let's tie off the {noun}."]],
  ["untie", ["Time to untie the {noun}."]],
  ["pour", ["Let's pour out the {noun}."]],
  ["fill", ["Let's fill the {noun}."]],
  ["rub", ["Worth a rub, the {noun}."]],
  ["touch", ["Let's feel the {noun}."]],
  ["count", ["Let's count the {noun}."]],
  ["wind", ["Better wind the {noun}."]],
  ["ring", ["Let's ring the {noun}."]],
  ["dig", ["Time to dig the {noun}."]],
  ["burn", ["Let's burn the {noun}."]],
  ["cut", ["Let's cut the {noun}."]],
  ["climb", ["Let's climb the {noun}."]],
  ["enter", ["Let's get into the {noun}."]],
  ["search", ["Let's search the {noun}."]],
  ["turn on", ["Let's switch on the {noun}."]],
  ["turn off", ["Better switch off the {noun}."]],
  ["look in", ["Let's look inside the {noun}."]],
  ["look under", ["Let's check under the {noun}."]],
]);

export const COMMAND_SCRIPT: CommandScript = {
  directionWords: DIRECTION_WORDS,
  directions: DIRECTION_LINES,
  verbs: VERB_LINES,
  templates: TEMPLATE_LINES,
};

/**
 * The Hero's **journey line** (ADR 0010 §3) — the one thing a collapsed
 * traversal run says, replacing the per-step declaration the run's last turn
 * would otherwise have spoken. Named after where he ended up ("Back down to
 * the cellar."), not the steps it took to get there — a run of six becomes
 * one line, not six. `{room}` fills with the destination's title, lowercased
 * and given its own article by the caller (`director.ts`), so a template
 * here never has to guess between "the" and "an".
 */
export const JOURNEY_LINES: readonly string[] = [
  "Back to {room}.",
  "Made it back to {room}.",
  "Found our way back to {room}.",
  "Here we are again — {room}.",
  "{Room} — we're back.",
  "Retraced our steps to {room}.",
  "{Room}, once more.",
  "Circled back to {room}.",
];

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
 * The gazetteer — one **exchange** per room, spoken once on first entry.
 *
 * **The Hero answers here as of M6.1e**, and the measurement is what chose this
 * over a fallback keyed on `PanelKind`. Of the 220 marker-less turns in the
 * corpus, 45 are first visits and every one of them already had a DM line and no
 * reply — the idol narrating a room at a player who says nothing, which is the
 * shape 6.1e exists to delete. A room is entered for the first time exactly
 * once, so unlike a beat these lines **cannot wear out**: there is no run, no
 * cooldown and no repeat to design around, which is why this is the one place
 * the corpus can be filled in without risking the generic-line failure the
 * marker split was written to escape. The DM half keeps its voice
 * (`wiki/the-guide.md`); the Hero's is his (`wiki/the-hero.md`) — terse, dry,
 * reacting to the room and never telling himself what to do in it (his rule 5).
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
/**
 * The Hero's **resolved-action** lines (ADR 0005 §1) — what he says on a turn
 * that moved something into or out of his hands.
 *
 * **Data, and a rotation, because a single string on a frequent trigger is a
 * verbal tic rather than a voice** (M6.1e session 4; the `routine-ack` lesson of
 * M6.1g, arrived at again from the other direction). This was one hardcoded
 * template in `mapper.ts` — `The {name}, then.` — firing **59 times** over a
 * playthrough in the identical shape, and `wiki/the-hero.md` prescribed the
 * shape, so every line authored from the spec inherited it. The clipped fragment
 * is right and stays; the fixed `, then` suffix is gone.
 *
 * `{name}` is the object's display name, substituted by the mapper. A line
 * without the token is one that does not need it: the panel already shows what he
 * picked up, and never naming it is part of not sounding like a play-log. Lines
 * must stay grammatical across every name the world holds — "jewel-encrusted
 * egg" as readily as "lantern".
 */
export interface ActionScript {
  readonly take: readonly string[];
  readonly drop: readonly string[];
}

export const ACTION_SCRIPT: ActionScript = {
  take: [
    "Worth the weight.",
    "That'll be useful.",
    "Somebody left this lying around.",
    "The {name}. Good.",
    "Mine now.",
  ],
  drop: [
    "It can stay.",
    "Not worth carrying.",
    "The {name}'s done its bit.",
  ],
};

export const GUIDE_SCRIPT = new Map<string, string | BeatExchange>([
  // Above ground — the house and the forest that rings it.
  ["WEST-OF-HOUSE", { dm: "Boarded front door. Someone did not want visitors.",
    hero: "They were thorough about it, too." }],
  ["NORTH-OF-HOUSE", { dm: "The path goes on. It usually does.", hero: "Paths are optimists." }],
  ["SOUTH-OF-HOUSE", { dm: "The same white house, a different side. The boards are just as final.",
    hero: "Boards on every side. Consistent, at least." }],
  ["EAST-OF-HOUSE", { dm: "That window is slightly ajar. That is an invitation.",
    hero: "Somebody's idea of security." }],
  ["FOREST-1", { dm: "Trees, and more trees. The forest keeps its one idea.",
    hero: "Trees. Wonderful." }],
  ["FOREST-2", { dm: "You have been among these trees before. They will not admit it.",
    hero: "Neither will I." }],
  ["FOREST-3", { dm: "More forest. It is patient in a way you are not.",
    hero: "It has the schedule for it." }],
  ["MOUNTAINS", { dm: "The mountains forbid passage. They have had practice.",
    hero: "Fine. They win." }],
  ["PATH", { dm: "A path worn by feet that mostly did not come back.", hero: "Comforting." }],
  ["UP-A-TREE", { dm: "A nest, an egg, a long way down. Choose carefully.",
    hero: "Two of the three are a problem." }],
  ["CLEARING", { dm: "A clearing. The trees step back to watch.", hero: "Polite of them." }],
  ["GRATING-CLEARING", { dm: "Leaves, and something square beneath them. Not everything buried stays buried.",
    hero: "Square things are never natural." }],

  // Inside the house.
  ["KITCHEN", { dm: "A table, a sack, a bottle. Somebody left in a hurry.",
    hero: "They left the good part behind, though." }],
  ["ATTIC", { dm: "Dark, and full of the shapes of useful things. Bring your own light.",
    hero: "Noted. In the dark." }],
  ["LIVING-ROOM", { dm: "Note the rug. Rugs in this house are load-bearing.",
    hero: "I've met rugs like it." }],
  ["CELLAR", { dm: "It gets dark down here. Darker than you want.", hero: "It usually does." }],

  // The first cave — troll country and the galleries.
  ["TROLL-ROOM", { dm: "The troll blocks the way and grins. He has done this to better than you.",
    hero: "He's done it to worse, too." }],
  ["EAST-OF-CHASM", { dm: "A chasm, and a narrow ledge. The empire keeps its treasures behind inconveniences.",
    hero: "A ledge is still a floor. Mostly." }],
  ["GALLERY", { dm: "A painting worth more than its frame. Take one, leave the other.",
    hero: "Art appreciation, my way." }],
  ["STUDIO", { dm: "Someone worked here once. The chimney still remembers the way up.",
    hero: "Chimneys have long memories." }],

  // The maze, which is its own joke and knows it.
  ["MAZE-1", { dm: "A maze of twisty little passages, all alike. It means that literally.",
    hero: "Of course it does." }],
  ["MAZE-2", { dm: "Another twist. The maze does not care which.", hero: "Neither do I. Yet." }],
  ["MAZE-5", { dm: "Still the maze. Landmarks are a luxury it does not offer.",
    hero: "I'll make my own." }],
  ["MAZE-8", { dm: "The passages keep their faces turned away. Count your steps or lose them.",
    hero: "I stopped counting a while back." }],
  ["DEAD-END-1", { dm: "A dead end. The maze offers several. It is generous that way.",
    hero: "Generous." }],
  ["DEAD-END-2", { dm: "Another wall where a way should be. The maze is consistent, at least.",
    hero: "Walls usually are." }],
  ["CYCLOPS-ROOM", { dm: "The cyclops is hungry and you are on the menu. There is a name he would rather not hear.",
    hero: "I'm not much of a meal." }],
  ["STRANGE-PASSAGE", { dm: "A passage that connects what should not connect. Use it anyway.",
    hero: "Geography can file a complaint." }],
  ["TREASURE-ROOM", { dm: "The thief's own hoard. He will want it back, and he is not far.",
    hero: "So we've both been busy." }],
  ["GRATING-ROOM", { dm: "A grating overhead, and daylight past it. Locked, of course.",
    hero: "Daylight I can't reach is a rumor." }],

  // Mirrors and the round hub of the middle empire.
  ["MIRROR-ROOM-1", { dm: "A mirror you could step through. The empire's shortcuts had style.",
    hero: "Style and a long drop, usually." }],
  ["MIRROR-ROOM-2", { dm: "The same mirror from the other side. It kept its promise.",
    hero: "Rare, that." }],
  ["ROUND-ROOM", { dm: "Every passage meets here. A hub, or a snare, depending on your errand.",
    hero: "Both, given time." }],
  ["EW-PASSAGE", { dm: "East to west, and nothing to see between. Some rooms are only distance.",
    hero: "Distance I can do." }],
  ["NS-PASSAGE", { dm: "North to south. The empire built corridors the way it built everything: to outlast you.",
    hero: "It's ahead so far." }],
  ["LOUD-ROOM", { dm: "The room is very loud. The room is very loud.",
    hero: "I heard you. Twice." }],
  ["DAMP-CAVE", { dm: "Water somewhere close, and the smell of it older than the walls.",
    hero: "Old water. Marvellous." }],
  ["DEEP-CANYON", { dm: "A canyon that goes down further than your light. Down is a direction here, not a plan.",
    hero: "It's been both so far." }],
  ["CHASM-ROOM", { dm: "A chasm too wide to argue with. Go around.",
    hero: "I don't argue with holes." }],

  // The dam and the reservoir it holds.
  ["DAM-ROOM", { dm: "A dam, and a control panel. The manual is elsewhere, on purpose.",
    hero: "Naturally." }],
  ["DAM-LOBBY", { dm: "Guidebooks and matches. The empire believed in signage.",
    hero: "And in fire, apparently." }],
  ["MAINTENANCE-ROOM", { dm: "Buttons in four colors. Only some of them regret being pressed.",
    hero: "Four ways to find out, one at a time." }],
  ["RESERVOIR-SOUTH", { dm: "The south bank. The water decides whether this is a shore or a floor.",
    hero: "Wet either way." }],
  ["RESERVOIR", { dm: "A reservoir, drained or full by a bolt you turned upstream. Cause, then effect.",
    hero: "My favourite order." }],
  ["RESERVOIR-NORTH", { dm: "The far bank, and a pump for a boat you do not yet own.",
    hero: "Optimistic infrastructure." }],
  ["STREAM-VIEW", { dm: "A stream, viewed. The empire liked to be looked at.",
    hero: "It's holding up better than the empire." }],
  ["DAM-BASE", { dm: "The river begins here. So does the part of the empire with no walls.",
    hero: "Fewer walls, more weather." }],

  // Hades and the temples.
  ["ENTRANCE-TO-HADES", { dm: "The gate to the land of the dead. The dead are in.",
    hero: "They always are." }],
  ["LAND-OF-LIVING-DEAD", { dm: "Spirits, and a bell, a book, a candle. The rite is older than the empire that fears it.",
    hero: "Three props and a bad crowd." }],
  ["ENGRAVINGS-CAVE", { dm: "Ancient carvings. They flatter no one who stops to read them.",
    hero: "I've had worse reviews." }],
  ["EGYPT-ROOM", { dm: "A gold coffin, too heavy to be wise. Everyone takes it anyway.",
    hero: "I'm not everyone. I'm worse." }],
  ["DOME-ROOM", { dm: "A railing, a long drop, and a rope you did not think to bring. Improvise.",
    hero: "The railing is the good news." }],
  ["TORCH-ROOM", { dm: "A torch that burns without fuel. The empire had good years.",
    hero: "It's still having one." }],
  ["NORTH-TEMPLE", { dm: "A temple, quiet the way only abandoned holy places are.",
    hero: "Quiet I'll take." }],
  ["SOUTH-TEMPLE", { dm: "An altar, and a way down. Somewhere to leave what you cannot carry further.",
    hero: "Altars always want something." }],
  ["ATLANTIS-ROOM", { dm: "An ancient hall, and a trident in it. Atlantis kept better souvenirs than it kept itself.",
    hero: "Sank with good taste." }],

  // The Frigid River and Aragain Falls.
  ["RIVER-1", { dm: "The current has you now. It knows where it is going, which is more than you can say.",
    hero: "One of us should." }],
  ["RIVER-2", { dm: "The banks slide past. Downstream is the only vote that counts here.",
    hero: "I abstain." }],
  ["RIVER-3", { dm: "Still drifting. The river is in no hurry and neither, now, are you.",
    hero: "I've had worse commutes." }],
  ["RIVER-4", { dm: "The water quickens. A buoy rides ahead of you, red and deliberate.",
    hero: "Nothing red out here is decorative." }],
  ["RIVER-5", { dm: "The last calm stretch. Beyond it the river stops being scenery.",
    hero: "Scenery was nice while it lasted." }],
  ["WHITE-CLIFFS-NORTH", { dm: "Cliffs too sheer to land against. Keep to the water.",
    hero: "The water and I have an arrangement." }],
  ["WHITE-CLIFFS-SOUTH", { dm: "More white cliff, no more welcoming. The river chose your route for you.",
    hero: "It's not a bad navigator." }],
  ["SHORE", { dm: "The far shore. The river sets you down, this once.",
    hero: "Dry land. Overrated, but dry." }],
  ["SANDY-BEACH", { dm: "Sand, and a buoy that rode the river before you did.",
    hero: "It got here first." }],
  ["SANDY-CAVE", { dm: "A cave that wants digging. Bring a shovel and low expectations.",
    hero: "I have one of the two." }],
  ["ARAGAIN-FALLS", { dm: "A waterfall, and a rainbow you might yet be able to walk on.",
    hero: "\"Might\" is doing a lot of work there." }],
  ["ON-RAINBOW", { dm: "You are standing on a rainbow. Do not think about it too hard.",
    hero: "Too late." }],
  ["END-OF-RAINBOW", { dm: "The end of the rainbow, and the pot they promised. For once they meant it.",
    hero: "Somebody kept a promise. Suspicious." }],
  ["CANYON-BOTTOM", { dm: "The bottom of the canyon. Everything rolls down here eventually, including you.",
    hero: "I walked. Mostly." }],
  ["CLIFF-MIDDLE", { dm: "A ledge halfway up. Halfway is the worst place to stop and think.",
    hero: "So I won't." }],
  ["CANYON-VIEW", { dm: "A long look down the canyon. The vertigo is complimentary.",
    hero: "Generous of the management." }],

  // The coal mine.
  ["MINE-ENTRANCE", { dm: "The coal mine yawns. It has swallowed better-equipped men.",
    hero: "Equipment was never my problem." }],
  ["SQUEEKY-ROOM", { dm: "Something small lives here and does not like company.",
    hero: "Small things rarely do." }],
  ["BAT-ROOM", { dm: "A bat, and it likes shiny things. Garlic, it likes considerably less.",
    hero: "Everyone's a critic." }],
  ["SHAFT-ROOM", { dm: "A shaft, a basket, a chain. Load it before you regret the weight on your back.",
    hero: "My back has opinions already." }],
  ["SMELLY-ROOM", { dm: "A smell with a warning inside it. The next room is where it comes true.",
    hero: "Smells don't usually lie." }],
  ["GAS-ROOM", { dm: "Gas, and an open flame in your hand. Think.",
    hero: "I'm thinking. Quickly." }],
  ["MINE-1", { dm: "Coal, and dark, and more of both. The mine repeats like the maze, but dirtier.",
    hero: "The maze was at least clean." }],
  ["MINE-2", { dm: "The same coal from a different angle. Down here, angles are all you get.",
    hero: "I'll take the angle." }],
  ["MINE-4", { dm: "Deeper in. The mine gives up nothing it was not paid for in advance.",
    hero: "I'm short on advance." }],
  ["LADDER-TOP", { dm: "A ladder down. The bottom is further than the rung suggests.",
    hero: "They always are." }],
  ["LADDER-BOTTOM", { dm: "The foot of the ladder, and the mine proper. Mind your light.",
    hero: "The light and I are close." }],
  ["TIMBER-ROOM", { dm: "Old timbers, and a gap too narrow for a full pack. Travel light or not at all.",
    hero: "Light it is." }],
  ["LOWER-SHAFT", { dm: "A draft from nowhere, and pressure of the diamond-making kind. Something valuable is close.",
    hero: "Pressure I know about." }],
  ["MACHINE-ROOM", { dm: "A machine, a lid, a switch. Coal goes in; something better is supposed to come out.",
    hero: "Supposed to." }],
  ["SLIDE-ROOM", { dm: "A chute back to the cellar. Faster down than up, as these things always are.",
    hero: "Down is my best direction." }],

  // The end.
  ["STONE-BARROW", { dm: "The barrow, at last. The way in opens once, and only forward.",
    hero: "Forward. Finally." }],
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
 * where he also reports an action** (ADR 0009 §6): "Worth the weight." and his
 * answer are two balloons in the order the mapper pushes them, and `page.ts`
 * decides whether that is one panel or two.
 *
 * **`death` is still deliberately absent.** The `reaction` rung is tight on the
 * Hero's face and carries no speech balloon by design (`render.ts`'s
 * `BALLOON_HEADROOM`). The idol does not crowd a death, and neither does a quip.
 *
 * **The refusals are scripted as of M6.1d**, and that was the stage's largest
 * lever. They were held back because the beat table consumed one shared cooldown
 * with the gazetteer, so scripting the biggest marker in the game would have
 * starved the rarer beats. The cooldown is per beat now
 * (`MapperOptions.guideCooldown`), so the argument no longer holds — and the
 * measurement it was waiting on says the refusal families are 26.4% and 18.8% of
 * all turns, the two largest things in the game.
 *
 * **Slice 4: every beat is a run, not a line.** Each entry is the beat's lines in
 * the order they are spoken, and the *n*th time the beat speaks it takes the
 * *n*th line (`mapper.ts`'s `variantOf`). The run is written as a small arc —
 * fresh reaction, then recognition, then the worn line the pair are left with —
 * because the beat that fires fourteen times in a playthrough is the one that
 * read as a stuck record before this slice.
 *
 * Run depths are measured, not chosen: over the 606-turn corpus a beat is
 * *spoken* (cooldown survivors, not marker occurrences) `reveal` 14×, `effort`
 * 9×, `scored` 5×, `uncanny` 3×, `combat-threat` 3×, `grue-threat` 1×,
 * `combat-victory` 0×. So `reveal` earns four lines and the rest two or three;
 * the fights are scripted three deep on the corpus's account being the poorer
 * evidence there — the walkthroughs avoid combat, real play does not.
 *
 * **M6.1e answered the question 6.1d left open, and the answer changed the
 * shape of this table.** 6.1d met D5 on volume, and the measurement underneath it
 * was bad: **218 of 252 exchanges were a run's last line repeating** — 150 of them
 * `parser-miss` alone, which fires 160× in the corpus and 139× in one
 * playthrough. No depth covers that. Two moves, together:
 *
 * - **The frequent beats are split by what actually happened.** `parser-miss`
 *   became `not-here` / `not-carried` / `unknown-word` and the map's own refusal
 *   became `blocked-exit` — measured shares, not guessed ones. This makes each
 *   line *apt* rather than merely varied, and it divides the firing count each
 *   run has to carry.
 * - **A run may end in a cycling tail** ({@link BeatCycle}, amending ADR 0006 §4
 *   rule 4). `run` is the arc, walked once and never re-entered — so nothing ever
 *   loops back to an opening reaction, which is what rule 4 was protecting. Only
 *   the settled register cycles.
 *
 * So an entry here is written as two lists: **what the pair say while the beat is
 * still new, and what they have left once it is not.** The second list is the one
 * a reader sees most, and it is written to be re-read.
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
  ["scored", {
    // M6.1g. Treasure does not arrive one room at a time — the endgame is a ferry
    // to the trophy case, and on the won corpus this beat was firing on
    // consecutive turns, putting "Mine's longer." in adjacent panels. The count
    // was never the problem; the spacing was.
    cooldown: 3,
    run: [
      {
        dm: "The empire notices what leaves it. It always sends someone.",
        hero: "That one counts.",
      },
      {
        dm: "Another one out of the ground. It is keeping a list.",
        hero: "Let it. I'm keeping one too.",
      },
    ],
    // Four, not two: the cooldown above spaces the *firings*, and the loop's
    // length is what spaces the *lines*. At two the same line came back every
    // second firing, which on the won corpus was every eleven panels.
    loop: [
      { dm: "The list is getting long on both sides.", hero: "Mine's longer." },
      { dm: "It noticed that one too.", hero: "Good. I want it counting." },
      { dm: "One more the empire will want back.", hero: "It can want." },
      { dm: "It never runs out of ledger, that one.", hero: "Neither do I." },
    ],
  }],
  ["reveal", {
    run: [
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
    ],
    loop: [
      { dm: "Found. As arranged.", hero: "As arranged." },
      { dm: "There it is, where it was always going to be.", hero: "I do like being right." },
      { dm: "Another one off the schedule.", hero: "Whose schedule is it, I wonder." },
    ],
  }],
  ["effort", {
    run: [
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
    ],
    loop: [
      { dm: "It gives, eventually. They all do.", hero: "Eventually is doing a lot of work there." },
      { dm: "More weight. Of course.", hero: "I'd have built it lighter." },
    ],
  }],
  // **The refusal family**, split three ways at M6.1e because one voice cannot
  // answer three different noes. Measured over the corpus: `not-here` ~95
  // firings, `not-carried` 54, `unknown-word` 11. None of them may name a noun —
  // a marker knows a refusal happened, not what was refused.
  //
  // The Hero reaches for something that is somewhere else. The joke is spatial,
  // and it is the one refusal where he is usually right and merely early.
  ["parser-miss/not-here", {
    cooldown: 2,
    run: [
      {
        dm: "Not here. Somewhere, perhaps, but not here.",
        hero: "It was here. I'd have sworn it was here.",
      },
      {
        dm: "You are describing a room you were in earlier.",
        hero: "They all describe a room I was in earlier.",
      },
      {
        dm: "The map is large and your memory is a map of its own.",
        hero: "Mine's to scale. It's just not aligned.",
      },
    ],
    loop: [
      { dm: "Not in this room.", hero: "Then it's in the next one." },
      { dm: "Also not in this room.", hero: "I'm narrowing it down." },
      { dm: "Still elsewhere.", hero: "Elsewhere is where I keep everything." },
      { dm: "Nothing of that description is here.", hero: "Give it a minute." },
      { dm: "You are looking for it in the wrong century.", hero: "It's a big dungeon. I'll allow myself the error." },
      { dm: "Not here either.", hero: "I'm building a very good map of where it isn't." },
      { dm: "That is somewhere you have been.", hero: "Everywhere is somewhere I have been." },
    ],
  }],
  // The Hero reaches for something he is *not carrying*. Different joke: he is
  // not lost, he is over-committed. 54 firings — the second largest.
  ["parser-miss/not-carried", {
    cooldown: 2,
    run: [
      {
        dm: "You are not holding that.",
        hero: "I was holding it. Something happened in between.",
      },
      {
        dm: "Your hands contain what your hands contain.",
        hero: "That is the most useful thing you've said all game.",
      },
      {
        dm: "There is a limit, and you keep finding it.",
        hero: "The limit keeps moving. I've watched it.",
      },
    ],
    loop: [
      { dm: "Not in your hands.", hero: "Then it's on the floor behind me." },
      { dm: "Still not in your hands.", hero: "I'm aware. I was hoping you weren't." },
      { dm: "You put it down. You do that a lot.", hero: "It's a carrying problem, not a memory problem." },
    ],
  }],
  // The vocabulary miss — the parser did not understand the *word*. The rarest of
  // the three (11), and the only one where the Hero is arguing with the book
  // rather than with the world.
  ["parser-miss/unknown-word", {
    cooldown: 1,
    run: [
      {
        dm: "That is not a thing the world knows how to be asked.",
        hero: "It knew a minute ago. I'll try smaller words.",
      },
      {
        dm: "The module is quite specific about its vocabulary.",
        hero: "The module could try meeting me halfway.",
      },
      {
        dm: "I could tell you why. It would not help.",
        hero: "It would help me.",
      },
      {
        dm: "You are arguing with a book.",
        hero: "The book started it.",
      },
    ],
    loop: [
      { dm: "There is a way to say that. This is not it.", hero: "Then we'll find it the slow way." },
      { dm: "No.", hero: "Noted." },
      { dm: "We have had this conversation.", hero: "We'll have it again. I'm nothing if not thorough." },
    ],
  }],
  // **The map's "no", not the parser's** — 114 turns say exactly "You can't go
  // that way", plus the mountains, the storm-tossed trees and the impenetrable
  // forest. The largest single sentence in the game, and it had no voice at all
  // until M6.1e. He is not misunderstood here; he is simply walking into a wall.
  ["blocked-exit", {
    cooldown: 3,
    run: [
      {
        dm: "There is no way through there.",
        hero: "There's a gap. I can see a gap.",
      },
      {
        dm: "You can see it. You cannot use it.",
        hero: "That's the whole dungeon in one sentence.",
      },
      {
        dm: "The map is not interested in your opinion of the map.",
        hero: "Noted, and disregarded.",
      },
    ],
    loop: [
      { dm: "Not that way.", hero: "Fine. The long way." },
      { dm: "Nor that way.", hero: "I'm eliminating. It's a method." },
      { dm: "That is a wall doing what walls do.", hero: "It could do it somewhere less convenient." },
      { dm: "No.", hero: "You could have led with the map." },
      { dm: "Still a wall.", hero: "I'll take your word for it. Once more." },
      { dm: "The dungeon has opinions about where you go.", hero: "So do I. Mine lose." },
      { dm: "You have tried that one before.", hero: "It might have changed its mind." },
    ],
  }],
  // The engine's own one-word receipts — "Taken.", "Dropped.", "Opened." — which
  // are the turns the Hero already has an action balloon on. Scriptable only
  // since ADR 0009 §6 let him report *and* answer; before that the reply was
  // suppressed on exactly these turns.
  ["routine-ack", {
    // M6.1g, and the worst of the clustering: "Taken." is what a `take all` and a
    // hoard ferry produce every single turn, so the loop's three lines were
    // recycling at **gap 1** — "And that one." 34 times, twice back to back. The
    // acknowledgement beat is the one that most needs to be occasional: it fires
    // on the turns where the Hero already has an action balloon, so a silent one
    // is not a silent panel.
    cooldown: 3,
    run: [
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
    ],
    // The most-fired loop in the game, so the longest — same reason as `scored`.
    loop: [
      { dm: "Noted, filed, forgotten.", hero: "That's the arrangement." },
      { dm: "And that one.", hero: "And that one." },
      { dm: "The list grows.", hero: "The list is the job." },
      { dm: "Logged.", hero: "Efficient of you." },
      { dm: "The inventory takes it without comment.", hero: "Best kind of witness." },
    ],
  }],
  ["uncanny", {
    run: [
      {
        dm: "Not all of this is only stone.",
        hero: "I heard it. I'm going to keep not thinking about it.",
      },
      {
        dm: "There it is again. You did not imagine it the first time either.",
        hero: "I was doing so well at imagining it.",
      },
    ],
    loop: [
      { dm: "You have stopped flinching.", hero: "I've started counting instead. That's worse." },
      { dm: "It is still doing that.", hero: "It can do that without me listening." },
    ],
  }],
]);
