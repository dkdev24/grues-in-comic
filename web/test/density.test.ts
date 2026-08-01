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
    // Since ADR 0009 §6 the Hero may report *and* answer on one turn, so these
    // are a partition of his speaking turns by whether a reply was among them,
    // not by which single balloon he got.
    expect(t.heroReply + t.heroAction).toBe(t.hero);
  });

  it("cannot show more exchanges than were scripted", () => {
    expect(t.screenExchangeTurns).toBeLessThanOrEqual(t.exchanges);
    expect(t.onePanelExchangeTurns).toBeLessThanOrEqual(t.screenExchangeTurns);
    // Panels, not turns: one turn's run can leave several frames carrying both,
    // so this is bounded by the other panel census and not by the turn counts.
    expect(t.panelsExchange).toBeLessThanOrEqual(t.panelsBothSpeakers);
  });

  it("meets D5 — one exchange every 2–3 turns, oracle included (M6.1d)", () => {
    // **Inverted at M6.1d, which is what 6.1a wrote it for.** Until this slice it
    // asserted the opposite — `> 5`, "we are still nowhere near" — and it failed
    // the moment the limiters came off, which is the failure it existed to
    // produce. It is now the stage's exit criterion, kept as a floor *and* a
    // ceiling: a comic where the two never stop talking is as wrong as one where
    // they never start, and 6.1e adds a great deal of dialogue on top of this.
    expect(rates(t).turnsPerExchange).toBeGreaterThan(1.5);
    expect(rates(t).turnsPerExchange).toBeLessThanOrEqual(3);
    // The oracle is the honest number: the scene walkthroughs share an opening
    // dense in first visits, and a whole playthrough is not. It started at one in
    // 135 and it is the row D5 is really about.
    const oracle = current.files.find((f) => f.file === "12-full-game.cmd")!;
    expect(rates(oracle).turnsPerExchange).toBeLessThanOrEqual(3);
  });

  it("keeps the two-shot the common case for an exchange (M6.1d)", () => {
    // ADR 0005 §4's facing two-shot, measured: of the exchanges that reached the
    // screen, most put the DM's line and the Hero's answer in *one* panel. A turn
    // whose DM also reads a room description aloud is a panel run by ADR 0009 §4
    // and is not counted against this — the exchange closing the run is what the
    // run is built to end on.
    expect(t.onePanelExchangeTurns).toBeGreaterThan(t.screenExchangeTurns / 2);
  });
});
