import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { validateWorld } from "../src/validate.js";
import type { WorldDocument } from "../src/schema.js";

const samplePath = new URL("../samples/west-of-house.world.json", import.meta.url);
const sample = JSON.parse(readFileSync(samplePath, "utf8")) as WorldDocument;

describe("west-of-house sample world", () => {
  const result = validateWorld(sample);

  it("passes validation", () => {
    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it("contains the expected entities", () => {
    expect(result.summary).toMatchObject({
      rooms: 11,
      stubRooms: 8,
      objects: 8,
      stubObjects: 5,
      globals: 4,
      tables: 1,
      flags: 11,
    });
  });

  it("exercises every exit variant", () => {
    const kinds = new Set(sample.rooms.flatMap((room) => room.exits.map((exit) => exit.kind)));
    expect([...kinds].sort()).toEqual(["blocked", "conditional", "door", "routine", "to"]);
  });

  it("covers conditional exits both with and without else-messages", () => {
    const conditionals = sample.rooms
      .flatMap((room) => room.exits)
      .filter((exit) => exit.kind === "conditional");
    expect(conditionals.some((exit) => exit.else !== undefined)).toBe(true);
    expect(conditionals.some((exit) => exit.else === undefined)).toBe(true);
  });

  it("collects opaque behavior references for stage 2.2", () => {
    expect(result.summary?.routineRefs).toEqual([
      "KITCHEN-FCN",
      "KITCHEN-WINDOW-F",
      "LIVING-ROOM-FCN",
      "MAILBOX-F",
      "NAILS-PSEUDO",
      "TRAP-DOOR-EXIT",
      "WEST-HOUSE",
    ]);
  });
});
