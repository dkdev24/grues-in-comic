/**
 * Combat verification — the "one-of set" method for randomized turns.
 *
 * Combat text is chosen by `<RANDOM …>`, and the engine's generator is not the
 * Z-machine's, so a fight cannot be diffed against a golden text-for-text the
 * way the deterministic corpus is. Reproducing dfrotz's PRNG would buy that
 * parity at the cost of pinning the engine's determinism contract to one
 * interpreter's implementation choice, which ADR 0002 does not want.
 *
 * So randomized turns are verified by *membership* instead: whatever the draw
 * lands on, every line the engine prints during a fight must be a message the
 * game could actually have produced. That catches the failures that matter
 * here — reading the wrong melee row, indexing a result table off by one,
 * rendering a marker as a bare number, emitting a table id instead of prose —
 * without asserting which of the legal messages came out.
 *
 * The legal set is **derived from the IR, never hand-listed**. A hand-kept list
 * would drift from the game and quietly start passing by construction, which is
 * the failure mode `harness/golden.ts` warns about at length. Two sources:
 *
 *   - the melee message tables (HERO-MELEE and the per-villain tables), whose
 *     rows are string chunks interleaved with the F-WEP/F-DEF markers; and
 *   - the literal TELL text of the combat routines themselves, which is where
 *     the *fixed* lines live ("You are still recovering from that last blow…",
 *     the carcass description, and so on).
 *
 * Entity names are wildcards: the markers stand for a weapon and a defender
 * whose names depend on what the player is carrying.
 */

import { describe, expect, it } from "vitest";
import { createEngine } from "../src/engine.js";
import { transcriptText } from "../src/events.js";
import { normalize } from "../harness/golden.js";
import {
  doc,
  legalTurnMatcher,
  messageRows,
  objects,
  tables,
  tellPatterns,
} from "./membership.js";

/**
 * The villains, read out of the `VILLAINS` table rather than named here.
 *
 * Each row is `[villain, best-weapon, advantage, prob, melee-table]`, so the
 * table yields both who can fight and which message table they draw from —
 * and a villain added to the game joins these checks without editing the test.
 */
const villains = (tables.get("VILLAINS")?.elements ?? []).flatMap((row) => {
  if (typeof row !== "object" || row === null || !("table" in row)) return [];
  const fields = tables.get(row.table)?.elements ?? [];
  const who = fields[0];
  const melee = fields[4];
  return [
    {
      id: typeof who === "object" && who !== null && "ref" in who ? who.ref : undefined,
      melee: typeof melee === "object" && melee !== null && "table" in melee ? melee.table : undefined,
    },
  ];
});

/** Melee tables HERO-BLOW and VILLAIN-BLOW draw from. */
const MELEE_TABLES = [
  "HERO-MELEE",
  ...villains.map((v) => v.melee).filter((t): t is string => t !== undefined),
];

/**
 * Routines whose literal TELL text can appear in a fight turn: the melee
 * machinery, plus each villain's own action routine — combat calls those with
 * F-BUSY?/F-DEAD/F-UNCONSCIOUS, and they answer in prose ("The troll, angered
 * and humiliated, recovers his weapon.").
 */
const COMBAT_ROUTINES = [
  /*
   * The sword daemon is not combat machinery, but its output lands in combat
   * turns and always has: killing the last villain in the room is exactly what
   * makes the glow change, so "Your sword is no longer glowing." follows the
   * troll's death message on the same turn. It was invisible here only while
   * I-SWORD sat in the complex-routine catalog (ADR 0003).
   */
  "I-SWORD",
  "HERO-BLOW",
  "VILLAIN-BLOW",
  "VILLAIN-RESULT",
  "WINNER-RESULT",
  "VILLAIN-STRENGTH",
  ...villains
    .map((v) => (v.id === undefined ? undefined : objects.get(v.id)?.action))
    .filter((r): r is string => r !== undefined),
];

/** The legal-turn matcher for melee text: message tables plus combat prose. */
const legalTurn = legalTurnMatcher(MELEE_TABLES, COMBAT_ROUTINES);

/** Seeds sampled per assertion — enough that both outcomes appear reliably. */
const SEEDS = 40;

/** Walk to the Troll Room, armed and carrying light. */
const APPROACH = [
  "north", "east", "open window", "enter house", "west",
  "take lamp", "take sword", "move rug", "open trap door",
  "turn on lamp", "down", "north",
];

/**
 * How a fight ended, and the pure-combat turns along the way.
 *
 * The `died`/`killed`/`struck` fields are read out of the *text*; the fields
 * below them are read out of the *world*. Keeping both is the point: membership
 * proves the engine printed a line the game owns, and nothing more. A fight that
 * narrates a death without removing the troll, or announces a blow that costs no
 * strength, satisfies every text check in this file — so the two have to be
 * captured separately and then asserted to agree.
 */
interface Fight {
  /** Turns of melee text only — the death turn is excluded (see below). */
  turns: string[];
  /** The player was killed (`JIGS-UP`, then resurrection). */
  died: boolean;
  /** The troll was killed. */
  killed: boolean;
  /** The villain landed at least one blow of its own. */
  struck: boolean;

  /** The troll is gone from the world — `locations.TROLL` no longer resolves. */
  trollRemoved: boolean;
  /** Lowest `ADVENTURER.strength` seen: negative means the player took wounds. */
  playerStrength: number;
  /** Lowest `TROLL.strength` seen: negative is the unconscious state. */
  trollStrength: number;
  /** `DEATHS`, `HERE` and `SCORE` once the fight is over. */
  deaths: number;
  here: string;
  score: number;
  /**
   * `SCORE` as of the *previous* turn, so the death penalty can be checked
   * wherever the death happened — including on the way in, where the troll's
   * free swing kills some seeds before a blow is ever struck.
   */
  scorePrev: number;
}

function fight(seed: number): Fight {
  const engine = createEngine(doc, { seed });
  const result: Fight = {
    turns: [],
    died: false,
    killed: false,
    struck: false,
    trollRemoved: false,
    playerStrength: 0,
    trollStrength: 0,
    deaths: 0,
    here: "",
    score: 0,
    scorePrev: 0,
  };

  /** Fold the current world into the result: strengths are watched for minima. */
  const observe = (): void => {
    const state = engine.snapshot();
    const player = state.properties["ADVENTURER"]?.["strength"];
    const troll = state.properties["TROLL"]?.["strength"];
    if (typeof player === "number") result.playerStrength = Math.min(result.playerStrength, player);
    if (typeof troll === "number") result.trollStrength = Math.min(result.trollStrength, troll);
    result.trollRemoved = state.locations["TROLL"] === undefined;
    result.deaths = Number(state.globals["DEATHS"] ?? 0);
    result.here = String(state.globals["HERE"] ?? "");
    // Carry the old reading forward before overwriting it: the death penalty is
    // a *delta*, and the turn that charges it is the turn that prints the death.
    result.scorePrev = result.score;
    result.score = Number(state.globals["SCORE"] ?? 0);
  };

  /*
   * The approach is itself dangerous: `I-FIGHT` gives the troll a free swing
   * the moment the player walks in, so some seeds are decided before a single
   * "kill troll" is typed. Watching the approach for that is why this loop
   * cannot simply assume it arrives.
   */
  for (const command of APPROACH) {
    const text = normalize(transcriptText(engine.command(command).events));
    observe();
    /*
     * The villain's blows and the running score are read here too, not only in
     * the fight loop below. A death on the way in is still a death the world
     * has to account for, and a free swing that wounds the player is still a
     * blow — reading them only after the first "kill troll" made the world and
     * the text disagree on exactly the seeds decided during the approach.
     */
    if (VILLAIN_BLOW.test(text)) result.struck = true;
    if (/You have died/.test(text)) {
      result.died = true;
      return result;
    }
  }

  // Disarm-and-recover exchanges can run for a while before either side lands
  // a decisive blow, so the cap is generous enough not to cut a live fight off.
  for (let i = 0; i < 40; i++) {
    const text = normalize(transcriptText(engine.command("kill troll with sword").events));
    // Once the troll is gone the turn is a parser refusal, not combat.
    if (/can't see any troll/.test(text)) break;
    /*
     * A LOSE-WEAPON result knocks the sword out of the player's hands, so the
     * next "kill troll with sword" is refused for want of a weapon. Pick it
     * back up, as a player would, rather than counting the fight as over —
     * being disarmed is a combat result, not a conclusion.
     */
    if (/don't have that/.test(text)) {
      /*
       * Retrieving the sword costs a turn, and the villain gets to swing
       * during it — the troll can and does kill an unarmed player here. That
       * turn's output has to be read for the same outcomes as any other, or a
       * death lands in a turn nobody inspected and the fight looks undecided.
       */
      const recovery = normalize(transcriptText(engine.command("take sword").events));
      observe();
      if (VILLAIN_BLOW.test(recovery)) result.struck = true;
      if (/You have died/.test(recovery)) {
        result.died = true;
        break;
      }
      continue;
    }
    observe();
    if (VILLAIN_BLOW.test(text)) result.struck = true;
    /*
     * The death turn is not pure melee — `JIGS-UP` prints its banner and
     * resurrection follows with a room description — so it is recorded but not
     * offered to the membership check, which only claims to cover melee text.
     */
    if (/You have died/.test(text)) {
      result.died = true;
      break;
    }
    result.turns.push(text);
    if (/carcass has disappeared/.test(text)) {
      result.killed = true;
      break;
    }
  }
  /*
   * No observation here: every path above already observed the turn it acted
   * on, and a second reading with no command in between would overwrite
   * `scorePrev` with the post-death score and destroy the delta.
   */
  return result;
}

/**
 * A line that can only have come from the villain's side of the fight.
 *
 * Drawn from TROLL-MELEE rather than guessed: these are the phrasings that
 * name the axe or the troll as the *attacker*, so matching one proves
 * `VILLAIN-BLOW` ran rather than `HERO-BLOW`.
 */
const VILLAIN_BLOW = /(the troll's|the axe|troll (swings|strikes|charges|attacks|delivers|swings))/i;

describe("combat — randomized turns verified by membership", () => {
  it("derives its legal message set from the IR", () => {
    /*
     * Guards the derivation itself: if the melee tables stopped resolving, the
     * set would collapse and every membership assertion below would pass
     * vacuously against an empty alternation.
     *
     * Exact counts rather than lower bounds, so a table that silently loses
     * rows is a failure here instead of a quietly weaker check elsewhere.
     * HERO-MELEE holds seven rows of phrasings, one per blow result from
     * MISSED to LOSE-WEAPON; HESITATE and SITTING-DUCK have no hero phrasing.
     */
    expect(messageRows("HERO-MELEE")).toHaveLength(29);
    expect(messageRows("TROLL-MELEE").length).toBeGreaterThan(0);
    expect(tellPatterns("HERO-BLOW").length).toBeGreaterThan(0);
  });

  it("rejects text the game could not have produced", () => {
    /*
     * The negative control. A membership check built from a wildcard-bearing
     * alternation can easily become unfalsifiable — `NAME` matching too
     * greedily would let it accept anything, and the suite would look green
     * while verifying nothing. These are the actual failure modes the check
     * exists to catch.
     */
    expect(legalTurn.test("You are likely to be eaten by a grue.")).toBe(false);
    // A marker rendered as its raw number instead of a name.
    expect(legalTurn.test("Your 0 misses the 1 by an inch.")).toBe(false);
    // A table id leaking into prose.
    expect(legalTurn.test("HERO-MELEE#0#0")).toBe(false);
    // A real message with the tail corrupted.
    expect(legalTurn.test("A good slash, but it misses the troll by a")).toBe(false);
    // ...and the same message intact, so the control cuts both ways.
    expect(legalTurn.test("A good slash, but it misses the troll by a mile.")).toBe(true);
  });

  it("accepts the lines the reference build actually printed", () => {
    /*
     * The positive control, and the only hand-written text in this file. Every
     * line was captured from `dfrotz -w 200 -s <seed>` fighting the troll in
     * `verification/build/zork1.z3` — the shipped story file, which is ground
     * truth where it and the ZIL disagree (stage 0.2).
     *
     * It is here because membership is *one-sided*. A narrower legal set never
     * makes a passing line fail: if the derivation quietly stopped resolving
     * TROLL-MELEE, or a wildcard tightened, every assertion below would still
     * pass while covering less of the game. Only real reference output makes
     * that kind of narrowing visible.
     *
     * The set deliberately spans all three sources — HERO-MELEE rows, the
     * villain's TROLL-MELEE rows, and routine TELL text (including I-SWORD's
     * glow, which prints on the turn the last villain dies) — so a regression
     * in any one of them fails here.
     */
    const reference = [
      // HERO-MELEE: the player's side of the exchange.
      "Your sword misses the troll by an inch.",
      "The fatal blow strikes the troll square in the heart: He dies.",
      "The force of your blow knocks the troll back, stunned.",
      "The haft of your sword knocks out the troll.",
      "The troll is disarmed by a subtle feint past his guard.",
      "A furious exchange, and the troll is knocked out!",
      // TROLL-MELEE: the villain's side.
      "The axe sweeps past as you jump aside.",
      "The troll's axe barely misses your ear.",
      "The troll's mighty blow drops you to your knees.",
      "The troll's swing almost knocks you over as you barely parry in time.",
      "The troll swings his axe, but it misses.",
      "You charge, but the troll jumps nimbly aside.",
      "You stagger back under a hail of axe strokes.",
      // Routine TELL text: the fixed lines around the draws.
      "You are still recovering from that last blow, so your attack is ineffective.",
      "The unarmed troll cannot defend himself: He dies.",
      "The unconscious troll cannot defend himself: He dies.",
      "The troll slowly regains his feet.",
      "The troll stirs, quickly resuming a fighting stance.",
      "The troll, angered and humiliated, recovers his weapon. He appears to have an axe to grind with you.",
      "The troll, disarmed, cowers in terror, pleading for his life in the guttural tongue of the trolls.",
      "Almost as soon as the troll breathes his last breath, a cloud of sinister black fog envelops him, and when the fog lifts, the carcass has disappeared.",
      // I-SWORD, which speaks on combat turns.
      "Your sword has begun to glow very brightly.",
      "Your sword is glowing with a faint blue glow.",
      "Your sword is no longer glowing.",
    ];
    for (const line of reference) {
      expect(legalTurn.test(line), `the reference printed this, we reject it: ${line}`).toBe(true);
    }
  });

  it("changes the world to match what the text claimed", () => {
    /*
     * The assertion membership cannot make. Every check above reads printed
     * text, and text is cheap: a fight that narrates the troll's death without
     * removing him from the world, or announces the axe landing without costing
     * the player any strength, passes all of them. `thief.test.ts` learned this
     * the same way — a thief who wanders and never steals prints legal lines
     * forever.
     *
     * So the two records are gathered separately in `fight()` and reconciled
     * here. Text and world have to tell the same story.
     */
    for (let seed = 1; seed <= SEEDS; seed++) {
      const f = fight(seed);

      if (f.killed) {
        // "the carcass has disappeared" is literal: TROLL leaves the world.
        expect(f.trollRemoved, `seed ${seed} narrated a kill but the troll is still here`).toBe(
          true,
        );
      }

      if (f.died) {
        /*
         * `JIGS-UP` resurrects to the forest and charges 10 points. The score
         * check is what distinguishes a real death from a banner printed by a
         * routine that forgot to run the rest of the pass.
         */
        expect(f.deaths, `seed ${seed} narrated a death that was not recorded`).toBe(1);
        expect(f.here, `seed ${seed} died without being resurrected above ground`).toBe("FOREST-1");
        expect(f.score, `seed ${seed} died without paying the penalty`).toBe(f.scorePrev - 10);
      }

      // Nobody is both dead and victorious.
      expect(f.died && f.killed, `seed ${seed} both died and won`).toBe(false);
    }
  });

  it("tracks combat in the world, not only in the prose", () => {
    /*
     * The strengths are the fight's actual state machine — `ADVENTURER.strength`
     * counts the player's wounds, `TROLL.strength` goes negative when he is
     * knocked unconscious and the description swaps to the sprawled variant.
     * A fight that never moved either number is not a fight, however good the
     * text looked, and that is precisely the v0.7.0 failure this suite exists
     * to prevent recurring: the villain's half of combat was unextracted and
     * the player could not be hurt at all.
     */
    const fights = Array.from({ length: SEEDS }, (_, i) => fight(i + 1));

    expect(
      fights.filter((f) => f.playerStrength < 0).length,
      "the player was never wounded in any fight",
    ).toBeGreaterThan(0);
    expect(
      fights.filter((f) => f.trollStrength < 0).length,
      "the troll was never knocked unconscious in any fight",
    ).toBeGreaterThan(0);
    expect(
      fights.filter((f) => f.trollRemoved).length,
      "the troll was never removed from the world",
    ).toBeGreaterThan(0);

    /*
     * Text and world agree on the villain's blows. `struck` is a regex over
     * TROLL-MELEE phrasings and `playerStrength` is the wound counter; a seed
     * that lost strength without a single villain line, or printed villain
     * lines that cost nothing, means one of the two is lying.
     */
    for (const [i, f] of fights.entries()) {
      if (f.playerStrength < 0) {
        expect(f.struck, `seed ${i + 1} wounded the player with no villain blow printed`).toBe(true);
      }
    }
  });

  it("only ever prints messages the game could have produced", () => {
    for (let seed = 1; seed <= SEEDS; seed++) {
      for (const turn of fight(seed).turns) {
        for (const line of turn.split("\n")) {
          expect(legalTurn.test(line), `seed ${seed} printed an illegal line: ${line}`).toBe(true);
        }
      }
    }
  });

  it("decides every fight, either way", () => {
    for (let seed = 1; seed <= SEEDS; seed++) {
      const { died, killed } = fight(seed);
      expect(died || killed, `seed ${seed} left the fight undecided`).toBe(true);
    }
  });

  it("lets the villain strike back, and kill", () => {
    /*
     * The assertion v0.7.0 was missing. Its tests checked that the troll dies
     * and that the printed messages are legal — both of which a *one-sided*
     * fight satisfies, which is exactly what shipped: `VILLAIN-BLOW` and
     * `WINNER-RESULT` were unextracted, so the player could not be hurt at all.
     * Nothing here passes unless the villain's half of combat runs.
     */
    const fights = Array.from({ length: SEEDS }, (_, i) => fight(i + 1));
    expect(fights.filter((f) => f.struck).length, "villain never landed a blow").toBeGreaterThan(0);
    expect(fights.filter((f) => f.died).length, "player never died").toBeGreaterThan(0);
    expect(fights.filter((f) => f.killed).length, "troll never died").toBeGreaterThan(0);
  });
});
