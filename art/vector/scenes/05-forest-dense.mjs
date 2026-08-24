/** Forest — crowded trunks under a closed canopy, no sky. */
import { clamp, smoothstep, hatch, canopy, litter, tufts } from '../kit.mjs';
import { stand, foreground, groundFill } from './common.mjs';

const EDGE = [[-10, 438], [130, 424], [270, 416], [400, 422], [522, 436]];

export default {
  id: 'forest-dense', title: 'Forest', rooms: ['FOREST-1', 'FOREST-2', 'FOREST-3'],
  pairsWith: 'pastoral', seed: 1205,
  draw(S) {
    const { R } = S;
    // Trunks first and buried at both ends: a `bulb` closes with a bowed cap,
    // so a trunk stopped in mid-frame reads as an open pipe. The canopy goes
    // over the tops and the white ground over the feet.
    S.push(stand(S, {
      seed: 21,
      specs: [
        { x: 214, yTop: 40, yBot: 470, w0: 20, w1: 15, lean: 5, lit: 0.30, dark: 0.72, pitch: 5.8 },
        { x: 336, yTop: 30, yBot: 476, w0: 24, w1: 18, lean: -4, lit: 0.34, dark: 0.76, pitch: 5.6 },
        { x: 124, yTop: 44, yBot: 482, w0: 28, w1: 21, lean: 6, lit: 0.32, dark: 0.78, pitch: 5.6 },
        { x: 442, yTop: 24, yBot: 492, w0: 40, w1: 30, lean: -8, lit: 0.36, dark: 0.84, pitch: 5.4 },
        { x: 42, yTop: 12, yBot: 508, w0: 58, w1: 44, lean: 10, lit: 0.38, dark: 0.88, pitch: 5.2 },
        { x: 288, yTop: 6, yBot: 520, w0: 74, w1: 58, lean: -6, lit: 0.40, dark: 0.90, pitch: 5.0 },
      ],
    }));

    // the canopy is the ceiling of this room: one packed band across the top,
    // with the gaps between masses left white so it does not go solid
    for (const [cx, cy, rx, ry, sd] of [
      [40, 62, 96, 62, 101], [170, 40, 104, 58, 102], [300, 56, 96, 60, 103],
      [430, 38, 104, 56, 104], [516, 70, 90, 58, 105], [110, 118, 78, 40, 106],
      [372, 122, 84, 42, 107],
    ]) S.push(`<g fill="#000">${canopy(cx, cy, rx, ry, sd, { lobe: 0.13, dark: 0.95 })}</g>`);

    S.push(groundFill(EDGE));

    // undergrowth against the trunk feet, standing on the ground
    for (const [cx, cy, rx, ry, sd] of [[86, 410, 54, 26, 111], [362, 414, 60, 28, 112], [498, 420, 56, 26, 113]])
      S.push(`<g fill="#000">${canopy(cx, cy, rx, ry, sd, { lobe: 0.16 })}</g>`);

    // forest floor: leaf litter, thick under the trees and thinning forward
    S.push(`<g fill="#000">${litter({
      n: 2600, R,
      pick: () => {
        const x = R.range(-8, 520), y = R.range(400, 522);
        return R() > clamp(0.95 - smoothstep(420, 520, y) * 0.85) ? null : [x, y];
      },
    })}</g>`);
    S.push(foreground(S, { R, edgePts: EDGE, density: 110 }).g);
  },
};
