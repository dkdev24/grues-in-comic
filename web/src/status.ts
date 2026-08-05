/**
 * The Infocom status line, derived from the event stream alone (stage 5.2).
 *
 * This module is the shell's proof that the ADR 0002 contract is usable from
 * outside the engine: it reconstructs *room, score and moves* — the three
 * things the 1980 status bar showed — without reading engine internals, without
 * `snapshot()`, and without parsing narration prose. Two contract findings are
 * encoded here rather than worked around silently:
 *
 * 1. **The room name comes from the world document, not from narration.** The
 *    engine does now emit the name on `room-title` (v1.5.1 — it did not when
 *    this module was written), but the status line still looks it up by room id,
 *    deliberately: a title event only arrives when the game *describes* a room,
 *    and `restore()` describes nothing, so a status line folded from titles
 *    would go blank on restore. Ids arrive on every path. ADR 0004 §4 calls this
 *    the `player-moved` workaround remaining available; it is the better source
 *    here, not the fallback. The transcript pane, which styles the line the
 *    player sees, is the channel's consumer.
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
  /**
   * Whether the player can see (contract v1.1.0). The comic pane paints the
   * panel black when this is false; the console pane ignores it, because the
   * engine's own prose already says "It is pitch black".
   *
   * Folded from `light-changed`, which the engine emits on the opening turn and
   * then only on a flip — so the fold is a plain assignment and the initial
   * value below is only ever seen before the first turn is observed.
   */
  lit: boolean;
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
  reset(roomId: string, score: number, moves: number, lit: boolean): Status;
}

/**
 * @param roomNames room id → display name, from the world document's `rooms`.
 *   An id missing from the table falls back to the id itself: a status line
 *   reading `EW-PASSAGE` is a visible bug report, where an empty one hides it.
 */
export function createStatusTracker(roomNames: ReadonlyMap<string, string>): StatusTracker {
  const status: Status = { room: "", score: 0, moves: 0, lit: true };

  return {
    status,
    reset(roomId, score, moves, lit) {
      status.room = nameOf(roomNames, roomId);
      status.score = score;
      status.moves = moves;
      status.lit = lit;
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
        } else if (e.type === "light-changed") {
          status.lit = e.lit;
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

/**
 * Object id → display name (ZIL DESC), for the comic mapper's Hero action lines
 * (ADR 0005 §1). Built from the world document at the view layer — static world
 * data, the same category as {@link roomNameTable}, never a reach into engine
 * runtime — so the mapper stays a pure function of (event stream + static config).
 */
export function objectNameTable(objects: readonly { id: string; name?: string }[]): Map<string, string> {
  return new Map(objects.map((o) => [o.id, o.name ?? o.id]));
}
