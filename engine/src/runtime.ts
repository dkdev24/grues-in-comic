/**
 * The runtime context (stage 4.3) — everything a behavior routine can reach.
 *
 * The POC interpreter (`ir/poc/interpreter.ts`) threaded a bare `WorldState`
 * and appended prose to a string array. The engine needs three more things:
 * the parser's PRSA/PRSO/PRSI, a seeded RNG, and an **event sink** instead of a
 * transcript buffer — because ADR 0002's contract is events, and prose is only
 * one kind.
 *
 * Text is buffered rather than emitted per `TELL`, since a single ZIL routine
 * prints a sentence across many calls and one narration event per fragment
 * would be unreadable for any UI. {@link flush} closes the current run.
 */

import type { BehaviorRoutine, BehaviorValue } from "@grues-in-comic/ir";
import type { EngineEvent, NarrationChannel } from "./events.js";
import type { GameState, WorldIndex } from "./state.js";
import type { Rng } from "./rng.js";

export interface RuntimeContext {
  world: WorldIndex;
  state: GameState;
  rng: Rng;
  /** Behavior routines by id (ADR 0001 AST). */
  routines: Map<string, BehaviorRoutine>;
  /** Engine builtins — the ZIL utility layer, shared by every game. */
  builtins: Map<string, Builtin>;

  /**
   * ZIL PRSA / PRSO / PRSI.
   *
   * These are **not** context fields with their own storage: they are accessors
   * over the globals of the same name, because the world document declares them
   * as globals and extracted behavior reads them that way — `V-OPEN` tests
   * `<FSET? ,PRSO ,OPENBIT>`, which reaches the interpreter as a plain global
   * read. A separate copy on the context would be a second source of truth that
   * routines could never see.
   */
  action: string;
  directObject: string | undefined;
  indirectObject: string | undefined;
  /** ZIL's verb *word* (TAKE), distinct from PRSA (V-TAKE), for `verb?` tests. */
  verb: string;

  /** Events emitted so far this turn. */
  events: EngineEvent[];
  /** Prose accumulated since the last flush. */
  buffer: string;
  /** Channel the buffered prose will be emitted on. */
  channel: NarrationChannel;
  /** Pronoun referent (ZIL P-IT-OBJECT), set by THIS-IS-IT. */
  itObject?: string;
  /** Directions queued by DO-WALK, drained by the turn loop. */
  pendingWalks: string[];
  /** Set by FINISH — the game is over and the turn must stop. */
  finished?: { outcome: "victory" | "death" | "quit"; text: string };
  /** Depth guard: behavior is data, and data can recurse forever. */
  depth: number;
  /**
   * Routines a daemon named but the document never defined — routines the
   * extractor catalogued rather than extracted. Shared across turns so the
   * host can report each one once, and never silently.
   */
  missingRoutines: Set<string>;
}

export type Builtin = (ctx: RuntimeContext, args: BehaviorValue[]) => BehaviorValue;

/** ZIL TELL — append prose to the current run. */
export function tell(ctx: RuntimeContext, text: string): void {
  ctx.buffer += text;
}

/**
 * Close the current prose run and emit it, if there is anything to emit.
 *
 * Trailing whitespace is trimmed but interior newlines are kept: ZIL routines
 * print deliberate blank lines between paragraphs and golden-transcript parity
 * is measured on the text, so we may tidy the edges and nothing else.
 */
export function flush(ctx: RuntimeContext): void {
  const text = ctx.buffer.replace(/[ \t]+$/g, "");
  ctx.buffer = "";
  if (text.trim().length === 0) return;
  ctx.events.push({ type: "narration", channel: ctx.channel, text });
}

/** Emit on a specific channel without disturbing the default. */
export function emitOn(ctx: RuntimeContext, channel: NarrationChannel, text: string): void {
  flush(ctx);
  ctx.events.push({ type: "narration", channel, text });
}

export function emit(ctx: RuntimeContext, event: EngineEvent): void {
  // Prose printed before a structural event belongs *before* it in the stream,
  // or a UI replaying events renders the room description after the move.
  flush(ctx);
  ctx.events.push(event);
}
