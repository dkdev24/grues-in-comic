/** North of House — the north face, boarded windows, the path running north. */
import { clamp, smoothstep, hatch, sky, canopy } from '../kit.mjs';
import { treeline, house, chimney, foreground, path } from './common.mjs';

export default {
  id: 'house-north', title: 'North of House', rooms: ['NORTH-OF-HOUSE'],
  pairsWith: 'field', seed: 1202,
  draw(S) {
    const { R } = S;
    S.push(S.clipped('M-16,-16 H528 V226 H-16 Z', sky({ yTop: -14, yBot: 226, base: 0.38, fade: 0.15, seed: 9 })));
    S.push(`<g fill="#000">${treeline(S, { y: 230, h: 44, seed: 62, step: 54 })}</g>`);

    // the house sits to the right; the frame is mostly the ground it stands on
    const h = house(S, { x0: 268, x1: 528, eave: 202, base: 386, apex: 128, seed: 72, sideAngle: 0.03 });
    S.push(chimney(S, { x: 470, w: 32, yTop: 88, yBot: 190, seed: 82 }));
    S.push(h.g);

    // two boarded windows: the black opening first, planks over it
    for (const wx of [300, 400]) {
      S.push(`<rect x="${wx}" y="252" width="72" height="80" fill="#000" stroke="#000" stroke-width="4.4"/>`);
      for (let i = 0; i < 3; i++) {
        const y = 264 + i * 26;
        S.push(`<path d="M${wx - 10},${y + 3} L${wx + 82},${y - 3} L${wx + 82},${y + 12} L${wx - 10},${y + 18} Z"
          fill="#fff" stroke="#000" stroke-width="3.4" stroke-linejoin="round"/>`);
      }
    }

    S.push(path(S, { near: [120, 520], far: [188, 244], width: 168, taper: 0.10, R, seed: 34 }));
    S.push(`<g fill="#000">${canopy(52, 300, 58, 30, 93, { lobe: 0.16 })}</g>`);
    S.push(`<g fill="#000">${canopy(262, 380, 46, 24, 94, { lobe: 0.17 })}</g>`);

    const fg = foreground(S, { R, edgePts: [[-10, 416], [120, 404], [260, 398], [400, 404], [522, 416]], density: 120 });
    S.push(fg.g);
  },
};
