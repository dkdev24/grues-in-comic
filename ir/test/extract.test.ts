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

const { world, catalog } = extractWorld(programs);
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
    const byId = new Map(world.globals.map((g) => [g.id, g.value]));
    for (const id of [
      "COFFIN-CURE", "CYCLOPS-FLAG", "DEFLATE", "DOME-FLAG", "EMPTY-HANDED",
      "FALSE-FLAG", "LLD-FLAG", "LOW-TIDE", "MAGIC-FLAG", "RAINBOW-FLAG",
      "TROLL-FLAG", "WON-FLAG",
    ]) {
      expect(byId.get(id), id).toBe(false);
    }
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

  it("extracts the full parser vocabulary", () => {
    const v = world.vocabulary!;
    expect(v.syntax.length).toBe(267);
    expect(v.synonyms.length).toBe(75);
    expect(v.buzzwords.length).toBe(21);
    expect(v.directions.length).toBe(13);
    expect(result.summary?.syntaxRules).toBe(267);
  });

  it("resolves ZORK-NUMBER compile-time CONDs for Zork I", () => {
    const v = world.vocabulary!;
    // Live clause (N==? ZORK-NUMBER 3): GIVE gains the HAND alias.
    expect(v.synonyms).toContainEqual({ word: "GIVE", synonyms: ["HAND"] });
    // Dead clauses (==? 2 / ==? 3): Zork II buzzwords and short ATTACK/KILL rules.
    expect(v.buzzwords).not.toContain("FROTZ");
    expect(v.buzzwords).not.toContain("OZMOO");
    expect(v.syntax.filter((r) => r.verb === "ATTACK")).toEqual([
      {
        verb: "ATTACK",
        objects: [
          { find: "ACTORBIT", options: ["ON-GROUND", "IN-ROOM"] },
          { preposition: "WITH", find: "WEAPONBIT", options: ["HELD", "CARRIED", "HAVE"] },
        ],
        action: "V-ATTACK",
      },
    ]);
  });

  it("keeps punctuation buzzwords and maps direction words", () => {
    const v = world.vocabulary!;
    for (const punct of [".", ",", '"']) expect(v.buzzwords).toContain(punct);
    expect(v.directions).toContainEqual({ word: "NORTH", direction: "north" });
    expect(v.directions).toContainEqual({ word: "NE", direction: "northeast" });
    expect(v.directions).toContainEqual({ word: "LAND", direction: "land" });
  });

  it("declares every (FIND flag) in the registry", () => {
    const declared = new Set(world.flags.map((f) => f.id));
    for (const rule of world.vocabulary!.syntax) {
      for (const slot of rule.objects) {
        if (slot.find !== undefined) expect(declared.has(slot.find), slot.find).toBe(true);
      }
    }
    expect(declared.has("RMUNGBIT")).toBe(true);
  });

  it("is deterministic across runs", () => {
    expect(extractWorld(programs)).toEqual({ world, catalog });
  });
});

describe("behavior extraction (stage 3.4, batch 1)", () => {
  const byId = new Map(world.routines!.map((r) => [r.id, r]));

  it("extracts a majority of the referenced handlers; catalog covers the rest", () => {
    const refs = result.summary!.routineRefs;
    const extractedRefs = refs.filter((r) => byId.has(r));
    expect(refs.length).toBe(292);
    expect(extractedRefs.length).toBeGreaterThan(refs.length / 2);
    const catalogued = new Set(catalog.map((c) => c.id));
    for (const ref of refs) {
      expect(byId.has(ref) || catalogued.has(ref), ref).toBe(true);
    }
    for (const entry of catalog) expect(entry.reasons.length).toBeGreaterThan(0);
  });

  it("reproduces the hand-written POC ASTs structurally", async () => {
    const { TRAP_DOOR_EXIT, KITCHEN_WINDOW_F } = await import("../poc/routines.js");
    const extractedTrapDoor = byId.get("TRAP-DOOR-EXIT")!;
    expect(extractedTrapDoor.body).toEqual(TRAP_DOOR_EXIT.body);
    const extractedWindow = byId.get("KITCHEN-WINDOW-F")!;
    expect(extractedWindow.body).toEqual(KITCHEN_WINDOW_F.body);
  });

  it("executes extracted routines identically to the POC goldens", async () => {
    const { runRoutine } = await import("../poc/interpreter.js");
    const { makeWorld } = await import("../poc/world.js");

    const closed = makeWorld({ here: "LIVING-ROOM", verb: "WALK", globals: { "RUG-MOVED": true } });
    expect(runRoutine(byId.get("TRAP-DOOR-EXIT")!, closed)).toBe(false);
    expect(closed.output.join("")).toBe("The trap door is closed.\n");
    expect(closed.itObject).toBe("TRAP-DOOR");

    const open = makeWorld({
      here: "LIVING-ROOM",
      verb: "WALK",
      globals: { "RUG-MOVED": true },
      flags: { "TRAP-DOOR": ["OPENBIT"] },
    });
    expect(runRoutine(byId.get("TRAP-DOOR-EXIT")!, open)).toBe("CELLAR");

    const window = makeWorld({
      here: "KITCHEN",
      verb: "OPEN",
      globals: { "KITCHEN-WINDOW-FLAG": false },
    });
    expect(runRoutine(byId.get("KITCHEN-WINDOW-F")!, window)).toBe(true);
    expect(window.output.join("")).toBe(
      "With great effort, you open the window far enough to allow entry.\n",
    );
  });

  it("resolves ELSE clauses, bare T statements, and V? verb constants", () => {
    const json = JSON.stringify(world.routines);
    expect(json).not.toContain('"ELSE"');
    // Sample of a routine using `,V?ATTACK`-style comparisons: lowered to verb words.
    expect(catalog.every((c) => !c.reasons.some((r) => r.includes("V?")))).toBe(true);
  });

  it("keeps the catalog and extracted sets disjoint and sorted", () => {
    const catalogued = new Set(catalog.map((c) => c.id));
    for (const routine of world.routines!) expect(catalogued.has(routine.id)).toBe(false);
    const ids = world.routines!.map((r) => r.id);
    expect(ids).toEqual([...ids].sort());
  });
});
