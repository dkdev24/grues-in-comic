/**
 * The save slot.
 *
 * **The assertions that matter here are the failure modes**, not the round
 * trip. A save slot that works is one line; a save slot that cannot brick the
 * game is the reason this module exists, and every one of those paths needs a
 * hostile `Storage` to reach — which is why `createSessionStore` takes one.
 */

import { describe, expect, it } from "vitest";
import type { SaveState } from "../../engine/src/engine.js";
import type { Turn } from "../src/session.js";
import {
  createSessionStore,
  ENVELOPE_VERSION,
  StorageFullError,
  type PersistedSession,
} from "../src/persistence.js";

const KEY = "test/save";

/** An in-memory `Storage`, with hooks for the two ways a real one misbehaves. */
function fakeStorage(options: { failWrite?: Error; failRead?: Error } = {}): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    key: (i: number) => [...map.keys()][i] ?? null,
    getItem(k: string) {
      if (options.failRead) throw options.failRead;
      return map.get(k) ?? null;
    },
    setItem(k: string, v: string) {
      if (options.failWrite) throw options.failWrite;
      map.set(k, v);
    },
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
  } as Storage;
}

const save = { contractVersion: "1.0.0", turn: 3 } as unknown as SaveState;
const turns = [
  { command: null, events: [], status: { room: "West of House", score: 0, moves: 0 }, mix: {} },
  { command: "north", events: [], status: { room: "North of House", score: 0, moves: 1 }, mix: {} },
] as unknown as Turn[];

function quotaError(name = "QuotaExceededError"): Error {
  const err = new Error("quota");
  err.name = name;
  return err;
}

describe("createSessionStore", () => {
  it("round-trips a session", () => {
    const store = createSessionStore(KEY, fakeStorage());
    store.write(save, turns);
    const read = store.read();
    expect(read?.version).toBe(ENVELOPE_VERSION);
    expect(read?.save).toEqual(save);
    expect(read?.turns).toHaveLength(2);
    expect(read?.turns[1]?.command).toBe("north");
  });

  it("reports an empty slot as no saved game", () => {
    expect(createSessionStore(KEY, fakeStorage()).read()).toBeNull();
  });

  it("discards a corrupt payload instead of throwing", () => {
    // The brick case: a truncated write must not fail every future boot.
    const storage = fakeStorage();
    storage.setItem(KEY, "{not json");
    const store = createSessionStore(KEY, storage);
    expect(store.read()).toBeNull();
    expect(storage.getItem(KEY)).toBeNull();
  });

  it("discards a payload that parses but is not ours", () => {
    const storage = fakeStorage();
    storage.setItem(KEY, JSON.stringify({ hello: "world" }));
    const store = createSessionStore(KEY, storage);
    expect(store.read()).toBeNull();
    expect(storage.getItem(KEY)).toBeNull();
  });

  it("discards an envelope from another version", () => {
    const storage = fakeStorage();
    const future: PersistedSession = { version: ENVELOPE_VERSION + 1, save, turns: [] };
    storage.setItem(KEY, JSON.stringify(future));
    const store = createSessionStore(KEY, storage);
    expect(store.read()).toBeNull();
    expect(storage.getItem(KEY)).toBeNull();
  });

  it("reports a full quota as StorageFullError", () => {
    // The caller turns autosave off on this one and keeps playing, so it has to
    // be distinguishable from a generic failure.
    const store = createSessionStore(KEY, fakeStorage({ failWrite: quotaError() }));
    expect(() => store.write(save, turns)).toThrow(StorageFullError);
  });

  it("recognises Firefox's spelling of a full quota", () => {
    const store = createSessionStore(
      KEY, fakeStorage({ failWrite: quotaError("NS_ERROR_DOM_QUOTA_REACHED") }),
    );
    expect(() => store.write(save, turns)).toThrow(StorageFullError);
  });

  it("rethrows write failures that are not quota", () => {
    const store = createSessionStore(KEY, fakeStorage({ failWrite: new Error("disk on fire") }));
    expect(() => store.write(save, turns)).toThrow("disk on fire");
  });

  it("survives storage that throws on access", () => {
    // Safari private mode and blocked-cookie settings throw on getItem itself.
    // Nothing is corrupt, so there is nothing to clear — it just has no save.
    const store = createSessionStore(KEY, fakeStorage({ failRead: new Error("denied") }));
    expect(store.read()).toBeNull();
  });

  it("rebuilds mix as a live Map, not a JSON husk", () => {
    // The bug this pins: `EventMix.counts` is a Map, `JSON.stringify` writes a
    // Map as `{}`, and nothing failed until a resumed turn reached the
    // inspector and called `.get` on a plain object. Found by reloading the
    // page, not by the suite — so it gets an assertion.
    const store = createSessionStore(KEY, fakeStorage());
    const withEvents = [
      {
        command: null,
        events: [{ type: "narration", channel: "prose", text: "West of House" }],
        status: { room: "West of House", score: 0, moves: 0 },
        mix: { counts: new Map([["narration", 1]]), total: 1, turns: 1 },
      },
      {
        command: "north",
        events: [
          { type: "narration", channel: "prose", text: "North of House" },
          { type: "player-moved", from: "WEST-OF-HOUSE", to: "NORTH-OF-HOUSE" },
        ],
        status: { room: "North of House", score: 0, moves: 1 },
        mix: { counts: new Map(), total: 0, turns: 0 },
      },
    ] as unknown as Turn[];

    store.write(save, withEvents);
    const read = store.read();

    const last = read?.turns[1]?.mix;
    expect(last?.counts).toBeInstanceOf(Map);
    expect(last?.counts.get("narration")).toBe(2);
    expect(last?.counts.get("player-moved")).toBe(1);
    // Cumulative across the replayed history, not per-turn.
    expect(last?.total).toBe(3);
    expect(last?.turns).toBe(2);
  });

  it("copies the history it is given", () => {
    // The caller keeps mutating `history` after every turn; a store holding the
    // live array would silently persist turns it was never asked to.
    const storage = fakeStorage();
    const store = createSessionStore(KEY, storage);
    const live = [...turns];
    store.write(save, live);
    live.push(turns[0]!);
    expect(store.read()?.turns).toHaveLength(2);
  });
});
