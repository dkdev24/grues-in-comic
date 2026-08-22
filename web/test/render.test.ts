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
import {
  applyHeadroom, clearOfFaces, fit, BALLOON_HEADROOM, MAX_FIGURE_WIDTH, MAX_HEAD_HEIGHT,
  type PlacedBody,
} from "../src/comic/render.js";
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
/** A figure whose head is `headFrac` of it — the roster's spread is 0.295..0.479. */
const headed = (width: number, height: number, headFrac: number) =>
  ({ width, height, headHeight: height * headFrac }) as Figure;
const place = (fig: Figure, x: number, y: number, scale: number): PlacedBody =>
  ({ speaker: "hero", figure: fig, x, y, scale, mirror: false });

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

describe("applyHeadroom / MAX_HEAD_HEIGHT", () => {
  const height = 400;
  const band = height * BALLOON_HEADROOM;

  it("pushes a figure down to the band and caps a head that then crowds the frame", () => {
    // A big-headed Hero at a close-up: head-top above the band, head over the cap.
    const item = place(headed(200, 500, 0.35), 100, 0, 1);
    applyHeadroom([item], height);
    expect(item.y).toBeCloseTo(band);
    expect(item.figure.headHeight * item.scale).toBeCloseTo(height * MAX_HEAD_HEIGHT);
    // Chin lands inside the panel with a body still under it.
    expect(item.y + item.figure.headHeight * item.scale).toBeLessThan(height * 0.83);
  });

  it("shrinks about the figure's own centre, so the balloon column stays over it", () => {
    const item = place(headed(200, 500, 0.35), 100, 0, 1);
    const centre = item.x + item.figure.width / 2;
    applyHeadroom([item], height);
    expect(item.x + (item.figure.width * item.scale) / 2).toBeCloseTo(centre);
  });

  it("leaves a small-headed figure at the band untouched", () => {
    // 0.30 of a figure filling the band-to-floor gap is under the cap: dan's case,
    // and the reason the packed cast's Hero does not move.
    const item = place(headed(200, 500, 0.28), 100, 0, 1);
    applyHeadroom([item], height);
    expect(item.scale).toBe(1);
    expect(item.y).toBeCloseTo(band);
  });

  it("does not touch a figure already sitting below the band", () => {
    // Pushing it further down is how a head leaves the *bottom* of the frame —
    // which is what a `reaction` Guide does when it is shrunk from the feet up.
    const item = place(headed(200, 500, 0.45), 100, band + 40, 1);
    applyHeadroom([item], height);
    expect(item.y).toBe(band + 40);
    expect(item.scale).toBe(1);
  });
});
