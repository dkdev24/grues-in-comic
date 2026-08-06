import { describe, expect, it } from "vitest";
import { crossedMilestones, MAX_SCORE } from "../src/analytics.js";

describe("crossedMilestones", () => {
  it("reports nothing for a turn that doesn't cross a threshold", () => {
    expect(crossedMilestones(10, 20)).toEqual([]);
  });

  it("reports a single threshold crossed by one turn", () => {
    expect(crossedMilestones(80, 90)).toEqual([Math.round(MAX_SCORE * 0.25)]);
  });

  it("reports every threshold a single turn jumps past at once", () => {
    // A big pickup/deposit turn can cross more than one quarter in one move.
    expect(crossedMilestones(0, MAX_SCORE)).toEqual([
      Math.round(MAX_SCORE * 0.25),
      Math.round(MAX_SCORE * 0.5),
      Math.round(MAX_SCORE * 0.75),
      MAX_SCORE,
    ]);
  });

  it("never refires a threshold already reached before this turn", () => {
    expect(crossedMilestones(MAX_SCORE, MAX_SCORE)).toEqual([]);
  });

  it("does not fire on a score that drops", () => {
    // Death can cost points in Zork I; a drop must not look like a crossing.
    expect(crossedMilestones(100, 90)).toEqual([]);
  });
});
