/**
 * Booting an IR world document into live {@link GameState} (stage 4.1).
 *
 * The world document is declarative: it says where things *start*, not how the
 * object tree is shaped. This module is where those two views meet — every
 * structural relationship the schema describes as "derived" (rooms live under
 * the ROOMS meta entity, global objects under GLOBAL-OBJECTS, scenery under
 * LOCAL-GLOBALS) is materialised here exactly once, so no later stage has to
 * special-case a container that only exists implicitly.
 */

import type {
  BehaviorValue,
  ObjectLocation,
  TableElement,
  WorldDocument,
  WorldObject,
} from "@grues-in-comic/ir";
import { indexWorld, PLAYER_ID, type GameState, type RuntimeTable, type WorldIndex } from "./state.js";

/**
 * Object properties that are mutable at runtime. The IR stores an object's
 * initial property values inline on the object; behavior reads and writes them
 * through `prop`/`set-prop` by IR field name, so state must carry a copy —
 * writing back to the document would corrupt a world shared between engines.
 */
const MUTABLE_PROPERTY_KEYS = [
  "action",
  "capacity",
  "description",
  "descriptionRoutine",
  "initialDescription",
  "size",
  "strength",
  "text",
  "treasureValue",
  "value",
  "vehicleType",
] as const satisfies readonly (keyof WorldObject)[];

export interface LoadOptions {
  /**
   * Where the player starts. Defaults to the first room in document order,
   * which is the ZIL convention (Zork I's `<SETG HERE ,WEST-OF-HOUSE>`) but is
   * a convention, not a guarantee — pass it explicitly for any other world.
   */
  start?: string;
}

export interface LoadedWorld {
  world: WorldIndex;
  state: GameState;
}

export function loadWorld(doc: WorldDocument, options: LoadOptions = {}): LoadedWorld {
  const world = indexWorld(doc);

  const state: GameState = {
    globals: {},
    flags: {},
    locations: {},
    children: {},
    properties: {},
    tables: {},
    turn: 0,
    visited: new Set(),
    clock: [],
  };

  for (const g of doc.globals) state.globals[g.id] = g.value;

  for (const t of doc.tables) {
    state.tables[t.id] = {
      kind: t.kind,
      elements: t.elements.map(elementValue),
      pure: t.pure ?? false,
    };
  }

  // Meta entities first: rooms and global objects are parented into them below,
  // and LOCAL-GLOBALS nests inside GLOBAL-OBJECTS (the parser's scope walk
  // depends on that nesting, so it is load-time structure, not a runtime hack).
  const roleContainer = new Map<string, string>();
  for (const m of doc.metaEntities ?? []) {
    roleContainer.set(m.role, m.id);
    state.children[m.id] ??= [];
  }
  for (const m of doc.metaEntities ?? []) {
    if (m.location !== undefined) link(state, m.id, m.location);
  }

  const roomsContainer = roleContainer.get("rooms");
  for (const room of doc.rooms) {
    state.flags[room.id] = new Set(room.flags);
    /*
     * Rooms carry properties too, and behavior reads them the same way it reads
     * an object's: DESCRIBE-ROOM does `<APPLY <GETP ,HERE ,P?ACTION> ,M-LOOK>`
     * and `<GETP ,HERE ,P?LDESC>`. Populating objects only left every such read
     * returning the property default, so rooms whose description is computed
     * printed nothing at all while rooms with a static one were unaffected.
     */
    const props: Record<string, BehaviorValue> = {};
    if (room.action !== undefined) props["action"] = room.action;
    if (room.description !== undefined) props["description"] = room.description;
    state.properties[room.id] = props;

    if (roomsContainer !== undefined) link(state, room.id, roomsContainer);
  }

  for (const obj of doc.objects) {
    state.flags[obj.id] = new Set(obj.flags);
    const props: Record<string, BehaviorValue> = {};
    for (const key of MUTABLE_PROPERTY_KEYS) {
      const v = obj[key];
      if (v !== undefined) props[key] = v;
    }
    state.properties[obj.id] = props;

    const parent = containerFor(obj.location, roleContainer);
    if (parent !== undefined) link(state, obj.id, parent);
  }

  const start = options.start ?? doc.rooms[0]?.id;
  if (start === undefined) throw new Error("world has no rooms; nowhere to start");
  if (!world.rooms.has(start)) throw new Error(`start room ${start} is not a room in this world`);

  // ZIL's GO routine seeds these before the first turn. HERE is declared in the
  // document with a placeholder value because ZIL globals must be declared
  // before the room ids exist.
  state.globals["HERE"] = start;
  state.globals["WINNER"] = PLAYER_ID;
  state.globals["MOVES"] = 0;
  // The start room counts as visited: the player is standing in it, so a
  // return trip must not read as a first visit (first-visit scoring, stage 4.3).
  state.visited.add(start);

  // The player is a real object-tree node so containment tests need no special
  // case. The document leaves it "nowhere" — placing it is a runtime decision.
  if (world.objects.has(PLAYER_ID)) link(state, PLAYER_ID, start);

  return { world, state };
}

/**
 * Attach a child during load, at the **front** of the parent's child list.
 *
 * The Z-machine builds its object tree with `insert_obj`, which prepends, so a
 * container's children end up in *reverse* declaration order. Loading in
 * document order instead is a plausible-looking mistake that produces plausible
 * -looking output: every object is present and in a stable order, just not the
 * original's. Stage 4.4's transcript diff is what settled it — the Kitchen
 * lists the bottle before the sack and the Living Room the sword before the
 * lantern, both the reverse of how `1dungeon.zil` declares them.
 *
 * This is the same rule as the runtime {@link move}, which is the point: there
 * is one insertion order in the object tree, not one for loading and another
 * for play.
 */
function link(state: GameState, entity: string, parent: string): void {
  state.locations[entity] = parent;
  (state.children[parent] ??= []).unshift(entity);
}

function containerFor(
  location: ObjectLocation,
  roleContainer: Map<string, string>,
): string | undefined {
  switch (location.kind) {
    case "room":
    case "object":
      return location.id;
    case "global":
      return roleContainer.get("global-objects");
    case "local-globals":
      return roleContainer.get("local-globals");
    case "nowhere":
      return undefined;
  }
}

/** Entity refs collapse to their id string — that is how behavior values name entities. */
function elementValue(e: TableElement): BehaviorValue {
  if (typeof e === "object" && e !== null && "ref" in e) return e.ref;
  return e;
}
