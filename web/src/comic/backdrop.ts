/**
 * Room → backdrop assignment (ADR 0004 §7, the establishing rung).
 *
 * **Three backdrops for 110 rooms.** Comic Chat v1.0 shipped exactly three
 * (`pastoral`, `field`, `room8bs`) and no `AT_BACKDROP` assets survive, so this
 * is an assignment problem, not a lookup. What makes it tractable is that Zork
 * is mostly indoors: of 110 rooms, the great majority are cellar, maze, temple
 * and cave — rooms a generic interior serves honestly. The outdoors is small
 * and it is the part the reader sees first.
 *
 * So the table names the **outdoor** rooms and everything else falls through to
 * `room`. That inverts the obvious shape on purpose: the default is the case
 * with the most members, and a room missing from the table gets a plausible
 * backdrop rather than none.
 *
 * **This is a table, not a regex.** The 5.3 stub tested `/…|HOUSE|…/` before
 * `/^(WEST|NORTH|SOUTH|EAST)-OF-HOUSE$/`, so all four house rooms matched the
 * first branch and the `field` backdrop never drew — a dead branch that no test
 * could see, because the stub always returned *some* backdrop. Room ids are a
 * closed set from the world document; matching them by pattern buys nothing and
 * costs exactly this.
 */

/** The backdrops packed by `art/tools/avbpack.ts`; see `art/package.json`. */
export type BackdropId = "pastoral" | "field" | "room";

/**
 * The rooms that are not interiors.
 *
 * `field` is the white house's clearing — the four rooms that ring it, where
 * the house itself is the subject. `pastoral` is everywhere else above ground:
 * forest, path, clearing, mountainside, the barrow.
 *
 * Coverage is asserted against the world document in `test/backdrop.test.ts`,
 * which fails if a new outdoor room appears unassigned.
 */
const OUTDOORS = new Map<string, BackdropId>([
  // The house clearing. EAST-OF-HOUSE is "Behind House" — the id and the
  // printed name disagree, which is why this table keys on ids.
  ["WEST-OF-HOUSE", "field"],
  ["NORTH-OF-HOUSE", "field"],
  ["SOUTH-OF-HOUSE", "field"],
  ["EAST-OF-HOUSE", "field"],

  // The woods and the high ground.
  ["FOREST-1", "pastoral"],
  ["FOREST-2", "pastoral"],
  ["FOREST-3", "pastoral"],
  ["PATH", "pastoral"],
  ["UP-A-TREE", "pastoral"],
  ["CLEARING", "pastoral"],
  ["GRATING-CLEARING", "pastoral"],
  ["CANYON-VIEW", "pastoral"],
  ["CLIFF-MIDDLE", "pastoral"],
  ["CANYON-BOTTOM", "pastoral"],
  ["END-OF-RAINBOW", "pastoral"],
  ["ARAGAIN-FALLS", "pastoral"],
  ["MOUNTAINS", "pastoral"],
  ["STONE-BARROW", "pastoral"],
]);

/**
 * The backdrop for a room, or `room` when the room is not in the outdoor table.
 *
 * Total by construction: the establishing rung always has something to draw.
 */
export function backdropFor(room: string): BackdropId {
  return OUTDOORS.get(room) ?? "room";
}

/** The outdoor assignments, for tests and tooling. Do not mutate. */
export const OUTDOOR_BACKDROPS: ReadonlyMap<string, BackdropId> = OUTDOORS;
