/**
 * The Infocom status line, derived from the event stream alone (stage 5.2).
 *
 * This module is the shell's proof that the ADR 0002 contract is usable from
 * outside the engine: it reconstructs *room, score and moves* — the three
 * things the 1980 status bar showed — without reading engine internals, without
 * `snapshot()`, and without parsing narration prose. Two contract findings are
 * encoded here rather than worked around silently:
 *
 * 1. **`room-title` never arrives.** The engine delegates room description to
 *    Zork's own `DESCRIBE-ROOM`, which prints the name inside a `prose` line
 *    (HANDOFF open issue). The name comes from the world document instead,
 *    looked up by room id — which is why {@link createStatusTracker} takes a
 *    name table rather than listening for a title event. ADR 0004 §4 keeps the
 *    channel in the contract for exactly this consumer; this is what "the
 *    `player-moved` workaround remains available" looks like in code.
 *
 * 2. **`start()` emits no `player-moved`.** The opening turn reports the
 *    player's placement as an `object-moved` of {@link PLAYER_ID} whose `from`
 *    and `to` are both the starting room. A shell that watches `player-moved`
 *    alone therefore has no room to show until the player first walks. Watching
 *    the player's own `object-moved` covers both, so that is what we do.
 */

import { PLAYER_ID } from "../../engine/src/state.js";
import type { EngineEvent } from "../../engine/src/events.js";

export interface Status {
  /** Display name of the current room, or `""` before the first placement. */
  room: string;
  score: number;
  moves: number;
}

export interface StatusTracker {
  readonly status: Status;
  /** Fold one turn's events in. `turn` is {@link TurnResult.turn}. */
  observe(events: readonly EngineEvent[], turn: number): Status;
  /**
   * Set the status directly, for the one case events cannot cover: `restore()`
   * emits none, so a UI whose state is *derived* from the stream has nothing to
   * fold and must read the save instead. The third contract finding of 5.2.
   *
   * Takes a room **id**, like the events do, not a display name.
   */
  reset(roomId: string, score: number, moves: number): Status;
}

/**
 * @param roomNames room id → display name, from the world document's `rooms`.
 *   An id missing from the table falls back to the id itself: a status line
 *   reading `EW-PASSAGE` is a visible bug report, where an empty one hides it.
 */
export function createStatusTracker(roomNames: ReadonlyMap<string, string>): StatusTracker {
  const status: Status = { room: "", score: 0, moves: 0 };

  return {
    status,
    reset(roomId, score, moves) {
      status.room = nameOf(roomNames, roomId);
      status.score = score;
      status.moves = moves;
      return { ...status };
    },
    observe(events, turn) {
      for (const e of events) {
        // Finding 2: the player's placement arrives on `object-moved` at start
        // and on both channels thereafter, so this one case covers every move.
        if (e.type === "player-moved") status.room = nameOf(roomNames, e.to);
        else if (e.type === "object-moved" && e.object === PLAYER_ID) {
          status.room = nameOf(roomNames, e.to);
        } else if (e.type === "score-changed") {
          // The event carries the running total; `delta` is for the UI to flash.
          status.score = e.score;
        }
      }
      status.moves = turn;
      return { ...status };
    },
  };
}

function nameOf(names: ReadonlyMap<string, string>, id: string): string {
  return names.get(id) ?? id;
}

/** Room id → display name, for {@link createStatusTracker}. */
export function roomNameTable(rooms: readonly { id: string; name?: string }[]): Map<string, string> {
  return new Map(rooms.map((r) => [r.id, r.name ?? r.id]));
}
