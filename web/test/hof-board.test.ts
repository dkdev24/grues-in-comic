/**
 * The board's two rendering rules that are not DOM (ADR 0011 §1, stage 6.8e).
 *
 * The markup around them is untested on purpose — this project has no DOM test
 * environment and adding one to assert that a `<span>` contains a string would
 * buy nothing. What is worth pinning is the flag arithmetic, which is silently
 * wrong for a whole country if the offset slips, and the mark column, which
 * carries three different meanings in three tiers.
 */

import { describe, expect, it } from "vitest";
import { flagOf, markFor } from "../src/hof-board.js";

describe("flagOf", () => {
  it("offsets a two-letter code into the regional indicator range", () => {
    expect(flagOf("KR")).toBe("🇰🇷");
    expect(flagOf("US")).toBe("🇺🇸");
    expect(flagOf("JP")).toBe("🇯🇵");
  });

  it("renders nothing rather than a wrong flag", () => {
    // The server already resolved Tor, XX and absent to null (ADR 0011 §4);
    // this is the second line of defence, and it draws a blank.
    for (const unknown of [null, "", "K", "KOR", "kr", "1A"]) {
      expect(flagOf(unknown)).toBe("");
    }
  });
});

describe("markFor", () => {
  it("ranks the finished tier and badges the live one", () => {
    expect(markFor("won", 0)).toBe("1ST");
    expect(markFor("won", 2)).toBe("3RD");
    expect(markFor("live", 0)).toBe("▸ PLAYING NOW");
    expect(markFor("recent", 0)).toBe("");
  });

  it("keeps ranking past the three ordinals it spells out", () => {
    expect(markFor("won", 3)).toBe("4TH");
    expect(markFor("won", 9)).toBe("10TH");
  });
});
