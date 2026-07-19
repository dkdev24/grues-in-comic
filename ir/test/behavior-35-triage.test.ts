/**
 * Stage 3.5 triage tests: the deliberate engine-builtin list (ADR 0001) and
 * the three extractor-only lowerings that fell out of it — Number statements,
 * bare room/object atoms in expression position, and `,NAME` GVals naming
 * routines.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { WorldDocument } from "../src/schema.js";

const here = fileURLToPath(new URL(".", import.meta.url));
const world = JSON.parse(
  readFileSync(join(here, "..", "artifacts", "zork1.world.json"), "utf8"),
) as WorldDocument;
const catalog = JSON.parse(
  readFileSync(join(here, "..", "artifacts", "zork1.behavior-catalog.json"), "utf8"),
) as { id: string; reasons: string[] }[];

const routineById = new Map(world.routines!.map((r) => [r.id, r]));
const catalogIds = new Set(catalog.map((c) => c.id));

describe("stage 3.5 triage — Group A builtins stay catalogued by design", () => {
  it("meta verbs, randomness, and parser/scope machinery are catalogued, not extracted", () => {
    for (const id of [
      "V-SAVE", "V-RESTORE", "V-RESTART", "V-QUIT", "V-VERIFY",
      "V-RANDOM", "PICK-ONE", "LIT?", "GOTO", "V-WALK", "GLOBAL-IN?", "OTHER-SIDE",
    ]) {
      expect(routineById.has(id), `${id} should not be extracted`).toBe(false);
      expect(catalogIds.has(id), `${id} should be catalogued (builtin frontier)`).toBe(true);
    }
  });
});

describe("stage 3.5 triage — extractor-only lowerings", () => {
  it("GO-NEXT: a Number ending a COND clause is a value statement", () => {
    const goNext = JSON.stringify(routineById.get("GO-NEXT"));
    expect(goNext).toContain('{"op":"value","expr":{"op":"const","value":2}}');
    expect(goNext).toContain('{"op":"value","expr":{"op":"const","value":1}}');
  });

  it("TRAP-DOOR-FCN: a bare room atom in expression position is the entity", () => {
    expect(JSON.stringify(routineById.get("TRAP-DOOR-FCN"))).toContain(
      '{"op":"entity","id":"LIVING-ROOM"}',
    );
  });

  it("BELL-F: a ,NAME GVal naming a routine is its name string", () => {
    // `<EQUAL? ,HERE ,LLD-ROOM>` — an original-game quirk comparing the
    // current room to a routine; stays always-false, as on the Z-machine.
    expect(JSON.stringify(routineById.get("BELL-F"))).toContain(
      '{"op":"equal?","args":[{"op":"global","id":"HERE"},{"op":"const","value":"LLD-ROOM"}]}',
    );
  });
});
