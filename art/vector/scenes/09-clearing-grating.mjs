/** Clearing — the ring of trees, the leaves, and the grating under them. */
import { clamp, smoothstep, lerp, fx, curve, ribbon, hatch, sky, canopy, litter, rock } from '../kit.mjs';
import { stand, treeline, foreground, groundFill } from './common.mjs';

const EDGE = [[-10, 372], [130, 362], [270, 358], [400, 362], [522, 372]];

export default {
  id: 'clearing-grating', title: 'Clearing (Grating)', rooms: ['CLEARING', 'GRATING-CLEARING'],
  pairsWith: 'grating-clearing', seed: 1209,
  draw(S) {
    const { R } = S;
    // a hole of sky over the middle of the clearing, ringed by canopy
    S.push(S.clipped('M120,-16 H400 V210 H120 Z', sky({ yTop: -14, yBot: 208, base: 0.30, fade: 0.18, seed: 43, xs: 118, xe: 402 })));
    S.push(`<g fill="#000">${treeline(S, { y: 224, x0: 110, x1: 410, h: 30, seed: 69, step: 48 })}</g>`);

    // trunks buried top and bottom (see `groundFill`)
    S.push(stand(S, {
      seed: 41,
      specs: [
        { x: 146, yTop: 106, yBot: 396, w0: 20, w1: 14, lean: 3, lit: 0.30, dark: 0.72, pitch: 5.8 },
        { x: 372, yTop: 104, yBot: 400, w0: 22, w1: 16, lean: -3, lit: 0.32, dark: 0.74, pitch: 5.8 },
        { x: 40, yTop: 40, yBot: 440, w0: 52, w1: 40, lean: 7, lit: 0.38, dark: 0.88, pitch: 5.2 },
        { x: 486, yTop: 38, yBot: 444, w0: 54, w1: 42, lean: -7, lit: 0.38, dark: 0.88, pitch: 5.2 },
      ],
    }));
    for (const [cx, cy, rx, ry, sd] of [
      [4, 54, 110, 74, 151], [116, 30, 84, 48, 152], [396, 32, 86, 48, 153], [516, 56, 110, 74, 154],
      [58, 152, 84, 44, 155], [462, 154, 86, 44, 156],
    ]) S.push(`<g fill="#000">${canopy(cx, cy, rx, ry, sd, { lobe: 0.13, dark: 0.94 })}</g>`);

    S.push(groundFill(EDGE));

    // the clearing floor, leaf-strewn, thinning where the grating is swept clear
    S.push(`<g fill="#000">${litter({
      n: 2200, R,
      pick: () => {
        const x = R.range(-8, 520), y = R.range(370, 522);
        if (Math.hypot((x - 258) / 128, (y - 434) / 62) < 1.05) return null;
        return R() > 0.72 ? null : [x, y];
      },
    })}</g>`);

    // THE GRATING. A dark pit under a heavy iron lattice, sunk flush in the
    // ground: bold frame, bars as white ribbons, black between them.
    const frame = 'M148,428 L368,414 L392,470 L128,486 Z';
    S.push(`<path d="${frame}" fill="#000"/>`);
    const bars = [];
    for (let i = 1; i < 7; i++) {
      const t = i / 7;
      bars.push(ribbon([[lerp(148, 368, t), lerp(428, 414, t)], [lerp(128, 392, t), lerp(486, 470, t)]], [5.2, 6.0]));
    }
    for (let i = 1; i < 3; i++) {
      const t = i / 3;
      bars.push(ribbon([[lerp(148, 128, t), lerp(428, 486, t)], [lerp(368, 392, t), lerp(414, 470, t)]], [4.4, 4.4]));
    }
    S.push(`<g fill="#fff"><path d="${bars.join('')}"/></g>`);
    S.push(`<path d="${frame}" fill="none" stroke="#000" stroke-width="6" stroke-linejoin="round"/>`);

    S.push(rock({ cx: 430, cy: 402, rx: 36, ry: 21, seed: 55, scene: S, dark: 0.62 }));
    S.push(foreground(S, { R, edgePts: EDGE, density: 60, spread: 1.2 }).g);
  },
};
