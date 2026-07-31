/**
 * M6.1a — the dialogue-density baseline.
 *
 * This is a **change detector for content**, the counterpart of the pixel gate.
 * Everything else in this directory asserts a rule; the numbers M6.1 is judged on
 * are not rules, they are measurements of the authored tables against the corpus,
 * and they are meant to move — a lot, and repeatedly, over slices 6.1c–6.1e. What
 * must not happen is their moving *unnoticed*: an edit to `comic/script.ts`, to
 * the cooldown, or to `exchangeFor` changes how often the two characters speak,
 * and nothing else in the suite would report it.
 *
 * So a failure here means "look at the report, then `npm --prefix web run
 * density:accept` if that is the move you meant" — not "you broke something".
 *
 * The invariants below are separate on purpose: those *are* rules, they hold
 * whatever the numbers do, and they are what makes the baseline trustworthy as a
 * measurement rather than as a pile of integers.
 */

import { describe, expect, it } from "vitest";
import { diff, rates, readBaseline, runDensity } from "../tools/density.js";

const baseline = readBaseline();
const current = runDensity();

describe("dialogue density (M6.1a)", () => {
  it("matches the committed baseline", () => {
    expect(diff(baseline, current), "run `npm --prefix web run density` to read the drift")
      .toEqual([]);
  });

  it("measures the shipped tables, not a fixture", () => {
    // The whole reason `comic/script.ts` exists: if these fall back to an empty
    // or throwaway script the report is a measurement of nothing.
    expect(current.script.rooms).toBeGreaterThan(50);
    expect(current.script.beats).toBeGreaterThan(0);
    expect(current.guideCooldown).toBe(baseline.guideCooldown);
    expect(current.seed).toBe(baseline.seed);
  });

  it("covers the whole corpus, oracle included", () => {
    expect(current.files.map((f) => f.file)).toContain("12-full-game.cmd");
    // 606 turns is the corpus §6.1's diagnosis was measured over; a change to the
    // walkthroughs is a legitimate reason for this to move, and a reason to
    // re-read every rate in the plan.
    expect(current.totals.turns).toBe(606);
  });
});

describe("what the counts must obey whatever they are", () => {
  const t = current.totals;

  it("splits each balloon exactly once", () => {
    expect(t.dmBeat + t.dmGazetteer).toBeLessThanOrEqual(t.dm);
    expect(t.heroAction + t.heroReply).toBe(t.hero);
  });

  it("counts an exchange only where both spoke", () => {
    expect(t.exchanges).toBeLessThanOrEqual(Math.min(t.dm, t.heroReply));
    // The mapper gives the Hero one balloon per turn (`exchangeFor` rule 2), so
    // every reply is a turn on which he reported no action.
    expect(t.heroReply + t.heroAction).toBe(t.hero);
  });

  it("cannot show more exchanges than were scripted", () => {
    expect(t.screenExchangeTurns).toBeLessThanOrEqual(t.exchanges);
    expect(t.panelsExchange).toBeLessThanOrEqual(t.screenExchangeTurns);
    expect(t.panelsExchange).toBeLessThanOrEqual(t.panelsBothSpeakers);
  });

  it("is nowhere near D5 yet — the fact that scopes the whole stage", () => {
    // Not a target: a tripwire. D5 wants one exchange every 2–3 turns, and this
    // asserts we are still in the world where that is a 15–25× move. When 6.1d
    // lands, this test is what says so — it fails, and it is deleted or inverted
    // deliberately rather than quietly drifting past.
    expect(rates(t).turnsPerExchange).toBeGreaterThan(5);
  });
});
