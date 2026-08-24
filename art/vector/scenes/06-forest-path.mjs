/** Forest Path — the track north, with a gap of light at the end of it. */
import { clamp, smoothstep, hatch, sky, canopy, litter } from '../kit.mjs';
import { stand, path, foreground, treeline, groundFill } from './common.mjs';

const EDGE = [[-10, 452], [110, 440], [256, 448], [400, 440], [522, 452]];

export default {
  id: 'forest-path', title: 'Forest Path', rooms: ['PATH'],
  pairsWith: 'pastoral', seed: 1206,
  draw(S) {
    const { R } = S;
    // the light at the end of the path: a bright gap the canopy closes around
    S.push(S.clipped('M176,120 Q182,196 172,266 Q260,278 346,266 Q338,192 344,118 Q260,104 176,120 Z', sky({ yTop: 110, yBot: 268, base: 0.22, fade: 0.16, seed: 23, xs: 168, xe: 352 })));
    S.push(`<g fill="#000">${treeline(S, { y: 262, x0: 160, x1: 360, h: 26, seed: 65, step: 44 })}</g>`);

    S.push(stand(S, {
      seed: 26,
      specs: [
        { x: 168, yTop: 96, yBot: 462, w0: 18, w1: 13, lean: 3, lit: 0.30, dark: 0.70, pitch: 5.8 },
        { x: 352, yTop: 94, yBot: 466, w0: 20, w1: 14, lean: -3, lit: 0.32, dark: 0.72, pitch: 5.8 },
        { x: 96, yTop: 40, yBot: 476, w0: 38, w1: 28, lean: 5, lit: 0.36, dark: 0.82, pitch: 5.4 },
        { x: 424, yTop: 36, yBot: 480, w0: 44, w1: 33, lean: -6, lit: 0.36, dark: 0.84, pitch: 5.4 },
        { x: 8, yTop: 10, yBot: 508, w0: 66, w1: 50, lean: 8, lit: 0.40, dark: 0.90, pitch: 5.0 },
        { x: 508, yTop: 8, yBot: 512, w0: 68, w1: 52, lean: -8, lit: 0.40, dark: 0.90, pitch: 5.0 },
      ],
    }));

    for (const [cx, cy, rx, ry, sd] of [
      [24, 60, 110, 74, 121], [148, 44, 96, 56, 122], [372, 46, 98, 56, 123],
      [500, 62, 108, 70, 124], [64, 150, 84, 44, 125], [456, 152, 86, 44, 126],
    ]) S.push(`<g fill="#000">${canopy(cx, cy, rx, ry, sd, { lobe: 0.13, dark: 0.95 })}</g>`);

    S.push(groundFill(EDGE));
    // the two nearest trunks stand IN the ground, so their feet are covered by
    // scrub rather than by the ground fill
    for (const [cx, cy, rx, ry, sd] of [[34, 434, 62, 30, 127], [486, 438, 62, 30, 128]])
      S.push(`<g fill="#000">${canopy(cx, cy, rx, ry, sd, { lobe: 0.16 })}</g>`);

    S.push(path(S, { near: [252, 524], far: [262, 276], width: 210, taper: 0.16, R, seed: 36 }));
    S.push(`<g fill="#000">${litter({
      n: 1500, R,
      pick: () => {
        const x = R.range(-8, 520), y = R.range(300, 522);
        // the track itself stays clear; the litter banks up either side of it
        const half = 105 * (0.16 + 0.84 * smoothstep(276, 524, y));
        if (Math.abs(x - 256) < half * 0.86) return null;
        return R() > 0.8 ? null : [x, y];
      },
    })}</g>`);
    S.push(foreground(S, { R, edgePts: EDGE, density: 90 }).g);
  },
};
