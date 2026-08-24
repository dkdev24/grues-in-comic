/**
 * Backdrop generation with rough.js.
 *
 * Same idea as the hand-rolled engine (tone is line density, driven by a
 * perspective-correct tone field) but rough.js draws every mark. Its `hachure`
 * fill is the primitive that was being hand-rolled before, and its bowing /
 * roughness give the pen quality for free.
 *
 * The tone field is quantized to a few levels, and each level has its own
 * hachure angle and gap. Adjacent cells at the same level merge visually, so
 * the picture resolves into contour bands of hatching -- which is what an
 * engraving is -- rather than a grid of independently drawn tiles.
 */
import rough from 'roughjs/bundled/rough.esm.js';
import { writeFileSync } from 'node:fs';

const gen = rough.generator();
const W = 512, H = 512;
const VX = 256, VY = 266;
const XL = -66, XR = 578, YT = -76, YB = 588;
const ZVOID = 5.4;

// ------------------------------------------------------------------ utilities
let _s = 20260824;
const rnd = () => (_s = (_s * 1664525 + 1013904223) >>> 0) / 4294967296;
const rr = (a, b) => a + (b - a) * rnd();
const clamp = (v, lo = 0, hi = 1) => (v < lo ? lo : v > hi ? hi : v);
const smoothstep = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); };

function h2(i, j, seed) {
  let n = (Math.imul(i, 73856093) ^ Math.imul(j, 19349663) ^ Math.imul(seed, 83492791)) & 0x7fffffff;
  n = Math.imul(n ^ (n >>> 13), 1274126177) & 0x7fffffff;
  return ((n ^ (n >>> 16)) & 0xffff) / 65535;
}
const sm = t => t * t * (3 - 2 * t);
function vnoise(x, y, seed) {
  const i = Math.floor(x), j = Math.floor(y), u = sm(x - i), v = sm(y - j);
  const a = h2(i, j, seed), b = h2(i + 1, j, seed), c = h2(i, j + 1, seed), d = h2(i + 1, j + 1, seed);
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}
function fbm(x, y, seed = 0, oct = 4) {
  let amp = 1, f = 1, tot = 0, norm = 0;
  for (let k = 0; k < oct; k++) { tot += amp * vnoise(x * f, y * f, seed + k * 17); norm += amp; amp *= 0.5; f *= 2; }
  return tot / norm;
}

const proj = (x, y, s) => [VX + (x - VX) * s, VY + (y - VY) * s];
const at = (x, y, z) => proj(x, y, 1 / z);
const rect = z => [proj(XL, YT, 1 / z), proj(XR, YT, 1 / z), proj(XR, YB, 1 / z), proj(XL, YB, 1 / z)];

// ---------------------------------------------------------------- light model
const F = 300;
const LAMP = [95, -6, 1.78];
const real3 = (x, y, z) => [(x - VX) * z, (y - VY) * z, F * z];
const L3 = real3(...LAMP);
function light(x, y, z, radius = 215) {
  const p = real3(x, y, z);
  const d = Math.hypot(p[0] - L3[0], p[1] - L3[1], p[2] - L3[2]);
  return 1 / (1 + (d / radius) ** 2);
}
const depthRamp = z => (z - 1) / (ZVOID - 1);
const voidward = z => smoothstep(ZVOID * 0.70, ZVOID * 0.99, z);

// ----------------------------------------------------------------- rock relief
function makeBlobs(n, b0, b1, seed, raW = 0.20, rbW = 52) {
  let s = seed >>> 0;
  const r = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = 1 + (ZVOID - 1) * Math.pow(r(), 0.75);
    const k = 0.55 + r() * 1.15;
    out.push([a, b0 + (b1 - b0) * r(), raW * k * a * 0.55, rbW * k, Math.floor(r() * 9999)]);
  }
  return out;
}
function reliefFn(blobs, ldir) {
  const NB = 90;
  const buckets = Array.from({ length: NB }, () => []);
  for (const bl of blobs) {
    const lo = Math.floor(clamp((bl[0] - bl[2] * 1.5 - 1) / (ZVOID - 1)) * (NB - 1));
    const hi = Math.floor(clamp((bl[0] + bl[2] * 1.5 - 1) / (ZVOID - 1)) * (NB - 1));
    for (let k = lo; k <= hi; k++) buckets[k].push(bl);
  }
  return (a, b) => {
    const k = Math.floor(clamp((a - 1) / (ZVOID - 1)) * (NB - 1));
    let tot = 0;
    for (const [ac, bc, ra, rb, sd] of buckets[k]) {
      const dz = (a - ac) / ra, db = (b - bc) / rb;
      const d = Math.hypot(dz, db);
      if (d > 1.55) continue;
      const ang = Math.atan2(db, dz);
      const rad = 1 + 0.30 * (fbm(Math.cos(ang) * 1.6 + 3, Math.sin(ang) * 1.6 + 3, sd, 3) - 0.5) * 2;
      if (d < rad) {
        const f = (db * ldir[1] + dz * ldir[0]) / Math.max(0.2, d);
        tot += -0.34 + 0.62 * clamp((f + 1) / 2) + 0.22 * (d / rad);
      } else if (d < rad * 1.38) {
        tot += 0.50 * (1 - (d - rad) / (rad * 0.38));
      }
    }
    return tot;
  };
}

// ------------------------------------------------------------------ tone fields
function toneWall(side) {
  const xe = side === 'L' ? XL : XR, sd = side === 'L' ? 11 : 29;
  return (z, y) => {
    const ty = (y - YT) / (YB - YT);
    let t = 0.42 + 0.54 * depthRamp(z);
    t += 0.46 * (1 - Math.pow(Math.sin(Math.PI * clamp(ty)), 0.75));
    t += 0.26 * Math.exp(-(((ty - 0.36) / 0.065) ** 2));
    t += 0.18 * Math.exp(-(((ty - 0.63) / 0.045) ** 2));
    t += (fbm(z * 1.55, ty * 6.4 + z * 0.5, sd) - 0.5) * 0.40;
    t -= 1.05 * light(xe, y, z);
    return Math.max(clamp(t), voidward(z));
  };
}
const toneCeil = (z, x) => {
  const tx = (x - XL) / (XR - XL);
  let t = 0.48 + 0.44 * depthRamp(z);
  t += 0.34 * (1 - Math.pow(Math.sin(Math.PI * clamp(tx)), 0.5));
  t += (fbm(z * 1.7, tx * 5.8 + z * 0.4, 47) - 0.5) * 0.34;
  t -= 0.92 * light(x, YT, z);
  return Math.max(clamp(t), voidward(z));
};
const toneFloor = (z, x) => {
  const tx = (x - XL) / (XR - XL);
  let t = 0.12 + 0.46 * depthRamp(z);
  t += 0.30 * (1 - Math.sin(Math.PI * clamp(tx)));
  t += (fbm(z * 1.9, tx * 7.2 + z * 0.7, 71) - 0.5) * 0.40;
  t -= 1.00 * light(x, YB, z);
  return Math.max(clamp(t), voidward(z));
};

// ------------------------------------------------------------------ svg output
const round = d => d.replace(/-?\d+\.\d+/g, m => (+m).toFixed(1));
function draw(d) {
  const o = d.options;
  let out = '';
  for (const set of d.sets) {
    const p = round(gen.opsToPath(set));
    if (set.type === 'path')
      out += `<path d="${p}" fill="none" stroke="${o.stroke}" stroke-width="${o.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`;
    else if (set.type === 'fillPath')
      out += `<path d="${p}" fill="${o.fill}" stroke="none"/>`;
    else if (set.type === 'fillSketch')
      out += `<path d="${p}" fill="none" stroke="${o.fill}" stroke-width="${o.fillWeight}" stroke-linecap="round"/>`;
  }
  return out;
}

// --------------------------------------------------------------- tone -> fill
// Six levels. Angles are deliberately not 45 apart: any two families at 90
// degrees read as tile grout rather than as tone.
const LEVELS = [
  null,
  { fillStyle: 'hachure',    gap: 9.4, angle: 118, weight: 0.80 },
  { fillStyle: 'hachure',    gap: 6.4, angle: 118, weight: 0.85 },
  { fillStyle: 'cross-hatch', gap: 6.8, angle: 152, weight: 0.85 },
  { fillStyle: 'cross-hatch', gap: 4.8, angle:  96, weight: 0.90 },
  { fillStyle: 'cross-hatch', gap: 3.2, angle: 128, weight: 0.95 },
  { fillStyle: 'solid' },
];
const THR = [0.23, 0.40, 0.56, 0.71, 0.855, 0.960];
function levelOf(t) {
  let l = 0;
  for (let i = 0; i < THR.length; i++) if (t >= THR[i]) l = i + 1;
  return l;
}

function cellFill(pts, level, s, seed) {
  const L = LEVELS[level];
  if (!L) return '';
  if (L.fillStyle === 'solid')
    return draw(gen.polygon(pts, { fill: '#000', fillStyle: 'solid', stroke: 'none', roughness: 1.4, seed }));
  return draw(gen.polygon(pts, {
    fill: '#000', stroke: 'none',
    fillStyle: L.fillStyle,
    // gap tracks the cell's perspective scale, so the far end densifies on its own
    hachureGap: Math.max(1.15, L.gap * (0.45 + 0.55 * Math.pow(s, 0.45))),
    hachureAngle: L.angle + rr(-7, 7),
    fillWeight: Math.max(0.45, L.weight * (0.55 + 0.45 * Math.pow(s, 0.3))),
    roughness: 1.15, bowing: 1.6, seed,
  }));
}

// --------------------------------------------------------------------- surfaces
const SURFACES = [
  { name: 'ceil',  pt: (z, b) => at(b, YT, z), tone: toneCeil,       b0: XL, b1: XR,
    relief: reliefFn(makeBlobs(36, XL, XR, 1409, 0.20, 54), [-0.4, -0.9]) },
  { name: 'floor', pt: (z, b) => at(b, YB, z), tone: toneFloor,      b0: XL, b1: XR,
    relief: reliefFn(makeBlobs(16, XL, XR, 1511, 0.20, 46), [-0.3, -0.9]) },
  { name: 'wallL', pt: (z, b) => at(XL, b, z), tone: toneWall('L'),  b0: YT, b1: YB,
    relief: reliefFn(makeBlobs(34, YT, YB, 1201, 0.20, 52), [0, -1]) },
  { name: 'wallR', pt: (z, b) => at(XR, b, z), tone: toneWall('R'),  b0: YT, b1: YB,
    relief: reliefFn(makeBlobs(42, YT, YB, 1307, 0.24, 46), [0, -1]) },
];

const out = [];
out.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);
out.push('<rect width="512" height="512" fill="#fff"/>');

const NA = 30, NB = 34;
let cells = 0;

// A rectangular cell grid is the one thing that gives quantized hatching away:
// the level boundaries all line up on the same rows and columns. Cells are cut
// from a *shared* vertex grid whose interior points are jittered, so every cell
// is an irregular quad and every level boundary is a ragged edge. Shared
// vertices mean neighbours still meet exactly, with no cracks.
function vgrid(b0, b1, seed) {
  const V = [];
  for (let i = 0; i <= NA; i++) {
    const row = [];
    const za = 1 + (ZVOID - 1) * Math.pow(i / NA, 1.55);
    const zPrev = 1 + (ZVOID - 1) * Math.pow(Math.max(0, i - 1) / NA, 1.55);
    const zNext = 1 + (ZVOID - 1) * Math.pow(Math.min(NA, i + 1) / NA, 1.55);
    for (let j = 0; j <= NB; j++) {
      const bb = b0 + (b1 - b0) * (j / NB);
      const edge = i === 0 || i === NA || j === 0 || j === NB;
      if (edge) { row.push([za, bb]); continue; }
      const ja = (h2(i, j, seed) - 0.5) * 0.62 * (zNext - zPrev) * 0.5;
      const jb = (h2(i, j, seed + 991) - 0.5) * 0.66 * ((b1 - b0) / NB);
      row.push([za + ja, bb + jb]);
    }
    V.push(row);
  }
  return V;
}

for (const S of SURFACES) {
  const tone = (z, b) => clamp(S.tone(z, b) + S.relief(z, b));
  const V = vgrid(S.b0, S.b1, S.name.length * 37 + 5);
  for (let i = 0; i < NA; i++) {
    for (let j = 0; j < NB; j++) {
      const c = [V[i][j], V[i + 1][j], V[i + 1][j + 1], V[i][j + 1]];
      const ca = (c[0][0] + c[1][0] + c[2][0] + c[3][0]) / 4;
      const cb = (c[0][1] + c[1][1] + c[2][1] + c[3][1]) / 4;
      const level = levelOf(tone(ca, cb));
      if (!level) continue;
      const q = c.map(([a, b]) => S.pt(a, b));
      const cx = (q[0][0] + q[1][0] + q[2][0] + q[3][0]) / 4;
      const cy = (q[0][1] + q[1][1] + q[2][1] + q[3][1]) / 4;
      const e = 1.3;   // inflate so same-level neighbours knit into one field
      const qi = q.map(([x, y]) => {
        const d = Math.hypot(x - cx, y - cy) || 1;
        return [x + ((x - cx) / d) * e, y + ((y - cy) / d) * e];
      });
      out.push(cellFill(qi, level, 1 / ca, (i * 131 + j * 17) % 9999));
      cells++;
    }
  }
}

// the void
out.push(draw(gen.polygon(rect(ZVOID), { fill: '#000', fillStyle: 'solid', stroke: '#000', strokeWidth: 2, roughness: 2.2, seed: 7 })));

// --------------------------------------------------------------------- timbers
function beam(quad, s, seed) {
  let g = draw(gen.polygon(quad, {
    fill: '#fff', fillStyle: 'solid', stroke: '#000',
    strokeWidth: Math.max(0.8, 2.6 * s), roughness: 1.1, bowing: 1.2, seed,
  }));
  // grain: a few long strokes down the length of the beam
  const [A, B, C, D] = quad;
  for (let k = 1; k < 7; k++) {
    const t = k / 7 + rr(-0.03, 0.03);
    const a = [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t];
    const b = [D[0] + (C[0] - D[0]) * t, D[1] + (C[1] - D[1]) * t];
    g += draw(gen.line(a[0], a[1], b[0], b[1], {
      stroke: '#000', strokeWidth: Math.max(0.4, 0.95 * s), roughness: 2.0, bowing: 2.4, seed: seed + k,
    }));
  }
  return g;
}
function frame(z, brace) {
  const s = 1 / z, [tl, tr, br, bl] = rect(z);
  const pw = 58 * s, lh = 48 * s;
  let g = '';
  g += beam([bl, [bl[0] + pw, bl[1]], [tl[0] + pw, tl[1]], tl], s, 11);
  g += beam([[br[0] - pw, br[1]], br, tr, [tr[0] - pw, tr[1]]], s, 23);
  g += beam([tl, tr, [tr[0], tr[1] + lh], [tl[0], tl[1] + lh]], s, 31);
  if (brace) {
    const th = 13 * s;
    const b0 = [tl[0] + pw, tl[1] + lh * 1.1], b1 = [tl[0] + pw * 3.4, tl[1] + lh * 0.15];
    g += beam([b0, [b0[0] + th, b0[1] + th], [b1[0] + th, b1[1] + th], b1], s, 43);
  }
  // shadow the lintel throws
  g += draw(gen.polygon([tl, tr, [tr[0], tr[1] + lh * 1.5], [tl[0], tl[1] + lh * 1.5]], {
    fill: '#000', fillStyle: 'hachure', hachureGap: Math.max(1.2, 3.4 * s),
    hachureAngle: 100, fillWeight: Math.max(0.45, 0.9 * s), stroke: 'none',
    roughness: 1.2, bowing: 1.5, seed: 57,
  }));
  return g;
}
for (const [z, br] of [[4.20, false], [2.72, false], [1.78, true], [1.13, false]]) out.push(frame(z, br));

// ----------------------------------------------------------------------- rails
{
  let g = '';
  for (let z = ZVOID; z > 1; z -= 0.052 * Math.pow(z, 1.35) * rr(0.82, 1.18)) {
    const s = 1 / z;
    const y = VY + (YB - VY) * s;
    const x1 = VX + (182 - VX) * s, x2 = VX + (330 - VX) * s, t = Math.max(0.6, 6.5 * s);
    g += draw(gen.polygon([[x1, y - t / 2], [x2, y - t / 2], [x2, y + t / 2], [x1, y + t / 2]], {
      fill: '#fff', fillStyle: 'solid', stroke: '#000',
      strokeWidth: Math.max(0.4, 1.6 * s), roughness: 1.6, bowing: 1.4, seed: (z * 100) | 0,
    }));
  }
  for (const xo of [192, 320]) {
    const a = at(xo, YB, 1.0), b = at(xo, YB, ZVOID);
    g += draw(gen.line(a[0], a[1], b[0], b[1], { stroke: '#fff', strokeWidth: 6, roughness: 1.1, bowing: 1.0, seed: 71 }));
    g += draw(gen.line(a[0], a[1], b[0], b[1], { stroke: '#000', strokeWidth: 3, roughness: 1.1, bowing: 1.0, seed: 71 }));
  }
  out.push(g);
}

// ------------------------------------------------------------------------ lamp
{
  const p = at(LAMP[0], LAMP[1], LAMP[2]), s = 1 / LAMP[2], r = 30 * s;
  let g = `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${(r * 2.4).toFixed(1)}" fill="#fff"/>`;
  const fl = [];
  for (let i = 0; i < 800; i++) {
    const a = rr(0, Math.PI * 2), rad = r * (2.2 + Math.pow(rnd(), 0.6) * 1.5);
    if (rnd() > 1 - Math.pow(rad / (r * 3.7), 2.2)) continue;
    fl.push(`<circle cx="${(p[0] + Math.cos(a) * rad).toFixed(1)}" cy="${(p[1] + Math.sin(a) * rad).toFixed(1)}" r="${rr(0.6, 2).toFixed(2)}"/>`);
  }
  g += `<g fill="#fff">${fl.join('')}</g>`;
  for (let k = 0; k < 40; k++) {
    const a = (Math.PI * 2 * k) / 40 + rr(-0.04, 0.04);
    const r0 = r * rr(2.5, 2.9), r1 = r0 + r * rr(0.6, 2.2);
    g += draw(gen.line(p[0] + Math.cos(a) * r0, p[1] + Math.sin(a) * r0,
                       p[0] + Math.cos(a) * r1, p[1] + Math.sin(a) * r1,
                       { stroke: '#000', strokeWidth: 1.1, roughness: 1.3, seed: k }));
  }
  g += draw(gen.polygon([[p[0] - r * 0.6, p[1] - r * 0.5], [p[0] + r * 0.6, p[1] - r * 0.5],
                         [p[0] + r * 0.5, p[1] + r * 0.85], [p[0] - r * 0.5, p[1] + r * 0.85]],
                        { fill: '#000', fillStyle: 'solid', stroke: '#000', strokeWidth: 1.5, roughness: 1.2, seed: 91 }));
  g += draw(gen.ellipse(p[0], p[1] + r * 0.1, r * 0.6, r * 0.85,
                        { fill: '#fff', fillStyle: 'solid', stroke: '#fff', strokeWidth: 1, roughness: 1.4, seed: 93 }));
  const top = at(LAMP[0], YT, LAMP[2]);
  g += draw(gen.line(p[0], p[1] - r * 1.3, top[0], top[1] + 18 * s,
                     { stroke: '#000', strokeWidth: 1.6, roughness: 1.6, bowing: 2, seed: 95 }));
  out.push(g);
}

// ------------------------------------------------------- foreground: spoil, pick
function lump(cx, cy, r, seed) {
  const n = 11, pts = [];
  let s2 = seed >>> 0;
  const q = () => (s2 = (s2 * 1664525 + 1013904223) >>> 0) / 4294967296;
  for (let i = 0; i < n; i++) {
    const a = (Math.PI * 2 * i) / n, k = 0.72 + q() * 0.44;
    pts.push([cx + Math.cos(a) * r * k, cy + Math.sin(a) * r * k * 0.66]);
  }
  let g = draw(gen.polygon(pts, { fill: '#fff', fillStyle: 'solid', stroke: '#000', strokeWidth: 2.6, roughness: 1.5, bowing: 1.6, seed }));
  // shade the side away from the lamp
  const sh = pts.map(([x, y]) => [x + r * 0.34, y + r * 0.16]);
  g += draw(gen.polygon(sh, {
    fill: '#000', fillStyle: 'zigzag', hachureGap: 1.9, hachureAngle: 122,
    fillWeight: 1.1, stroke: 'none', roughness: 1.2, bowing: 1.4, seed: seed + 3,
  }));
  g += draw(gen.polygon(pts, { fill: 'none', stroke: '#000', strokeWidth: 2.6, roughness: 1.5, bowing: 1.6, seed }));
  return g;
}
for (const [cx, cy, r, sd] of [[112, 472, 42, 901], [196, 508, 30, 902], [58, 512, 26, 903],
                               [466, 486, 34, 904], [392, 512, 24, 905], [300, 500, 18, 906]])
  out.push(lump(cx, cy, r, sd));

out.push('<g transform="translate(414,286) rotate(13)">'
  + draw(gen.path('M8,4 L22,2 L34,236 L18,240 Z', { fill: '#000', fillStyle: 'solid', stroke: '#000', strokeWidth: 2, roughness: 1.3, seed: 111 }))
  + draw(gen.path('M-56,10 C-34,-14 6,-24 40,-19 L60,-15 L54,-4 C20,-11 -18,-3 -46,18 Z',
                  { fill: '#000', fillStyle: 'solid', stroke: '#000', strokeWidth: 2, roughness: 1.3, seed: 113 }))
  + draw(gen.rectangle(0, -18, 28, 30, { fill: '#000', fillStyle: 'solid', stroke: '#000', strokeWidth: 2, roughness: 1.3, seed: 115 }))
  + '</g>');

out.push(draw(gen.rectangle(4, 4, 504, 504, { fill: 'none', stroke: '#000', strokeWidth: 3, roughness: 1.1, bowing: 0.8, seed: 5 })));
out.push('</svg>');

writeFileSync('31-coal-mine-rough.svg', out.join('\n'));
console.log('cells:', cells, 'bytes:', out.join('').length);
