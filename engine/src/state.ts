/**
 * Engine world runtime (stage 4.1) — the mutable state an IR world document
 * boots into, plus the object-tree primitives every later stage builds on.
 *
 * Division of labour: the IR document is *immutable input* (it is the compiled
 * game), and {@link GameState} is *everything that changes*. Nothing in here
 * reaches back into the document to mutate it, which is what makes
 * {@link GameState} a complete save file on its own.
 */

import type { BehaviorValue, WorldDocument } from "@grues-in-comic/ir";

/**
 * A table's runtime storage. Element 0 of an `ltable` is its length, exactly as
 * ZIL lays it out, so extracted `GET`/`PUT` offsets need no translation.
 */
export interface RuntimeTable {
  kind: "table" | "ltable" | "itable";
  elements: BehaviorValue[];
  /** ZIL (PURE): writes are a bug, not a game mechanic. */
  pure: boolean;
}

/**
 * The player. ZIL models the player as an object (WINNER/ADVENTURER) in the
 * object tree, and so do we — `PLAYER_ID` is a real node, so `<IN? .OBJ ,WINNER>`
 * and carrying-capacity checks work with no special case.
 */
export const PLAYER_ID = "ADVENTURER";

/** Complete mutable game state. JSON-serializable except for the flag Sets. */
export interface GameState {
  /** Global variables (ZIL GLOBAL), including HERE and the score counters. */
  globals: Record<string, BehaviorValue>;
  /** Entity id → set flags. */
  flags: Record<string, Set<string>>;
  /** Entity id → containing entity id (absent = nowhere / detached). */
  locations: Record<string, string>;
  /**
   * Container id → ordered children, kept consistent with `locations`.
   * {@link move} inserts at the FRONT, matching the Z-machine `insert_obj`
   * opcode — object listing order in a room depends on this being right.
   */
  children: Record<string, string[]>;
  /** Entity id → mutable property values, keyed by IR field name. */
  properties: Record<string, Record<string, BehaviorValue>>;
  /** Table id → runtime storage. */
  tables: Record<string, RuntimeTable>;
  /** Turn counter (ZIL MOVES). */
  turn: number;
  /** Rooms the player has already entered, for first-visit scoring/description. */
  visited: Set<string>;
  /**
   * Interrupt record table ids in CLOCKER iteration order (gclock.zil C-TABLE):
   * newest allocation first, matching the ZIL walk from C-INTS toward the table
   * end. Each record is a 3-slot table in `tables` —
   * [C-ENABLED?, C-TICK, C-RTN] = [0|1, tick, routine name].
   */
  clock: string[];
}

/** Read-only view of the IR document, indexed for O(1) lookup during play. */
export interface WorldIndex {
  doc: WorldDocument;
  rooms: Map<string, WorldDocument["rooms"][number]>;
  objects: Map<string, WorldDocument["objects"][number]>;
  /** Rooms and objects together — most engine code doesn't care which it has. */
  entityKind: Map<string, "room" | "object" | "meta">;
}

export function indexWorld(doc: WorldDocument): WorldIndex {
  const rooms = new Map(doc.rooms.map((r) => [r.id, r]));
  const objects = new Map(doc.objects.map((o) => [o.id, o]));
  const entityKind = new Map<string, "room" | "object" | "meta">();
  for (const r of doc.rooms) entityKind.set(r.id, "room");
  for (const o of doc.objects) entityKind.set(o.id, "object");
  for (const m of doc.metaEntities ?? []) entityKind.set(m.id, "meta");
  return { doc, rooms, objects, entityKind };
}

/* ---------------- object tree ---------------- */

export function locationOf(state: GameState, entity: string): string | undefined {
  return state.locations[entity];
}

export function childrenOf(state: GameState, container: string): readonly string[] {
  return state.children[container] ?? [];
}

/** ZIL FIRST? — the container's first child, or undefined when empty. */
export function firstChild(state: GameState, container: string): string | undefined {
  return state.children[container]?.[0];
}

/** ZIL NEXT? — the entity's next sibling under its current parent. */
export function nextSibling(state: GameState, entity: string): string | undefined {
  const parent = state.locations[entity];
  if (parent === undefined) return undefined;
  const siblings = state.children[parent];
  if (siblings === undefined) return undefined;
  const i = siblings.indexOf(entity);
  return i >= 0 ? siblings[i + 1] : undefined;
}

/**
 * ZIL IN? is a *direct* containment test — one level, not transitive.
 * Use {@link isWithin} when you mean "anywhere inside".
 */
export function isIn(state: GameState, entity: string, container: string): boolean {
  return state.locations[entity] === container;
}

/** Transitive containment: is `entity` inside `container` at any depth? */
export function isWithin(state: GameState, entity: string, container: string): boolean {
  let at = state.locations[entity];
  // Guard against a cycle rather than hanging: the tree is data, and data lies.
  for (let hops = 0; at !== undefined && hops < 64; hops++) {
    if (at === container) return true;
    at = state.locations[at];
  }
  return false;
}

/** ZIL MOVE — reparent, becoming the new container's first child. */
export function move(state: GameState, entity: string, to: string): void {
  remove(state, entity);
  state.locations[entity] = to;
  (state.children[to] ??= []).unshift(entity);
}

/** ZIL REMOVE — detach from the tree entirely (the object is now nowhere). */
export function remove(state: GameState, entity: string): void {
  const parent = state.locations[entity];
  if (parent === undefined) return;
  const siblings = state.children[parent];
  const i = siblings?.indexOf(entity) ?? -1;
  if (i >= 0) siblings!.splice(i, 1);
  delete state.locations[entity];
}

/* ---------------- flags ---------------- */

export function hasFlag(state: GameState, entity: string, flag: string): boolean {
  return state.flags[entity]?.has(flag) ?? false;
}

export function setFlag(state: GameState, entity: string, flag: string): void {
  (state.flags[entity] ??= new Set()).add(flag);
}

export function clearFlag(state: GameState, entity: string, flag: string): void {
  state.flags[entity]?.delete(flag);
}

/* ---------------- convenience ---------------- */

/** The room the player is in (ZIL HERE). */
export function here(state: GameState): string {
  const v = state.globals["HERE"];
  if (typeof v !== "string") throw new Error("HERE is not a room id");
  return v;
}

/** ZIL truth: only `<>` (false) is false — 0 and "" are true. */
export function truthy(v: BehaviorValue | undefined): boolean {
  return v !== undefined && v !== false;
}
