/** Behind House — the east face, with the one window slightly ajar. */
import { clamp, smoothstep, curve, hatch, sky, canopy, rock } from '../kit.mjs';
import { treeline, house, foreground } from './common.mjs';

export default {
  id: 'house-behind', title: 'Behind House', rooms: ['EAST-OF-HOUSE'],
  pairsWith: 'field', seed: 1204,
  draw(S) {
    const { R } = S;
    S.push(S.clipped('M-16,-16 H528 V232 H-16 Z', sky({ yTop: -14, yBot: 232, base: 0.36, fade: 0.14, seed: 17 })));
    S.push(`<g fill="#000">${treeline(S, { y: 236, h: 48, seed: 64, step: 50 })}</g>`);

    const h = house(S, { x0: 214, x1: 528, eave: 198, base: 392, apex: 118, seed: 74 });
    S.push(h.g);

    // the ajar window: a black opening with the sash swung out over it, and a
    // white sill catching the light. The one thing this room is about.
    S.push(`<rect x="286" y="252" width="104" height="92" fill="#000" stroke="#000" stroke-width="4.6"/>`);
    const sash = 'M288,250 L246,236 L246,330 L288,342 Z';
    S.push(`<path d="${sash}" fill="#fff"/>`);
    S.push(S.clipped(sash, hatch({
      x0: 242, x1: 292, y0: 232, y1: 346, angle: 1.35, pitch: 6.2, seed: 46,
      tone: (x) => clamp(0.30 + 0.34 * smoothstep(288, 246, x)), wmin: 1.4, wmax: 3.0, wander: 0.6,
    })));
    S.push(`<path d="${sash}" fill="none" stroke="#000" stroke-width="4.4" stroke-linejoin="round"/>`);
    S.push(`<path d="M262,236 L262,330" fill="none" stroke="#000" stroke-width="3"/>`);
    S.push(`<path d="M280,344 L398,344 L394,356 L282,356 Z" fill="#fff" stroke="#000" stroke-width="4"/>`);

    // the path round the corner of the house, and the scrub either side of it
    S.push(`<path d="${curve([[196, 522], [206, 460], [222, 412], [236, 392]])}" fill="none" stroke="#000" stroke-width="3.4"/>`);
    S.push(`<g fill="#000">${canopy(126, 320, 72, 38, 97, { lobe: 0.14 })}</g>`);
    S.push(`<g fill="#000">${canopy(36, 352, 62, 34, 98, { lobe: 0.14 })}</g>`);
    S.push(rock({ cx: 158, cy: 404, rx: 30, ry: 18, seed: 52, scene: S, dark: 0.60 }));

    const fg = foreground(S, { R, edgePts: [[-10, 424], [140, 412], [280, 406], [410, 410], [522, 420]], density: 130 });
    S.push(fg.g);
  },
};
