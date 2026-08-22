/**
 * Room → backdrop assignment.
 *
 * **This test exists because the 5.3 stub's bug was invisible.** The stub always
 * returned *a* backdrop, so every panel drew and every test passed while the
 * `field` branch was unreachable — the same shape as the v1.4.1 polarity bug,
 * where the right structure hid the wrong content. So the assertions here are on
 * the mapping itself, not on the fact that a mapping happened.
 *
 * Two things are pinned: the assignments a reader would notice (the regression
 * case first), and coverage against the real world document, so an outdoor room
 * that never got assigned fails here rather than silently rendering as a cellar.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { WorldDocument } from "@grues-in-comic/ir";
import { backdropFor, ROOM_BACKDROPS } from "../src/comic/backdrop.js";

const here = fileURLToPath(new URL(".", import.meta.url));
const world = JSON.parse(
  readFileSync(join(here, "../../ir/artifacts/zork1.world.json"), "utf8"),
) as WorldDocument;
const roomIds = new Set(world.rooms.map((r) => r.id));

describe("backdropFor", () => {
  it("gives the house clearing the field backdrop", () => {
    // The regression: 5.3 matched /HOUSE/ against `pastoral` first, so all four
    // of these returned `pastoral` and `field` never drew. Reverting the table
    // to that order fails exactly here.
    for (const room of ["WEST-OF-HOUSE", "NORTH-OF-HOUSE", "SOUTH-OF-HOUSE", "EAST-OF-HOUSE"]) {
      expect(backdropFor(room)).toBe("field");
    }
  });

  it("gives the woods and the high ground the pastoral backdrop", () => {
    for (const room of ["FOREST-1", "FOREST-2", "FOREST-3", "PATH", "CLEARING", "UP-A-TREE"]) {
      expect(backdropFor(room)).toBe("pastoral");
    }
  });

  it("gives the themed interiors their own backdrops", () => {
    // The post-MVP art pass replaced the generic-interior fallback for the
    // rooms a reader would recognise; these no longer draw as `room`.
    expect(backdropFor("KITCHEN")).toBe("house-interior");
    expect(backdropFor("LIVING-ROOM")).toBe("house-interior");
    expect(backdropFor("ATTIC")).toBe("attic");
    expect(backdropFor("CELLAR")).toBe("cellar");
    expect(backdropFor("MAZE-1")).toBe("maze");
    expect(backdropFor("ENTRANCE-TO-HADES")).toBe("hades-entrance");
  });

  it("draws the barrow interior on the win, which no room id can ask for", () => {
    // Zork I models no room inside the barrow — the win fires while the player
    // is still standing in STONE-BARROW — so `barrow-interior` was orphaned art
    // until the marker became the key (FUTURE_WORK F1).
    expect(backdropFor("STONE-BARROW", "victory")).toBe("barrow-interior");
    // The exterior is still what the room draws by itself: the walk up to the
    // door, and the frame the Hero speaks his declaration from.
    expect(backdropFor("STONE-BARROW")).toBe("barrow-exterior");
    expect(backdropFor("STONE-BARROW", null)).toBe("barrow-exterior");
  });

  it("lets every other marker fall through to the room", () => {
    // The override table is one entry wide on purpose. A marker with no
    // backdrop of its own must not shadow the room's — a death in the cellar is
    // still drawn in the cellar.
    expect(backdropFor("CELLAR", "death")).toBe("cellar");
    expect(backdropFor("CELLAR", "parser-miss/not-here")).toBe("cellar");
  });

  it("is total — every room in the world document resolves to a real backdrop", () => {
    for (const id of roomIds) {
      const backdrop = backdropFor(id);
      expect(typeof backdrop).toBe("string");
      expect(backdrop.length).toBeGreaterThan(0);
    }
  });

  it("assigns every room, and only rooms that exist", () => {
    // A typo'd id in the table is a room silently rendering as the fallback.
    const unknown = [...ROOM_BACKDROPS.keys()].filter((id) => !roomIds.has(id));
    expect(unknown).toEqual([]);
    // The whole world is assigned; nothing falls through to the `room` default.
    const unassigned = [...roomIds].filter((id) => !ROOM_BACKDROPS.has(id));
    expect(unassigned).toEqual([]);
  });

  it("covers the opening area, which 5.4 must render", () => {
    // Exit criterion for stage 5.4 is the opening area playable in comic form.
    // Every above-ground room the player reaches before the trapdoor is either
    // assigned outdoors or is one of the house interiors.
    const opening = [
      "WEST-OF-HOUSE", "NORTH-OF-HOUSE", "SOUTH-OF-HOUSE", "EAST-OF-HOUSE",
      "FOREST-1", "FOREST-2", "FOREST-3", "PATH", "CLEARING", "GRATING-CLEARING",
      "UP-A-TREE", "CANYON-VIEW", "STONE-BARROW",
    ];
    for (const room of opening) {
      expect(roomIds.has(room), `${room} missing from world document`).toBe(true);
      expect(backdropFor(room)).not.toBe("room");
    }
  });
});
