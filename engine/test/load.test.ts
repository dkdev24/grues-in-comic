/**
 * Stage 4.1 — booting the real Zork I world document into engine state.
 *
 * These assert the *derived* structure the schema promises but never spells
 * out per entity (rooms under ROOMS, globals under GLOBAL-OBJECTS, the nested
 * meta entities), because that derivation is the part a future extractor change
 * could silently break.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import type { WorldDocument } from "@grues-in-comic/ir";
import { loadWorld } from "../src/load.js";
import { childrenOf, hasFlag, here, isIn, isWithin, PLAYER_ID } from "../src/state.js";

const doc = JSON.parse(
  readFileSync(new URL("../../ir/artifacts/zork1.world.json", import.meta.url), "utf8"),
) as WorldDocument;

describe("loadWorld (Zork I)", () => {
  it("boots without hand-seeded state", () => {
    const { world, state } = loadWorld(doc);
    expect(world.rooms.size).toBe(110);
    expect(world.objects.size).toBe(137);
    expect(here(state)).toBe("WEST-OF-HOUSE");
    expect(state.turn).toBe(0);
  });

  it("parents every room under the ROOMS meta entity, in reverse document order", () => {
    const { state } = loadWorld(doc);
    const rooms = childrenOf(state, "ROOMS");
    expect(rooms.length).toBe(110);
    // Reversed, because the Z-machine builds the object tree by prepending
    // (`insert_obj`). Stage 4.4's transcript diff is what established this:
    // the Kitchen lists the bottle before the sack, the reverse of how
    // 1dungeon.zil declares them. See `link` in src/load.ts.
    expect(rooms).toEqual([...doc.rooms.map((r) => r.id)].reverse());
    expect(rooms[rooms.length - 1]).toBe("WEST-OF-HOUSE");
  });

  it("orders a container's children as the Z-machine object tree does", () => {
    const { state } = loadWorld(doc);
    // 1dungeon.zil declares SANDWICH-BAG then BOTTLE; the game lists the
    // bottle first, and the golden transcript agrees.
    expect(childrenOf(state, "KITCHEN-TABLE")).toEqual(["BOTTLE", "SANDWICH-BAG"]);
  });

  it("nests LOCAL-GLOBALS inside GLOBAL-OBJECTS, as the scope walk requires", () => {
    const { state } = loadWorld(doc);
    expect(isIn(state, "LOCAL-GLOBALS", "GLOBAL-OBJECTS")).toBe(true);
  });

  it("routes each object-location kind to its container", () => {
    const { state } = loadWorld(doc);
    // kind: "object" — the leaflet (ZIL ADVERTISEMENT) starts in the mailbox.
    expect(isIn(state, "ADVERTISEMENT", "MAILBOX")).toBe(true);
    // kind: "room" — the mailbox itself is in West of House.
    expect(isIn(state, "MAILBOX", "WEST-OF-HOUSE")).toBe(true);
    // Transitive: the leaflet is therefore *within* the room too, but not IN it.
    expect(isWithin(state, "ADVERTISEMENT", "WEST-OF-HOUSE")).toBe(true);
    expect(isIn(state, "ADVERTISEMENT", "WEST-OF-HOUSE")).toBe(false);
    // kind: "global" / "local-globals" — the scaffolding pools.
    expect(childrenOf(state, "GLOBAL-OBJECTS").length).toBeGreaterThan(0);
    expect(childrenOf(state, "LOCAL-GLOBALS").length).toBeGreaterThan(0);
  });

  it("places the player as a real object-tree node at the start room", () => {
    const { state } = loadWorld(doc);
    expect(isIn(state, PLAYER_ID, "WEST-OF-HOUSE")).toBe(true);
    expect(state.globals["WINNER"]).toBe(PLAYER_ID);
  });

  it("copies flags and properties out of the document so play cannot corrupt it", () => {
    const { state } = loadWorld(doc);
    expect(hasFlag(state, "MAILBOX", "CONTBIT")).toBe(true);
    state.flags["MAILBOX"]!.add("OPENBIT");
    state.properties["MAILBOX"]!["capacity"] = 999;

    const fresh = loadWorld(doc).state;
    expect(hasFlag(fresh, "MAILBOX", "OPENBIT")).toBe(false);
    expect(fresh.properties["MAILBOX"]!["capacity"]).not.toBe(999);
  });

  it("loads tables, resolving entity refs to ids", () => {
    const { state } = loadWorld(doc);
    const aboveGround = state.tables["ABOVE-GROUND"];
    expect(aboveGround?.kind).toBe("ltable");
    expect(aboveGround?.pure).toBe(true);
    expect(aboveGround?.elements[0]).toBe("WEST-OF-HOUSE");
  });

  it("rejects a start room that is not a room", () => {
    expect(() => loadWorld(doc, { start: "MAILBOX" })).toThrow(/not a room/);
  });
});
