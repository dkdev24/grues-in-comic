/**
 * The two pure helpers behind the panel layout fixes, pinned. Both are exported
 * from `render.ts` solely so they can be exercised here without a canvas or a
 * cast; `renderPanel` is their only production caller.
 *
 * Guards the v1.8.0 Last Session work:
 *  - `clearOfFaces` — a thought balloon must never land on a face; it slides
 *    horizontally out of every head keep-out box, and is a no-op when clear.
 *  - `fit` / `MAX_FIGURE_WIDTH` — a panel carrying a Guide/Hero balloon caps the
 *    figure width so a balloon column survives beside the head; a caption-only or
 *    `reaction` panel passes `Infinity` and is left uncapped.
 */

import { describe, expect, it } from "vitest";
import { clearOfFaces, fit, MAX_FIGURE_WIDTH } from "../src/comic/render.js";
import type { Figure } from "../src/comic/figure.js";

type Face = { left: number; right: number; top: number; bottom: number };

/** [x−bulge, x+w+bulge] vs [f.left, f.right] must not overlap horizontally. */
function disjointH(x: number, w: number, bulge: number, f: Face): boolean {
  const left = x - bulge;
  const right = x + w + bulge;
  return right <= f.left || left >= f.right;
}

// `fit` reads only width and height off the figure.
const figure = (width: number, height: number) => ({ width, height }) as Figure;

describe("clearOfFaces", () => {
  const width = 400;

  it("slides a balloon that overlaps a face until it is disjoint", () => {
    const face: Face = { left: 180, right: 220, top: 120, bottom: 300 };
    const x = clearOfFaces(150, 200, 100, 60, 14, [face], width);
    expect(disjointH(x, 100, 14, face)).toBe(true);
    expect(x).not.toBe(150); // it actually moved
  });

  it("is a no-op when the balloon already clears horizontally", () => {
    const face: Face = { left: 180, right: 220, top: 120, bottom: 300 };
    expect(clearOfFaces(300, 200, 80, 60, 14, [face], width)).toBe(300);
  });

  it("is a no-op when the balloon clears vertically (well above the head)", () => {
    const face: Face = { left: 180, right: 220, top: 400, bottom: 560 };
    expect(clearOfFaces(190, 10, 80, 60, 14, [face], width)).toBe(190);
  });

  it("tolerates overlap when the face is too wide to clear either side", () => {
    const face: Face = { left: 40, right: 360, top: 120, bottom: 300 };
    // Cannot fit left or right of a panel-spanning head; left in place, only
    // clamped inside the edges — a small honest overlap over an unreadable ribbon.
    expect(clearOfFaces(100, 200, 200, 60, 0, [face], width)).toBe(100);
  });

  it("settles a balloon into the gap between two on-stage heads", () => {
    // Two heads with a comfortable gap (140..260); a balloon that fits the gap
    // should be slid off the left head and land clear of both. (The pass is
    // greedy, not a global solver — this asserts it finds an existing seat, not
    // that it can wedge an oversized balloon between crowded faces.)
    const faces: Face[] = [
      { left: 60, right: 140, top: 120, bottom: 300 },
      { left: 260, right: 340, top: 120, bottom: 300 },
    ];
    const x = clearOfFaces(120, 200, 70, 60, 8, faces, width);
    for (const f of faces) expect(disjointH(x, 70, 8, f)).toBe(true);
  });
});

describe("fit / MAX_FIGURE_WIDTH", () => {
  const height = 400;
  const fill = 1.35; // close-up: fill alone would let a wide figure span the panel

  it("caps a wide figure to the balloon width when a Guide/Hero balloon is present", () => {
    const wide = figure(300, 300);
    const capped = fit(wide, height, fill, 400 * MAX_FIGURE_WIDTH);
    expect(capped).toBeCloseTo((400 * MAX_FIGURE_WIDTH) / 300);
    // Strictly smaller than the same panel with no balloon.
    expect(capped).toBeLessThan(fit(wide, height, fill, Infinity));
  });

  it("leaves a caption-only / reaction panel (Infinity cap) uncapped", () => {
    const wide = figure(300, 300);
    // height*fill/h = 1.8, clamped by MAX_SCALE 1.6; the width cap does not apply.
    expect(fit(wide, height, fill, Infinity)).toBeCloseTo(1.6);
  });

  it("does not shrink a narrow figure even under the cap", () => {
    const narrow = figure(100, 300);
    const capped = fit(narrow, height, fill, 400 * MAX_FIGURE_WIDTH);
    expect(capped).toBe(fit(narrow, height, fill, Infinity)); // cap is not the binding term
  });
});
