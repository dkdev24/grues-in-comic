/**
 * The Narrative Director (ADR 0005): the seam between the turn stream and the
 * panel stream.
 *
 * Where the {@link Mapper} is `read(turn) -> TurnScript` (exactly one script per
 * turn), the Director is `ingest(turn) -> PanelDelta` (**zero to many panels**).
 * That arity is the whole point: it lets the comic become an *edited retelling* —
 * dropping noise turns, collapsing traversal, buffering until a beat resolves —
 * rather than a one-panel-per-turn mirror of the transcript.
 *
 * **Order of the two edits (ADR 0008 Phase 2).** The Director now edits the
 * *utterance* stream and hands what survives to {@link Page}, which panelizes it.
 * That ordering is deliberate: which turns are worth showing is semantic and ours;
 * how surviving lines pack into panels is mechanical and Comic Chat's. Running the
 * port first and editing panels afterwards would mean dropping a panel that had
 * already absorbed a kept line by clone-append.
 *
 * **Slice 3 — noise drop, made conditional at M6.1d.** The Director drops turns
 * the mapper tagged `refusal` (ADR 0005 §2/§3): the parser said no and nothing
 * happened, the try-and-error the play-log rendered verbatim. That was measured
 * when a refusal carried no balloon at all. **Since ADR 0009 §5 a refusal that
 * has something to say is a beat and is kept; a silent one is still dropped** —
 * at 26.4% of turns it is the largest single lever on D5, and the Hero arguing
 * with the parser is the funniest material in the game. The consequence is
 * accepted rather than worked around: the panel stream gets longer.
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
import { createMapper, type MapperOptions, type Panel, type TurnScript } from "./mapper.js";
import {
  BRK, CHR, addScript, createPage, mergeDelta,
  type FitTest, type Page, type PanelDelta,
} from "./page.js";

export interface DirectorOptions extends MapperOptions {
  /** Balloon-layout seam handed to the {@link Page}; see `page.ts`. */
  fit?: FitTest;
}

/** Nothing was emitted this call. A fresh object each time — deltas are merged into. */
const noPanels = (): PanelDelta => ({ replacedLast: false, appended: [] });

/**
 * Does this turn put a balloon on the page? `<Brk>` and `<Chr>` are instructions
 * to `page.ts`, not utterances, so a script made only of those is silent — which
 * is exactly what an unscripted refusal is (ADR 0009 §5). Asked of the script the
 * mapper produced rather than of the marker table, so a beat authored in M6.1e
 * changes what survives without touching this file.
 */
export function speaks(script: TurnScript): boolean {
  return script.lines.some((line) => line.text !== BRK && line.text !== CHR);
}

export interface Director {
  /**
   * Fold one turn in; get what it did to the panel list — no panels when the turn
   * was dropped or buffered, and `replacedLast` when a line clone-appended into
   * the panel already on screen.
   */
  ingest(turn: Turn): PanelDelta;
  /** Emit any buffered traversal run. Call at end of input; a no-op if none pends. */
  flush(): PanelDelta;
  /** Every panel *emitted* so far — the edited stream the view draws (ADR 0005). */
  readonly panels: readonly Panel[];
}

export function createDirector(options: DirectorOptions = {}): Director {
  const mapper = createMapper(options);
  const page: Page = createPage(options.fit ? { fit: options.fit } : {});
  // The run collapses to its latest script — the destination reached so far.
  // `null` when no traversal run is open.
  let pendingTraversal: TurnScript | null = null;

  /** Panelize the buffered run's one script, if any, and clear the buffer. */
  function flushPending(): PanelDelta {
    if (pendingTraversal === null) return noPanels();
    const script = pendingTraversal;
    pendingTraversal = null;
    return addScript(page, script);
  }

  return {
    get panels() {
      return page.panels;
    },
    flush(): PanelDelta {
      return flushPending();
    },
    ingest(turn: Turn): PanelDelta {
      // Always fold — the mapper's stream state must stay whole even when the
      // turn is dropped or buffered (see the module note).
      const script = mapper.read(turn);
      // Slice 3, as ADR 0009 §5 amends it: drop a refusal only when it says
      // nothing. A silent refusal never interrupts a walk, so an open traversal
      // run keeps buffering across it — but one that speaks is a beat like any
      // other and ends the run below.
      if (script.context.kind === "refusal" && !speaks(script)) return noPanels();
      // Slice 4: hold a traversal, keeping only the latest — the run's destination.
      if (script.context.kind === "traversal") {
        pendingTraversal = script;
        return noPanels();
      }
      // Any other beat ends the run: flush it first, then emit this turn.
      const out = flushPending();
      mergeDelta(out, addScript(page, script));
      return out;
    },
  };
}

