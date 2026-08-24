/** West of House — the white house front, boarded door, small mailbox. */
import { clamp, smoothstep, fx, curve, hatch, sky, canopy, rock } from '../kit.mjs';
import { treeline, house, chimney, foreground } from './common.mjs';

export default {
  id: 'house-west', title: 'West of House', rooms: ['WEST-OF-HOUSE'],
  pairsWith: 'field', seed: 1201,
  draw(S) {
    const { R } = S;
    // sky down to the treeline
    S.push(S.clipped('M-16,-16 H528 V214 H-16 Z', sky({ yTop: -14, yBot: 214, base: 0.40, fade: 0.16, seed: 4 })));
    S.push(`<g fill="#000">${treeline(S, { y: 218, h: 40, seed: 61, step: 58 })}</g>`);

    const h = house(S, { x0: 132, x1: 404, eave: 196, base: 372, apex: 108, seed: 71 });
    S.push(chimney(S, { x: 336, w: 34, yTop: 74, yBot: 178, seed: 81 }));
    S.push(h.g);

    // the boarded front door, dead centre, and the two front windows
    S.push(`<rect x="248" y="266" width="66" height="106" fill="#000"/>`);
    S.push(`<rect x="248" y="266" width="66" height="106" fill="none" stroke="#000" stroke-width="4.4"/>`);
    for (let i = 0; i < 3; i++) {
      const y = 282 + i * 32;
      S.push(`<path d="M236,${y + i * 2} L326,${y - 4 + i * 2} L326,${y + 12 + i * 2} L236,${y + 16 + i * 2} Z"
        fill="#fff" stroke="#000" stroke-width="3.6" stroke-linejoin="round"/>`);
    }
    for (const wx of [166, 348]) {
      S.push(`<rect x="${wx}" y="240" width="46" height="52" fill="#000" stroke="#000" stroke-width="4.2"/>`);
      S.push(`<path d="M${wx - 8},262 L${wx + 54},256 L${wx + 54},270 L${wx - 8},276 Z" fill="#fff" stroke="#000" stroke-width="3.2"/>`);
    }

    // bushes crowding the foot of the wall
    S.push(`<g fill="#000">${canopy(126, 366, 44, 22, 91, { lobe: 0.18 })}</g>`);
    S.push(`<g fill="#000">${canopy(410, 362, 40, 20, 92, { lobe: 0.18 })}</g>`);

    const fg = foreground(S, { R, edgePts: [[-10, 400], [110, 388], [250, 378], [390, 380], [522, 392]], density: 130 });
    S.push(fg.g);

    // the mailbox: a bulbous box on a post, bold outline, contour family inside
    const box = 'M62,404 Q62,384 92,384 L138,384 Q158,384 158,406 Q158,428 138,428 L92,428 Q62,428 62,404 Z';
    S.push(`<path d="${box}" fill="#fff"/>`);
    S.push(S.clipped(box, hatch({
      x0: 58, x1: 162, y0: 380, y1: 432, angle: 0.08, pitch: 5.4, seed: 44,
      tone: (x, y) => clamp(0.78 - 0.66 * smoothstep(400, 384, y) - 0.2 * smoothstep(150, 100, x)),
      wmin: 1.4, wmax: 3.2, wander: 1.0,
    })));
    S.push(`<path d="${box}" fill="none" stroke="#000" stroke-width="4.6" stroke-linejoin="round"/>`);
    S.push(`<path d="M104,428 L102,492" fill="none" stroke="#000" stroke-width="7" stroke-linecap="round"/>`);
    S.push(`<path d="M150,392 L172,376" fill="none" stroke="#000" stroke-width="4"/>`);
  },
};
