/**
 * Stage 4.4 — golden-transcript parity, as a test rather than a report.
 *
 * `npm run replay` is the human-facing harness; this is the same comparison
 * wired into the suite so parity cannot regress silently between sessions. The
 * goldens are dfrotz captures of the shipped Release 119 story file, so this is
 * a diff against the real Zork I, not against our own earlier output.
 */

import { describe, expect, it } from "vitest";
import { loadDocument, replay, walkthroughNames } from "../harness/replay.js";
import { normalize, parseGolden, stripSessionEnd } from "../harness/golden.js";

const doc = loadDocument();
const names = walkthroughNames();

describe("golden transcripts", () => {
  it("has walkthroughs to replay", () => {
    expect(names.length).toBeGreaterThan(0);
  });

  for (const name of names) {
    const result = replay(name, doc);

    if (result.parity === "informational") {
      /*
       * Declared unverifiable, with a stated reason — see the `# parity:`
       * directive in the walkthrough. Asserting it *stays* unverifiable would
       * be wrong (fixing it is the goal), so the test only checks the
       * declaration is intact and the reason survives, keeping "cannot verify"
       * visible instead of quietly deleted.
       */
      it(`declares why ${name} cannot be verified`, () => {
        expect(result.reason.length).toBeGreaterThan(0);
      });
      continue;
    }

    it(`replays ${name} with no diff`, () => {
      // Report the diffs themselves on failure — a bare count says nothing
      // about which turn broke or how.
      expect(
        result.diffs.map((d) => `turn ${d.index + 1} (${d.command})\n  want: ${d.expected}\n  got:  ${d.actual}`),
      ).toEqual([]);
      expect(result.matched).toBe(result.total);
    });
  }

  it("verifies strictly on most walkthroughs", () => {
    // Guards against parity being "achieved" by marking everything
    // informational: the strict set must stay the large majority.
    const results = names.map((name) => replay(name, doc));
    const strict = results.filter((r) => r.parity === "strict");
    expect(strict.length).toBeGreaterThanOrEqual(results.length - 1);
  });

  it("compares a meaningful number of turns", () => {
    // Guards against the harness passing by comparing nothing — a normalizer
    // bug that empties both sides would otherwise look like perfect parity.
    const total = names.reduce((sum, name) => sum + replay(name, doc).total, 0);
    expect(total).toBeGreaterThanOrEqual(80);
  });
});

describe("the normalizer keeps what parity is measured on", () => {
  /*
   * The normalizer decides what "the same output" means, so it needs tests of
   * its own. If it discarded too much, every transcript would pass and the
   * harness above would be worthless.
   */

  it("reflows wrapped lines but keeps paragraph breaks", () => {
    const wrapped = "You are standing in an open field west of a white\nhouse.\n\nThere is a mailbox here.";
    expect(normalize(wrapped)).toBe(
      "You are standing in an open field west of a white house.\nThere is a mailbox here.",
    );
  });

  it("does not merge distinct paragraphs into one", () => {
    expect(normalize("First.\n\nSecond.")).not.toBe(normalize("First. Second."));
  });

  it("keeps real differences visible", () => {
    expect(normalize("Taken.")).not.toBe(normalize("Dropped."));
    expect(normalize("The door is open.")).not.toBe(normalize("The door is closed."));
  });

  it("strips the status line and interpreter chatter, not prose", () => {
    const raw = [
      "Using normal formatting.",
      "Loading /path/to/zork1.z3.",
      " West of House                       Score: 0        Moves: 0",
      "",
      "Release 119 / Serial number 880429",
      "",
      "West of House",
      "You are standing in an open field.",
      "> West of House                      Score: 0        Moves: 1",
      "",
      "Taken.",
    ].join("\n");

    const golden = parseGolden(raw);
    // One paragraph: the room name and its description are consecutive lines
    // in the capture, and reflowing them is exactly what the normalizer is for.
    expect(normalize(golden.opening)).toBe("West of House You are standing in an open field.");
    expect(normalize(golden.turns[0] ?? "")).toBe("Taken.");
  });

  it("cuts the end-of-session dialogue off the last turn", () => {
    const last = [
      "West of House",
      "",
      ">Your score is 0 (total of 350 points), in 7 moves.",
      "This gives you the rank of Beginner.",
      "Do you wish to leave the game? (Y is affirmative): >",
    ].join("\n");
    expect(normalize(stripSessionEnd(last))).toBe("West of House");
  });
});
