/**
 * Scene kit — the shared vocabulary the early-game backdrops are built from.
 *
 * `woodring.mjs` is the engine (ribbons, line families, the mottle, foliage
 * lobes). This is the layer above it: a frame to compose into, and the handful
 * of forms these ten outdoor scenes keep needing — sky, a hatched region at an
 * arbitrary angle, tree trunks, clapboard walls, boarded openings, ground
 * tufts, rocks.
 *
 * Every family here routes through `hatch()` or `bulb()`, so every family in a
 * scene carries the same mottle. That is rule 6 of the idiom: one hand.
 */
import {
  clamp, lerp, smoothstep, fx, rng, fbm,
  ribbon, lineField, waveLine, dashes, blob, curve, bulb, foliage, mottle,
} from './woodring.mjs';

export {
  clamp, lerp, smoothstep, fx, rng, fbm,
  ribbon, lineField, waveLine, dashes, blob, curve, bulb, foliage, mottle,
};

import { writeFileSync } from 'node:fs';


/** A drawing surface: clip-path bookkeeping, a paint list, and serialization. */
export function Scene({ seed = 1, W = 512, H = 512 }) {
  const defs = [], out = [];
  let uid = 0;
  const R = rng(seed);
  const clipId = d => {
    const id = `k${++uid}`;
    defs.push(`<clipPath id="${id}"><path d="${d}"/></clipPath>`);
    return id;
  };
  const push = (...s) => { for (const v of s) if (v) out.push(v); };
  /** Paint `inner` (black marks) only inside `region`. */
  const clipped = (region, inner) => `<g clip-path="url(#${clipId(region)})" fill="#000">${inner}</g>`;
  const svg = () => [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`,
    `<defs>${defs.join('')}</defs>`,
    `<rect width="${W}" height="${H}" fill="#fff"/>`,
    ...out,
    // rule 4: the originals all sit inside a bold closed border
    `<rect x="3" y="3" width="${W - 6}" height="${H - 6}" fill="none" stroke="#000" stroke-width="5"/>`,
    '</svg>',
  ].join('\n');
  const write = file => { const s = svg(); writeFileSync(file, s); return s.length; };
  return { W, H, R, defs, out, clipId, push, clipped, svg, write, nextId: () => `b${++uid}` };
}

/**
 * One line family at an arbitrary angle across a box.
 *
 * The generic workhorse: walls, roofs, ground shadow, cave rock, water. `tone`
 * gives the weight at a point, the mottle is added on top so the family reads
 * as the same hand as everything else, and `cut` breaks the line for light
 * rather than thinning it below a pixel.
 */
export function hatch({
  x0 = -16, y0 = -16, x1 = 528, y1 = 528, angle = 0, pitch = 6,
  tone = () => 0.5, wmin = 1.35, wmax = 2.9, gamma = 1, cut = 0.17,
  seed = 0, wander = 0.8, step = 1.8, mot = {},
}) {
  const ca = Math.cos(angle), sa = Math.sin(angle);
  const nx = -sa, ny = ca;
  const corners = [[x0, y0], [x1, y0], [x0, y1], [x1, y1]];
  const ss = corners.map(([x, y]) => x * nx + y * ny);
  const ts = corners.map(([x, y]) => x * ca + y * sa);
  const s0 = Math.min(...ss), s1 = Math.max(...ss);
  const t0 = Math.min(...ts), t1 = Math.max(...ts);
  const n = Math.max(1, Math.round((s1 - s0) / pitch));
  const m = Math.max(40, Math.round((t1 - t0) / step));
  return lineField({
    n,
    line: u => {
      const s = lerp(s0, s1, u), pts = [];
      for (let i = 0; i <= m; i++) {
        const t = lerp(t0, t1, i / m);
        const w = (fbm(t * 0.045, s * 0.9 + seed, seed + 3, 3) - 0.5) * 2 * wander;
        pts.push([ca * t + nx * (s + w), sa * t + ny * (s + w)]);
      }
      return pts;
    },
    tone: (x, y) => clamp(tone(x, y) + mottle(x * ca + y * sa, (x * nx + y * ny) / pitch, { seed, ...mot })),
    wmin, wmax, gamma, cut, minRun: 1.2,
  });
}

/**
 * The sky family: long, near-straight horizontals, lighter toward the horizon.
 *
 * Straight from `field.png` — the wander is under a pixel at native size and
 * all of the character is thickness along the line.
 */
export function sky({ yTop = -14, yBot = 268, base = 0.41, fade = 0.17, pitch = 6.0, seed = 3, xs = -14, xe = 526 }) {
  return lineField({
    n: Math.round((yBot - yTop) / pitch),
    line: t => waveLine(xs, xe, lerp(yTop, yBot, t), { amp: 0.55, freq: 0.030, seed: seed + t * 50, n: 420 }),
    tone: (x, y) => clamp(base - fade * smoothstep(yTop - 20, yBot, y) + mottle(x, y)),
    wmin: 1.35, wmax: 2.9, gamma: 1.0, cut: 0.17, minRun: 1.2,
  });
}

/**
 * A tree trunk: `bulb` with a narrow profile, so the contour family runs
 * ACROSS the trunk and bows with it. That bow is what makes it round; a
 * vertical family down a trunk reads as a flat plank.
 */
export function trunk({ x, yTop, yBot, w0, w1 = w0 * 0.72, lean = 0, seed = 1, id, pitch = 5.2, lit = 0.36, bend = 0.30, dark = 0.92, wander = 1.8 }) {
  const b = bulb({
    yTop, yBot, pitch, lit, litWidth: 0.30, wmin: 1.4, wmax: 3.2, dark,
    bend, seed, id, cut: 0.17, wander,
    profile: t => [x + lean * t * t, lerp(w0, w1, t) / 2],
  });
  return b;
}

/** Ragged bark: a few long broken verticals over the contour family. */
export function bark({ x, yTop, yBot, w, seed = 1, n = 5 }) {
  const R = rng(seed);
  const ds = [];
  for (let i = 0; i < n; i++) {
    const cx = x + R.range(-w * 0.34, w * 0.34);
    const y0 = R.range(yTop, yBot - 40), y1 = Math.min(yBot - 4, y0 + R.range(28, 96));
    const pts = [];
    for (let k = 0; k <= 14; k++) {
      const y = lerp(y0, y1, k / 14);
      pts.push([cx + (fbm(y * 0.06, i * 3.7, seed, 3) - 0.5) * 5, y]);
    }
    ds.push(ribbon(pts, pts.map((_, k) => 1.6 + 1.2 * Math.sin(Math.PI * (k / 14)))));
  }
  return `<path d="${ds.join('')}"/>`;
}

/** A canopy or bush: packed lobes, no outline. */
export function canopy(cx, cy, rx, ry, seed, opts = {}) {
  return foliage({ cx, cy, rx, ry, seed, lobe: 0.15, jitter: 0.40, ...opts });
}

/** A tapering limb. */
export function limb(pts, w0, w1) {
  const dense = [];
  for (let i = 0; i < pts.length - 1; i++)
    for (let k = 0; k < 6; k++)
      dense.push([lerp(pts[i][0], pts[i + 1][0], k / 6), lerp(pts[i][1], pts[i + 1][1], k / 6)]);
  dense.push(pts[pts.length - 1]);
  return `<path d="${ribbon(dense, dense.map((_, i) => lerp(w0, w1, i / (dense.length - 1))))}"/>`;
}

/** Sparse upright ticks — the marks a white foreground carries. */
export function tufts({ n = 140, x0 = 0, x1 = 512, y0 = 340, y1 = 512, R, spread = 1.1, w0 = 1.7, len = [5, 13], per = [3, 6], bias = null }) {
  const ds = [];
  for (let i = 0; i < n; i++) {
    const x = R.range(x0, x1), y = R.range(y0, y1);
    if (bias && R() > bias(x, y)) continue;
    const k = Math.round(R.range(per[0], per[1]));
    for (let j = 0; j < k; j++) {
      const a = -Math.PI / 2 + R.range(-spread, spread);
      const L = R.range(len[0], len[1]);
      ds.push(ribbon([[x, y], [x + Math.cos(a) * L, y + Math.sin(a) * L]], [w0, 0.25]));
    }
  }
  return ds.length ? `<path d="${ds.join('')}"/>` : '';
}

/** Fallen leaves / litter: short near-horizontal flecks. */
export function litter({ n, R, pick, len = [4, 10] }) {
  return dashes({
    n, pick,
    angle: () => R.range(-0.5, 0.5),
    len: () => R.range(len[0], len[1]),
    w0: 1.5, w1: 0.4,
  });
}

/** A boulder or a barrow stone: a lumpy closed form with its own contour family. */
export function rock({ cx, cy, rx, ry, seed = 1, wobble = 0.34, angle = 0.25, pitch = 5.4, dark = 0.72, lit = [-0.5, -0.6], scene }) {
  const d = blob(cx, cy, rx, ry, seed, wobble, 56);
  const tone = (x, y) => {
    const u = (x - cx) / rx, v = (y - cy) / ry;
    const l = (u * lit[0] + v * lit[1]) / Math.hypot(...lit);
    return clamp(dark - 0.62 * smoothstep(-0.2, 1.1, l));
  };
  return `<path d="${d}" fill="#fff"/>`
    + scene.clipped(d, hatch({
        x0: cx - rx - 4, x1: cx + rx + 4, y0: cy - ry - 4, y1: cy + ry + 4,
        angle, pitch, tone, seed, wmin: 1.4, wmax: 3.0, wander: 1.2,
      }))
    + `<path d="${d}" fill="none" stroke="#000" stroke-width="4.2" stroke-linejoin="round"/>`;
}

/**
 * A clapboard wall face.
 *
 * `poly` is the face outline. The siding is one horizontal family at constant
 * pitch (rule 1), weighted by `tone`; the board seams are the same family run
 * heavy every `boards` lines, which is how a plank wall reads in 1-bit without
 * a second crossing family.
 */
export function wallFace({ poly, scene, tone, seed = 7, pitch = 7.5, angle = 0, x0, y0, x1, y1, edge = 4.4 }) {
  return `<path d="${poly}" fill="#fff"/>`
    + scene.clipped(poly, hatch({ x0, y0, x1, y1, angle, pitch, tone, seed, wmin: 1.35, wmax: 3.1, wander: 0.7 }))
    + `<path d="${poly}" fill="none" stroke="#000" stroke-width="${edge}" stroke-linejoin="round"/>`;
}

/** Planks nailed across an opening — the boarded door and windows of the house. */
export function boarded({ x, y, w, h, n = 3, seed = 3, angle = 0.16 }) {
  const R = rng(seed);
  let g = `<rect x="${fx(x)}" y="${fx(y)}" width="${fx(w)}" height="${fx(h)}" fill="#fff" stroke="#000" stroke-width="4.2"/>`;
  // the opening reads as dark behind the boards
  g += `<g clip-path="none">`;
  for (let i = 0; i < n; i++) {
    const cy = y + h * ((i + 0.5) / n) + R.range(-3, 3);
    const a = R.range(-angle, angle);
    const bh = h / n * R.range(0.42, 0.60);
    const dx = w * 0.62;
    const pts = [[x - w * 0.10, cy - Math.tan(a) * dx], [x + w * 1.10, cy + Math.tan(a) * dx]];
    g += `<path d="${ribbon(pts, [bh, bh])}" fill="#fff" stroke="#000" stroke-width="3.4" stroke-linejoin="round"/>`;
  }
  g += `</g>`;
  return g;
}

/** A dark opening — a doorway, a window, a barrow mouth. Solid black, hard edge. */
export function darkOpening(d) {
  return `<path d="${d}" fill="#000"/><path d="${d}" fill="none" stroke="#000" stroke-width="4" stroke-linejoin="round"/>`;
}
