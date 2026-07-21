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
 * **This is the Slice 2 skeleton and does none of that yet.** It wraps the mapper
 * and returns exactly one panel per turn, so it is a pure refactor with no
 * behaviour change — proven by `director.test.ts`, which asserts the Director's
 * flattened output equals the mapper's panel sequence over every walkthrough. The
 * beat detection and the noise/traversal edits (ADR 0005 §2/§3) land in Slices 3–4,
 * where this stops returning exactly one panel and that equivalence test becomes a
 * golden panel-*sequence* per walkthrough (superseding the mapper's §6 count test).
 *
 * The Director keeps only stream-derived state (today: none of its own, all of the
 * mapper's) and reads no engine internals, so the parity oracle still applies —
 * the one property ADR 0004 §5 made load-bearing and ADR 0005 preserves.
 */

import type { Turn } from "../session.js";
import { createMapper, type MapperOptions, type Panel } from "./mapper.js";

export type DirectorOptions = MapperOptions;

export interface Director {
  /** Fold one turn in; get the panels it produced. Slice 2: always exactly one. */
  ingest(turn: Turn): Panel[];
  /** Every panel emitted so far — the canonical stream (ADR 0004 §5). */
  readonly panels: readonly Panel[];
}

export function createDirector(options: DirectorOptions = {}): Director {
  const mapper = createMapper(options);
  return {
    get panels() {
      return mapper.panels;
    },
    ingest(turn: Turn): Panel[] {
      // Slice 2: strict 1:1 passthrough. The list return type is the forward
      // room the later slices grow into — do not collapse it back to `Panel`.
      return [mapper.panel(turn)];
    },
  };
}
