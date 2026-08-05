/**
 * An unlit room renders as a black frame.
 *
 * The one test in this directory that asserts on *pixels* outside the gate, and
 * deliberately so: darkness is a claim about what the reader can see, and the
 * rule tests beside it cannot tell a black panel from a lit one. It renders
 * through `@napi-rs/canvas` like the gate, so it carries the same coupling to
 * that devDependency and to the built cast in `web/assets/comic/`.
 *
 * It asserts *properties* rather than a hash — that the frame is dark, that no
 * figure is drawn on it, and that the balloons still are — so it survives the
 * re-rolls the gate exists to catch.
 */

import { describe, expect, it } from "vitest";
import { createCanvas } from "@napi-rs/canvas";
import type { PanelContext } from "../src/comic/page.js";
import type { Panel } from "../src/comic/mapper.js";
import { backdropFor } from "../src/comic/backdrop.js";
import { renderPanel } from "../src/comic/render.js";
import { FIXTURE_ROLES, NEUTRAL, loadFixtureCast } from "../tools/cast-fixture.js";

const W = 400;
const H = 400;
const cast = await loadFixtureCast(FIXTURE_ROLES);
// The fixture cast, not the shipped one: this asserts on the renderer, and the
// real avatars would couple it to casting decisions it makes no claim about.
const HERO_ROLE = "hero";
const DM_ROLE = "guide";

const context = (dark: boolean): PanelContext => ({
  turn: 1, camera: "medium", emphatic: false, room: "CELLAR",
  focus: null, marker: null, kind: "ambient", roomTitle: null, dark,
});

function panelOf(dark: boolean): Panel {
  return {
    ...context(dark),
    bodies: [
      { speaker: DM_ROLE, emotion: NEUTRAL },
      { speaker: HERO_ROLE, emotion: NEUTRAL, requested: true },
    ],
    speakers: [
      { speaker: DM_ROLE, text: "It is pitch black.", balloonClass: "CBWoodringNormal" as const },
    ],
  };
}

/** Every pixel of the rendered panel, as `[r, g, b]` triples. */
function render(dark: boolean): Uint8ClampedArray {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d") as unknown as CanvasRenderingContext2D;
  renderPanel(ctx, panelOf(dark), cast, W, H, { backdrop: backdropFor("CELLAR") });
  return ctx.getImageData(0, 0, W, H).data;
}

/**
 * Share of pixels that are exactly the darkness fill.
 *
 * Exactly, not "dark enough": the shipped cellar backdrop is itself mostly dark
 * art, so a brightness threshold cannot tell an unlit panel from a lit one in a
 * cave — the first draft of this test passed on the dark case and failed on the
 * lit one for that reason. An exact-match count separates a flat fill from a
 * drawn image whatever the image happens to look like.
 */
function fillShare(pixels: Uint8ClampedArray): number {
  let filled = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i] === 11 && pixels[i + 1] === 11 && pixels[i + 2] === 11) filled += 1;
  }
  return filled / (pixels.length / 4);
}

describe("a dark panel", () => {
  it("is a flat black fill, where a lit one is a drawn room", () => {
    // Not 100%: the balloon and the panel border survive on top of the black.
    expect(fillShare(render(true))).toBeGreaterThan(0.8);
    expect(fillShare(render(false))).toBeLessThan(0.05);
  });

  it("still draws the balloon, which is the panel's only content", () => {
    const pixels = render(true);
    let white = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i]! > 200 && pixels[i + 1]! > 200 && pixels[i + 2]! > 200) white += 1;
    }
    // A speech balloon is a white blob with black text — thousands of pixels of
    // it. Nothing else in an unlit panel is light-coloured.
    expect(white).toBeGreaterThan(1000);
  });

  it("records the figures it placed but did not draw, so the geometry stays comparable", () => {
    const trace = { bodies: [], balloons: [], stacked: false };
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d") as unknown as CanvasRenderingContext2D;
    renderPanel(ctx, panelOf(true), cast, W, H, { trace });
    expect(trace.bodies.length).toBeGreaterThan(0);
    expect(trace.balloons.length).toBeGreaterThan(0);
  });

  it("does not suppress the caption box a death in the dark still carries", () => {
    const panel = { ...panelOf(true), roomTitle: "Cellar" } as Panel;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d") as unknown as CanvasRenderingContext2D;
    renderPanel(ctx, panel, cast, W, H, {});
    // The box is white-on-black at the top-left margin; sample inside it.
    const [r, g, b] = ctx.getImageData(14, 14, 1, 1).data;
    expect([r, g, b]).toEqual([255, 255, 255]);
  });
});
