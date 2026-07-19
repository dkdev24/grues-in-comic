/**
 * Stage 4.1 exit criteria — "can walk the map; state transitions correct".
 *
 * The map walk at the end is the real test: it proves the *whole* document's
 * exit graph is coherent, not just the handful of rooms a scripted route
 * touches. A dangling exit is exactly the kind of extraction defect that would
 * otherwise surface as an unexplainable crash in stage 4.4.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import type { Direction, WorldDocument } from "@grues-in-comic/ir";
import { loadWorld } from "../src/load.js";
import { goTo, resolveExit, roomIsLit } from "../src/movement.js";
import { here, isIn, PLAYER_ID, setFlag } from "../src/state.js";

const doc = JSON.parse(
  readFileSync(new URL("../../ir/artifacts/zork1.world.json", import.meta.url), "utf8"),
) as WorldDocument;

describe("exit resolution", () => {
  it("resolves a plain exit", () => {
    const { world, state } = loadWorld(doc);
    expect(resolveExit(world, state, "WEST-OF-HOUSE", "north")).toEqual({
      kind: "go",
      to: "NORTH-OF-HOUSE",
    });
  });

  it("reports a blocked exit with its authored message", () => {
    const { world, state } = loadWorld(doc);
    const r = resolveExit(world, state, "WEST-OF-HOUSE", "east");
    expect(r.kind).toBe("blocked");
    expect(r.kind === "blocked" && r.message).toMatch(/boarded/);
  });

  it("reports no exit where the room declares none", () => {
    const { world, state } = loadWorld(doc);
    expect(resolveExit(world, state, "WEST-OF-HOUSE", "up").kind).toBe("none");
  });

  it("gates a door exit on OPENBIT", () => {
    const { world, state } = loadWorld(doc);
    const doorRoom = doc.rooms.find((r) => r.exits.some((e) => e.kind === "door"));
    const exit = doorRoom!.exits.find((e) => e.kind === "door")!;
    if (exit.kind !== "door") throw new Error("unreachable");

    expect(resolveExit(world, state, doorRoom!.id, exit.direction).kind).not.toBe("go");
    setFlag(state, exit.door, "OPENBIT");
    expect(resolveExit(world, state, doorRoom!.id, exit.direction)).toEqual({
      kind: "go",
      to: exit.to,
    });
  });

  it("gates a conditional exit on its global", () => {
    const { world, state } = loadWorld(doc);
    const room = doc.rooms.find((r) => r.exits.some((e) => e.kind === "conditional"))!;
    const exit = room.exits.find((e) => e.kind === "conditional")!;
    if (exit.kind !== "conditional") throw new Error("unreachable");

    state.globals[exit.if] = false;
    expect(resolveExit(world, state, room.id, exit.direction).kind).not.toBe("go");
    state.globals[exit.if] = true;
    expect(resolveExit(world, state, room.id, exit.direction)).toEqual({
      kind: "go",
      to: exit.to,
    });
  });

  it("defers a PER exit to the behavior interpreter (stage 4.3)", () => {
    const { world, state } = loadWorld(doc);
    const room = doc.rooms.find((r) => r.exits.some((e) => e.kind === "routine"))!;
    const exit = room.exits.find((e) => e.kind === "routine")!;
    if (exit.kind !== "routine") throw new Error("unreachable");
    expect(resolveExit(world, state, room.id, exit.direction)).toEqual({
      kind: "routine",
      routine: exit.routine,
    });
  });
});

describe("walking the map", () => {
  it("moves the player and keeps HERE and the object tree in step", () => {
    const { state } = loadWorld(doc);
    const { from, firstVisit } = goTo(state, "NORTH-OF-HOUSE");

    expect(from).toBe("WEST-OF-HOUSE");
    expect(firstVisit).toBe(true);
    expect(here(state)).toBe("NORTH-OF-HOUSE");
    expect(isIn(state, PLAYER_ID, "NORTH-OF-HOUSE")).toBe(true);
    expect(isIn(state, PLAYER_ID, "WEST-OF-HOUSE")).toBe(false);
    expect(goTo(state, "WEST-OF-HOUSE").firstVisit).toBe(false);
  });

  it("walks the canonical opening route above ground", () => {
    const { world, state } = loadWorld(doc);
    // West of House → North of House → Behind House (ZIL id EAST-OF-HOUSE;
    // the room's DESC is "Behind House" — id and display name differ, and the
    // engine must never conflate them).
    const route: Direction[] = ["north", "east"];
    for (const dir of route) {
      const r = resolveExit(world, state, here(state), dir);
      expect(r.kind).toBe("go");
      if (r.kind === "go") goTo(state, r.to);
    }
    expect(here(state)).toBe("EAST-OF-HOUSE");
    expect(world.rooms.get(here(state))!.name).toBe("Behind House");
    expect(roomIsLit(state)).toBe(true);
  });

  it("has no exit pointing at a room that does not exist", () => {
    const { world } = loadWorld(doc);
    const dangling: string[] = [];
    for (const room of doc.rooms) {
      for (const exit of room.exits) {
        const to = "to" in exit ? exit.to : undefined;
        if (to !== undefined && !world.rooms.has(to)) dangling.push(`${room.id} ${exit.direction} → ${to}`);
      }
    }
    expect(dangling).toEqual([]);
  });

  it("reaches exactly the above-ground map using only unconditional exits", () => {
    const { world, state } = loadWorld(doc);
    const seen = new Set(["WEST-OF-HOUSE"]);
    const queue = ["WEST-OF-HOUSE"];
    while (queue.length > 0) {
      const room = queue.shift()!;
      for (const exit of world.rooms.get(room)!.exits) {
        const r = resolveExit(world, state, room, exit.direction);
        if (r.kind === "go" && !seen.has(r.to)) {
          seen.add(r.to);
          queue.push(r.to);
        }
      }
    }
    // 16 rooms — the whole surface world, and no more. Everything underground
    // is behind the kitchen window (a door exit) or the trap door (a PER
    // routine), so this number is a real statement about Zork I's topology:
    // if it grows, an exit that should be gated has stopped being gated.
    expect(seen.size).toBe(16);
    expect(seen.has("EAST-OF-HOUSE")).toBe(true);
    expect(seen.has("KITCHEN")).toBe(false);
    expect(seen.has("CELLAR")).toBe(false);
  });
});
