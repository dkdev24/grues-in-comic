/**
 * The status line is derived from the event stream alone, so these tests pin
 * the three contract findings stage 5.2 turned up — each is a case where a
 * plausible reading of ADR 0002 gives a shell with no room name.
 */

import { describe, expect, it } from "vitest";
import type { EngineEvent } from "../../engine/src/events.js";
import { PLAYER_ID } from "../../engine/src/state.js";
import { createStatusTracker, roomNameTable } from "../src/status.js";

const names = roomNameTable([
  { id: "WEST-OF-HOUSE", name: "West of House" },
  { id: "NORTH-OF-HOUSE", name: "North of House" },
]);

describe("status tracker", () => {
  it("takes the opening room from the player's object-moved, not player-moved", () => {
    // Finding 2: `start()` emits no `player-moved` — it reports the player's
    // placement as an object-moved with `from` === `to`. A tracker watching
    // only `player-moved` shows an empty room until the first walk.
    const tracker = createStatusTracker(names);
    const opening: EngineEvent[] = [
      { type: "object-moved", object: PLAYER_ID, from: "WEST-OF-HOUSE", to: "WEST-OF-HOUSE" },
      { type: "narration", channel: "prose", text: "West of House\n" },
    ];
    expect(tracker.observe(opening, 0).room).toBe("West of House");
  });

  it("does not follow other objects' moves", () => {
    // The thief wanders roughly once per turn (ADR 0004 §Context: 187 events).
    // Reading room from any `object-moved` would put the player in his room.
    const tracker = createStatusTracker(names);
    tracker.observe(
      [{ type: "object-moved", object: PLAYER_ID, from: "WEST-OF-HOUSE", to: "WEST-OF-HOUSE" }],
      0,
    );
    tracker.observe(
      [{ type: "object-moved", object: "THIEF", from: "ROUND-ROOM", to: "EW-PASSAGE" }],
      1,
    );
    expect(tracker.status.room).toBe("West of House");
  });

  it("follows player-moved on travel", () => {
    const tracker = createStatusTracker(names);
    const status = tracker.observe(
      [{ type: "player-moved", from: "WEST-OF-HOUSE", to: "NORTH-OF-HOUSE" }],
      1,
    );
    expect(status.room).toBe("North of House");
    expect(status.moves).toBe(1);
  });

  it("names rooms from the world document, never from narration text", () => {
    // Finding 1: room ids arrive on every path, `room-title` events only when a
    // room is described — and `restore()` describes nothing, so the status line
    // stays on the id table even now that the channel is live. An unknown id
    // shows as the id, which is a visible bug report rather than a blank line.
    const tracker = createStatusTracker(names);
    const status = tracker.observe(
      [{ type: "player-moved", from: "NORTH-OF-HOUSE", to: "FOREST-1" }],
      2,
    );
    expect(status.room).toBe("FOREST-1");
  });

  it("takes the running total from score-changed, not the delta", () => {
    const tracker = createStatusTracker(names);
    tracker.observe([{ type: "score-changed", score: 10, delta: 10 }], 1);
    const status = tracker.observe([{ type: "score-changed", score: 35, delta: 25 }], 2);
    expect(status.score).toBe(35);
  });

  it("rebuilds from a save, because restore emits no events", () => {
    // Finding 3: derived UI state cannot be folded from a stream that is empty.
    const tracker = createStatusTracker(names);
    tracker.observe([{ type: "player-moved", from: "X", to: "NORTH-OF-HOUSE" }], 9);
    const status = tracker.reset("WEST-OF-HOUSE", 25, 4);
    expect(status).toEqual({ room: "West of House", score: 25, moves: 4 });
  });

  it("returns a copy, so a caller cannot mutate the tracker's state", () => {
    const tracker = createStatusTracker(names);
    const status = tracker.observe([], 1);
    status.room = "Nowhere";
    expect(tracker.status.room).not.toBe("Nowhere");
  });
});
