/**
 * Travel between rooms (stage 4.1) — resolving an exit, and the state
 * transition that follows a successful one.
 *
 * Exit resolution is deliberately split from *performing* the move. The parser,
 * a vehicle, a forced move by a daemon, and the THIEF all need to ask "where
 * does north lead from here, and may I go?" without committing to it, and stage
 * 4.3 needs the refusal *reason* to turn into the right narration event.
 */

import type { Direction, Exit } from "@grues-in-comic/ir";
import {
  hasFlag,
  here,
  move,
  truthy,
  type GameState,
  type WorldIndex,
  PLAYER_ID,
} from "./state.js";

export type ExitResolution =
  /** Travel permitted; `to` is the destination room. */
  | { kind: "go"; to: string }
  /** Travel refused with a specific message from the world document. */
  | { kind: "blocked"; message: string }
  /** Travel refused, no authored message — the caller supplies the default. */
  | { kind: "refused" }
  /**
   * The exit is computed by a routine (ZIL `PER`). Stage 4.1 has no behavior
   * interpreter, so resolution defers to the caller; stage 4.3 runs the routine
   * and folds the result back into one of the outcomes above.
   */
  | { kind: "routine"; routine: string }
  /** No such exit from this room at all. */
  | { kind: "none" };

/** Find the exit a room declares for a direction, if any. */
export function exitFor(
  world: WorldIndex,
  room: string,
  direction: Direction,
): Exit | undefined {
  return world.rooms.get(room)?.exits.find((e) => e.direction === direction);
}

/**
 * Decide what happens if the player walks `direction` from `room`, without
 * changing any state.
 */
export function resolveExit(
  world: WorldIndex,
  state: GameState,
  room: string,
  direction: Direction,
): ExitResolution {
  const exit = exitFor(world, room, direction);
  if (exit === undefined) return { kind: "none" };

  switch (exit.kind) {
    case "to":
      return { kind: "go", to: exit.to };
    case "blocked":
      return { kind: "blocked", message: exit.message };
    case "conditional":
      // ZIL `IF <global>`: the gate is a plain truth test on a global.
      if (truthy(state.globals[exit.if])) return { kind: "go", to: exit.to };
      return exit.else === undefined ? { kind: "refused" } : { kind: "blocked", message: exit.else };
    case "door":
      if (hasFlag(state, exit.door, "OPENBIT")) return { kind: "go", to: exit.to };
      return exit.else === undefined ? { kind: "refused" } : { kind: "blocked", message: exit.else };
    case "routine":
      return { kind: "routine", routine: exit.routine };
  }
}

/**
 * Move the player to a room and record the visit.
 *
 * Returns the room departed, so callers can emit `player-moved` without having
 * read HERE beforehand. Room *description* and first-visit scoring belong to
 * stage 4.3 (they are narration, and narration is action dispatch's job).
 */
export function goTo(state: GameState, to: string): { from: string; firstVisit: boolean } {
  const from = here(state);
  const firstVisit = !state.visited.has(to);
  state.globals["HERE"] = to;
  state.visited.add(to);
  move(state, PLAYER_ID, to);
  return { from, firstVisit };
}

/**
 * Is the player's current room lit? Stage 4.1 answers the static half only —
 * a room with ONBIT, or the ALWAYS-LIT debug global. Light *sources* carried
 * into a dark room are stage 4.3, once object scope exists.
 */
export function roomIsLit(state: GameState, room = here(state)): boolean {
  return truthy(state.globals["ALWAYS-LIT"]) || hasFlag(state, room, "ONBIT");
}
