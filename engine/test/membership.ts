/**
 * Membership verification — deriving the set of messages the game could print.
 *
 * Randomized turns cannot be diffed against a golden text-for-text: the draw
 * chooses the wording, and the engine's generator is not the Z-machine's.
 * `combat.test.ts` sets out the reasoning at length; this module is the shared
 * machinery both it and `thief.test.ts` build their checks from.
 *
 * The rule that makes the method worth anything: **the legal set is derived
 * from the IR, never hand-listed.** A hand-kept list drifts from the game and
 * starts passing by construction, which is the failure `harness/golden.ts`
 * warns about. Everything here reads the world document.
 *
 * Two sources of legal text:
 *
 *   - message tables (HERO-MELEE, THIEF-MELEE, …), whose rows are string chunks
 *     interleaved with the F-WEP/F-DEF markers; and
 *   - the literal TELL text of the routines that run during the turn, which is
 *     where the fixed lines live.
 *
 * Entity names are wildcards: the markers stand for a weapon and a defender
 * whose names depend on what the player is carrying.
 */

import { readFileSync } from "node:fs";
import type { WorldDocument } from "@grues-in-comic/ir";

export const doc = JSON.parse(
  readFileSync(new URL("../../ir/artifacts/zork1.world.json", import.meta.url), "utf8"),
) as WorldDocument;

export const tables = new Map(doc.tables?.map((t) => [t.id, t]) ?? []);
export const objects = new Map(doc.objects?.map((o) => [o.id, o]) ?? []);

/**
 * A name standing in for F-WEP / F-DEF, or for a TELL `D`/`N` part.
 *
 * Must *begin with a letter*: an unanchored wildcard also matches a bare `0`,
 * which would make the check accept a marker printed as its raw number — the
 * exact rendering bug it is here to catch (see the negative controls).
 */
export const NAME = "[A-Za-z][^.!?]*?";

export function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Collect every leaf message row reachable from a message table.
 *
 * The tables nest: HERO-MELEE is indexed by blow result, each entry is an
 * ltable of interchangeable phrasings, and each of those is the message itself
 * — string chunks with `0`/`1` (F-WEP/F-DEF) where a name is printed.
 */
export function messageRows(id: string, seen = new Set<string>()): (string | number)[][] {
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
export function rowPattern(row: (string | number)[]): string {
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

export function discriminating(pattern: string): boolean {
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
 * inside COND clauses, and every one of those is text a turn can print.
 */
export function tellPatterns(routineId: string): string[] {
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

/**
 * Every string element of a table, each as a pattern of its own.
 *
 * For tables that are not message rows but *interleaved* data — `LAMP-TABLE` is
 * `[100, "The lamp appears a bit dimmer.", 70, …]`, a countdown paired with the
 * warning it prints — the strings are separate messages, never printed
 * together. {@link messageRows} would splice the whole table into one pattern
 * with wildcards where the numbers are, which matches nothing the game prints.
 */
export function stringLiterals(id: string): string[] {
  return (tables.get(id)?.elements ?? [])
    .filter((el): el is string => typeof el === "string")
    .map(escape);
}

/**
 * The legal-turn matcher for a set of message tables and routines.
 *
 * One turn's output is legal when it is a concatenation of legal messages — a
 * turn prints several (your blow, then the villain's; or the wait, then what a
 * daemon did during it). Built as a single alternation so the regex engine does
 * the backtracking.
 */
export function legalTurnMatcher(
  tableIds: string[],
  routineIds: string[],
  literalTableIds: string[] = [],
): RegExp {
  const patterns = [
    ...tableIds.flatMap((id) => messageRows(id).map(rowPattern)),
    ...literalTableIds.flatMap(stringLiterals),
    ...routineIds.flatMap(tellPatterns),
  ].filter(discriminating);
  return new RegExp(`^(?:\\s*(?:${patterns.join("|")}))+\\s*$`);
}
