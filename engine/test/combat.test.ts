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

/** Melee tables whose rows HERO-BLOW and VILLAIN-BLOW draw from. */
const MELEE_TABLES = ["HERO-MELEE", "TROLL-MELEE", "THIEF-MELEE", "CYCLOPS-MELEE"];

/** Routines whose literal TELL text can appear in a fight turn. */
const COMBAT_ROUTINES = [
  "HERO-BLOW",
  "VILLAIN-BLOW",
  "VILLAIN-RESULT",
  "WINNER-RESULT",
  "VILLAIN-STRENGTH",
];

const tables = new Map(doc.tables?.map((t) => [t.id, t]) ?? []);

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
];

/**
 * One turn's output is legal when it is a concatenation of legal messages —
 * the engine prints several per turn (your blow, then the villain's). Built as
 * a single alternation so the regex engine does the backtracking.
 */
const legalTurn = new RegExp(`^(?:\\s*(?:${legalPatterns.join("|")}))+\\s*$`);

/** Walk to the Troll Room, armed and carrying light. */
const APPROACH = [
  "north", "east", "open window", "enter house", "west",
  "take lamp", "take sword", "move rug", "open trap door",
  "turn on lamp", "down", "north",
];

function fight(seed: number): string[] {
  const engine = createEngine(doc, { seed });
  for (const command of APPROACH) engine.command(command);

  const turns: string[] = [];
  for (let i = 0; i < 12; i++) {
    const text = normalize(transcriptText(engine.command("kill troll with sword").events));
    // Once the troll is gone the turn is a parser refusal, not combat.
    if (/can't see any troll/.test(text)) break;
    turns.push(text);
    if (/carcass has disappeared/.test(text)) break;
  }
  return turns;
}

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

  it("reaches a decided fight from every seed", () => {
    for (let seed = 1; seed <= 40; seed++) {
      const turns = fight(seed);
      expect(turns.length, `seed ${seed} produced no combat`).toBeGreaterThan(0);
    }
  });

  it("only ever prints messages the game could have produced", () => {
    for (let seed = 1; seed <= 40; seed++) {
      for (const turn of fight(seed)) {
        for (const line of turn.split("\n")) {
          expect(legalTurn.test(line), `seed ${seed} printed an illegal line: ${line}`).toBe(true);
        }
      }
    }
  });

  it("kills the troll under at least some seeds", () => {
    // Membership alone would be satisfied by an engine that misses forever;
    // the outcome has to be reachable for the dam walkthrough to get past the
    // Troll Room at all.
    const kills = Array.from({ length: 40 }, (_, i) => fight(i + 1)).filter((turns) =>
      turns.some((t) => /carcass has disappeared/.test(t)),
    );
    expect(kills.length).toBeGreaterThan(0);
  });
});
