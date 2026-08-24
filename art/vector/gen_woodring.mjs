/**
 * Backdrop generation in the actual Comic Chat idiom (Jim Woodring).
 *
 * Calibrated against the real art, decoded from the shipped `.bgb` files
 * (`art/.scratch/bgb2png.ts` -> pastoral / room / field). That art works on
 * rules that are close to the opposite of a wood engraving:
 *
 *   1. ONE line family per region, at CONSTANT pitch. Never cross-hatching.
 *   2. Tone comes from line THICKNESS, not from spacing. A line swells to carry
 *      shadow and thins to nothing to carry light.
 *   3. Lines follow the CONTOUR of the form they sit on. Every object gets its
 *      own family running with its own shape.
 *   4. Every object is a closed shape with a bold outline, and the shapes are
 *      bulbous and organic.
 *   5. Composition is a flat frieze. No vanishing point, no chiaroscuro.
 *
 * Because tone is thickness, the drawing primitive is not a stroke: it is a
 * RIBBON -- a filled polygon around a centreline whose width varies per point.
 */
import { writeFileSync } from 'node:fs';

const W = 512, H = 512;
let _s = 7654321;
const rnd = () => (_s = (_s * 1664525 + 1013904223) >>> 0) / 4294967296;
const rr = (a, b) => a + (b - a) * rnd();
const clamp = (v, lo = 0, hi = 1) => (v < lo ? lo : v > hi ? hi : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); };

// ------------------------------------------------------------------ noise
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
function fbm(x, y, seed = 0, oct = 3) {
  let amp = 1, f = 1, tot = 0, norm = 0;
  for (let k = 0; k < oct; k++) { tot += amp * vnoise(x * f, y * f, seed + k * 17); norm += amp; amp *= 0.5; f *= 2; }
  return tot / norm;
}

// ------------------------------------------------------------------ ribbons
const fx = n => n.toFixed(1);

/** A filled polygon around a centreline, with per-point width. This is the
 *  whole engine: a line that swells is how this style carries tone. */
function ribbon(pts, widths) {
  if (pts.length < 2) return '';
  const L = [], R = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1];
    const d = Math.hypot(dx, dy) || 1;
    dx /= d; dy /= d;
    const w = Math.max(0, widths[i]) / 2;
    L.push([pts[i][0] - dy * w, pts[i][1] + dx * w]);
    R.push([pts[i][0] + dy * w, pts[i][1] - dx * w]);
  }
  R.reverse();
  const all = L.concat(R);
  return 'M' + all.map(p => `${fx(p[0])},${fx(p[1])}`).join('L') + 'Z';
}

/**
 * One family of lines across a region.
 * `line(t)` gives a line's centreline points for t in 0..1 (t walks the family),
 * `tone(x, y)` gives 0..1, and thickness interpolates wmin..wmax from it.
 */
function lineField({ n, line, tone, wmin = 0.7, wmax = 5.2, gamma = 1.0 }) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const pts = line(i / n);
    const ws = pts.map(([x, y]) => {
      const t = Math.pow(clamp(tone(x, y)), gamma);
      return lerp(wmin, wmax, t);
    });
    // a line that has gone to nothing everywhere is simply not drawn
    if (ws.every(w => w <= wmin * 1.02)) {
      if (wmin < 0.35) continue;
    }
    out.push(ribbon(pts, ws));
  }
  // every ribbon is a closed subpath, so the whole family is one <path>
  return out.length ? `<path d="${out.join('')}"/>` : '';
}

/** Hand-drawn wobble: a horizontal run with a slow wave, as in the real skies. */
function waveLine(x0, x1, y, { amp = 1.6, freq = 0.013, seed = 1, n = 90, bend = 0 }) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = lerp(x0, x1, t);
    const wob = (fbm(x * freq, y * 0.02 + seed, seed, 3) - 0.5) * 2 * amp;
    pts.push([x, y + wob + bend * Math.sin(Math.PI * t)]);
  }
  return pts;
}

const out = [];
const defs = [];
let uid = 0;
const clip = d => { const id = `c${++uid}`; defs.push(`<clipPath id="${id}"><path d="${d}"/></clipPath>`); return id; };

out.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);
out.push('<rect width="512" height="512" fill="#fff"/>');

// ============================================================== the scene
// Coal Mine Tunnels, as a flat frieze: a lined rock face, a black tunnel mouth,
// two bulbous timber props, a lintel, and a white foreground with spoil.

const GROUND = 372;                       // the horizon / floor line
const groundPts = waveLine(-10, 522, GROUND, { amp: 2.4, freq: 0.006, seed: 5, n: 120 });
const groundD = 'M' + groundPts.map(p => `${fx(p[0])},${fx(p[1])}`).join('L');

// ---------------------------------------------------------------- the mouth
// A bulbous arch, not a rectangle: the shapes in this idiom all swell.
const archD = `M176,${GROUND} C168,300 170,246 196,214 C216,189 240,178 262,178
  C286,178 310,190 328,216 C350,247 350,302 344,${GROUND} Z`;

// ------------------------------------------------------------- rock face field
// Horizontal lines across the whole face, thickening toward the top and toward
// the mouth: one family, constant pitch, tone entirely in the weight.
const faceD = `M-10,-10 H522 V${GROUND + 2} H-10 Z`;
const faceClip = clip(faceD + ` M176,${GROUND} C168,300 170,246 196,214 C216,189 240,178 262,178 C286,178 310,190 328,216 C350,247 350,302 344,${GROUND} Z`);

function faceTone(x, y) {
  // darker high on the wall, and in a pool of shadow around the tunnel mouth
  let t = 0.70 - 0.82 * smoothstep(-30, GROUND, y);
  const dx = (x - 260) / 190, dy = (y - 268) / 190;
  t += 0.62 * Math.exp(-(dx * dx + dy * dy) * 1.35);
  t += (fbm(x * 0.010, y * 0.016, 21, 3) - 0.5) * 0.42;
  t -= 0.30 * Math.exp(-(((x - 96) / 120) ** 2 + ((y - 120) / 110) ** 2));  // lamp glow
  return clamp(t);
}
const PITCH = 8.2;
out.push(`<g clip-path="url(#${faceClip})" fill="#000" fill-rule="evenodd">`);
out.push(lineField({
  n: Math.round((GROUND + 24) / PITCH),
  line: t => waveLine(-12, 524, -14 + t * (GROUND + 22), { amp: 2.0, freq: 0.011, seed: 3 + t * 40, n: 100 }),
  tone: faceTone, wmin: 0.40, wmax: 6.4, gamma: 1.10,
}));
out.push('</g>');

// ------------------------------------------------------------------ the mouth
out.push(`<path d="${archD}" fill="#000"/>`);
// a rim of thicker line just inside the opening, the way forms are edged here
out.push(`<path d="${archD}" fill="none" stroke="#000" stroke-width="7"/>`);


// ------------------------------------------------------------------- the props
/** A bulbous tapering column: spine plus a width profile that swells. */
function prop(cx, yTop, yBot, wTop, wMid, wBot, seed) {
  const n = 60;
  const spine = [], half = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, y = lerp(yTop, yBot, t);
    const bulge = Math.sin(Math.PI * clamp(t * 1.05)) ** 0.7;
    const w = lerp(lerp(wTop, wBot, t), wMid, bulge * 0.55)
            + (fbm(t * 3.2, seed, seed, 3) - 0.5) * 3.0;
    spine.push([cx + (fbm(t * 2.1, seed + 9, seed, 3) - 0.5) * 5.0, y]);
    half.push(w);
  }
  const left = spine.map((p, i) => [p[0] - half[i], p[1]]);
  const right = spine.map((p, i) => [p[0] + half[i], p[1]]).reverse();
  const d = 'M' + left.concat(right).map(p => `${fx(p[0])},${fx(p[1])}`).join('L') + 'Z';
  const cid = clip(d);
  let g = `<path d="${d}" fill="#fff"/>`;
  // contour family: lines run ACROSS the column and bow with its surface, so
  // the family itself describes the round of the form
  g += `<g clip-path="url(#${cid})" fill="#000">`;
  g += lineField({
    n: Math.round((yBot - yTop) / 6.2),
    line: t => {
      const y = lerp(yTop - 4, yBot + 4, t);
      const i = Math.min(n, Math.max(0, Math.round(t * n)));
      const w = half[i] + 6;
      return waveLine(spine[i][0] - w, spine[i][0] + w, y, { amp: 0.7, freq: 0.05, seed: seed + t * 30, n: 22, bend: 3.2 });
    },
    tone: (x, y) => {
      const i = Math.min(n, Math.max(0, Math.round(((y - yTop) / (yBot - yTop)) * n)));
      const u = (x - spine[i][0]) / Math.max(1, half[i]);          // -1..1 across
      // lit from the upper left: the far side of the round goes heavy
      return clamp(0.06 + 0.90 * smoothstep(-0.70, 1.05, u) + 0.20 * smoothstep(0.55, 1.0, (y - yTop) / (yBot - yTop)));
    },
    wmin: 0.85, wmax: 5.6, gamma: 1.25,
  });
  g += '</g>';
  g += `<path d="${d}" fill="none" stroke="#000" stroke-width="5.5" stroke-linejoin="round"/>`;
  // banding rings, the segmented look these forms always have
  for (const t of [0.24, 0.52, 0.79]) {
    const i = Math.round(t * n);
    const w = half[i];
    g += `<path d="M${fx(spine[i][0] - w)},${fx(spine[i][1])} Q${fx(spine[i][0])},${fx(spine[i][1] + 9)} ${fx(spine[i][0] + w)},${fx(spine[i][1])}" fill="none" stroke="#000" stroke-width="4"/>`;
  }
  return g;
}
out.push(prop(112, 150, GROUND + 6, 19, 38, 24, 11));
out.push(prop(410, 138, GROUND + 6, 21, 41, 26, 29));

// -------------------------------------------------------------------- lintel
const lintelD = `M84,168 C150,142 372,132 442,158 C452,161 452,186 442,190
  C372,166 150,176 84,196 C74,199 74,171 84,168 Z`;
{
  const cid = clip(lintelD);
  out.push(`<path d="${lintelD}" fill="#fff"/>`);
  out.push(`<g clip-path="url(#${cid})" fill="#000">`);
  out.push(lineField({
    n: 9,
    line: t => waveLine(74, 456, lerp(140, 196, t), { amp: 1.1, freq: 0.02, seed: 60 + t * 20, n: 60, bend: -14 + t * 4 }),
    tone: (x, y) => clamp(0.10 + 0.80 * smoothstep(150, 196, y)),
    wmin: 0.5, wmax: 4.4,
  }));
  out.push('</g>');
  out.push(`<path d="${lintelD}" fill="none" stroke="#000" stroke-width="5.5" stroke-linejoin="round"/>`);
}

// -------------------------------------------------------------------- ground
// White, the way the foregrounds in this art are white, marked only with tufts.
out.push(`<path d="${groundD}" fill="none" stroke="#000" stroke-width="4.5"/>`);
{
  // sparse dash tufts, thinning toward the bottom of the frame
  const marks = [];
  for (let i = 0; i < 300; i++) {
    const x = rr(-5, 517), y = rr(GROUND + 6, 520);
    if (rnd() > 1 - smoothstep(GROUND, 520, y) * 0.72) continue;
    const a = rr(-1.5, -0.4), len = rr(4, 11) * (0.5 + smoothstep(GROUND, 520, y));
    marks.push(ribbon([[x, y], [x + Math.cos(a) * len, y + Math.sin(a) * len]], [2.1, 0.4]));
  }
  out.push(`<g fill="#000"><path d="${marks.join('')}"/></g>`);
}

// ---------------------------------------------------------------- rails
{
  const rail = (x0, x1) => {
    const pts = [];
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      pts.push([lerp(x0, x1, t), lerp(520, GROUND - 2, t)]);
    }
    return pts;
  };
  const A = rail(206, 244), B = rail(316, 282);
  for (const r of [A, B]) out.push(`<g fill="#000"><path d="${ribbon(r, r.map((_, i) => lerp(5.0, 1.6, i / (r.length - 1))))}"/></g>`);
  const ties = [];
  for (let i = 0; i < 13; i++) {
    const t = Math.pow(i / 13, 1.25);
    const y = lerp(518, GROUND + 4, t);
    const a = [lerp(196, 240, t), y], b = [lerp(326, 286, t), y];
    ties.push(ribbon([a, b], [lerp(5.5, 1.8, t), lerp(5.5, 1.8, t)]));
  }
  out.push(`<g fill="#000"><path d="${ties.join('')}"/></g>`);
}

// -------------------------------------------------------------------- spoil
function lump(cx, cy, rx, ry, seed) {
  const n = 44, pts = [];
  for (let i = 0; i <= n; i++) {
    const a = (Math.PI * 2 * i) / n;
    const k = 0.82 + 0.30 * fbm(Math.cos(a) * 1.7 + 4, Math.sin(a) * 1.7 + 4, seed, 3);
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  const d = 'M' + pts.map(p => `${fx(p[0])},${fx(p[1])}`).join('L') + 'Z';
  const cid = clip(d);
  let g = `<path d="${d}" fill="#fff"/>`;
  g += `<g clip-path="url(#${cid})" fill="#000">`;
  g += lineField({
    n: Math.round((ry * 2) / 5.4),
    line: t => waveLine(cx - rx * 1.3, cx + rx * 1.3, cy - ry * 1.2 + t * ry * 2.4,
                        { amp: 0.6, freq: 0.06, seed: seed + t * 12, n: 20, bend: 2.6 }),
    tone: (x, y) => clamp(0.05 + 0.95 * smoothstep(-0.5, 1.0, (x - cx) / rx) * smoothstep(-1.2, 0.4, (y - cy) / ry)),
    wmin: 0.35, wmax: 5.0, gamma: 1.3,
  });
  g += '</g>';
  g += `<path d="${d}" fill="none" stroke="#000" stroke-width="4.5" stroke-linejoin="round"/>`;
  return g;
}
out.push(lump(70, 448, 40, 24, 101));
out.push(lump(150, 486, 33, 20, 102));
out.push(lump(452, 462, 44, 26, 103));
out.push(lump(372, 500, 30, 18, 104));

// --------------------------------------------------------------------- lamp
{
  const cx = 96, cy = 120;
  // a bulbous lamp body, solid black -- the accent shapes here are always solid
  out.push(`<path d="M${cx - 15},${cy - 4} C${cx - 17},${cy - 24} ${cx + 17},${cy - 24} ${cx + 15},${cy - 4}
    C${cx + 22},${cy + 18} ${cx - 22},${cy + 18} ${cx - 15},${cy - 4} Z" fill="#000"/>`);
  out.push(`<path d="M${cx},${cy - 22} C${cx - 6},${cy - 40} ${cx + 6},${cy - 46} ${cx},${cy - 60}"
    fill="none" stroke="#000" stroke-width="5"/>`);
  const rays = [];
  for (let k = 0; k < 22; k++) {
    const a = (Math.PI * 2 * k) / 22 + 0.12;
    const r0 = 30 + rr(0, 4), r1 = r0 + rr(9, 22);
    rays.push(ribbon([[cx + Math.cos(a) * r0, cy + Math.sin(a) * r0],
                      [cx + Math.cos(a) * r1, cy + Math.sin(a) * r1]], [3.4, 0.4]));
  }
  out.push(`<g fill="#000"><path d="${rays.join('')}"/></g>`);
}

out.push(`<rect x="3" y="3" width="506" height="506" fill="none" stroke="#000" stroke-width="6"/>`);
out.unshift(`<defs>${''}</defs>`);
out[0] = '';
out.splice(2, 0, `<defs>${defs.join('')}</defs>`);
out.push('</svg>');

writeFileSync('31-coal-mine-woodring.svg', out.join('\n'));
console.log('bytes:', out.join('').length);
