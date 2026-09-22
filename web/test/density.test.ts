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
 * So a failure here means "look at the report, then `pnpm -C web run
 * density:accept` if that is the move you meant" — not "you broke something".
 *
 * The invariants below are separate on purpose: those *are* rules, they hold
 * whatever the numbers do, and they are what makes the baseline trustworthy as a
 * measurement rather than as a pile of integers.
 */

import { readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { D5_PRIME_MAX, D5_PRIME_MIN, diff, rates, readBaseline, runDensity } from "../tools/density.js";

const baseline = readBaseline();
const WALKTHROUGHS = join(fileURLToPath(new URL("../..", import.meta.url)), "verification", "walkthroughs");
const current = runDensity();

describe("dialogue density (M6.1a)", () => {
  it("matches the committed baseline", () => {
    expect(diff(baseline, current), "run `pnpm -C web run density` to read the drift")
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
    // **The corpus is read off the directory** (v0.28.5), so this asserts the
    // count matches the folder rather than a list kept by hand — the list was
    // hand-kept until `13-canyon-death.cmd` landed in `mapper.test.ts`'s corpus
    // and not in this one, which is F17's bug in miniature.
    expect(current.files).toHaveLength(
      readdirSync(WALKTHROUGHS).filter((file) => file.endsWith(".cmd")).length,
    );
    // 634 turns since the death scene. It was 623 from M6.1g, and 606 before
    // that, while the full-game row was a *naive* replay of `12-full-game.cmd` —
    // a game lost at the troll and then flailed through 16 surface rooms
    // (`PITFALLS.md` → Web). A change to the walkthroughs is a legitimate reason
    // for this to move, and a reason to re-read every rate in the plan.
    expect(current.totals.turns).toBe(634);
  });

  it("measures a game that is *won*, not one that is lost (M6.1g)", () => {
    // The regression that matters most about the row, stated so it cannot come
    // back quietly: the losing replay only ever saw 16 of 110 rooms, so it fired
    // a fraction of the gazetteer. Two thirds of every aggregate above depends
    // on this staying true.
    const oracle = current.files.find((f) => f.file === "12-full-game.cmd")!;
    expect(oracle.turns).toBeGreaterThan(400);
    expect(oracle.dmGazetteer).toBeGreaterThan(50);
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

  it("meets D5′ — both speakers share a band of emitted panels (ADR 0010 §4, 6.1k)", () => {
    // D5 (turn rate) went to ~1.0 by construction once the Hero speaks on
    // nearly every turn (ADR 0010 §4), so the exit criterion moved to a panel
    // share instead: `panelsBothSpeakers / panels`. A band, not a floor — both
    // ends are real failure modes. The bottom guards against the pane reading
    // as two monologues (the "1.6" undershoot session 4 hit going the other
    // direction, `docs/DEVELOPMENT_PLAN.md` §6.1e); the top guards against a
    // wall of talk where the two never stop. Set from this slice's own
    // measurement (43.7%) with room on both sides for 6.1e's remaining
    // authoring to move it.
    expect(rates(t).bothSpeakersShare).toBeGreaterThan(D5_PRIME_MIN);
    expect(rates(t).bothSpeakersShare).toBeLessThanOrEqual(D5_PRIME_MAX);
    const oracle = current.files.find((f) => f.file === "12-full-game.cmd")!;
    expect(rates(oracle).bothSpeakersShare).toBeGreaterThan(D5_PRIME_MIN);
    expect(rates(oracle).bothSpeakersShare).toBeLessThanOrEqual(D5_PRIME_MAX);
  });
});
