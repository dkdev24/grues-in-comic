/**
 * ADR 0003 — the exit-scan rewrite.
 *
 * ZIL walks a room's exits as numbered Z-machine properties (`NEXTP`, then
 * `GETPT`/`PTSIZE`/`GETB` to read the destination out of the property's
 * bytes). The IR models exits structurally, so there is nothing to translate
 * that into: the extractor instead recognizes the idiom and rewrites it onto
 * the room's derived `adjacent` list.
 *
 * That makes this the one rewrite in an extractor that is otherwise a
 * mechanical image of its input, so the tests here are as much about the
 * *limits* of the match as about the match itself. The safety property is
 * fail-closed: a shape that is not exactly the idiom must fall back to the
 * ordinary path and catalog the routine, never produce a loop that looks
 * plausible and iterates the wrong thing.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { extractWorld, type AstProgram } from "../src/extract-world.js";

const here = fileURLToPath(new URL(".", import.meta.url));
const astDir = join(here, "..", "..", "importer", "artifacts", "ast");

const programs: AstProgram[] = readdirSync(astDir)
  .filter((f) => f.endsWith(".json"))
  .sort()
  .map((f) => JSON.parse(readFileSync(join(astDir, f), "utf8")) as AstProgram);

const { world, catalog } = extractWorld(programs);
const routineById = new Map((world.routines ?? []).map((r) => [r.id, r]));
const roomById = new Map(world.rooms.map((r) => [r.id, r]));

/**
 * Re-extract with one atom renamed inside the I-SWORD form — a single-token
 * perturbation of the idiom, which is the cheapest way to ask "does the
 * matcher actually check this?" without hand-building an AST.
 */
function extractWithPerturbedScan(atom: string, replacement: string): string[] {
  const clone = JSON.parse(JSON.stringify(programs)) as AstProgram[];
  let renamed = 0;
  const walk = (node: unknown, inSword: boolean): void => {
    if (Array.isArray(node)) return node.forEach((n) => walk(n, inSword));
    if (typeof node !== "object" || node === null) return;
    const n = node as Record<string, unknown>;
    // The routine's own name marks the subtree; ZIL puts it right after ROUTINE.
    const mine = inSword || JSON.stringify(n["elements"] ?? "").includes('"I-SWORD"');
    if (mine && n["type"] === "Atom" && n["name"] === atom) {
      n["name"] = replacement;
      renamed++;
    }
    for (const key of Object.keys(n)) walk(n[key], mine);
  };
  walk(clone, false);
  // Guard the guard: a perturbation that changed nothing would make the
  // fallback assertions below pass for the wrong reason.
  expect(renamed, `expected to rename ${atom}`).toBeGreaterThan(0);
  const result = extractWorld(clone);
  return result.catalog.filter((e) => e.id === "I-SWORD").flatMap((e) => e.reasons);
}

describe("the derived adjacency list", () => {
  it("keeps exits that declare a destination, in exit order", () => {
    // Four exits, three destinations: `down` and `north` both lead to the
    // chasm, and the duplicate collapses.
    expect(roomById.get("EW-PASSAGE")?.adjacent).toEqual([
      "ROUND-ROOM",
      "TROLL-ROOM",
      "CHASM-ROOM",
    ]);
  });

  it("excludes blocked exits, which have no destination at all", () => {
    // CHASM-ROOM's `down` is a NEXIT — a refusal message. The ZIL scan skips
    // it because its property is not UEXIT/CEXIT/DEXIT sized.
    const chasm = roomById.get("CHASM-ROOM")!;
    expect(chasm.exits.some((e) => e.kind === "blocked")).toBe(true);
    expect(chasm.adjacent).toEqual(["RESERVOIR-SOUTH", "EW-PASSAGE", "NS-PASSAGE"]);
  });

  it("includes conditional and door exits regardless of their state", () => {
    /*
     * The distinction the field name invites getting wrong. A CEXIT whose
     * global is false and a DEXIT whose door is shut are both *declared*
     * destinations, and the ZIL counts them: it tests the property's shape,
     * never whether the player could walk through. An implementation that
     * filtered to currently-reachable rooms would make the sword stop
     * glowing next to a villain behind a closed door.
     */
    const withDoor = world.rooms.filter((r) => r.exits.some((e) => e.kind === "door"));
    expect(withDoor.length).toBeGreaterThan(0);
    for (const room of withDoor) {
      for (const exit of room.exits) {
        if (exit.kind === "door" || exit.kind === "conditional") {
          expect(room.adjacent, room.id).toContain(exit.to);
        }
      }
    }
  });

  it("is present for every room, so a scan never reads a missing property", () => {
    for (const room of world.rooms) {
      expect(room.adjacent, room.id).toBeDefined();
    }
  });
});

describe("the exit-scan rewrite", () => {
  it("extracts I-SWORD, which the NEXTP idiom had kept catalogued", () => {
    expect(routineById.has("I-SWORD")).toBe(true);
    expect(catalog.some((e) => e.id === "I-SWORD")).toBe(false);
  });

  it("leaves no byte-addressing residue in the extracted routine", () => {
    // The rewrite must consume the whole idiom. A GETB or property-number
    // comparison surviving into the IR would mean it matched only part of it.
    const json = JSON.stringify(routineById.get("I-SWORD"));
    expect(json).not.toContain("GETB");
    expect(json).not.toContain("NEXTP");
    expect(json).not.toContain("PTSIZE");
    expect(json).not.toContain("LOW-DIRECTION");
  });

  it("walks the adjacency list and passes destinations to INFESTED?", () => {
    const json = JSON.stringify(routineById.get("I-SWORD"));
    expect(json).toContain('"prop":"adjacentRooms"');
    // The scanned room is HERE, and each element reaches INFESTED? as an
    // ordinary argument — no engine builtin in between.
    expect(json).toContain('"routine":"INFESTED?"');
    expect(json).toContain('"op":"table-get"');
  });

  it("catalogs rather than guesses when the idiom does not match exactly", () => {
    /*
     * The fail-closed property, exercised on the two tests that carry the
     * filtering semantics. Swapping either one leaves a loop that still
     * *looks* like an exit scan, and a matcher that ignored them would
     * silently produce the same rewrite for a routine that meant something
     * else. The reasons must name the byte-addressing operators, which is
     * what "fell back to the ordinary path" looks like from outside.
     */
    for (const [atom, replacement] of [
      ["LOW-DIRECTION", "LOW-DIRECTION-XX"],
      ["DEXIT", "FEXIT"],
    ] as const) {
      const reasons = extractWithPerturbedScan(atom, replacement).join("; ");
      expect(reasons, `${atom} → ${replacement}`).toMatch(/GETPT|PTSIZE|GETB|NEXTP/);
    }
  });
});
