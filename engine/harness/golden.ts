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
const STATUS_LINE = /^\s*.*\bScore:\s*-?\d+\s+Moves:\s*\d+\s*$/;

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
 * The turn boundary is the **`>` prompt**, not the status line. Those look
 * interchangeable in a simple transcript and are not: dfrotz redraws the status
 * line only when the move counter advances, and ZIL's meta-verbs (SCORE,
 * DIAGNOSE, VERBOSE) deliberately do not consume a move. Splitting on status
 * lines therefore merges each such command into its neighbour and shifts every
 * later turn by one — which reads as a cascade of unrelated content diffs
 * rather than as an off-by-one, and is why walkthroughs 01–03 parsed correctly
 * while 06 did not: only 06 uses SCORE mid-sequence.
 *
 * So: a line beginning with `>` opens a new turn. Whatever follows on that line
 * is either the status line (decoration, discarded) or the first line of the
 * turn's own output.
 */
export function parseGolden(raw: string): GoldenTranscript {
  const blocks: string[] = [];
  let current: string[] = [];

  for (const line of raw.split("\n")) {
    if (INTERPRETER_NOISE.test(line.trim())) continue;
    // The very first status line precedes any prompt.
    if (blocks.length === 0 && current.length === 0 && STATUS_LINE.test(line)) continue;

    if (line.startsWith(">")) {
      blocks.push(current.join("\n"));
      const remainder = line.slice(1);
      current = STATUS_LINE.test(remainder) ? [] : [remainder];
      continue;
    }
    current.push(line);
  }
  blocks.push(current.join("\n"));

  // The first block is the banner plus the opening room description; the status
  // line dfrotz draws before it carries no `>` and so opens no block.
  const [banner = "", ...turns] = blocks;
  return { opening: stripBanner(banner), turns };
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
 * Only the *quit* dialogue, identified by its confirmation prompt. An earlier
 * version cut at the score summary itself, which looks equivalent and is not:
 * `SCORE` prints a byte-identical summary, so a mid-walkthrough SCORE had its
 * entire output deleted and then "matched" an engine that printed nothing. That
 * is the failure mode this whole module warns about — a normalizer discarding
 * so much that the comparison passes by construction.
 */
export function stripSessionEnd(text: string): string {
  if (!/Do you wish to leave the game\?/.test(text)) return text;
  const cut = text.search(/^>?\s*Your score is .* \(total of \d+ points\)/m);
  return cut === -1 ? text : text.slice(0, cut);
}

/**
 * A walkthrough's parity expectation, declared in a `# parity:` directive.
 *
 * `informational` marks a walkthrough that *cannot* reach turn-for-turn parity
 * for a stated reason — an unextracted routine, or output chosen by a random
 * draw the engine's generator cannot reproduce. Such a walkthrough is still run
 * and still reported; it simply does not fail the suite.
 *
 * This exists so that "cannot verify" and "fails to verify" stay distinguishable.
 * Deleting the walkthrough would hide the limitation; leaving it failing would
 * train everyone to ignore a red harness.
 */
export type ParityMode = "strict" | "informational";

export interface Walkthrough {
  commands: string[];
  parity: ParityMode;
  /**
   * A `# oracle:` walkthrough is a completion oracle, not a parity walkthrough:
   * it drives the engine to a *destination* (the full game to the barrow), and
   * its turn-for-turn text is never expected to match — combat and the thief
   * make most of 400+ turns a random draw. It is verified by reaching the win,
   * in a dedicated completion test, not by the golden ratio; so the parity
   * corpus excludes it rather than letting one long oracle swamp the ratio.
   */
  oracle: boolean;
  /** Why parity is informational, taken from the directive's `# reason:` lines. */
  reason: string;
  /**
   * Indices of individual commands that cannot be verified, with the reason.
   *
   * Whole-file `informational` is too blunt for a walkthrough that has to *pass
   * through* something unverifiable to reach what it is actually testing. The
   * dam is behind the Troll Room, the Troll Room is a cut vertex, and the fight
   * is decided by a random draw our generator cannot reproduce — so reaching
   * the dam costs a handful of unmatched turns no matter how the walkthrough is
   * written. Marking the whole file informational to accommodate them would
   * stop verifying the dam, which is the entire point of the walkthrough.
   */
  informationalTurns: Map<number, string>;
}

/**
 * Read a `.cmd` walkthrough: its commands and its parity directives.
 *
 * `# informational: <reason>` applies to every command after it until the next
 * `# strict:`, so a walkthrough can quarantine a passage without surrendering
 * the turns on either side.
 */
export function parseWalkthrough(raw: string): Walkthrough {
  const lines = raw.split("\n").map((line) => line.trim());
  const commands: string[] = [];
  const informationalTurns = new Map<number, string>();
  let scoped: string | undefined;

  for (const line of lines) {
    if (line.length === 0) continue;
    if (line.startsWith("#")) {
      const opened = /^#\s*informational:\s*(.*)$/.exec(line);
      if (opened !== null) scoped = opened[1]!.trim();
      else if (/^#\s*strict:/.test(line)) scoped = undefined;
      continue;
    }
    if (scoped !== undefined) informationalTurns.set(commands.length, scoped);
    commands.push(line);
  }

  const parity: ParityMode = lines.some((line) => /^#\s*parity:\s*informational/.test(line))
    ? "informational"
    : "strict";
  const oracle = lines.some((line) => /^#\s*oracle:/.test(line));

  /*
   * `# reason:` runs until the next directive, not to the end of the file — the
   * per-turn `# informational:` / `# strict:` markers below it are directives in
   * their own right, and swallowing them turned the whole-file reason into an
   * unreadable run-on that repeated them.
   */
  const reasonLines: string[] = [];
  let collecting = false;
  for (const line of lines) {
    if (!line.startsWith("#")) continue;
    if (/^#\s*reason:/.test(line)) {
      collecting = true;
      reasonLines.push(line.replace(/^#\s*reason:\s*/, ""));
      continue;
    }
    if (/^#\s*(parity|informational|strict):/.test(line)) {
      collecting = false;
      continue;
    }
    if (collecting) reasonLines.push(line.replace(/^#\s*/, ""));
  }
  const reason = reasonLines.join(" ").replace(/\s+/g, " ").trim();

  return {
    commands,
    parity,
    oracle,
    reason: parity === "informational" ? reason : "",
    informationalTurns,
  };
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
