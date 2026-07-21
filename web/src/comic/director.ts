/**
 * The Narrative Director (ADR 0005): the seam between the turn stream and the
 * panel stream.
 *
 * Where the {@link Mapper} is `panel(turn) -> Panel` (exactly one), the Director
 * is `ingest(turn) -> Panel[]` (**zero to many**). That arity is the whole point:
 * it lets the comic become an *edited retelling* — dropping noise turns, collapsing
 * traversal, buffering until a beat resolves — rather than a one-panel-per-turn
 * mirror of the transcript.
 *
 * **Slice 3 — noise drop.** The Director drops turns the mapper tagged `refusal`
 * (ADR 0005 §2/§3): the parser said no and nothing happened, the try-and-error the
 * play-log rendered verbatim. `ingest` returns `[]` for those.
 *
 * **Slice 4 — traversal collapse (this file's buffering).** A *run* of consecutive
 * `traversal` panels — moves through rooms already seen, i.e. backtracking — is
 * collapsed to a single panel at the run's destination (ADR 0005 §3). This is the
 * Director's first buffered edit: a traversal is held, not emitted, and the buffer
 * keeps only the latest (the destination so far); the run flushes — emitting that
 * one panel — when a non-traversal turn arrives (an `arrival` in a new room, an
 * `action`, a death, ambient narration) or when {@link Director.flush} is called at
 * end of input. Walking through *new* rooms is unaffected: each is an `arrival`, a
 * beat, emitted as it happens. Only revisiting collapses. A trailing run (input ends
 * mid-walk) stays buffered until `flush` — the comic trails live play by the walk,
 * which is the intended past-tense retelling, not a bug.
 *
 * The mapper is always folded, even for a dropped or buffered turn: it maintains the
 * visited / inventory / room state the classification of *later* turns depends on, so
 * skipping it would corrupt the stream. Only *emission* is edited. A dropped or
 * collapsed-away turn never carries a Guide line (a refusal is never a first visit; a
 * collapsed traversal keeps the run's *last* panel, and the cooldown only advances
 * when a line actually fires), so Slice 5's Guide is unaffected. `.panels` is the
 * **emitted** stream — what is on screen — not the mapper's full fold, and excludes a
 * still-buffered run until it flushes.
 *
 * The Director keeps only stream-derived state and reads no engine internals, so the
 * parity oracle still applies — the property ADR 0004 §5 made load-bearing and ADR
 * 0005 preserves.
 */

import type { Turn } from "../session.js";
import { createMapper, type MapperOptions, type Panel } from "./mapper.js";

export type DirectorOptions = MapperOptions;

export interface Director {
  /** Fold one turn in; get the panels it emitted — `[]` when dropped or buffered. */
  ingest(turn: Turn): Panel[];
  /** Emit any buffered traversal run. Call at end of input; a no-op if none pends. */
  flush(): Panel[];
  /** Every panel *emitted* so far — the edited stream the view draws (ADR 0005). */
  readonly panels: readonly Panel[];
}

export function createDirector(options: DirectorOptions = {}): Director {
  const mapper = createMapper(options);
  const emitted: Panel[] = [];
  // The run collapses to its latest panel — the destination reached so far. `null`
  // when no traversal run is open.
  let pendingTraversal: Panel | null = null;

  /** Emit the buffered run's one panel, if any, and clear the buffer. */
  function flushPending(): Panel[] {
    if (pendingTraversal === null) return [];
    const panel = pendingTraversal;
    pendingTraversal = null;
    emitted.push(panel);
    return [panel];
  }

  return {
    get panels() {
      return emitted;
    },
    flush(): Panel[] {
      return flushPending();
    },
    ingest(turn: Turn): Panel[] {
      // Always fold — the mapper's stream state must stay whole even when the
      // panel is dropped or buffered (see the module note).
      const panel = mapper.panel(turn);
      // Slice 3: drop refusals. A refusal never interrupts a walk, so an open
      // traversal run keeps buffering across it.
      if (panel.kind === "refusal") return [];
      // Slice 4: hold a traversal, keeping only the latest — the run's destination.
      if (panel.kind === "traversal") {
        pendingTraversal = panel;
        return [];
      }
      // Any other beat ends the run: flush it first, then emit this panel.
      const out = flushPending();
      emitted.push(panel);
      out.push(panel);
      return out;
    },
  };
}
