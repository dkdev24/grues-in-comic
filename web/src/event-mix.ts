/**
 * The event-mix census, live (stage 5.2).
 *
 * A text shell only needs `narration`/`speech`/`question` — it can drop the
 * rest and still be correct. That is precisely why this module exists: the
 * comic layer (5.3) is driven by the events a text UI ignores, and the
 * measured mix over all 11 walkthroughs is lopsided enough to design against
 * (ADR 0004 §Context: 192 `narration`, **0 `speech`**, 187 `object-moved`).
 *
 * Showing the running mix beside the transcript turns that census into
 * something a player's own session confirms or contradicts, which is worth
 * more than a shell that concatenates text. It also keeps the 0-`speech`
 * finding visible: a session that ever renders a non-zero `speech` count has
 * discovered something ADR 0004 assumes does not happen.
 */

import type { EngineEvent } from "../../engine/src/events.js";

export type EventKind = EngineEvent["type"];

export interface EventMix {
  /** Counts by event type, insertion-ordered by first sighting. */
  readonly counts: ReadonlyMap<EventKind, number>;
  /** Events observed in total, across every turn. */
  readonly total: number;
  /** Turns observed — the denominator that makes counts comparable. */
  readonly turns: number;
}

export interface MixTracker {
  observe(events: readonly EngineEvent[]): EventMix;
  snapshot(): EventMix;
}

/** The full contract vocabulary, in ADR 0002 declaration order. */
export const ALL_EVENT_KINDS: readonly EventKind[] = [
  "narration",
  "speech",
  "player-moved",
  "object-moved",
  "score-changed",
  "light-changed",
  "game-over",
  "question",
];

export function createMixTracker(): MixTracker {
  // Seeded with every kind at zero so an *absent* event type is displayed as
  // a zero rather than as a missing row — the 0-`speech` finding is only
  // legible if the row is there.
  const counts = new Map<EventKind, number>(ALL_EVENT_KINDS.map((k) => [k, 0]));
  let total = 0;
  let turns = 0;

  const snapshot = (): EventMix => ({ counts: new Map(counts), total, turns });

  return {
    snapshot,
    observe(events) {
      turns += 1;
      for (const e of events) {
        counts.set(e.type, (counts.get(e.type) ?? 0) + 1);
        total += 1;
      }
      return snapshot();
    },
  };
}

/** One-line summary of an event for the inspector, without presentational text. */
export function describeEvent(e: EngineEvent): string {
  switch (e.type) {
    case "narration":
      return `${e.channel} · ${summarize(e.text)}`;
    case "speech":
      return `${e.speaker} · ${summarize(e.text)}`;
    case "player-moved":
      return `${e.from} → ${e.to}`;
    case "object-moved":
      return `${e.object}: ${e.from} → ${e.to}`;
    case "score-changed":
      return `${e.score} (${e.delta >= 0 ? "+" : ""}${e.delta})`;
    case "light-changed":
      return e.lit ? "lit" : "dark";
    case "game-over":
      return `${e.outcome} · ${summarize(e.text)}`;
    case "question":
      return summarize(e.text);
  }
}

function summarize(text: string): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > 60 ? `${flat.slice(0, 59)}…` : flat;
}
