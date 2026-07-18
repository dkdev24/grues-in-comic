import { describe, expect, it } from "vitest";
import { IR_VERSION } from "../src/schema.js";
import { validateWorld } from "../src/validate.js";

/** Smallest valid world: one room, one door object, everything referenced. */
function minimalWorld(): Record<string, unknown> {
  return {
    irVersion: IR_VERSION,
    flags: [{ id: "DOORBIT" }, { id: "ONBIT" }],
    globals: [{ id: "SOME-FLAG", value: false }],
    tables: [
      { id: "SOME-TABLE", kind: "ltable", pure: true, elements: [{ ref: "ROOM-A" }, 42, "text"] },
    ],
    rooms: [
      {
        id: "ROOM-A",
        name: "Room A",
        exits: [
          { direction: "north", kind: "to", to: "ROOM-B" },
          { direction: "south", kind: "blocked", message: "No." },
          { direction: "east", kind: "conditional", to: "ROOM-B", if: "SOME-FLAG", else: "Not yet." },
          { direction: "west", kind: "door", to: "ROOM-B", door: "DOOR-1" },
          { direction: "down", kind: "routine", routine: "SOME-EXIT-FCN" },
        ],
        flags: ["ONBIT"],
        scenery: ["DOOR-1"],
      },
      { id: "ROOM-B", name: "Room B", exits: [], flags: [], stub: true },
    ],
    objects: [
      {
        id: "DOOR-1",
        name: "door",
        location: { kind: "local-globals" },
        synonyms: ["DOOR"],
        flags: ["DOORBIT"],
      },
    ],
  };
}

function errorsFor(mutate: (world: Record<string, unknown>) => void): string[] {
  const world = minimalWorld();
  mutate(world);
  return validateWorld(world).errors.map((e) => `${e.path}: ${e.message}`);
}

/* eslint-disable @typescript-eslint/no-explicit-any */
const room = (world: Record<string, unknown>, i = 0) => (world.rooms as any[])[i];
const object = (world: Record<string, unknown>, i = 0) => (world.objects as any[])[i];

describe("structural validation", () => {
  it("accepts the minimal world", () => {
    expect(validateWorld(minimalWorld()).errors).toEqual([]);
  });

  it("rejects non-object documents", () => {
    expect(validateWorld([]).valid).toBe(false);
    expect(validateWorld("hi").valid).toBe(false);
    expect(validateWorld(null).valid).toBe(false);
  });

  it("rejects a wrong irVersion", () => {
    expect(errorsFor((w) => (w.irVersion = "9.9.9"))).toEqual([`$.irVersion: must be "${IR_VERSION}"`]);
  });

  it("rejects unknown keys at every level", () => {
    expect(errorsFor((w) => (w.bogus = 1))).toEqual(["$.bogus: unknown key"]);
    expect(errorsFor((w) => (room(w).bogus = 1))).toEqual(["rooms[0].bogus: unknown key"]);
    expect(errorsFor((w) => (room(w).exits[0].bogus = 1))).toEqual(["rooms[0].exits[0].bogus: unknown key"]);
    expect(errorsFor((w) => (object(w).bogus = 1))).toEqual(["objects[0].bogus: unknown key"]);
  });

  it("rejects missing required fields", () => {
    expect(errorsFor((w) => delete room(w).name)).toEqual(["rooms[0].name: required"]);
    expect(errorsFor((w) => delete object(w).location)).toEqual(["objects[0].location: required"]);
    expect(errorsFor((w) => delete object(w).synonyms)).toEqual(["objects[0].synonyms: required"]);
    expect(errorsFor((w) => delete (w as any).flags).length).toBeGreaterThan(0);
  });

  it("rejects bad exit kinds and directions", () => {
    expect(errorsFor((w) => (room(w).exits[0].kind = "teleport"))).toEqual([
      'rooms[0].exits[0].kind: must be "to", "blocked", "conditional", "door", or "routine"',
    ]);
    expect(errorsFor((w) => (room(w).exits[0].direction = "NORTH")).length).toBe(1);
  });

  it("rejects duplicate directions within a room", () => {
    expect(errorsFor((w) => (room(w).exits[1].direction = "north"))).toEqual([
      'rooms[0].exits[1].direction: duplicate direction "north"',
    ]);
  });

  it("rejects duplicate ids across sections (flat namespace)", () => {
    // Renaming cascades (former id no longer resolves), so check containment.
    expect(errorsFor((w) => (object(w).id = "ROOM-A"))).toContain(
      'objects[0].id: duplicate id "ROOM-A" (already defined in rooms)',
    );
    expect(errorsFor((w) => ((w.globals as any[])[0].id = "SOME-TABLE"))).toContain(
      'tables[0].id: duplicate id "SOME-TABLE" (already defined in globals)',
    );
  });

  it("rejects non-integer numeric properties and non-scalar global values", () => {
    expect(errorsFor((w) => (room(w).score = 1.5))).toEqual(["rooms[0].score: must be an integer"]);
    expect(errorsFor((w) => ((w.globals as any[])[0].value = { ref: "ROOM-A" }))).toEqual([
      "globals[0].value: must be a boolean, integer, or string",
    ]);
  });
});

describe("referential validation", () => {
  it("rejects exits to unknown rooms", () => {
    expect(errorsFor((w) => (room(w).exits[0].to = "NOWHERE"))).toEqual([
      'rooms[0].exits[0].to: unknown room "NOWHERE"',
    ]);
  });

  it("rejects conditions on unknown globals", () => {
    expect(errorsFor((w) => (room(w).exits[2].if = "NO-SUCH-FLAG"))).toEqual([
      'rooms[0].exits[2].if: unknown global "NO-SUCH-FLAG"',
    ]);
  });

  it("rejects door exits through unknown or non-door objects", () => {
    expect(errorsFor((w) => (room(w).exits[3].door = "GHOST"))).toEqual([
      'rooms[0].exits[3].door: unknown object "GHOST"',
    ]);
    expect(errorsFor((w) => (object(w).flags = []))).toEqual([
      'rooms[0].exits[3].door: object "DOOR-1" is not flagged DOORBIT',
    ]);
  });

  it("rejects unknown scenery objects and object locations", () => {
    expect(errorsFor((w) => room(w).scenery.push("GHOST"))).toEqual([
      'rooms[0].scenery: unknown object "GHOST"',
    ]);
    expect(errorsFor((w) => (object(w).location = { kind: "room", id: "NOWHERE" }))).toEqual([
      'objects[0].location.id: unknown room "NOWHERE"',
    ]);
    expect(errorsFor((w) => (object(w).location = { kind: "object", id: "GHOST" }))).toEqual([
      'objects[0].location.id: unknown object "GHOST"',
    ]);
  });

  it("rejects undeclared flags on rooms and objects", () => {
    expect(errorsFor((w) => room(w).flags.push("MYSTERYBIT"))).toEqual([
      'rooms[0].flags: flag "MYSTERYBIT" is not declared in the flags registry',
    ]);
  });

  it("rejects dangling table refs", () => {
    expect(errorsFor((w) => ((w.tables as any[])[0].elements[0] = { ref: "GHOST" }))).toEqual([
      'tables[0].elements[0].ref: unknown entity "GHOST"',
    ]);
  });
});

describe("summary", () => {
  it("reports counts and sorted routine references", () => {
    const result = validateWorld(minimalWorld());
    expect(result.summary).toEqual({
      rooms: 2,
      stubRooms: 1,
      objects: 1,
      stubObjects: 0,
      globals: 1,
      tables: 1,
      flags: 2,
      exits: 5,
      routineRefs: ["SOME-EXIT-FCN"],
    });
  });
});
