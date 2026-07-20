/**
 * Thief verification — the robbery pass, by membership.
 *
 * `I-THIEF` has been queued and running since v0.8.0, but nothing exercised it:
 * no walkthrough stays underground long enough to be robbed, so `ROB` and the
 * thief's wander could have been silently wrong for a milestone the way combat
 * was. This file is that check.
 *
 * The thief cannot be diffed against a golden transcript for the same reason
 * combat cannot, only more so: *where he is* is a draw, so whether he shows up
 * on turn 10 or turn 60 is not reproducible across interpreters. So the same
 * method applies — every line he prints must be a message the game could have
 * produced (`membership.ts`), and the behaviour is asserted as invariants over
 * many seeds rather than as one fixed script.
 *
 * What that catches: an unextracted `ROB` (he wanders but never steals), a
 * booty pass that moves the wrong object, `THIEF-VS-ADVENTURER` returning the
 * wrong branch so he never becomes visible, a treasure moved to the wrong
 * container, and a marker rendered as a bare number.
 *
 * The scenario is the Cellar with the painting in hand, because the thief wants
 * treasure and the Cellar is `TOUCHBIT` early and often on his round. `wait` is the turn of choice:
 * it advances the clock without changing the world, so every line beyond the
 * wait's own is something a daemon did.
 */

import { describe, expect, it } from "vitest";
import { createEngine } from "../src/engine.js";
import { transcriptText } from "../src/events.js";
import { normalize } from "../harness/golden.js";
import {
  doc,
  legalTurnMatcher,
  messageRows,
  stringLiterals,
  tellPatterns,
} from "./membership.js";

/**
 * The thief's own machinery, plus the daemons that also speak during a long
 * underground wait.
 *
 * `I-LANTERN` and `I-SWORD` are not thief routines, but their output lands in
 * the same turns — the lamp dims on a schedule and the sword glows while the
 * thief is next door — so a check that omitted them would fail on a line that
 * is perfectly legal. `V-WAIT` contributes "Time passes...", the turn's own
 * text. Naming them here is not a hand-listed *message* set: the messages still
 * come out of the IR, only the routines that can speak are named.
 */
const THIEF_ROUTINES = [
  "I-THIEF",
  "ROB",
  "ROBBER-FUNCTION",
  "THIEF-VS-ADVENTURER",
  "DEPOSIT-BOOTY",
  "HACK-TREASURES",
  "STEAL-JUNK",
  "ROB-MAZE",
  "THIEF-IN-TREASURE",
  "V-WAIT",
  "I-LANTERN",
  "I-SWORD",
];

/** The thief fights back, drawing from his own melee table. */
const THIEF_TABLES = ["THIEF-MELEE"];

/**
 * The lamp's warnings come from `LAMP-TABLE`, not from a TELL, so `I-LANTERN`
 * alone would not cover "The lamp appears a bit dimmer." — which a 120-turn
 * vigil always reaches. It is a *literal* table: interleaved countdowns and
 * messages, so its strings are separate messages rather than one row.
 */
const LITERAL_TABLES = ["LAMP-TABLE"];

const legalTurn = legalTurnMatcher(THIEF_TABLES, THIEF_ROUTINES, LITERAL_TABLES);

/**
 * Down to the Gallery for the painting, then back to the Cellar to wait.
 *
 * The painting matters: an empty-handed player is robbed of nothing but the
 * sword, and the "finding nothing of value" branch would let a `ROB` that
 * cannot move a *treasure* pass. The vigil is kept in the Cellar rather than
 * where the painting lies, because the thief's round of the ROOMS tree passes
 * through the Cellar several times in a hundred turns and the Gallery twice —
 * too few chances for the visible branch to come up at all.
 */
const VIGIL_ROOM = "CELLAR";

const APPROACH = [
  "north", "east", "open window", "enter house", "west",
  "take lamp", "take sword", "move rug", "open trap door",
  "turn on lamp", "down", "south", "east", "take painting", "west", "north",
];

/** Long enough that the wander reaches the Cellar several times. */
const TURNS = 120;
const SEEDS = 12;

interface Visit {
  /** Lines printed across the vigil, excluding the room description. */
  lines: string[];
  /** The thief was in the room and visible at least once. */
  seen: boolean;
  /** The painting left the player's hands for the thief's bag. */
  robbed: boolean;
  /** The player stopped being in the vigil room (died, or was moved). */
  left: boolean;
}

/**
 * Wait in the Cellar and record what the thief did.
 *
 * Aborts if the player leaves the room: `JIGS-UP` resurrects to the forest,
 * which is above ground where the thief never goes, and every turn after that
 * would be a vigil over an empty stage. An earlier version of this probe missed
 * the thief entirely for exactly that reason.
 */
function vigil(seed: number): Visit {
  const engine = createEngine(doc, { seed });
  for (const command of APPROACH) engine.command(command);

  const visit: Visit = { lines: [], seen: false, robbed: false, left: false };
  for (let turn = 0; turn < TURNS; turn++) {
    const text = normalize(transcriptText(engine.command("wait").events));
    const state = engine.snapshot();

    if (state.globals["HERE"] !== VIGIL_ROOM) {
      visit.left = true;
      break;
    }
    for (const line of text.split("\n").map((l) => l.trim()).filter(Boolean)) {
      visit.lines.push(line);
    }
    // Visible *and* here: the thief spends most of his life INVISIBLE elsewhere.
    if (
      state.locations["THIEF"] === VIGIL_ROOM &&
      !(state.flags["THIEF"] ?? []).includes("INVISIBLE")
    ) {
      visit.seen = true;
    }
    if (state.locations["PAINTING"] === "THIEF") visit.robbed = true;
  }
  return visit;
}

describe("the thief — robbery verified by membership", () => {
  it("derives its legal message set from the IR", () => {
    /*
     * Guards the derivation. If these collapsed to nothing, every membership
     * assertion below would pass vacuously against an empty alternation — the
     * way a check like this dies quietly.
     */
    expect(messageRows("THIEF-MELEE").length).toBeGreaterThan(0);
    /*
     * `THIEF-VS-ADVENTURER` and `ROBBER-FUNCTION` carry all of the thief's
     * prose. `I-THIEF` and `ROB` are deliberately *silent* — the daemon and the
     * robbery move objects and delegate every word to those two — so asserting
     * text in them would pin a fact about the game that is not true.
     */
    expect(tellPatterns("THIEF-VS-ADVENTURER").length).toBeGreaterThan(0);
    expect(tellPatterns("ROBBER-FUNCTION").length).toBeGreaterThan(0);
    expect(stringLiterals("LAMP-TABLE").length).toBeGreaterThan(0);
  });

  it("rejects text the game could not have produced", () => {
    /*
     * The negative control, in both directions. A wildcard-bearing alternation
     * can quietly become unfalsifiable, and then the suite is green while
     * verifying nothing.
     */
    expect(legalTurn.test("You are likely to be eaten by a grue.")).toBe(false);
    // A marker rendered as its raw number instead of a name.
    expect(legalTurn.test("The thief places the 0 in his bag.")).toBe(false);
    // A table id leaking into prose.
    expect(legalTurn.test("THIEF-MELEE#0#0")).toBe(false);
    // A real message with its tail corrupted...
    expect(legalTurn.test("The thief just left, still carrying his large")).toBe(false);
    // ...and the same message intact.
    expect(
      legalTurn.test(
        "The thief just left, still carrying his large bag. You may not have noticed that he robbed you blind first.",
      ),
    ).toBe(true);
  });

  it("accepts the lines the reference build actually printed", () => {
    /*
     * The positive control, and the only hand-written text in this file. These
     * four lines were captured from `dfrotz -w 80 -s 1234` running this exact
     * scenario against `verification/build/zork1.z3` — the shipped story file,
     * which is ground truth where it and the ZIL disagree.
     *
     * They are here because the derived set is only as good as the derivation:
     * a change that quietly stopped resolving `THIEF-MELEE`, or that tightened
     * a wildcard, would still satisfy every membership check below (fewer legal
     * messages never makes a *passing* line fail) while covering less of the
     * game. Real reference output is what makes that narrowing visible.
     */
    const reference = [
      'A seedy-looking individual with a large bag just wandered through the room. On the way through, he quietly abstracted some valuables from your possession, mumbling something about "Doing unto others before..."',
      "Finishing you off, the thief inserts his blade into your heart.",
      "Someone carrying a large bag is casually leaning against one of the walls here. He does not speak, but it is clear from his aspect that the bag will be taken only over his dead body.",
      "The thief slowly approaches, strikes like a snake, and leaves you wounded.",
    ];
    for (const line of reference) {
      expect(legalTurn.test(line), `the reference printed this, we reject it: ${line}`).toBe(true);
    }
  });

  it("only ever prints messages the game could have produced", () => {
    for (let seed = 1; seed <= SEEDS; seed++) {
      for (const line of vigil(seed).lines) {
        expect(legalTurn.test(line), `seed ${seed} printed an illegal line: ${line}`).toBe(true);
      }
    }
  });

  it("robs the player", () => {
    /*
     * The assertion this file exists for. A thief who wanders but never calls
     * `ROB` satisfies every membership check above — he simply prints the
     * "finding nothing of value" line forever — which is precisely how an
     * unverified robbery pass would have looked green.
     *
     * Asserted on the *world*, not the text: the painting has to end up in the
     * thief's possession. A message claiming a robbery that did not move the
     * object is the failure worth catching.
     */
    const visits = Array.from({ length: SEEDS }, (_, i) => vigil(i + 1));
    expect(visits.filter((v) => v.robbed).length, "the thief never robbed anyone").toBeGreaterThan(
      0,
    );
  });

  it("shows himself, and can be fought", () => {
    /*
     * `THIEF-VS-ADVENTURER` decides between passing through unseen and standing
     * his ground; a branch stuck on one side is invisible to a text check that
     * only ever sees legal lines. Both sides have to happen.
     */
    const visits = Array.from({ length: SEEDS }, (_, i) => vigil(i + 1));
    expect(visits.filter((v) => v.seen).length, "the thief never appeared").toBeGreaterThan(0);
    const melee = messageRows("THIEF-MELEE").length;
    expect(melee, "the thief has no melee text to draw from").toBeGreaterThan(0);
  });

  it("wanders the dungeon rather than sitting still", () => {
    /*
     * The wander is what puts him in reach of the robbery at all. Pinned in his
     * starting room he would never rob anything, and the two checks above would
     * be the only thing standing between that and a green suite.
     */
    const engine = createEngine(doc, { seed: 1 });
    for (const command of APPROACH) engine.command(command);
    const rooms = new Set<string>();
    for (let turn = 0; turn < 40; turn++) {
      engine.command("wait");
      const where = engine.snapshot().locations["THIEF"];
      if (typeof where === "string") rooms.add(where);
    }
    expect(rooms.size, "the thief never moved").toBeGreaterThan(5);
    // He belongs underground: the wander must not walk him into the daylight.
    expect(rooms.has("WEST-OF-HOUSE")).toBe(false);
    expect(rooms.has("FOREST-1")).toBe(false);
  });
});
