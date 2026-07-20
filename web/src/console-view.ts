/**
 * The console pane: the terminal Zork was played on (ADR 0004 §4).
 *
 * At 5.2 this pane is the whole shell; at 5.3 it becomes the subordinate half
 * beside the comic. It is built as the subordinate half already — it owns a
 * `<section>`, not the page — so 5.3 adds a sibling rather than a rewrite.
 *
 * The pane renders by **channel, never by parsing text** (ADR 0002): `prose`
 * is the game's voice, `system` is the interpreter's, `question` is the parser
 * asking. That is the entire styling contract, and it is why the shell has no
 * regex over narration anywhere.
 */

import type { EngineEvent } from "../../engine/src/events.js";
import type { Status } from "./status.js";
import type { Turn } from "./session.js";

export interface ConsoleView {
  /** Append a turn: the echoed command, then its player-visible lines. */
  appendTurn(turn: Turn): void;
  /** Print a line in the interpreter's own voice (errors, save confirmations). */
  appendSystem(text: string): void;
  setStatus(status: Status): void;
}

/** Sub-pixel slack when deciding whether the reader is still at the end. */
const PIN_SLACK = 8;

export function createConsoleView(root: HTMLElement): ConsoleView {
  const transcript = required(root, ".transcript");
  const statusRoom = required(root, ".status-room");
  const statusScore = required(root, ".status-score");

  function line(className: string, text: string): void {
    const el = document.createElement("div");
    el.className = `line ${className}`;
    // textContent, not innerHTML: narration is game data, and the one place a
    // world document could inject markup into the page is right here.
    el.textContent = text;
    transcript.appendChild(el);
  }

  function scrollToEnd(): void {
    transcript.scrollTop = transcript.scrollHeight;
  }

  // The transcript follows the last line, but only while the reader is already
  // there: someone scrolled back into history must not be yanked forward.
  let pinned = true;
  transcript.addEventListener("scroll", () => {
    const remaining = transcript.scrollHeight - transcript.scrollTop - transcript.clientHeight;
    pinned = remaining <= PIN_SLACK;
  });

  // A resize re-flows the transcript, changing scrollHeight without an append.
  // Without this the newest line scrolls out of view and stays there until the
  // next command — narrow viewports reflow the most, so the pane that needs the
  // last line visible is the one that loses it.
  const observer = new ResizeObserver(() => {
    if (pinned) scrollToEnd();
  });
  observer.observe(transcript);

  return {
    appendTurn(turn) {
      if (turn.command !== null) line("echo", `>${turn.command}`);
      for (const e of turn.events) {
        const rendered = renderEvent(e);
        if (rendered) line(rendered.className, rendered.text);
      }
      this.setStatus(turn.status);
      scrollToEnd();
    },
    appendSystem(text) {
      line("system", text);
      scrollToEnd();
    },
    setStatus(status) {
      statusRoom.textContent = status.room;
      // The 1980 status bar's exact form. `moves` is the engine's turn counter,
      // which tracks ZIL's MOVES global.
      statusScore.textContent = `Score: ${status.score}    Moves: ${status.moves}`;
    },
  };
}

/**
 * A text pane renders three of the seven event types and drops the rest — the
 * dropped four are what the comic layer is built from (see `event-mix.ts`).
 * `game-over` carries player-visible text too, so it is four, not three.
 */
function renderEvent(e: EngineEvent): { className: string; text: string } | null {
  switch (e.type) {
    case "narration":
      return { className: e.channel, text: trimTrailingNewline(e.text) };
    case "speech":
      // Zero of these are emitted today (ADR 0004 §Context). Rendered anyway:
      // a shell that silently drops a contract event type is how a regression
      // in the *engine* would go unnoticed here.
      return { className: "speech", text: `${e.speaker}: ${trimTrailingNewline(e.text)}` };
    case "question":
      return { className: "question", text: trimTrailingNewline(e.text) };
    case "game-over":
      return { className: "game-over", text: trimTrailingNewline(e.text) };
    default:
      return null;
  }
}

/**
 * Engine text ends in `\n` because ZIL's `TELL` does; the pane is a stack of
 * block elements, so the newline would render as a blank line. Only the
 * trailing one goes — interior newlines are the game's own paragraphing and
 * are preserved by CSS `white-space: pre-wrap`.
 */
function trimTrailingNewline(text: string): string {
  return text.endsWith("\n") ? text.slice(0, -1) : text;
}

function required(root: HTMLElement, selector: string): HTMLElement {
  const el = root.querySelector<HTMLElement>(selector);
  if (!el) throw new Error(`console pane is missing ${selector}`);
  return el;
}
