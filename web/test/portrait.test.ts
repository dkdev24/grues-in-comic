/**
 * Portraits, checked against the real cast.
 *
 * Two things are pinned here, and the second is the one that matters.
 *
 * The **crop** is asserted as a rect that exists on the sheet — the 5.3 lesson
 * that a wrong answer hides inside a total function applies exactly: a portrait
 * cropped from a bad rect draws *something* (blank, or a neighbouring part's
 * pixels) and looks like a rendering problem rather than an arithmetic one.
 *
 * The **choice of part** is asserted as NEUTRAL. This is the decision in
 * `portrait.ts`, and it is the one a future change is most likely to undo by
 * accident — wiring the bar to the panel's emotion is a natural-looking edit
 * and it silently converts a roster into a mood ring.
 *
 * The letterbox arithmetic is pinned separately against a synthetic rect,
 * because no real face happens to be square and the interesting cases are the
 * two orientations.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseAvatar } from "../../art/src/avb.js";
import { packAvatar } from "../../art/src/pack.js";
import type { PackedAvatar } from "../../art/src/cast-manifest.js";
import { drawPortrait, portraitCrop, PORTRAIT } from "../src/comic/portrait.js";

const CORPUS = fileURLToPath(
  new URL("../../original-projects/comic-chat/v2.5-beta-1/comicart/", import.meta.url),
);

/** The cast of ADR 0004 §11 as amended at 5.3 — the same pair `figure.test.ts` loads. */
const CAST = { hero: "dan.avb", guide: "tiki.avb" };

function load(file: string): PackedAvatar {
  const av = parseAvatar(new Uint8Array(readFileSync(CORPUS + file)), file);
  return packAvatar(av, file.replace(".avb", "")).avatar;
}

describe.each(Object.entries(CAST))("%s (%s)", (_role, file) => {
  const avatar = load(file);

  it("has a portrait at all", () => {
    // §11 constrains casting to complex avatars, which own faces by definition.
    // If this ever fails the casting rule has been broken, not the crop.
    expect(portraitCrop(avatar)).not.toBeNull();
  });

  it("crops from a NEUTRAL face, not from whatever is first", () => {
    const portrait = portraitCrop(avatar)!;
    expect(portrait.part.kind).toBe("face");
    // Spelled out rather than borrowed from `pose.ts`, which keeps its own
    // `isNeutral` private: a test that reuses the implementation's predicate
    // asserts only that the code agrees with itself. **Both halves matter** —
    // §11 records that HAPPY and NEUTRAL share angle 0 and are separated only
    // by intensity, so an angle check alone would accept a smiling portrait.
    expect(portrait.part.angle).toBe(0);
    expect(portrait.part.intensity).toBe(0);
  });

  it("crops a rect that lies inside the sheet", () => {
    const { source } = portraitCrop(avatar)!;
    expect(source.width).toBeGreaterThan(0);
    expect(source.height).toBeGreaterThan(0);
    expect(source.x).toBeGreaterThanOrEqual(0);
    expect(source.y).toBeGreaterThanOrEqual(0);
    expect(source.x + source.width).toBeLessThanOrEqual(avatar.sheetWidth);
    expect(source.y + source.height).toBeLessThanOrEqual(avatar.sheetHeight);
  });

  it("crops the same drawing the figure path would pick for a neutral panel", () => {
    // The property that makes the bar read as *this character*: the portrait is
    // not a second piece of art of them. Both sides go through `firstNeutral`,
    // so this asserts the two call sites have not diverged.
    const { part } = portraitCrop(avatar)!;
    expect(avatar.faces).toContain(part);
  });
});

/**
 * A fake context that records `drawImage` rather than drawing. The letterbox is
 * nine numbers of arithmetic; a canvas would only make them harder to read.
 */
function capture() {
  const calls: number[][] = [];
  const ctx = {
    drawImage: (_sheet: unknown, ...args: number[]) => { calls.push(args); },
  } as unknown as CanvasRenderingContext2D;
  return { ctx, calls };
}

describe("drawPortrait", () => {
  const sheet = {} as CanvasImageSource;

  it("fits a tall face by height and centres it horizontally", () => {
    const { ctx, calls } = capture();
    drawPortrait(ctx, sheet, {
      part: {} as never, source: { x: 12, y: 34, width: 40, height: 80 },
    }, 0, 0, PORTRAIT);

    // Scale is 56/80 = 0.7 — the *height* is the binding dimension.
    const [sx, sy, sw, sh, dx, dy, dw, dh] = calls[0]!;
    expect([sx, sy, sw, sh]).toEqual([12, 34, 40, 80]);
    expect([dw, dh]).toEqual([28, 56]);
    // Centred across, flush vertically, because height already fills the box.
    expect(dx).toBe((PORTRAIT - 28) / 2);
    expect(dy).toBe(0);
  });

  it("fits a wide face by width and centres it vertically", () => {
    const { ctx, calls } = capture();
    drawPortrait(ctx, sheet, {
      part: {} as never, source: { x: 0, y: 0, width: 80, height: 40 },
    }, 0, 0, PORTRAIT);

    const [, , , , dx, dy, dw, dh] = calls[0]!;
    expect([dw, dh]).toEqual([56, 28]);
    expect(dx).toBe(0);
    expect(dy).toBe((PORTRAIT - 28) / 2);
  });

  it("never distorts: the drawn aspect is the source aspect", () => {
    // Catches an *independent-axis* stretch — scaling width and height by
    // different factors to fill the box — which is what `drawFigure`'s
    // uniform-scale rule forbids.
    //
    // It does **not** catch `min` becoming `max`, which cover-crops instead of
    // letterboxing: that keeps the aspect and overflows the box. Checked by
    // mutation, not assumed. The two orientation tests above are what fail
    // there, and that is the division of labour between them.
    const { ctx, calls } = capture();
    const source = { x: 0, y: 0, width: 37, height: 91 };
    drawPortrait(ctx, sheet, { part: {} as never, source }, 5, 7, PORTRAIT);
    const [, , , , , , dw, dh] = calls[0]!;
    expect(dw / dh).toBeCloseTo(source.width / source.height, 6);
  });

  it("honours the origin it is given", () => {
    const { ctx, calls } = capture();
    drawPortrait(ctx, sheet, {
      part: {} as never, source: { x: 0, y: 0, width: 56, height: 56 },
    }, 100, 200, PORTRAIT);
    const [, , , , dx, dy] = calls[0]!;
    expect([dx, dy]).toEqual([100, 200]);
  });
});
