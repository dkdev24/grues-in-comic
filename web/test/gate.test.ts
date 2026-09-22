/**
 * ADR 0008 Phase 3 — the pixel-parity gate.
 *
 * Every other test in this directory asserts a *rule*: `IsSpeaker` drops a
 * silent body, `AddLine` opens a panel on `BM_ACTION`, the driver refuses a
 * balloon with no corridor. None of them would notice the failure this port is
 * actually exposed to — a change that keeps every rule and moves every pixel.
 * `balloon-layout.ts` rolls a PRNG seeded by a hash of the panel's speakers and
 * text, so editing that hash, adding a line to the mapper's prose, or retuning a
 * `SHOTS` rung re-places balloons across the whole strip while every rule test
 * stays green.
 *
 * So this one asserts the *output*: the SHA-256 of each rendered panel, plus the
 * geometry that produced it (see `tools/gate.ts` for why that pair and not
 * committed PNGs). It is a change detector, not a correctness proof — a drift
 * here means "look at the images", and `pnpm run gate:accept` is how you say yes.
 *
 * The gate renders real assets through `@napi-rs/canvas`, so unlike the
 * canvas-free tests it is coupled to that devDependency and to the built cast in
 * `web/assets/comic/`. Both are tracked; a bump of either is expected to move
 * pixels and to be re-accepted deliberately.
 */

import { describe, expect, it } from "vitest";
import { readGolden, runGate, type GateRecord } from "../tools/gate.js";

const golden = readGolden();
const actual = await runGate();

function byName(records: readonly GateRecord[]): Map<string, GateRecord> {
  return new Map(records.map((record) => [record.name, record]));
}

describe("panel gate (ADR 0008 Phase 3)", () => {
  it("pins the same set of cases", () => {
    expect(actual.records.map((r) => r.name)).toEqual(golden.map((r) => r.name));
  });

  const expected = byName(golden);
  for (const record of actual.records) {
    const was = expected.get(record.name);
    if (!was) continue; // the case-set assertion above owns this failure.

    // Geometry first, deliberately: when both fail, the reported diff should be
    // the readable one. A hash mismatch alone tells you nothing about what moved.
    it(`${record.name} — geometry`, () => {
      expect(record.trace).toEqual(was.trace);
      expect(record.bodies).toEqual(was.bodies);
    });

    it(`${record.name} — pixels`, () => {
      expect(record.sha256, "run `pnpm run gate:accept` if the change is intended")
        .toBe(was.sha256);
    });
  }

  /**
   * `stackBalloons` is the renderer's refusal path (`render.ts`), and a panel
   * that reaches it was laid out by a fallback rather than by the port. Which
   * cases do that is pinned per-case above; this asserts the *count* separately
   * so a new panel silently falling back is a failure with a name, rather than
   * one more changed hash.
   *
   * **Empty since M6.1g.** It used to be exactly `mob4-p02`, where the fit test's
   * estimated arrow positions passed a panel the real head anchors then refused —
   * the divergence `fit.ts` documents. Widening `BALLOON_HEADROOM` to 0.44 gave
   * that panel enough band that the estimate no longer matters. The two sides
   * still disagree; the disagreement just has slack to hide in now, so this stays
   * pinned at zero to catch the day it runs out again.
   */
  it("nothing falls back to the balloon stack", () => {
    const stacked = actual.records.filter((r) => r.trace.stacked).map((r) => r.name);
    expect(stacked).toEqual(golden.filter((r) => r.trace.stacked).map((r) => r.name));
    expect(stacked).toEqual([]);
  });
});
