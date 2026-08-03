/**
 * Jump to beginning / jump to latest — one control, both panes.
 *
 * **Why one control and not one per pane.** The panes are two registers of a
 * single turn stream (ADR 0004 §2: narration is accompanied, never replaced), so
 * "take me back to the start" and "take me back to now" are one intent, not two.
 * Two sets of buttons would be two thumb targets for the same thought, and on a
 * stacked phone layout the second set is off-screen when you want it.
 *
 * **What is deliberately not synchronized: manual scrolling.** A reader hunting
 * through the strip for a picture and a reader re-reading the transcript are
 * doing different things at different speeds, and the mapping between them is not
 * even monotonic — a turn yields 0..N panels (ADR 0005 drops refusals and
 * collapses traversal runs), so five turns of transcript can be one panel. A
 * continuously coupled scroll would crawl through a collapsed walk and then leap.
 * The two edges, by contrast, need no mapping at all: "the top" and "the end"
 * mean the same thing in both panes whatever the panel density is between them.
 *
 * **The jump is instant, never smooth, and that is a virtualization
 * requirement** (`comic-view.ts`). The strip paints panels as they pass the
 * viewport, so animating a scroll across the whole history would paint every
 * panel on the way past — precisely the cost virtualization exists to avoid. An
 * instant jump paints one screen.
 */

/** The two ends of a pane. */
export type Edge = "beginning" | "latest";

/** Sub-pixel slack before a pane counts as away from an edge. Matches the
 * pinning slack the panes use for the same judgement. */
const EDGE_SLACK = 8;

/**
 * How long the control stays up after the reader stops scrolling.
 *
 * Long enough to travel from a flick to the button without hurrying, short
 * enough that it is gone before it reads as permanent chrome. Two seconds is the
 * conventional dwell for a revealed scroll affordance; it is not measured, and
 * the thing to watch if it is ever wrong is whether people report reaching for a
 * button that just left.
 */
const IDLE_MS = 2000;

/**
 * A scrolling pane the control can move. Both panes expose one rather than their
 * scroller element, so the control cannot reach into either pane's DOM.
 */
export interface ScrollPane {
  jump(edge: Edge): void;
  /** Whether a jump to each edge would actually move this pane. */
  offEdges(): Record<Edge, boolean>;
  /** Any scroll at all, including the pane's own follow-the-newest scroll. */
  onScroll(listener: () => void): void;
  /**
   * A scroll the *reader* asked for.
   *
   * Separate from {@link onScroll} because the panes scroll themselves on every
   * turn (both follow the newest panel/line), and a control that woke on that
   * would flash over the comic once per command. Gestures are the signal, not
   * the resulting scroll: wheel, touch drag, a key press in the pane, a pointer
   * put down on it.
   */
  onReaderScroll(listener: () => void): void;
}

export interface JumpControls {
  /** Re-read both panes and show or hide each button. Cheap, and coalesced to
   * one animation frame — a resumed session appends hundreds of turns, and each
   * one would otherwise force a layout read. */
  refresh(): void;
}

/** A `ScrollPane` over a scrolling element. */
export function createScrollPane(el: HTMLElement): ScrollPane {
  return {
    jump(edge) {
      el.scrollTop = edge === "beginning" ? 0 : el.scrollHeight;
    },
    offEdges() {
      return {
        beginning: el.scrollTop > EDGE_SLACK,
        latest: el.scrollHeight - el.scrollTop - el.clientHeight > EDGE_SLACK,
      };
    },
    onScroll(listener) {
      el.addEventListener("scroll", listener, { passive: true });
    },
    onReaderScroll(listener) {
      for (const type of ["wheel", "touchmove", "pointerdown", "keydown"]) {
        el.addEventListener(type, listener, { passive: true });
      }
    },
  };
}

/**
 * Wire the two buttons in `host` to every pane.
 *
 * **The control overlays the pane rather than taking a row in it**: a phone in
 * portrait has no vertical room to give a permanent strip of chrome, and every
 * pixel this took would come off the panel (`style.css` already hides the cast
 * bar there for the same reason).
 *
 * **It is revealed by scrolling and fades when the reader stops.** Two rules
 * compose to decide what is on screen:
 *
 *  - *Useful*: a button is shown only when it would actually move a pane —
 *    "any pane is off that edge", since the button moves all of them.
 *  - *Awake*: the control is visible for {@link IDLE_MS} after a reader gesture,
 *    and while it holds keyboard focus.
 *
 * Without the second rule "jump to beginning" would be on screen from the second
 * turn onward — there is history above almost always — and a control that is
 * permanently over the newest panel is a control that costs the comic something
 * on every turn to be useful on a few. A flick is a cheap price for a button you
 * want a handful of times a session, and it is a gesture the reader is already
 * making when they start browsing.
 *
 * Fading is done in CSS by opacity *and visibility*, never by opacity alone: an
 * invisible-but-focusable button is a stop on the tab order that a keyboard user
 * cannot see. `focusin`/`focusout` are what let such a user reach it — tabbing to
 * it keeps it awake for as long as it is theirs.
 */
export function createJumpControls(host: HTMLElement, panes: readonly ScrollPane[]): JumpControls {
  const buttons = new Map<Edge, HTMLButtonElement>();
  for (const button of host.querySelectorAll<HTMLButtonElement>("button[data-jump]")) {
    const edge = button.dataset.jump;
    if (edge !== "beginning" && edge !== "latest") continue;
    buttons.set(edge, button);
    button.addEventListener("click", () => {
      for (const pane of panes) pane.jump(edge);
      // The panes' own scroll events refresh us, but a pane already at the edge
      // emits none, and this is the moment the reader is watching. Stay awake:
      // having just jumped is when the other button is most likely wanted next.
      refreshNow();
      wake();
    });
  }

  for (const pane of panes) {
    pane.onScroll(refresh);
    pane.onReaderScroll(wake);
  }

  // Keyboard reach: focus holds the control open, and letting go starts the
  // clock again rather than snatching it away mid-tab.
  host.addEventListener("focusin", wake);
  host.addEventListener("focusout", wake);

  let queued = false;
  let sleepTimer: ReturnType<typeof setTimeout> | undefined;
  refresh();
  return { refresh };

  /** Show the control, and start (or restart) the clock that hides it again. */
  function wake(): void {
    refreshNow();
    host.classList.add("awake");
    clearTimeout(sleepTimer);
    sleepTimer = setTimeout(() => {
      // Never fade out from under a keyboard user who is on it right now.
      if (host.contains(document.activeElement)) return;
      host.classList.remove("awake");
    }, IDLE_MS);
  }

  function refresh(): void {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      refreshNow();
    });
  }

  function refreshNow(): void {
    const off = panes.map((pane) => pane.offEdges());
    for (const [edge, button] of buttons) {
      button.hidden = !off.some((edges) => edges[edge]);
    }
    // The container carries the framing, so it goes too when both buttons do —
    // otherwise an empty box floats over the comic.
    host.hidden = [...buttons.values()].every((button) => button.hidden);
  }
}
