/**
 * Room → backdrop assignment (ADR 0004 §7, the establishing rung).
 *
 * **Thirty backdrops for 110 rooms.** The MVP shipped three (`pastoral`,
 * `field`, `room`) against no `AT_BACKDROP` assets, so ~89 of 110 rooms drew as
 * a generic interior. The post-MVP art pass (`docs/backdrop-generation-plan.md`)
 * generated a set covering the whole game, and this table now assigns every room
 * a backdrop that fits it: the maze looks like a maze, the reservoir like water,
 * Hades like Hades.
 *
 * **This is a table, not a regex.** The 5.3 stub tested `/…|HOUSE|…/` before
 * `/^(WEST|NORTH|SOUTH|EAST)-OF-HOUSE$/`, so all four house rooms matched the
 * first branch and the `field` backdrop never drew — a dead branch no test could
 * see, because the stub always returned *some* backdrop. Room ids are a closed
 * set from the world document; matching them by pattern buys nothing and costs
 * exactly this. Coverage and id validity are asserted in `test/backdrop.test.ts`.
 *
 * `room` remains the fallback for any id not in the table (a new game, a room
 * added later) so `backdropFor` stays total. For Zork 1 every room is assigned,
 * so the fallback does not fire — but it is the safety net that keeps the
 * establishing rung with something to draw.
 */

/** The backdrops packed by `art/tools/avbpack.ts`; see `art/package.json`. */
export type BackdropId =
  | "pastoral" | "field" | "barrow-exterior" | "grating-clearing"
  | "house-interior" | "attic" | "cellar" | "troll-room" | "cyclops-room"
  | "timber-room" | "machine-room" | "reservoir" | "dam-lobby" | "maze"
  | "temple" | "egypt-room" | "round-room" | "torch-room" | "cave-system"
  | "dome-room" | "mirror-room" | "gallery" | "atlantis" | "hades-entrance"
  | "land-of-living-dead" | "barrow-interior" | "maintenance-room" | "loud-room"
  | "engravings-cave" | "room";

/**
 * Every room in the world document, keyed by id, grouped by the backdrop it
 * draws. Ids — not printed names — are the keys: EAST-OF-HOUSE prints as "Behind
 * House", and the maze rooms all print "Maze".
 */
export const ROOM_BACKDROPS: ReadonlyMap<string, BackdropId> = new Map<string, BackdropId>([
  // Above ground. The house clearing is `field`; the woods, high ground, cliffs
  // and river run through `pastoral`; the barrow and grating get their own.
  ["WEST-OF-HOUSE", "field"],
  ["NORTH-OF-HOUSE", "field"],
  ["SOUTH-OF-HOUSE", "field"],
  ["EAST-OF-HOUSE", "field"],
  ["STONE-BARROW", "barrow-exterior"],
  ["GRATING-CLEARING", "grating-clearing"],
  ["FOREST-1", "pastoral"],
  ["FOREST-2", "pastoral"],
  ["FOREST-3", "pastoral"],
  ["MOUNTAINS", "pastoral"],
  ["PATH", "pastoral"],
  ["UP-A-TREE", "pastoral"],
  ["CLEARING", "pastoral"],
  ["CANYON-VIEW", "pastoral"],
  ["CLIFF-MIDDLE", "pastoral"],
  ["CANYON-BOTTOM", "pastoral"],
  ["END-OF-RAINBOW", "pastoral"],
  ["ON-RAINBOW", "pastoral"],
  ["ARAGAIN-FALLS", "pastoral"],
  ["RIVER-1", "pastoral"],
  ["RIVER-2", "pastoral"],
  ["RIVER-3", "pastoral"],
  ["RIVER-4", "pastoral"],
  ["RIVER-5", "pastoral"],
  ["WHITE-CLIFFS-NORTH", "pastoral"],
  ["WHITE-CLIFFS-SOUTH", "pastoral"],
  ["SHORE", "pastoral"],
  ["SANDY-BEACH", "pastoral"],

  // The house.
  ["KITCHEN", "house-interior"],
  ["LIVING-ROOM", "house-interior"],
  ["ATTIC", "attic"],

  // The cellar and the troll's lair below it.
  ["CELLAR", "cellar"],
  ["TROLL-ROOM", "troll-room"],

  // The art rooms.
  ["GALLERY", "gallery"],
  ["STUDIO", "gallery"],

  // The maze and its dead ends (DEAD-END-5 is in the coal mine, not here).
  ["MAZE-1", "maze"], ["MAZE-2", "maze"], ["MAZE-3", "maze"], ["MAZE-4", "maze"],
  ["MAZE-5", "maze"], ["MAZE-6", "maze"], ["MAZE-7", "maze"], ["MAZE-8", "maze"],
  ["MAZE-9", "maze"], ["MAZE-10", "maze"], ["MAZE-11", "maze"], ["MAZE-12", "maze"],
  ["MAZE-13", "maze"], ["MAZE-14", "maze"], ["MAZE-15", "maze"],
  ["DEAD-END-1", "maze"], ["DEAD-END-2", "maze"], ["DEAD-END-3", "maze"],
  ["DEAD-END-4", "maze"], ["GRATING-ROOM", "maze"],

  // The cyclops and the thief's treasure room above it.
  ["CYCLOPS-ROOM", "cyclops-room"],
  ["TREASURE-ROOM", "cyclops-room"],

  // The reservoir and the stream that feeds it.
  ["RESERVOIR-SOUTH", "reservoir"],
  ["RESERVOIR", "reservoir"],
  ["RESERVOIR-NORTH", "reservoir"],
  ["STREAM-VIEW", "reservoir"],
  ["IN-STREAM", "reservoir"],

  // The dam and its works. Maintenance has its own backdrop.
  ["DAM-ROOM", "dam-lobby"],
  ["DAM-LOBBY", "dam-lobby"],
  ["DAM-BASE", "dam-lobby"],
  ["MAINTENANCE-ROOM", "maintenance-room"],

  // The mirror rooms.
  ["MIRROR-ROOM-1", "mirror-room"],
  ["MIRROR-ROOM-2", "mirror-room"],

  // The round room and the temple reached from it.
  ["ROUND-ROOM", "round-room"],
  ["NORTH-TEMPLE", "temple"],
  ["SOUTH-TEMPLE", "temple"],
  ["EGYPT-ROOM", "egypt-room"],
  ["TORCH-ROOM", "torch-room"],
  ["DOME-ROOM", "dome-room"],
  ["LOUD-ROOM", "loud-room"],
  ["ENGRAVINGS-CAVE", "engravings-cave"],

  // The land of the dead.
  ["ENTRANCE-TO-HADES", "hades-entrance"],
  ["LAND-OF-LIVING-DEAD", "land-of-living-dead"],

  // Atlantis.
  ["ATLANTIS-ROOM", "atlantis"],

  // The coal mine: shaft and timbering are `timber-room`, the gas engine is
  // `machine-room`, everything else is generic cave.
  ["SHAFT-ROOM", "timber-room"],
  ["LADDER-TOP", "timber-room"],
  ["LADDER-BOTTOM", "timber-room"],
  ["TIMBER-ROOM", "timber-room"],
  ["LOWER-SHAFT", "timber-room"],
  ["MACHINE-ROOM", "machine-room"],
  ["MINE-ENTRANCE", "cave-system"],
  ["SQUEEKY-ROOM", "cave-system"],
  ["BAT-ROOM", "cave-system"],
  ["SMELLY-ROOM", "cave-system"],
  ["GAS-ROOM", "cave-system"],
  ["DEAD-END-5", "cave-system"],
  ["MINE-1", "cave-system"], ["MINE-2", "cave-system"],
  ["MINE-3", "cave-system"], ["MINE-4", "cave-system"],
  ["SLIDE-ROOM", "cave-system"],

  // The connecting passages and lesser caves underground.
  ["EAST-OF-CHASM", "cave-system"],
  ["STRANGE-PASSAGE", "cave-system"],
  ["SMALL-CAVE", "cave-system"],
  ["TINY-CAVE", "cave-system"],
  ["COLD-PASSAGE", "cave-system"],
  ["NARROW-PASSAGE", "cave-system"],
  ["WINDING-PASSAGE", "cave-system"],
  ["TWISTING-PASSAGE", "cave-system"],
  ["EW-PASSAGE", "cave-system"],
  ["NS-PASSAGE", "cave-system"],
  ["DEEP-CANYON", "cave-system"],
  ["DAMP-CAVE", "cave-system"],
  ["CHASM-ROOM", "cave-system"],
  ["SANDY-CAVE", "cave-system"],
]);

/**
 * The one place a backdrop is chosen by something other than the room, and the
 * reason is that the room does not exist (v0.27.6, `FUTURE_WORK.md` F1).
 *
 * Zork I never modeled the inside of the barrow: `STONE-BARROW-FCN` prints the
 * ending and calls `<FINISH>` (`1dungeon.zil:1254`), so the player wins
 * *standing in* `STONE-BARROW` and there is no id to key `barrow-interior` on.
 * The affect marker is the only fact that distinguishes the six panels of the
 * ending from the exterior shot beside them — the win is the one turn in the
 * game whose picture is not a picture of its room. The Hero's declaration opts
 * out per line (`PageLine.marker`), so the frame at the door stays outside.
 */
const MARKER_BACKDROPS: ReadonlyMap<string, BackdropId> = new Map([
  ["victory", "barrow-interior"],
]);

/**
 * The backdrop for a panel: its marker's, when the marker names one, and
 * otherwise its room's — or `room` when the room is not in the table.
 *
 * Total by construction: the establishing rung always has something to draw.
 */
export function backdropFor(room: string, marker: string | null = null): BackdropId {
  if (marker !== null) {
    const override = MARKER_BACKDROPS.get(marker);
    if (override !== undefined) return override;
  }
  return ROOM_BACKDROPS.get(room) ?? "room";
}
