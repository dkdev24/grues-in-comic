/** Stone Barrow — the mound in the hillside with its dark mouth. */
import { clamp, smoothstep, curve, hatch, sky, canopy, rock, litter } from '../kit.mjs';
import { treeline, stand, foreground, groundFill } from './common.mjs';

const EDGE = [[-10, 452], [130, 442], [270, 436], [400, 442], [522, 454]];

export default {
  id: 'stone-barrow', title: 'Stone Barrow', rooms: ['STONE-BARROW'],
  pairsWith: 'barrow-exterior', seed: 1210,
  draw(S) {
    const { R } = S;
    S.push(S.clipped('M-16,-16 H528 V206 H-16 Z', sky({ yTop: -14, yBot: 204, base: 0.44, fade: 0.20, seed: 53 })));
    S.push(`<g fill="#000">${treeline(S, { y: 208, h: 40, seed: 70, step: 56 })}</g>`);

    // the mound: one big bulbous form with its own contour family bowing over
    // the round of it, sitting on the ground line
    const mound = curve([[-20, 388], [40, 342], [120, 286], [214, 248], [312, 244],
                         [408, 274], [478, 322], [532, 372]]) + ' L532,432 L-20,432 Z';
    S.push(`<path d="${mound}" fill="#fff"/>`);
    S.push(S.clipped(mound, hatch({
      x0: -22, x1: 534, y0: 240, y1: 436, angle: 0.10, pitch: 6.0, seed: 57,
      // light off the upper left, the mass turning away to the right and
      // deepening into the ground
      tone: (x, y) => clamp(0.34 + 0.40 * smoothstep(250, 430, y) + 0.28 * smoothstep(220, 470, x)),
      wmin: 1.45, wmax: 3.4, wander: 1.3,
    })));
    S.push(`<path d="${curve([[-20, 388], [40, 342], [120, 286], [214, 248], [312, 244], [408, 274], [478, 322], [532, 372]])}"
      fill="none" stroke="#000" stroke-width="5" stroke-linejoin="round"/>`);

    // the mouth: solid black, framed by two upright stones and a lintel
    const mouth = 'M212,398 Q212,314 262,306 Q312,314 312,398 Z';
    S.push(`<path d="${mouth}" fill="#000"/>`);
    S.push(rock({ cx: 196, cy: 358, rx: 34, ry: 52, seed: 58, scene: S, dark: 0.70, angle: 1.3 }));
    S.push(rock({ cx: 330, cy: 356, rx: 34, ry: 54, seed: 59, scene: S, dark: 0.76, angle: 1.3 }));
    S.push(rock({ cx: 262, cy: 292, rx: 82, ry: 22, seed: 60, scene: S, dark: 0.68, angle: 0.05 }));
    S.push(`<path d="${mouth}" fill="none" stroke="#000" stroke-width="5" stroke-linejoin="round"/>`);

    // the wood standing either side of the barrow — trunks first, canopy over
    // their tops, ground over their feet
    S.push(stand(S, {
      seed: 46,
      specs: [
        { x: 26, yTop: 110, yBot: 480, w0: 44, w1: 34, lean: 6, lit: 0.38, dark: 0.86, pitch: 5.2 },
        { x: 494, yTop: 112, yBot: 484, w0: 46, w1: 35, lean: -6, lit: 0.38, dark: 0.86, pitch: 5.2 },
      ],
    }));
    for (const [cx, cy, rx, ry, sd] of [[16, 118, 108, 66, 161], [498, 122, 106, 64, 162], [104, 178, 66, 34, 163]])
      S.push(`<g fill="#000">${canopy(cx, cy, rx, ry, sd, { lobe: 0.14, dark: 0.94 })}</g>`);
    S.push(groundFill(EDGE));

    S.push(rock({ cx: 402, cy: 414, rx: 40, ry: 22, seed: 61, scene: S, dark: 0.60 }));
    S.push(rock({ cx: 118, cy: 424, rx: 32, ry: 18, seed: 62, scene: S, dark: 0.56 }));
    S.push(`<g fill="#000">${litter({ n: 800, R, pick: () => (R() > 0.6 ? null : [R.range(-8, 520), R.range(408, 470)]), len: [3, 8] })}</g>`);

    S.push(foreground(S, { R, edgePts: EDGE, density: 120 }).g);
  },
};
