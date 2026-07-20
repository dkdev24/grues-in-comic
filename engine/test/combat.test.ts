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

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { WorldDocument } from "@grues-in-comic/ir";
import { createEngine } from "../src/engine.js";
import { transcriptText } from "../src/events.js";
import { normalize } from "../harness/golden.js";

const doc = JSON.parse(
  readFileSync(new URL("../../ir/artifacts/zork1.world.json", import.meta.url), "utf8"),
) as WorldDocument;

const tables = new Map(doc.tables?.map((t) => [t.id, t]) ?? []);
const objects = new Map(doc.objects?.map((o) => [o.id, o]) ?? []);

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
  "HERO-BLOW",
  "VILLAIN-BLOW",
  "VILLAIN-RESULT",
  "WINNER-RESULT",
  "VILLAIN-STRENGTH",
  ...villains
    .map((v) => (v.id === undefined ? undefined : objects.get(v.id)?.action))
    .filter((r): r is string => r !== undefined),
];

/**
 * A name standing in for F-WEP / F-DEF, or for a TELL `D`/`N` part.
 *
 * Must *begin with a letter*: an unanchored wildcard also matches a bare `0`,
 * which would make the check accept a marker printed as its raw number — the
 * exact rendering bug it is here to catch (see the negative control below).
 */
const NAME = "[A-Za-z][^.!?]*?";

function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Collect every leaf message row reachable from a melee table.
 *
 * The tables nest: HERO-MELEE is indexed by blow result, each entry is an
 * ltable of interchangeable phrasings, and each of those is the message itself
 * — string chunks with `0`/`1` (F-WEP/F-DEF) where a name is printed.
 */
function messageRows(id: string, seen = new Set<string>()): (string | number)[][] {
  if (seen.has(id)) return [];
  seen.add(id);
  const table = tables.get(id);
  if (table === undefined) return [];

  const rows: (string | number)[][] = [];
  const nested = table.elements.filter(
    (el): el is { table: string; offset: number } =>
      typeof el === "object" && el !== null && "table" in el,
  );
  // A row of chunks is a leaf: it holds strings, not further table pointers.
  if (nested.length === 0) {
    const chunks = table.elements.filter(
      (el): el is string | number => typeof el === "string" || typeof el === "number",
    );
    if (chunks.some((c) => typeof c === "string")) rows.push(chunks);
    return rows;
  }
  for (const child of nested) rows.push(...messageRows(child.table, seen));
  return rows;
}

/** Render a message row as a pattern, markers becoming name wildcards. */
function rowPattern(row: (string | number)[]): string {
  return row.map((chunk) => (typeof chunk === "string" ? escape(chunk) : NAME)).join("");
}

/**
 * Literal characters a message contributes, ignoring name wildcards.
 *
 * Patterns below {@link MIN_LITERAL} of these are dropped from the legal set,
 * for two reasons that turned out to be the same reason. A message that is
 * mostly wildcard — `<TELL D .OBJ "." CR>` and friends, which the villain
 * action routines are full of — discriminates nothing: it will happily accept
 * "You are likely to be eaten by a grue.", and the negative control catches it
 * doing so. It is also what makes the combined alternation backtrack
 * catastrophically, because each near-empty branch can match anywhere.
 *
 * Dropping them costs nothing real: a message with no fixed words of its own
 * could never have proved which message it was.
 */
const MIN_LITERAL = 12;

function literalLength(pattern: string): number {
  return pattern.split(NAME).join("").replace(/\\(.)/g, "$1").length;
}

function discriminating(pattern: string): boolean {
  /*
   * Only *wildcard-bearing* patterns need to earn their place. A pattern with
   * no wildcard is fixed text and discriminates perfectly however short it is
   * — and short ones are load-bearing, because ZIL assembles a sentence from
   * several TELLs: HERO-BLOW prints "The ", then "unconscious" or "unarmed",
   * then " ... cannot defend himself: He dies." Judging those by length alone
   * dropped the fragments and made the finished line unmatchable.
   */
  if (!pattern.includes(NAME)) return true;
  return literalLength(pattern) >= MIN_LITERAL;
}

/**
 * Literal TELL text in a routine body, as patterns.
 *
 * Walks the routine's IR generically rather than matching statement shapes: a
 * `tell` can sit in statement or expression position, nested arbitrarily deep
 * inside COND clauses, and every one of those is text a fight turn can print.
 */
function tellPatterns(routineId: string): string[] {
  const routine = doc.routines?.find((r) => r.id === routineId);
  if (routine === undefined) return [];

  const patterns: string[] = [];
  const visit = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const child of node) visit(child);
      return;
    }
    if (typeof node !== "object" || node === null) return;
    const record = node as Record<string, unknown>;
    if (record["op"] === "tell" && Array.isArray(record["parts"])) {
      // A TELL's parts form one message; CR splits it into printed lines.
      const pieces = record["parts"] as Record<string, unknown>[];
      let current = "";
      for (const part of pieces) {
        if ("text" in part) current += escape(part["text"] as string);
        else if ("newline" in part) {
          if (current.trim().length > 0) patterns.push(current);
          current = "";
        } else current += NAME;
      }
      if (current.trim().length > 0) patterns.push(current);
    }
    for (const value of Object.values(record)) visit(value);
  };
  visit(routine.body);
  return patterns;
}

const legalPatterns = [
  ...MELEE_TABLES.flatMap((id) => messageRows(id).map(rowPattern)),
  ...COMBAT_ROUTINES.flatMap(tellPatterns),
].filter(discriminating);

/**
 * One turn's output is legal when it is a concatenation of legal messages —
 * the engine prints several per turn (your blow, then the villain's). Built as
 * a single alternation so the regex engine does the backtracking.
 */
const legalTurn = new RegExp(`^(?:\\s*(?:${legalPatterns.join("|")}))+\\s*$`);

/** Seeds sampled per assertion — enough that both outcomes appear reliably. */
const SEEDS = 40;

/** Walk to the Troll Room, armed and carrying light. */
const APPROACH = [
  "north", "east", "open window", "enter house", "west",
  "take lamp", "take sword", "move rug", "open trap door",
  "turn on lamp", "down", "north",
];

/** How a fight ended, and the pure-combat turns along the way. */
interface Fight {
  /** Turns of melee text only — the death turn is excluded (see below). */
  turns: string[];
  /** The player was killed (`JIGS-UP`, then resurrection). */
  died: boolean;
  /** The troll was killed. */
  killed: boolean;
  /** The villain landed at least one blow of its own. */
  struck: boolean;
}

function fight(seed: number): Fight {
  const engine = createEngine(doc, { seed });
  const result: Fight = { turns: [], died: false, killed: false, struck: false };

  /*
   * The approach is itself dangerous: `I-FIGHT` gives the troll a free swing
   * the moment the player walks in, so some seeds are decided before a single
   * "kill troll" is typed. Watching the approach for that is why this loop
   * cannot simply assume it arrives.
   */
  for (const command of APPROACH) {
    if (/You have died/.test(transcriptText(engine.command(command).events))) {
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
      if (VILLAIN_BLOW.test(recovery)) result.struck = true;
      if (/You have died/.test(recovery)) {
        result.died = true;
        break;
      }
      continue;
    }
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
