/** Up a Tree — a limb across the foreground, the nest on it, the ground far below. */
import { clamp, smoothstep, fx, curve, ribbon, hatch, sky, canopy, limb, litter } from '../kit.mjs';
import { treeline } from './common.mjs';

export default {
  id: 'up-a-tree', title: 'Up a Tree', rooms: ['UP-A-TREE'],
  pairsWith: 'pastoral', seed: 1208,
  draw(S) {
    const { R } = S;
    // the ground is DOWN there: sky above, the tops of the wood below, and the
    // whole frame hangs off the limb crossing it
    S.push(S.clipped('M-16,-16 H528 V300 H-16 Z', sky({ yTop: -14, yBot: 298, base: 0.34, fade: 0.20, seed: 37 })));
    S.push(`<g fill="#000">${treeline(S, { y: 318, h: 34, seed: 67, step: 46, dark: 0.88 })}</g>`);
    S.push(`<g fill="#000">${treeline(S, { y: 372, h: 42, seed: 68, step: 58, dark: 0.94 })}</g>`);
    // the clearing floor seen from above, small and pale
    S.push(`<g fill="#000">${litter({
      n: 700, R,
      pick: () => {
        const x = R.range(120, 400), y = R.range(400, 512);
        return R() > 0.55 ? null : [x, y];
      }, len: [3, 7],
    })}</g>`);

    // the trunk this room is up: a slab holding the left edge, contour family
    const slab = 'M-16,-16 L112,-16 Q96,140 104,300 Q112,440 88,528 L-16,528 Z';
    S.push(`<path d="${slab}" fill="#fff"/>`);
    S.push(S.clipped(slab, hatch({
      x0: -18, x1: 118, y0: -18, y1: 530, angle: 0.06, pitch: 5.6, seed: 47,
      tone: (x, y) => clamp(0.88 - 0.70 * Math.exp(-(((x - 34) / 34) ** 2)) + 0.18 * smoothstep(80, 116, x)),
      wmin: 1.45, wmax: 3.4, wander: 1.4,
    })));
    S.push(`<path d="${slab}" fill="none" stroke="#000" stroke-width="5" stroke-linejoin="round"/>`);

    // the limb, and the small branches off it
    S.push(`<g fill="#000">${limb([[86, 292], [190, 320], [300, 336], [410, 328], [528, 306]], 46, 16)}</g>`);
    S.push(`<g fill="#000">${limb([[214, 322], [246, 268], [268, 214]], 16, 4)}</g>`);
    S.push(`<g fill="#000">${limb([[382, 330], [418, 276], [430, 232]], 14, 4)}</g>`);
    for (const [cx, cy, rx, ry, sd] of [[266, 196, 54, 30, 141], [432, 214, 48, 26, 142], [150, 246, 40, 22, 143]])
      S.push(`<g fill="#000">${canopy(cx, cy, rx, ry, sd, { lobe: 0.18 })}</g>`);

    // the nest: a woven mass of short strokes, and the egg sitting white in it
    const nest = 'M296,332 Q296,300 344,300 Q392,300 392,332 Q392,356 344,356 Q296,356 296,332 Z';
    S.push(`<path d="${nest}" fill="#fff"/>`);
    S.push(S.clipped(nest, hatch({
      x0: 292, x1: 396, y0: 296, y1: 360, angle: 0.55, pitch: 4.4, seed: 48,
      tone: (x, y) => clamp(0.82 - 0.5 * smoothstep(340, 300, y)), wmin: 1.4, wmax: 2.8, wander: 2.2,
    })));
    S.push(`<path d="${nest}" fill="none" stroke="#000" stroke-width="4.4" stroke-linejoin="round"/>`);
    S.push(`<ellipse cx="344" cy="312" rx="26" ry="19" fill="#fff" stroke="#000" stroke-width="4"/>`);
    S.push(`<path d="${curve([[326, 318], [336, 324], [352, 324], [362, 316]])}" fill="none" stroke="#000" stroke-width="2.4"/>`);
  },
};
