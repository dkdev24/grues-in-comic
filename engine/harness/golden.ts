/**
 * Golden-transcript parsing and normalization (stage 4.4).
 *
 * The goldens in `verification/golden/` are raw dfrotz captures of the shipped
 * Release 119 story file. They therefore carry a great deal that is *not*
 * gameplay: an interpreter banner, a status line redrawn every turn, and hard
 * word wrapping at the terminal width. None of that is behavior, and the engine
 * deliberately produces none of it — ADR 0002 makes rendering the UI's job.
 *
 * So the comparison happens on **normalized turn text**: what the player was
 * told, with presentation removed from both sides. Everything this module
 * strips is a considered decision about what parity means, and each is
 * commented, because a normalizer that quietly discards too much would turn the
 * whole harness into a test that passes by construction.
 */

/** A dfrotz status line: room name, then Score/Moves, redrawn every turn. */
const STATUS_LINE = /^\s*>?\s*.*\bScore:\s*-?\d+\s+Moves:\s*\d+\s*$/;

/** dfrotz's own chatter, before the story begins. */
const INTERPRETER_NOISE = /^(Using .* formatting\.|Loading .*\.)$/;

export interface GoldenTranscript {
  /** The opening text, before any command (banner excluded). */
  opening: string;
  /** One entry per command in the walkthrough, in order. */
  turns: string[];
}

/**
 * Split a dfrotz capture into the opening text plus one block per turn.
 *
 * Turn boundaries are the status lines: dfrotz redraws one immediately after
 * each prompt, so a status line marks "a command was just accepted".
 */
export function parseGolden(raw: string): GoldenTranscript {
  const blocks: string[] = [];
  let current: string[] = [];

  for (const line of raw.split("\n")) {
    if (INTERPRETER_NOISE.test(line.trim())) continue;
    if (STATUS_LINE.test(line)) {
      blocks.push(current.join("\n"));
      current = [];
      continue;
    }
    current.push(line);
  }
  blocks.push(current.join("\n"));

  // The first block is empty (the capture opens with a status line) and the
  // second is the banner plus the opening room description.
  const [, banner = "", ...turns] = blocks;
  return { opening: stripBanner(banner), turns: turns.map((t) => t) };
}

/**
 * Remove the copyright banner. It is emitted by the story file, not the
 * interpreter, but it is a *fixed* preamble rather than gameplay, and HANDOFF
 * has recorded it as a sanctioned diff since stage 0.2.
 */
function stripBanner(block: string): string {
  const lines = block.split("\n");
  const start = lines.findIndex((line) => /^Release \d+ \/ Serial number \d+/.test(line));
  return start === -1 ? block : lines.slice(start + 1).join("\n");
}

/**
 * Reduce text to what was *said*, discarding how it was laid out.
 *
 * - Paragraph structure is kept (a blank line separates paragraphs), because
 *   Zork uses blank lines deliberately and a missing one is a real diff.
 * - Line breaks *within* a paragraph are not: dfrotz hard-wraps at the terminal
 *   width and the engine emits unwrapped text, so comparing them literally
 *   would fail on every sentence longer than 76 characters while telling us
 *   nothing about behavior.
 * - The `>` prompt and any trailing quit chatter are dropped.
 */
export function normalize(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((paragraph) =>
      paragraph
        .split("\n")
        .map((line) => line.replace(/^>\s*/, "").trim())
        .filter((line) => line.length > 0)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter((paragraph) => paragraph.length > 0)
    .join("\n");
}

/**
 * Drop the interpreter's end-of-session dialogue.
 *
 * `quit` produces no status line, so its output lands inside the *previous*
 * turn's block — meaning the last real turn appears to have printed the score
 * summary and the "Do you wish to leave the game?" prompt. That is the
 * interpreter talking, not the game, and leaving it in would fail the final
 * turn of every walkthrough for a reason that has nothing to do with the
 * engine.
 */
export function stripSessionEnd(text: string): string {
  // The line is prefixed by the `>` prompt, which dfrotz emits without a
  // newline after it, so the summary shares a line with the prompt.
  const cut = text.search(/^>?\s*Your score is .* \(total of \d+ points\)/m);
  return cut === -1 ? text : text.slice(0, cut);
}

/** Read a `.cmd` walkthrough into its commands, dropping blanks and comments. */
export function parseWalkthrough(raw: string): string[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));
}

export interface TurnDiff {
  index: number;
  command: string;
  expected: string;
  actual: string;
}

/** Compare normalized turn text, returning only the turns that differ. */
export function diffTurns(
  commands: readonly string[],
  expected: readonly string[],
  actual: readonly string[],
): TurnDiff[] {
  const diffs: TurnDiff[] = [];
  for (let i = 0; i < commands.length; i++) {
    const want = normalize(stripSessionEnd(expected[i] ?? ""));
    const got = normalize(actual[i] ?? "");
    if (want !== got) {
      diffs.push({ index: i, command: commands[i]!, expected: want, actual: got });
    }
  }
  return diffs;
}
