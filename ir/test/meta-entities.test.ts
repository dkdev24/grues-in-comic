/**
 * World-document gap 1 — meta entities: ZIL's object-tree scaffolding
 * (GLOBAL-OBJECTS / LOCAL-GLOBALS / ROOMS) as first-class containers.
 *
 * Behavior code names these directly (`<IN? .OBJ ,ROOMS>`, `<FIRST? ,ROOMS>`,
 * `<EQUAL? ,PRSO ,ROOMS>`), which stalled 13 routines on "unknown name". They
 * carry no game semantics — no name, flags, or properties — only a node in
 * the object tree, so the IR emits them as `metaEntities` rather than objects
 * and leaves membership derived (rooms list + object location kinds).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { WorldDocument } from "../src/schema.js";
import { validateWorld } from "../src/validate.js";
import { runRoutine } from "../poc/interpreter.js";
import { makeWorld } from "../poc/world.js";

const here = fileURLToPath(new URL(".", import.meta.url));
const world = JSON.parse(
  readFileSync(join(here, "..", "artifacts", "zork1.world.json"), "utf8"),
) as WorldDocument;
const catalog = JSON.parse(
  readFileSync(join(here, "..", "artifacts", "zork1.behavior-catalog.json"), "utf8"),
) as { id: string; reasons: string[] }[];

const routineById = new Map(world.routines!.map((r) => [r.id, r]));
const metaById = new Map((world.metaEntities ?? []).map((m) => [m.id, m]));

describe("meta entities — extraction", () => {
  it("emits exactly the three ZIL scaffolding anchors, one per role", () => {
    expect([...metaById.keys()].sort()).toEqual(["GLOBAL-OBJECTS", "LOCAL-GLOBALS", "ROOMS"]);
    expect(metaById.get("ROOMS")!.role).toBe("rooms");
    expect(metaById.get("GLOBAL-OBJECTS")!.role).toBe("global-objects");
    expect(metaById.get("LOCAL-GLOBALS")!.role).toBe("local-globals");
  });

  it("keeps gglobals.zil's nesting: LOCAL-GLOBALS sits inside GLOBAL-OBJECTS", () => {
    // gparser.zil's scope walk distinguishes the two by climbing this edge.
    expect(metaById.get("LOCAL-GLOBALS")!.location).toBe("GLOBAL-OBJECTS");
    expect(metaById.get("GLOBAL-OBJECTS")!.location).toBeUndefined();
    expect(metaById.get("ROOMS")!.location).toBeUndefined();
  });

  it("does not also emit them as rooms or objects", () => {
    for (const id of metaById.keys()) {
      expect(world.rooms.some((r) => r.id === id), `${id} as room`).toBe(false);
      expect(world.objects.some((o) => o.id === id), `${id} as object`).toBe(false);
    }
  });

  it("leaves membership derived rather than duplicated per entity", () => {
    // The engine parents rooms under ROOMS and location-kind "global" /
    // "local-globals" objects under their anchors; nothing in the document
    // repeats that edge.
    expect(world.objects.some((o) => o.location.kind === "global")).toBe(true);
    expect(world.objects.some((o) => o.location.kind === "local-globals")).toBe(true);
    expect(JSON.stringify(world.objects)).not.toContain('"id":"GLOBAL-OBJECTS"');
  });
});

describe("meta entities — the routines they unblock", () => {
  it("extracts all 13 routines that stalled on an unknown meta-entity name", () => {
    for (const id of [
      "DESCRIBE-ROOM",
      "FIRSTER",
      "HACK-HACK",
      "I-THIEF",
      "PRE-TURN",
      "ROPE-FUNCTION",
      "TREE-ROOM",
      "V-DISEMBARK",
      "V-EAT",
      "V-EXIT",
      "V-FIND",
    ]) {
      expect(routineById.has(id), `${id} should be extracted`).toBe(true);
    }
    // RANDOMIZE-OBJECTS and V-CLIMB-UP advance to a later frontier form
    // (RANDOM, GETPT) rather than clearing outright.
    expect(routineById.has("RANDOMIZE-OBJECTS")).toBe(false);
    expect(routineById.has("V-CLIMB-UP")).toBe(false);
  });

  it("no routine still catalogs on a meta-entity name", () => {
    for (const entry of catalog) {
      expect(entry.reasons.join("; "), entry.id).not.toMatch(
        /unknown name ,(ROOMS|GLOBAL-OBJECTS|LOCAL-GLOBALS)/,
      );
    }
  });

  it("lowers `,ROOMS` to an entity reference, not a global read", () => {
    expect(JSON.stringify(routineById.get("FIRSTER"))).toContain(
      '"op":"in?","entity":{"op":"local","id":"OBJ"},"container":{"op":"entity","id":"ROOMS"}',
    );
    // V-FIND compares the object's container against the anchor directly:
    // `<EQUAL? .L ,GLOBAL-OBJECTS>` → "You find it."
    expect(JSON.stringify(routineById.get("V-FIND"))).toContain(
      '"op":"equal?","args":[{"op":"local","id":"L"},{"op":"entity","id":"GLOBAL-OBJECTS"}]',
    );
  });
});

describe("meta entities — validation", () => {
  const base = (): Record<string, unknown> => ({
    irVersion: world.irVersion,
    flags: [],
    globals: [],
    tables: [],
    rooms: [],
    objects: [],
    metaEntities: [{ id: "ROOMS", role: "rooms" }],
  });

  const errors = (doc: Record<string, unknown>) =>
    validateWorld(doc)
      .errors.map((e) => e.message)
      .join("; ");

  it("accepts a document whose behavior references a meta entity", () => {
    const doc = base();
    doc.routines = [{ id: "R", body: [{ op: "value", expr: { op: "entity", id: "ROOMS" } }] }];
    expect(validateWorld(doc).valid).toBe(true);
  });

  it("rejects an unknown role", () => {
    const doc = base();
    doc.metaEntities = [{ id: "X", role: "everything" }];
    expect(errors(doc)).toContain("must be one of: rooms, global-objects, local-globals");
  });

  it("rejects two anchors claiming the same role", () => {
    const doc = base();
    doc.metaEntities = [
      { id: "ROOMS", role: "rooms" },
      { id: "MORE-ROOMS", role: "rooms" },
    ];
    expect(errors(doc)).toContain('duplicate role "rooms"');
  });

  it("rejects an id that collides with a room", () => {
    const doc = base();
    doc.rooms = [{ id: "ROOMS", name: "Rooms", exits: [], flags: [] }];
    expect(errors(doc)).toContain("duplicate id");
  });

  it("rejects nesting inside something that is not a meta entity", () => {
    const doc = base();
    doc.metaEntities = [{ id: "ROOMS", role: "rooms", location: "WEST-OF-HOUSE" }];
    expect(errors(doc)).toContain('unknown meta entity "WEST-OF-HOUSE"');
  });

  it("rejects a containment cycle — the object tree would have no root", () => {
    const doc = base();
    doc.metaEntities = [
      { id: "A", role: "rooms", location: "B" },
      { id: "B", role: "global-objects", location: "A" },
    ];
    expect(errors(doc)).toContain('meta entity "A" is inside itself');
  });
});

describe("meta entities — golden: FIRSTER heads containers but not rooms", () => {
  const firster = () => routineById.get("FIRSTER")!;

  it("prints no header for a room, because the room is in ROOMS", () => {
    const w = makeWorld({
      here: "KITCHEN",
      verb: "LOOK",
      globals: { WINNER: "ADVENTURER" },
      locations: { KITCHEN: "ROOMS" },
      names: { KITCHEN: "Kitchen" },
    });
    runRoutine(firster(), w, ["KITCHEN", 0]);
    expect(w.output.join("")).toBe("");
  });

  it("prints a header for an ordinary container, which is not in ROOMS", () => {
    const w = makeWorld({
      here: "KITCHEN",
      verb: "LOOK",
      globals: { WINNER: "ADVENTURER" },
      locations: { KITCHEN: "ROOMS", SACK: "KITCHEN" },
      names: { SACK: "brown sack" },
    });
    runRoutine(firster(), w, ["SACK", 0]);
    expect(w.output.join("")).toBe("The brown sack contains:\n");
  });
});
