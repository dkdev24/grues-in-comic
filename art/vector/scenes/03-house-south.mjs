/** South of House — the blank south wall and the scrub crowding it. */
import { clamp, smoothstep, hatch, sky, canopy, rock } from '../kit.mjs';
import { treeline, house, chimney, foreground, path } from './common.mjs';

export default {
  id: 'house-south', title: 'South of House', rooms: ['SOUTH-OF-HOUSE'],
  pairsWith: 'field', seed: 1203,
  draw(S) {
    const { R } = S;
    S.push(S.clipped('M-16,-16 H528 V220 H-16 Z', sky({ yTop: -14, yBot: 220, base: 0.42, fade: 0.18, seed: 13 })));
    S.push(`<g fill="#000">${treeline(S, { y: 224, h: 42, seed: 63, step: 66 })}</g>`);

    // mirror of the north view: the house holds the left edge, no openings on
    // this face, which is the whole point of the room
    const h = house(S, { x0: -20, x1: 236, eave: 196, base: 380, apex: 120, seed: 73, sideAngle: -0.03 });
    S.push(chimney(S, { x: 36, w: 34, yTop: 80, yBot: 168, seed: 83 }));
    S.push(h.g);

    // a single high window, boarded, and the foundation shadow
    S.push(`<rect x="124" y="244" width="64" height="56" fill="#000" stroke="#000" stroke-width="4.4"/>`);
    for (let i = 0; i < 2; i++)
      S.push(`<path d="M114,${256 + i * 28} L200,${250 + i * 28} L200,${266 + i * 28} L114,${272 + i * 28} Z"
        fill="#fff" stroke="#000" stroke-width="3.4" stroke-linejoin="round"/>`);
    S.push(`<path d="M-20,380 H236" fill="none" stroke="#000" stroke-width="6"/>`);

    S.push(path(S, { near: [330, 522], far: [268, 236], width: 132, taper: 0.14, R, seed: 35 }));
    S.push(`<g fill="#000">${canopy(300, 330, 54, 28, 95, { lobe: 0.15 })}</g>`);
    S.push(`<g fill="#000">${canopy(452, 348, 66, 34, 96, { lobe: 0.14 })}</g>`);
    S.push(rock({ cx: 250, cy: 392, rx: 34, ry: 20, seed: 51, scene: S, dark: 0.66 }));

    const fg = foreground(S, { R, edgePts: [[-10, 408], [130, 400], [280, 392], [410, 396], [522, 408]], density: 125 });
    S.push(fg.g);
  },
};
