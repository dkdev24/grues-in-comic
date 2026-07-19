/**
 * Stage 2.2 POC — minimal world state and the engine-builtin layer.
 *
 * Shared by BOTH behavior representations under comparison (interpreted AST
 * and hand-transpiled TypeScript) so the differential tests compare only the
 * representation, never the substrate.
 */

import type { BehaviorValue } from "../src/behavior.js";

/** ZIL LTABLEs answer their element count at index 0 (see `table-get`). */
export interface RuntimeTable {
  kind: "table" | "ltable";
  elements: BehaviorValue[];
}

export interface WorldState {
  globals: Record<string, BehaviorValue>;
  /** Entity id → set flags. */
  flags: Record<string, Set<string>>;
  /** Entity id → containing entity id (object tree; absent = nowhere). */
  locations: Record<string, string>;
  /**
   * Container id → ordered child list, consistent with `locations` (for
   * `first`/`next`). `moveEntity` inserts at the FRONT (Z-machine
   * `insert_obj`); initial order is the `locations` init insertion order.
   */
  children: Record<string, string[]>;
  /** Entity id → short name, for TELL `D` parts (defaults to the id). */
  names: Record<string, string>;
  /** Entity id → property values, for `prop`/`set-prop` (IR field names). */
  properties: Record<string, Record<string, BehaviorValue>>;
  /** Table id → runtime table, for `table-get`/`table-set` (refs → id strings). */
  tables: Record<string, RuntimeTable>;
  /** Verb of the action being processed (ZIL PRSA). */
  verb: string;
  /** Narration chunks; join("") for the transcript. */
  output: string[];
  /** Directions re-dispatched via DO-WALK, in order. */
  walks: string[];
  /** Pronoun referent set by THIS-IS-IT (ZIL P-IT-OBJECT). */
  itObject?: string;
  /**
   * Interrupt record table ids in CLOCKER iteration order (gclock.zil
   * C-TABLE): newest allocation first, matching the ZIL walk from C-INTS
   * toward the table end. Each record is a 3-slot table in `tables` —
   * [C-ENABLED?, C-TICK, C-RTN] = [0|1, tick, routine name].
   */
  clock: string[];
}

export function makeWorld(init: {
  globals?: Record<string, BehaviorValue>;
  flags?: Record<string, string[]>;
  locations?: Record<string, string>;
  names?: Record<string, string>;
  properties?: Record<string, Record<string, BehaviorValue>>;
  tables?: Record<string, RuntimeTable>;
  here: string;
  verb: string;
}): WorldState {
  const flags: Record<string, Set<string>> = {};
  for (const [id, list] of Object.entries(init.flags ?? {})) flags[id] = new Set(list);
  const properties: Record<string, Record<string, BehaviorValue>> = {};
  for (const [id, props] of Object.entries(init.properties ?? {})) properties[id] = { ...props };
  const tables: Record<string, RuntimeTable> = {};
  for (const [id, t] of Object.entries(init.tables ?? {})) {
    tables[id] = { kind: t.kind, elements: [...t.elements] };
  }
  const locations = { ...init.locations };
  const children: Record<string, string[]> = {};
  for (const [child, parent] of Object.entries(locations)) {
    (children[parent] ??= []).push(child);
  }
  return {
    globals: { HERE: init.here, ...init.globals },
    flags,
    locations,
    children,
    names: { ...init.names },
    properties,
    tables,
    verb: init.verb,
    output: [],
    walks: [],
    clock: [],
  };
}

/** Observable outcome snapshot used by the differential tests. */
export function snapshot(world: WorldState, returned: BehaviorValue) {
  return {
    returned,
    transcript: world.output.join(""),
    walks: [...world.walks],
    itObject: world.itObject,
    globals: { ...world.globals },
    locations: { ...world.locations },
    children: Object.fromEntries(Object.entries(world.children).map(([id, c]) => [id, [...c]])),
    flags: Object.fromEntries(Object.entries(world.flags).map(([id, s]) => [id, [...s].sort()])),
    properties: Object.fromEntries(
      Object.entries(world.properties).map(([id, props]) => [id, { ...props }]),
    ),
    tables: Object.fromEntries(
      Object.entries(world.tables).map(([id, t]) => [id, [...t.elements]]),
    ),
  };
}

export function truthy(v: BehaviorValue): boolean {
  return v !== false;
}

export function hasFlag(world: WorldState, entity: string, flag: string): boolean {
  return world.flags[entity]?.has(flag) ?? false;
}

export function setFlag(world: WorldState, entity: string, flag: string): void {
  (world.flags[entity] ??= new Set()).add(flag);
}

export function clearFlag(world: WorldState, entity: string, flag: string): void {
  world.flags[entity]?.delete(flag);
}

/** Reparent an entity (behavior `move`): becomes the new container's FIRST child. */
export function moveEntity(world: WorldState, entity: string, to: string): void {
  removeEntity(world, entity);
  world.locations[entity] = to;
  (world.children[to] ??= []).unshift(entity);
}

/** Take an entity out of the world (behavior `remove`). */
export function removeEntity(world: WorldState, entity: string): void {
  const parent = world.locations[entity];
  if (parent !== undefined) {
    const siblings = world.children[parent];
    const i = siblings?.indexOf(entity) ?? -1;
    if (i >= 0) siblings!.splice(i, 1);
  }
  delete world.locations[entity];
}

export function tell(world: WorldState, text: string, newline = false): void {
  world.output.push(newline ? `${text}\n` : text);
}

/* ---- engine builtins (ZIL utility layer, shared by every game) ---- */

/**
 * ZIL PICK-ONE over the DUMMY refusal table. The original picks randomly;
 * the engine will use a seeded RNG (transcript-replay determinism). The POC
 * pins the first entry.
 */
const DUMMY_RESPONSES = ["Look around.", "Too late for that.", "Have your eyes checked."];

export type Builtin = (world: WorldState, args: BehaviorValue[]) => BehaviorValue;

export const builtins: Record<string, Builtin> = {
  /** ZIL OPEN-CLOSE (1actions.zil:28): shared open/close handler. */
  "OPEN-CLOSE": (world, [obj, strOpen, strClose]) => {
    if (typeof obj !== "string" || typeof strOpen !== "string" || typeof strClose !== "string") {
      throw new Error("OPEN-CLOSE expects (entity, openText, closeText)");
    }
    if (world.verb === "OPEN") {
      if (hasFlag(world, obj, "OPENBIT")) tell(world, DUMMY_RESPONSES[0]!);
      else {
        tell(world, strOpen);
        setFlag(world, obj, "OPENBIT");
      }
      tell(world, "", true);
    } else if (world.verb === "CLOSE") {
      if (hasFlag(world, obj, "OPENBIT")) {
        tell(world, strClose);
        clearFlag(world, obj, "OPENBIT");
      } else {
        tell(world, DUMMY_RESPONSES[0]!);
      }
      tell(world, "", true);
    }
    return true;
  },
  /** ZIL DO-WALK (gverbs.zil:2148): re-dispatch the action as WALK <dir>. */
  "DO-WALK": (world, [dir]) => {
    if (typeof dir !== "string") throw new Error("DO-WALK expects a direction");
    world.walks.push(dir);
    return true;
  },
  /** ZIL THIS-IS-IT (gverbs.zil:2191): set the pronoun referent. */
  "THIS-IS-IT": (world, [obj]) => {
    if (typeof obj !== "string") throw new Error("THIS-IS-IT expects an entity");
    world.itObject = obj;
    return true;
  },
  /* ZIL clock (gclock.zil): the interrupt table is engine state. QUEUE/INT
   * return an interrupt record — a 3-slot table addressed by the
   * C-ENABLED?/C-TICK/C-RTN constants (0/1/2) — so extracted GET/PUT code
   * works on it unchanged. ENABLE/DISABLE (gmacros.zil DEFMACs) flip slot 0. */
  QUEUE: (world, [rtn, tick]) => {
    if (typeof rtn !== "string" || typeof tick !== "number") {
      throw new Error("QUEUE expects (routine, tick)");
    }
    const id = builtins["INT"]!(world, [rtn]);
    interruptRecord(world, id).elements[C_TICK] = tick;
    return id;
  },
  INT: (world, [rtn]) => {
    if (typeof rtn !== "string") throw new Error("INT expects a routine name");
    const id = `INT-${rtn}`;
    if (world.tables[id] === undefined) {
      world.tables[id] = { kind: "table", elements: [0, 0, rtn] };
      world.clock.unshift(id);
    }
    return id;
  },
  ENABLE: (world, [int]) => {
    interruptRecord(world, int).elements[C_ENABLED] = 1;
    return int!;
  },
  DISABLE: (world, [int]) => {
    interruptRecord(world, int).elements[C_ENABLED] = 0;
    return int!;
  },
  /**
   * One end-of-turn tick: decrement every enabled record's tick and apply
   * its routine when the pre-decrement tick was ≤ 1 (so a tick of −1 is a
   * demon firing every turn, and 0 means dormant). Honors CLOCK-WAIT and
   * increments MOVES, as in gclock.zil. The engine's P-WON demon-region
   * gating (parser-failure turns run demons only) is stage 4.5 work.
   */
  CLOCKER: (world) => {
    if (truthy(world.globals["CLOCK-WAIT"] ?? false)) {
      world.globals["CLOCK-WAIT"] = false;
      return false;
    }
    let flg: BehaviorValue = false;
    for (const id of [...world.clock]) {
      const rec = interruptRecord(world, id);
      if (rec.elements[C_ENABLED] !== 1) continue;
      const tick = rec.elements[C_TICK];
      if (typeof tick !== "number" || tick === 0) continue;
      rec.elements[C_TICK] = tick - 1;
      if (tick <= 1) {
        const rtn = rec.elements[C_RTN];
        const fire = builtins[String(rtn)];
        if (fire === undefined) throw new Error(`CLOCKER: unknown routine ${String(rtn)}`);
        if (truthy(fire(world, []))) flg = true;
      }
    }
    world.globals["MOVES"] = (Number(world.globals["MOVES"]) || 0) + 1;
    return flg;
  },
};

/** Interrupt record slots (gclock.zil C-ENABLED?/C-TICK/C-RTN constants). */
const C_ENABLED = 0;
const C_TICK = 1;
const C_RTN = 2;

function interruptRecord(world: WorldState, id: BehaviorValue | undefined): RuntimeTable {
  const record = typeof id === "string" ? world.tables[id] : undefined;
  if (record === undefined) throw new Error(`not an interrupt record: ${String(id)}`);
  return record;
}
