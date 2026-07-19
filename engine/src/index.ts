/**
 * `@grues-in-comic/engine` — the platform-independent engine core (milestone 4).
 *
 * Zero runtime dependencies by design (ADR 0002 / Gate B): the IR package is
 * imported for *types only*, so nothing here survives into the emitted JS. No
 * DOM, no timers, no I/O — a UI drives the engine by calling `command()` and
 * rendering the events it returns.
 */

export { CONTRACT_VERSION, transcriptText } from "./events.js";
export type { EngineEvent, NarrationChannel, TurnResult } from "./events.js";

export { Rng } from "./rng.js";

export { loadWorld } from "./load.js";
export type { LoadOptions, LoadedWorld } from "./load.js";

export {
  PLAYER_ID,
  indexWorld,
  locationOf,
  childrenOf,
  firstChild,
  nextSibling,
  isIn,
  isWithin,
  move,
  remove,
  hasFlag,
  setFlag,
  clearFlag,
  here,
  truthy,
} from "./state.js";
export type { GameState, RuntimeTable, WorldIndex } from "./state.js";

export { exitFor, resolveExit, goTo, roomIsLit } from "./movement.js";
export type { ExitResolution } from "./movement.js";
