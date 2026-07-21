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
 * **Slice 3 — beat detection + noise drop (this file).** The Director drops turns
 * the mapper tagged `refusal` (ADR 0005 §2/§3): the parser said no and nothing
 * happened, the try-and-error the play-log used to render verbatim. `ingest`
 * returns `[]` for those, so the view draws no panel. Everything else still passes
 * through 1:1 — traversal *collapse* is Slice 4, kept separate so this slice is
 * "drop, never merge."
 *
 * The mapper is always folded, even for a dropped turn: it maintains the visited /
 * inventory / room state the classification of *later* turns depends on, so skipping
 * it would corrupt the stream. Only the *emission* is filtered. A dropped turn never
 * carries a Guide line (a refusal is never a first visit), so the cooldown is
 * unaffected. `.panels` is the **emitted** stream — what is on screen — not the
 * mapper's full fold.
 *
 * The Director keeps only stream-derived state and reads no engine internals, so
 * the parity oracle still applies — the property ADR 0004 §5 made load-bearing and
 * ADR 0005 preserves.
 */

import type { Turn } from "../session.js";
import { createMapper, type MapperOptions, type Panel } from "./mapper.js";

export type DirectorOptions = MapperOptions;

export interface Director {
  /** Fold one turn in; get the panels it produced — `[]` when the turn is dropped. */
  ingest(turn: Turn): Panel[];
  /** Every panel *emitted* so far — the edited stream the view draws (ADR 0005). */
  readonly panels: readonly Panel[];
}

export function createDirector(options: DirectorOptions = {}): Director {
  const mapper = createMapper(options);
  const emitted: Panel[] = [];
  return {
    get panels() {
      return emitted;
    },
    ingest(turn: Turn): Panel[] {
      // Always fold — the mapper's stream state must stay whole even when the
      // panel is dropped (see the module note).
      const panel = mapper.panel(turn);
      // Slice 3: drop refusals. Slices 4–5 add traversal collapse and the
      // conversational two-shot, which can make this return 0 or many.
      if (panel.kind === "refusal") return [];
      emitted.push(panel);
      return [panel];
    },
  };
}
