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
  | "engravings-cave" | "room"
  // Diversity pass (Image 4): splits `cave-system` and `maze` to cap reuse at 5.
  | "coal-mine" | "chasm-cave" | "winding-passage" | "small-cave"
  | "highlands" | "rainbow-falls" | "river" | "shoreline"
  | "maze-deep" | "maze-twisting" | "maze-dead-ends"
  // Diversity pass (Image 5): takes `pastoral` / `highlands` / `shoreline` to
  // one backdrop per room.
  | "forest-dark" | "forest-edge" | "forest-path" | "up-a-tree" | "east-clearing"
  | "canyon-view" | "cliff-middle" | "canyon-bottom" | "sandy-beach"
  // Image 6: takes `reservoir` and `timber-room` to one backdrop per room.
  | "reservoir-south" | "reservoir-north" | "stream-view" | "in-stream"
  | "shaft-room" | "ladder-top" | "ladder-bottom" | "lower-shaft"
  // Image 7: takes `river` and `rainbow-falls` to one backdrop per room.
  | "river-2" | "river-3" | "river-4" | "river-5"
  | "end-of-rainbow" | "on-rainbow" | "white-cliffs-north" | "white-cliffs-south"
  // Image 8: takes `winding-passage` and `small-cave` to one backdrop per room.
  | "strange-passage" | "narrow-passage" | "twisting-passage" | "cold-passage"
  | "tiny-cave" | "ew-passage" | "ns-passage" | "dead-end-5"
  // Image 9: takes `chasm-cave` and `cave-system` to one backdrop per room,
  // closing out the diversity-pass groups (Image 4's ≤5-cap ids).
  | "east-of-chasm" | "deep-canyon" | "damp-cave" | "sandy-cave"
  | "squeeky-room" | "bat-room" | "smelly-room" | "gas-room"
  // Image 10: takes `coal-mine`, `dam-lobby` and `temple` (from the original
  // 30-backdrop set) to one backdrop per room.
  | "mine-2" | "mine-3" | "mine-4" | "slide-room"
  | "dam-room" | "dam-base" | "south-temple"
  // Image 11: takes `maze`, `maze-deep`, `house-interior` and `gallery` to
  // one backdrop per room.
  | "maze-2" | "maze-3" | "maze-4" | "maze-5"
  | "maze-7" | "maze-8" | "maze-9" | "maze-10"
  | "living-room" | "studio"
  // Image 12: takes `maze-twisting`, `maze-dead-ends`, `mirror-room` and
  // `cyclops-room` to one backdrop per room.
  | "maze-12" | "maze-13" | "maze-14" | "maze-15"
  | "dead-end-2" | "dead-end-3" | "dead-end-4" | "grating-room"
  | "mirror-room-2" | "treasure-room"
  // Image 13: takes `field` to one backdrop per room — the last sheet,
  // reaching full 110/110 with no sharing.
  | "north-of-house" | "south-of-house" | "east-of-house";

/**
 * Every room in the world document, keyed by id, grouped by the backdrop it
 * draws. Ids — not printed names — are the keys: EAST-OF-HOUSE prints as "Behind
 * House", and the maze rooms all print "Maze".
 */
export const ROOM_BACKDROPS: ReadonlyMap<string, BackdropId> = new Map<string, BackdropId>([
  // Above ground. The house clearing is `field`; the woods, high ground, cliffs
  // and river run through `pastoral`; the barrow and grating get their own.
  // One backdrop per room (Image 13, the last for full 110/110) —
  // WEST-OF-HOUSE alone keeps the `field` id.
  ["WEST-OF-HOUSE", "field"],
  ["NORTH-OF-HOUSE", "north-of-house"],
  ["SOUTH-OF-HOUSE", "south-of-house"],
  ["EAST-OF-HOUSE", "east-of-house"],
  ["STONE-BARROW", "barrow-exterior"],
  ["GRATING-CLEARING", "grating-clearing"],
  ["FOREST-1", "pastoral"],
  ["FOREST-2", "forest-dark"],
  ["FOREST-3", "forest-edge"],
  ["MOUNTAINS", "highlands"],
  ["PATH", "forest-path"],
  ["UP-A-TREE", "up-a-tree"],
  ["CLEARING", "east-clearing"],
  ["CANYON-VIEW", "canyon-view"],
  ["CLIFF-MIDDLE", "cliff-middle"],
  ["CANYON-BOTTOM", "canyon-bottom"],
  // Rainbow Falls and the river. One backdrop per room (Image 7) —
  // ARAGAIN-FALLS alone keeps the `rainbow-falls` id, RIVER-1 the `river` id.
  ["END-OF-RAINBOW", "end-of-rainbow"],
  ["ON-RAINBOW", "on-rainbow"],
  ["ARAGAIN-FALLS", "rainbow-falls"],
  ["RIVER-1", "river"],
  ["RIVER-2", "river-2"],
  ["RIVER-3", "river-3"],
  ["RIVER-4", "river-4"],
  ["RIVER-5", "river-5"],
  ["WHITE-CLIFFS-NORTH", "white-cliffs-north"],
  ["WHITE-CLIFFS-SOUTH", "white-cliffs-south"],
  ["SHORE", "shoreline"],
  ["SANDY-BEACH", "sandy-beach"],

  // The house.
  // One backdrop per room (Image 11) — KITCHEN alone keeps the
  // `house-interior` id.
  ["KITCHEN", "house-interior"],
  ["LIVING-ROOM", "living-room"],
  ["ATTIC", "attic"],

  // The cellar and the troll's lair below it.
  ["CELLAR", "cellar"],
  ["TROLL-ROOM", "troll-room"],

  // The art rooms.
  // One backdrop per room (Image 11) — GALLERY alone keeps the
  // `gallery` id.
  ["GALLERY", "gallery"],
  ["STUDIO", "studio"],

  // The maze and its dead ends (DEAD-END-5 is in the coal mine, not here).
  // One backdrop per room (Image 11) — MAZE-1 alone keeps `maze`, MAZE-6
  // alone keeps `maze-deep`. Subtle variety only (rock formation/camera
  // angle) — no landmarks that would aid solving the maze.
  ["MAZE-1", "maze"], ["MAZE-2", "maze-2"], ["MAZE-3", "maze-3"], ["MAZE-4", "maze-4"],
  ["MAZE-5", "maze-5"],
  ["MAZE-6", "maze-deep"], ["MAZE-7", "maze-7"], ["MAZE-8", "maze-8"],
  ["MAZE-9", "maze-9"], ["MAZE-10", "maze-10"],
  // One backdrop per room (Image 12) — MAZE-11 alone keeps `maze-twisting`,
  // DEAD-END-1 alone keeps `maze-dead-ends`. Subtle variety only.
  ["MAZE-11", "maze-twisting"], ["MAZE-12", "maze-12"],
  ["MAZE-13", "maze-13"], ["MAZE-14", "maze-14"], ["MAZE-15", "maze-15"],
  ["DEAD-END-1", "maze-dead-ends"], ["DEAD-END-2", "dead-end-2"],
  ["DEAD-END-3", "dead-end-3"], ["DEAD-END-4", "dead-end-4"],
  ["GRATING-ROOM", "grating-room"],

  // The cyclops and the thief's treasure room above it.
  // One backdrop per room (Image 12) — CYCLOPS-ROOM alone keeps the
  // `cyclops-room` id.
  ["CYCLOPS-ROOM", "cyclops-room"],
  ["TREASURE-ROOM", "treasure-room"],

  // The reservoir and the stream that feeds it. One backdrop per room
  // (Image 6) — RESERVOIR alone keeps the `reservoir` id.
  ["RESERVOIR-SOUTH", "reservoir-south"],
  ["RESERVOIR", "reservoir"],
  ["RESERVOIR-NORTH", "reservoir-north"],
  ["STREAM-VIEW", "stream-view"],
  ["IN-STREAM", "in-stream"],

  // The dam and its works. Maintenance has its own backdrop.
  // One backdrop per room (Image 10) — DAM-LOBBY alone keeps the
  // `dam-lobby` id.
  ["DAM-ROOM", "dam-room"],
  ["DAM-LOBBY", "dam-lobby"],
  ["DAM-BASE", "dam-base"],
  ["MAINTENANCE-ROOM", "maintenance-room"],

  // The mirror rooms.
  // One backdrop per room (Image 12) — MIRROR-ROOM-1 alone keeps the
  // `mirror-room` id.
  ["MIRROR-ROOM-1", "mirror-room"],
  ["MIRROR-ROOM-2", "mirror-room-2"],

  // The round room and the temple reached from it.
  ["ROUND-ROOM", "round-room"],
  // One backdrop per room (Image 10) — NORTH-TEMPLE alone keeps the
  // `temple` id.
  ["NORTH-TEMPLE", "temple"],
  ["SOUTH-TEMPLE", "south-temple"],
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

  // The coal mine shaft and timbering. One backdrop per room (Image 6) —
  // TIMBER-ROOM alone keeps the `timber-room` id. The gas engine is
  // `machine-room`, everything else is generic cave.
  ["SHAFT-ROOM", "shaft-room"],
  ["LADDER-TOP", "ladder-top"],
  ["LADDER-BOTTOM", "ladder-bottom"],
  ["TIMBER-ROOM", "timber-room"],
  ["LOWER-SHAFT", "lower-shaft"],
  ["MACHINE-ROOM", "machine-room"],
  // One backdrop per room (Image 9) — MINE-ENTRANCE alone keeps the
  // `cave-system` id.
  ["MINE-ENTRANCE", "cave-system"],
  ["SQUEEKY-ROOM", "squeeky-room"],
  ["BAT-ROOM", "bat-room"],
  ["SMELLY-ROOM", "smelly-room"],
  ["GAS-ROOM", "gas-room"],

  // One backdrop per room (Image 10) — MINE-1 alone keeps the
  // `coal-mine` id.
  ["MINE-1", "coal-mine"], ["MINE-2", "mine-2"],
  ["MINE-3", "mine-3"], ["MINE-4", "mine-4"],
  ["SLIDE-ROOM", "slide-room"],

  // The connecting passages and lesser caves underground.
  // One backdrop per room (Image 9) — CHASM-ROOM alone keeps the
  // `chasm-cave` id.
  ["EAST-OF-CHASM", "east-of-chasm"],
  ["DEEP-CANYON", "deep-canyon"],
  ["CHASM-ROOM", "chasm-cave"],
  ["DAMP-CAVE", "damp-cave"],
  ["SANDY-CAVE", "sandy-cave"],

  // One backdrop per room (Image 8) — WINDING-PASSAGE alone keeps the
  // `winding-passage` id.
  ["STRANGE-PASSAGE", "strange-passage"],
  ["NARROW-PASSAGE", "narrow-passage"],
  ["WINDING-PASSAGE", "winding-passage"],
  ["TWISTING-PASSAGE", "twisting-passage"],
  ["COLD-PASSAGE", "cold-passage"],

  // One backdrop per room (Image 8) — SMALL-CAVE alone keeps the
  // `small-cave` id.
  ["SMALL-CAVE", "small-cave"],
  ["TINY-CAVE", "tiny-cave"],
  ["EW-PASSAGE", "ew-passage"],
  ["NS-PASSAGE", "ns-passage"],
  ["DEAD-END-5", "dead-end-5"],
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
