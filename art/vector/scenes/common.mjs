/** Forms shared by the ten early-game scenes. */
import {
  clamp, lerp, smoothstep, fx, fbm, curve, ribbon, dashes, rng,
  hatch, sky, trunk, bark, canopy, limb, tufts, litter, rock,
} from '../kit.mjs';

/**
 * A band of distant forest: one run of overlapping canopy masses on a bumpy
 * baseline. No trunks — at this depth the originals show only the mass.
 */
export function treeline(S, { y = 210, x0 = -20, x1 = 532, h = 46, seed = 60, step = 62, dark = 0.9 }) {
  const R = rng(seed);
  let g = '';
  for (let x = x0; x < x1; x += step * R.range(0.72, 1.15)) {
    const rx = step * R.range(0.55, 0.86);
    const ry = h * R.range(0.72, 1.18);
    g += canopy(x, y - ry * 0.15, rx, ry, seed + Math.round(x), { lobe: 0.20, dark });
  }
  return g;
}

/** A stand of trunks at assorted depths, back to front. */
export function stand(S, { specs, seed = 20 }) {
  let g = '';
  specs.forEach((s, i) => {
    const id = S.nextId();
    const t = trunk({ id, seed: seed + i * 5, ...s });
    S.defs.push(t.clipDef);
    g += t.svg;
    g += `<g fill="#000">${bark({ x: s.x, yTop: s.yTop, yBot: s.yBot, w: s.w0, seed: seed + i * 7, n: 4 })}</g>`;
  });
  return g;
}

/** The white foreground: a bold ground edge and sparse ticks below it. */
export function foreground(S, { edgePts, R, seed = 9, density = 150, spread = 1.1 }) {
  const edge = curve(edgePts);
  let g = `<path d="${edge}" fill="none" stroke="#000" stroke-width="3.2"/>`;
  const yAt = x => {
    for (let i = 0; i < edgePts.length - 1; i++)
      if (x >= edgePts[i][0] && x <= edgePts[i + 1][0])
        return lerp(edgePts[i][1], edgePts[i + 1][1], (x - edgePts[i][0]) / (edgePts[i + 1][0] - edgePts[i][0]));
    return edgePts[edgePts.length - 1][1];
  };
  // ticks standing along the edge itself, as the originals do
  const pts = [];
  for (let x = -8; x < 522; x += R.range(4, 11)) pts.push([x, yAt(x) + R.range(-2, 2)]);
  g += `<g fill="#000">${dashes({
    n: pts.length, pick: i => pts[i],
    angle: () => -Math.PI / 2 + R.range(-0.42, 0.42),
    len: () => R.range(4, 12), w0: 1.6, w1: 0.3,
  })}</g>`;
  g += `<g fill="#000">${tufts({
    n: density, R, x0: -6, x1: 518, y0: 300, y1: 520, spread,
    bias: (x, y) => (y < yAt(x) + 6 ? 0 : clamp(smoothstep(yAt(x), 500, y) * 0.9 + 0.12)),
  })}</g>`;
  return { g, yAt, edge };
}

/**
 * The white house.
 *
 * A flat frieze elevation — no vanishing point (rule 5). Clapboard siding is
 * one horizontal family; the roof is one family running with its slope; the
 * openings are boarded or dark. `flip` mirrors it about `cx`.
 */
export function house(S, { x0, x1, eave, base, apex, seed = 70, sideAngle = 0, roofDark = 0.62 }) {
  const cx = (x0 + x1) / 2;
  const wall = `M${fx(x0)},${fx(eave)} L${fx(x1)},${fx(eave)} L${fx(x1)},${fx(base)} L${fx(x0)},${fx(base)} Z`;
  const gable = `M${fx(x0 - 10)},${fx(eave)} L${fx(cx)},${fx(apex)} L${fx(x1 + 10)},${fx(eave)} Z`;
  let g = '';
  // roof first, wall over it, so the eave line stays crisp
  g += `<path d="${gable}" fill="#fff"/>`;
  g += S.clipped(gable, hatch({
    x0: x0 - 14, x1: x1 + 14, y0: apex - 6, y1: eave + 6,
    angle: Math.atan2(eave - apex, (x1 - x0) / 2), pitch: 6.4, seed: seed + 1,
    tone: (x, y) => clamp(roofDark - 0.30 * smoothstep(apex, eave, y) - 0.22 * smoothstep(cx, x1, x)),
    wmin: 1.4, wmax: 3.2, wander: 0.6,
  }));
  g += `<path d="${gable}" fill="none" stroke="#000" stroke-width="4.6" stroke-linejoin="round"/>`;

  g += `<path d="${wall}" fill="#fff"/>`;
  g += S.clipped(wall, hatch({
    x0: x0 - 6, x1: x1 + 6, y0: eave - 6, y1: base + 6,
    angle: sideAngle, pitch: 7.6, seed,
    // clapboard: light at the top of the wall, deepening toward the sill,
    // and every fourth seam run heavy so the boards read without a second family
    tone: (x, y) => clamp(0.30 + 0.24 * smoothstep(eave, base, y) - 0.16 * smoothstep(x0, cx, x)),
    wmin: 1.4, wmax: 3.0, wander: 0.5,
  }));
  g += `<path d="${wall}" fill="none" stroke="#000" stroke-width="4.6" stroke-linejoin="round"/>`;
  return { g, cx, wall, gable };
}

/** A brick chimney with its own cross family. */
export function chimney(S, { x, w, yTop, yBot, seed = 80 }) {
  const d = `M${fx(x)},${fx(yTop)} L${fx(x + w)},${fx(yTop)} L${fx(x + w)},${fx(yBot)} L${fx(x)},${fx(yBot)} Z`;
  return `<path d="${d}" fill="#fff"/>`
    + S.clipped(d, hatch({
        x0: x - 4, x1: x + w + 4, y0: yTop - 4, y1: yBot + 4, angle: 0, pitch: 7.0, seed,
        tone: () => 0.52, wmin: 1.5, wmax: 3.2, wander: 0.4,
      }))
    + `<path d="${d}" fill="none" stroke="#000" stroke-width="4.2" stroke-linejoin="round"/>`;
}

/** A trodden path: two bold edges converging, tufts crowding both sides. */
export function path(S, { near = [140, 512], far = [250, 260], width = 150, taper = 0.12, R, seed = 33 }) {
  const [nx, ny] = near, [fx0, fy] = far;
  const L = [], Rt = [];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    const x = lerp(nx, fx0, t), y = lerp(ny, fy, t);
    const w = (width / 2) * lerp(1, taper, smoothstep(0, 1, t));
    const j = (fbm(t * 4, seed, seed, 3) - 0.5) * 8 * (1 - t);
    L.push([x - w + j, y]); Rt.push([x + w + j, y]);
  }
  const dL = curve(L), dR = curve(Rt);
  let g = `<path d="${dL}" fill="none" stroke="#000" stroke-width="3.4"/>`;
  g += `<path d="${dR}" fill="none" stroke="#000" stroke-width="3.4"/>`;
  const pts = [];
  for (const side of [L, Rt]) for (const [x, y] of side) {
    for (let k = 0; k < 3; k++) pts.push([x + R.range(-7, 7), y + R.range(-4, 4)]);
  }
  g += `<g fill="#000">${dashes({
    n: pts.length, pick: i => pts[i],
    angle: () => -Math.PI / 2 + R.range(-0.5, 0.5),
    len: p => R.range(3, 10) * clamp(0.35 + (p[1] - fy) / 260), w0: 1.5, w1: 0.3,
  })}</g>`;
  return g;
}

/**
 * The white ground, painted over whatever runs into it.
 *
 * Trunks have to be drawn long and buried, not stopped at the ground line: a
 * `bulb` closes with a bowed cap, so a trunk that ends in mid-frame reads as an
 * open pipe. Same for the tops — draw the canopy AFTER the trunks so the mass
 * swallows the upper cap.
 */
export function groundFill(edgePts) {
  return `<path d="${curve(edgePts)} L540,548 L-20,548 Z" fill="#fff"/>`;
}
