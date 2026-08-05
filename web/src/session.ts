/**
 * A playable session: the engine, the derived status line, and the running
 * event census, with no DOM anywhere (stage 5.2).
 *
 * The split matters for 5.3. This module is the whole of what a *presentation*
 * layer needs — it hands over a turn's events plus the state derived from them,
 * and holds no opinion about balloons, panels or terminals. The comic pane will
 * consume the same {@link Turn} the console pane does; ADR 0004 §2's "narration
 * is accompanied, never replaced" is only cheap if both panes read one stream.
 */

import type { WorldDocument } from "@grues-in-comic/ir";
import { createEngine, type Engine, type SaveState } from "../../engine/src/engine.js";
import { CONTRACT_VERSION, type EngineEvent } from "../../engine/src/events.js";
import { PLAYER_ID } from "../../engine/src/state.js";
import { createMixTracker, type EventMix, type MixTracker } from "./event-mix.js";
import { createStatusTracker, roomNameTable, type Status, type StatusTracker } from "./status.js";

/** One turn, and everything the shell derived from it. */
export interface Turn {
  /** The command the player typed — `null` for the opening turn. */
  command: string | null;
  events: readonly EngineEvent[];
  status: Status;
  mix: EventMix;
}

export interface Session {
  readonly contractVersion: string;
  /** Routines the world document never defined; non-empty means missing gameplay. */
  readonly missingRoutines: readonly string[];
  start(): Turn;
  command(input: string): Turn;
  save(): SaveState;
  load(save: SaveState): void;
  readonly status: Status;
  /** Names of objects currently in scope — the shell's `/hint`. Not a turn. */
  hint(): readonly string[];
}

export interface SessionOptions {
  /**
   * Fixes the random sequence. Omitted, the session draws its own — the shell
   * is for playing, and a seeded browser session that always kills you at the
   * same troll is a test fixture, not a game. Pass one to reproduce a report.
   */
  seed?: number;
}

export function createSession(doc: WorldDocument, options: SessionOptions = {}): Session {
  const seed = options.seed ?? (Date.now() & 0x7fffffff);
  const engine: Engine = createEngine(doc, { seed });
  const status: StatusTracker = createStatusTracker(roomNameTable(doc.rooms ?? []));
  const mix: MixTracker = createMixTracker();

  const observe = (command: string | null, events: readonly EngineEvent[], turn: number): Turn => ({
    command,
    events,
    status: status.observe(events, turn),
    mix: mix.observe(events),
  });

  return {
    contractVersion: CONTRACT_VERSION,
    get missingRoutines() {
      return engine.missingRoutines();
    },
    get status() {
      return { ...status.status };
    },
    start() {
      const { events, turn } = engine.start();
      return observe(null, events, turn);
    },
    command(input) {
      const { events, turn } = engine.command(input);
      return observe(input, events, turn);
    },
    save() {
      return engine.snapshot();
    },
    hint() {
      return engine.hint();
    },
    load(save) {
      // The engine validates nothing about provenance, so the shell checks the
      // one thing that makes a save uninterpretable: a contract it doesn't know.
      if (majorOf(save.contractVersion) !== majorOf(CONTRACT_VERSION)) {
        throw new Error(
          `save was written against contract ${save.contractVersion}; this shell speaks ${CONTRACT_VERSION}`,
        );
      }
      engine.restore(save);
      // Status is *derived* from events and `restore` emits none, so it has to
      // be rebuilt from the save. `locations` and `globals.SCORE` are both in
      // the JSON-serializable SaveState, which is why this stays a contract
      // consumer rather than a reach into engine internals. The running event
      // mix is deliberately *not* rewound: it censuses this session's stream,
      // and the turns before a restore were still observed.
      // `save.lit` is the derived light (contract 1.1.0); a 1.0.x save predates
      // the field and is assumed lit, which is where all but a handful of rooms
      // are and what the next flip will correct anyway.
      status.reset(
        save.locations[PLAYER_ID] ?? "",
        Number(save.globals["SCORE"] ?? 0),
        save.turn,
        save.lit ?? true,
      );
    },
  };
}

function majorOf(version: string): string {
  return version.split(".")[0] ?? "";
}
