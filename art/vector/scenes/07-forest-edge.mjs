/** Forest, east edge — the trees give out onto open ground. */
import { clamp, smoothstep, curve, hatch, sky, canopy, rock, litter } from '../kit.mjs';
import { stand, treeline, foreground, groundFill } from './common.mjs';

const EDGE = [[-10, 420], [130, 404], [280, 388], [400, 384], [522, 390]];

export default {
  id: 'forest-edge', title: 'Forest Edge', rooms: ['FOREST-3', 'MOUNTAINS'],
  pairsWith: 'pastoral', seed: 1207,
  draw(S) {
    const { R } = S;
    // open sky over the right two thirds, the wood closing the left
    S.push(S.clipped('M-16,-16 H528 V264 H-16 Z', sky({ yTop: -14, yBot: 262, base: 0.40, fade: 0.20, seed: 29 })));

    // a far ridge, drawn as a bold contour with scrub ticks and nothing else:
    // flat frieze, no aerial perspective (rule 5)
    const ridge = curve([[150, 250], [230, 238], [300, 230], [372, 236], [450, 248], [528, 258]]);
    S.push(`<path d="${ridge}" fill="none" stroke="#000" stroke-width="3"/>`);
    S.push(`<g fill="#000">${treeline(S, { y: 268, x0: 156, x1: 534, h: 30, seed: 66, step: 62, dark: 0.86 })}</g>`);

    S.push(stand(S, {
      seed: 31,
      specs: [
        { x: 186, yTop: 92, yBot: 418, w0: 22, w1: 16, lean: 4, lit: 0.32, dark: 0.74, pitch: 5.8 },
        { x: 108, yTop: 62, yBot: 440, w0: 40, w1: 30, lean: 5, lit: 0.36, dark: 0.84, pitch: 5.4 },
        { x: 20, yTop: 20, yBot: 470, w0: 70, w1: 54, lean: 9, lit: 0.40, dark: 0.90, pitch: 5.0 },
      ],
    }));
    for (const [cx, cy, rx, ry, sd] of [
      [10, 66, 116, 80, 131], [126, 48, 96, 58, 132], [72, 158, 88, 46, 133], [196, 116, 66, 34, 134],
    ]) S.push(`<g fill="#000">${canopy(cx, cy, rx, ry, sd, { lobe: 0.13, dark: 0.94 })}</g>`);

    S.push(groundFill(EDGE));

    S.push(`<g fill="#000">${canopy(238, 372, 52, 26, 135, { lobe: 0.16 })}</g>`);
    S.push(rock({ cx: 402, cy: 336, rx: 44, ry: 26, seed: 53, scene: S, dark: 0.64 }));
    S.push(rock({ cx: 470, cy: 356, rx: 28, ry: 17, seed: 54, scene: S, dark: 0.56 }));
    S.push(`<g fill="#000">${litter({
      n: 900, R,
      pick: () => {
        const x = R.range(-8, 260), y = R.range(320, 470);
        return R() > clamp(0.9 - smoothstep(0, 260, x)) ? null : [x, y];
      },
    })}</g>`);

    S.push(foreground(S, { R, edgePts: EDGE, density: 150 }).g);
  },
};
