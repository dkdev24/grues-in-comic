/**
 * Stage 2.2 POC — minimal world state and the engine-builtin layer.
 *
 * Shared by BOTH behavior representations under comparison (interpreted AST
 * and hand-transpiled TypeScript) so the differential tests compare only the
 * representation, never the substrate.
 */

import type { BehaviorValue } from "../src/behavior.js";

export interface WorldState {
  globals: Record<string, BehaviorValue>;
  /** Entity id → set flags. */
  flags: Record<string, Set<string>>;
  /** Verb of the action being processed (ZIL PRSA). */
  verb: string;
  /** Narration chunks; join("") for the transcript. */
  output: string[];
  /** Directions re-dispatched via DO-WALK, in order. */
  walks: string[];
  /** Pronoun referent set by THIS-IS-IT (ZIL P-IT-OBJECT). */
  itObject?: string;
}

export function makeWorld(init: {
  globals?: Record<string, BehaviorValue>;
  flags?: Record<string, string[]>;
  here: string;
  verb: string;
}): WorldState {
  const flags: Record<string, Set<string>> = {};
  for (const [id, list] of Object.entries(init.flags ?? {})) flags[id] = new Set(list);
  return {
    globals: { HERE: init.here, ...init.globals },
    flags,
    verb: init.verb,
    output: [],
    walks: [],
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
    flags: Object.fromEntries(Object.entries(world.flags).map(([id, s]) => [id, [...s].sort()])),
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
};
