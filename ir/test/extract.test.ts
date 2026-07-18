/**
 * Stage 3.1–3.2 extraction tests: the world model extracted from the
 * committed importer AST artifacts must validate, cover all 110 Zork I rooms
 * and 137 objects, and agree with the hand-transcribed stage 2.1 sample
 * where they overlap.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { extractWorld, type AstProgram } from "../src/extract-world.js";
import { validateWorld } from "../src/validate.js";

const here = fileURLToPath(new URL(".", import.meta.url));
const astDir = join(here, "..", "..", "importer", "artifacts", "ast");

const programs: AstProgram[] = readdirSync(astDir)
  .filter((f) => f.endsWith(".json"))
  .sort()
  .map((f) => JSON.parse(readFileSync(join(astDir, f), "utf8")) as AstProgram);

const world = extractWorld(programs);
const result = validateWorld(world);

const sample = JSON.parse(
  readFileSync(join(here, "..", "samples", "west-of-house.world.json"), "utf8"),
);

describe("extractWorld (Zork I AST artifacts)", () => {
  it("produces a valid IR world document", () => {
    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it("extracts all 110 rooms with 352 exits", () => {
    expect(result.summary?.rooms).toBe(110);
    expect(result.summary?.stubRooms).toBe(0);
    expect(result.summary?.exits).toBe(352);
  });

  it("matches the expected exit-kind breakdown", () => {
    const kinds: Record<string, number> = {};
    for (const room of world.rooms) {
      for (const exit of room.exits) kinds[exit.kind] = (kinds[exit.kind] ?? 0) + 1;
    }
    expect(kinds).toEqual({ to: 277, blocked: 37, conditional: 25, door: 6, routine: 7 });
  });

  it("agrees with the hand-transcribed sample rooms", () => {
    for (const id of ["WEST-OF-HOUSE", "KITCHEN", "LIVING-ROOM"]) {
      const extracted = world.rooms.find((r) => r.id === id)!;
      const transcribed = sample.rooms.find((r: { id: string }) => r.id === id)!;
      expect(new Set(extracted.exits)).toEqual(new Set(transcribed.exits));
      expect([...extracted.flags].sort()).toEqual([...transcribed.flags].sort());
      expect(extracted.name).toBe(transcribed.name);
      expect(extracted.action).toBe(transcribed.action);
      expect(extracted.score).toBe(transcribed.score);
      expect(extracted.scenery).toEqual(transcribed.scenery);
      expect(extracted.pseudo).toEqual(transcribed.pseudo);
    }
  });

  it("skips ZIL comment nodes inside property lists", () => {
    // TREASURE-ROOM's FLAGS list carries `;"CANT-HAVE-ONBIT"`.
    expect(world.rooms.find((r) => r.id === "TREASURE-ROOM")?.flags).toEqual(["RLANDBIT"]);
  });

  it("declares every exit-condition global, all initially false", () => {
    expect(world.globals.map((g) => g.id)).toEqual(
      [
        "COFFIN-CURE", "CYCLOPS-FLAG", "DEFLATE", "DOME-FLAG", "EMPTY-HANDED",
        "FALSE-FLAG", "LLD-FLAG", "LOW-TIDE", "MAGIC-FLAG", "RAINBOW-FLAG",
        "TROLL-FLAG", "WON-FLAG",
      ],
    );
    expect(world.globals.every((g) => g.value === false)).toBe(true);
  });

  it("emits every door object DOORBIT-flagged", () => {
    const byId = new Map(world.objects.map((o) => [o.id, o]));
    for (const room of world.rooms) {
      for (const exit of room.exits) {
        if (exit.kind !== "door") continue;
        const door = byId.get(exit.door);
        expect(door, `${room.id}: ${exit.door}`).toBeDefined();
        expect(door!.flags).toContain("DOORBIT");
      }
    }
  });

  it("extracts all 137 objects fully (140 forms minus 3 scaffolding)", () => {
    expect(result.summary?.objects).toBe(137);
    expect(result.summary?.stubObjects).toBe(0);
    const ids = new Set(world.objects.map((o) => o.id));
    for (const meta of ["GLOBAL-OBJECTS", "LOCAL-GLOBALS", "ROOMS"]) {
      expect(ids.has(meta), meta).toBe(false);
    }
  });

  it("matches the expected initial-location breakdown", () => {
    const kinds: Record<string, number> = {};
    for (const o of world.objects) kinds[o.location.kind] = (kinds[o.location.kind] ?? 0) + 1;
    expect(kinds).toEqual({ room: 73, object: 20, "local-globals": 20, global: 14, nowhere: 10 });
  });

  it("agrees with the hand-transcribed sample objects", () => {
    for (const id of ["MAILBOX", "ADVERTISEMENT", "KITCHEN-WINDOW"]) {
      const extracted = world.objects.find((o) => o.id === id);
      const transcribed = sample.objects.find((o: { id: string }) => o.id === id);
      expect(extracted, id).toEqual(transcribed);
    }
  });

  it("maps out-of-schema-0.1 properties (VTYPE, DESCFCN) and ACTION 0", () => {
    expect(world.objects.find((o) => o.id === "INFLATED-BOAT")?.vehicleType).toBe("NONLANDBIT");
    expect(world.objects.find((o) => o.id === "BAT")?.descriptionRoutine).toBe("BAT-D");
    expect(world.objects.find((o) => o.id === "ADVENTURER")?.action).toBeUndefined();
  });

  it("applies ZIL string semantics: | is a hard newline, wraps are spaces", () => {
    const leaflet = world.objects.find((o) => o.id === "ADVERTISEMENT")!;
    expect(leaflet.text).toContain('"WELCOME TO ZORK!\n\nZORK is a game of adventure, danger, and low cunning. In it you will explore');
    const strings = JSON.stringify(world);
    expect(strings.includes("|")).toBe(false);
  });

  it("is deterministic across runs", () => {
    expect(extractWorld(programs)).toEqual(world);
  });
});
