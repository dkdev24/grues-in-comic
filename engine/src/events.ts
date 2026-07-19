/**
 * The engine↔UI event contract (ADR 0002 §2), transcribed as code.
 *
 * Events are **semantic, never presentational**: `speech` carries a speaker id,
 * not a bubble position; `player-moved` carries room ids, not panel layouts.
 * Every value here is JSON-serializable, which is what makes Worker hosting,
 * save files, and the transcript harness the same problem.
 *
 * The vocabulary grows *additively* through milestone 4 as systems land;
 * breaking changes bump {@link CONTRACT_VERSION}.
 */

/**
 * Version of the engine↔UI contract (not the engine, not the IR).
 * Consumers should refuse an event stream whose major version they don't know.
 */
export const CONTRACT_VERSION = "1.0.0";

/** How a UI should style a narration line without parsing its text. */
export type NarrationChannel = "room-title" | "prose" | "system";

export type EngineEvent =
  /** Prose for the player. `channel` lets UIs style without parsing text. */
  | { type: "narration"; channel: NarrationChannel; text: string }
  /** Dialogue attributed to a character — the hook the comic layer builds on. */
  | { type: "speech"; speaker: string; text: string }
  /** Player location changed (room transition, incl. forced moves). */
  | { type: "player-moved"; from: string; to: string }
  /** An object's containment changed (take/drop/put; thief steals). */
  | { type: "object-moved"; object: string; from: string; to: string }
  | { type: "score-changed"; score: number; delta: number }
  | { type: "game-over"; outcome: "victory" | "death" | "quit"; text: string }
  /** Parser needs clarification; next command answers it. */
  | { type: "question"; text: string };

export interface TurnResult {
  events: EngineEvent[];
  /** Turn counter after execution (daemons/timers advance per turn). */
  turn: number;
}

/**
 * Golden-transcript parity is measured on the concatenated player-visible text
 * of a turn (ADR 0002: `narration`/`speech`/`question`), so the harness and the
 * text UI share one definition of "what the player saw".
 */
export function transcriptText(events: readonly EngineEvent[]): string {
  let out = "";
  for (const e of events) {
    if (e.type === "narration" || e.type === "question") out += e.text;
    else if (e.type === "speech") out += e.text;
    else if (e.type === "game-over") out += e.text;
  }
  return out;
}
