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
  it("meta verbs, randomness, and parser machinery are catalogued, not extracted", () => {
    for (const id of [
      "V-SAVE", "V-RESTORE", "V-RESTART", "V-QUIT", "V-VERIFY",
      "V-RANDOM", "PICK-ONE", "GOTO", "V-WALK", "GLOBAL-IN?", "OTHER-SIDE",
    ]) {
      expect(routineById.has(id), `${id} should not be extracted`).toBe(false);
      expect(catalogIds.has(id), `${id} should be catalogued (builtin frontier)`).toBe(true);
    }
  });

  it("engine-implemented routines are excluded outright, not catalogued", () => {
    /*
     * A second, stronger mechanism than the builtin frontier. `LIT?` reached
     * the frontier by accident — it stalled on `,ONBIT` — and once flags-as-
     * values became extractable it sailed through and *shadowed* the engine's
     * own lighting, since routines take precedence over builtins. It is now on
     * ENGINE_IMPLEMENTED and never queued at all.
     *
     * So the assertion is "not extracted", which is the invariant that
     * matters; being absent from the catalog too is the point — nothing is
     * pending about it.
     */
    for (const id of ["LIT?", "MAIN-LOOP", "PARSER", "CLOCKER", "QUEUE"]) {
      expect(routineById.has(id), `${id} should not be extracted`).toBe(false);
      expect(catalogIds.has(id), `${id} is engine-owned, not a catalog entry`).toBe(false);
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

  it("BELL-F: a ,NAME naming a room's ACTION routine resolves to that room", () => {
    // `<EQUAL? ,HERE ,LLD-ROOM>` is a *stale room name*: Zork I renamed the room
    // `LLD-ROOM → ENTRANCE-TO-HADES` but left `,LLD-ROOM` in BELL-F and kept the
    // action routine's name. Release 119 still named the room LLD-ROOM, so the
    // exorcism's compare fired there; it must resolve to that room here too.
    expect(JSON.stringify(routineById.get("BELL-F"))).toContain(
      '{"op":"equal?","args":[{"op":"global","id":"HERE"},{"op":"entity","id":"ENTRANCE-TO-HADES"}]}',
    );
    // The action routine itself stays extracted (reachable via the room's
    // `action` entry ref), so nothing is lost by resolving the reference.
    expect(routineById.has("LLD-ROOM")).toBe(true);
  });
});
