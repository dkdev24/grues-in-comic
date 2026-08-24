/**
 * A copy of the original Comic Chat `field` backdrop (Jim Woodring), rebuilt
 * with the vector engine as a style test.
 *
 * Reference: `reference/backdrops-original/field.png` (315x315), decoded from
 * `field.bgb` by `art/tools/bgbdump.ts`. Authored here at 512 and rendered down.
 *
 * The original uses three distinct fills, and getting all three right is the
 * whole exercise:
 *   - sky:        long horizontal wavy lines, constant pitch, weight-modulated
 *   - the tuber:  contour lines bowing with the form, with a lit crescent where
 *                 they thin away to nothing
 *   - vegetation: short tapered dashes, tone by density rather than by weight
 */
import { writeFileSync } from 'node:fs';
import {
  clamp, lerp, smoothstep, fx, rng, fbm,
  ribbon, lineField, waveLine, dashes, blob, curve, bulb, foliage, mottle,
} from './woodring.mjs';

const W = 512, H = 512;
const R = rng(90210);
const defs = [], out = [];
let uid = 0;
const clipId = d => { const id = `k${++uid}`; defs.push(`<clipPath id="${id}"><path d="${d}"/></clipPath>`); return id; };

// ---------------------------------------------------------------- the terrain
// One ridge across the middle, a mound on the right, and a foreground edge that
// sweeps up from the lower left. Everything below the foreground edge is white.
const ridgePts = [[-10, 268], [60, 262], [140, 258], [196, 250], [240, 246],
                  [296, 236], [352, 244], [420, 258], [470, 268], [522, 276]];
const ridge = curve(ridgePts);
// sky = everything above the ridge, closed over the top of the frame
const skyRegion = ridge + ' L522,-14 L-14,-14 Z';
const moundTop = [[236, 250], [268, 238], [300, 232], [340, 238], [386, 250],
                  [436, 264], [486, 276], [522, 284]];
const mound = curve(moundTop) + `L522,340 L236,340 Z`;
const fgEdge = curve([[-10, 392], [70, 372], [150, 352], [240, 336], [330, 328],
                      [420, 326], [522, 330]]);
const fgRegion = fgEdge + ` L522,522 L-10,522 Z`;

// ------------------------------------------------------------------- the sky
// Measured off a 5x crop of the original: the lines are very nearly STRAIGHT --
// vertical wander is under a pixel at native size. All of the character is
// thickness variation ALONG each line, at high frequency: a line swells and
// then thins to almost nothing every ten or twenty pixels, and some lines break
// outright. Adjacent lines vary independently, so the field reads as mottled
// rather than as ruled.
{
  const cid = clipId(skyRegion);
  const skyTone = (x, y) => {
    const base = 0.41 - 0.17 * smoothstep(-20, 268, y);
    // `y * 3.1` decorrelates the noise line to line, so no two neighbours
    // thicken in the same places
    return clamp(base + mottle(x, y));
  };
  out.push(`<g clip-path="url(#${cid})" fill="#000">`);
  out.push(lineField({
    n: Math.round(302 / 6.0),
    // barely any wander, and enough samples to resolve the fast weight changes
    line: t => waveLine(-14, 526, -14 + t * 302, {
      amp: 0.55, freq: 0.030, seed: 3 + t * 50, n: 420,
    }),
    // 1-bit: never thinner than an output pixel, and light is carried by
    // breaking the line rather than by fading it
    tone: skyTone, wmin: 1.35, wmax: 2.9, gamma: 1.0, cut: 0.17, minRun: 1.2,
  }));
  out.push('</g>');
}

// ------------------------------------------------------------- the far ridge
out.push(`<path d="${ridge}" fill="none" stroke="#000" stroke-width="2.6"/>`);

// ---------------------------------------------------------------- the mound
// Scrub on the mound: short near-vertical dashes, dense at the crest and
// thinning down the slope. Density carries this tone, not thickness.
{
  const cid = clipId(mound);
  out.push(`<g clip-path="url(#${cid})" fill="#000">`);
  const topAt = x => {
    for (let i = 0; i < moundTop.length - 1; i++) {
      const [x0, y0] = moundTop[i], [x1, y1] = moundTop[i + 1];
      if (x >= x0 && x <= x1) return lerp(y0, y1, (x - x0) / (x1 - x0));
    }
    return 260;
  };
  out.push(dashes({
    n: 6400,
    pick: () => {
      const x = R.range(232, 524), y = R.range(230, 344);
      const t = topAt(x);
      if (y < t) return null;
      const depth = (y - t) / 78;
      if (R() > clamp(0.98 - depth * 1.05)) return null;
      return [x, y];
    },
    angle: () => -Math.PI / 2 + R.range(-0.30, 0.16),
    len: p => R.range(4, 13) * clamp(1.2 - (p[1] - topAt(p[0])) / 90),
    w0: 1.25, w1: 0.2,
  }));
  out.push('</g>');
  out.push(`<path d="${curve(moundTop)}" fill="none" stroke="#000" stroke-width="3.4"/>`);
}

// --------------------------------------------------------- bushes on the ridge
// Lobe clusters, not scribbles. See `foliage()` — the originals build a bush
// out of small rounded caps, each lit on top with a crescent of shadow under
// it, and never draw an outline around the mass.
function bush(cx, cy, rx, ry, seed, opts = {}) {
  return foliage({ cx, cy, rx, ry, seed, lobe: 0.20, jitter: 0.40, ...opts });
}
out.push(bush(196, 292, 28, 15, 21));
out.push(bush(246, 296, 21, 11, 22));
out.push(bush(146, 306, 20, 11, 23));
out.push(bush(300, 286, 16, 9, 24, { dark: 0.85 }));
out.push(bush(392, 296, 24, 13, 25));

// ------------------------------------------------------------ midground grass
// The band between the ridge and the foreground edge: sparse upright ticks.
{
  const cid = clipId(`M-10,236 H522 V400 H-10 Z`);
  out.push(`<g clip-path="url(#${cid})" fill="#000">`);
  const fgAt = x => {
    const pts = [[-10, 392], [70, 372], [150, 352], [240, 336], [330, 328], [420, 326], [522, 330]];
    for (let i = 0; i < pts.length - 1; i++)
      if (x >= pts[i][0] && x <= pts[i + 1][0])
        return lerp(pts[i][1], pts[i + 1][1], (x - pts[i][0]) / (pts[i + 1][0] - pts[i][0]));
    return 340;
  };
  out.push(dashes({
    n: 1700,
    pick: () => {
      const x = R.range(-8, 520), y = R.range(250, 396);
      const f = fgAt(x);
      if (y > f - 1 || y < 250) return null;
      if (R() > clamp(0.25 + 0.75 * smoothstep(260, f, y))) return null;
      return [x, y];
    },
    angle: () => -Math.PI / 2 + R.range(-0.22, 0.22),
    len: () => R.range(3, 9),
    w0: 1.3, w1: 0.25,
  }));
  out.push('</g>');
}

// ------------------------------------------------------- the foreground edge
out.push(`<path d="${fgEdge}" fill="none" stroke="#000" stroke-width="3.2"/>`);
// grass ticks standing along the edge itself, as in the original
{
  const pts = [];
  for (let x = -8; x < 522; x += R.range(3, 9)) {
    const t = clamp((x + 10) / 532);
    const y = lerp(392, 330, smoothstep(0, 1, t)) + (fbm(x * 0.02, 1, 9, 3) - 0.5) * 6;
    pts.push([x, y]);
  }
  out.push(`<g fill="#000">${dashes({
    n: pts.length,
    pick: i => pts[i],
    angle: () => -Math.PI / 2 + R.range(-0.4, 0.4),
    len: () => R.range(4, 11),
    w0: 1.6, w1: 0.3,
  }).replace(/^<path d="|"\/>$/g, (m) => m)}</g>`);
}

// ---------------------------------------------------------- foreground tufts
// White ground, marked only with sparse little starbursts.
{
  const ds = [];
  for (let i = 0; i < 150; i++) {
    const x = R.range(0, 512), y = R.range(340, 516);
    if (R() > clamp(smoothstep(330, 470, y) * 0.9 + 0.1)) continue;
    const n = Math.round(R.range(3, 6));
    for (let k = 0; k < n; k++) {
      const a = -Math.PI / 2 + R.range(-1.1, 1.1);
      const L = R.range(5, 13);
      ds.push(ribbon([[x, y], [x + Math.cos(a) * L, y + Math.sin(a) * L]], [1.7, 0.25]));
    }
  }
  out.push(`<g fill="#000"><path d="${ds.join('')}"/></g>`);
}

// ------------------------------------------------------------------ the tuber
// The original is a STACK of squashed bulbous segments, each with its own
// contour family and its own lit crescent, overlapping downward. Drawing it as
// one tapered vase is the single biggest way to miss this form.
{
  const segs = [
    { yTop:  14, yBot:  78, hw0: 20, hw1: 34, cx0: 48, cx1: 44, lit: 0.40, pitch: 5.6 },
    { yTop:  58, yBot: 138, hw0: 30, hw1: 52, cx0: 44, cx1: 38, lit: 0.42, pitch: 5.8 },
    { yTop: 112, yBot: 202, hw0: 48, hw1: 78, cx0: 38, cx1: 26, lit: 0.44, pitch: 5.9 },
    { yTop: 172, yBot: 350, hw0: 76, hw1: 116, cx0: 22, cx1: 2, lit: 0.46, pitch: 6.0 },
  ];
  segs.forEach((sg, i) => {
    const b = bulb({
      yTop: sg.yTop, yBot: sg.yBot, pitch: sg.pitch, lit: sg.lit, litWidth: 0.07,
      // 1-bit line rules, same as the sky: never sub-pixel, break for light
      wmin: 1.45, wmax: 3.6, dark: 0.94, bend: 0.26, seed: 5 + i * 4, id: `tub${i}`,
      cut: 0.17, wander: 1.3,
      profile: t => {
        const u = smoothstep(0, 1, t);
        // each segment swells through its middle and tucks back at its foot
        const swell = Math.sin(Math.PI * clamp(0.16 + t * 0.80)) ** 0.42;
        return [lerp(sg.cx0, sg.cx1, u), lerp(sg.hw0, sg.hw1, swell)];
      },
    });
    defs.push(b.clipDef);
    out.push(b.svg);
  });
  // the facet line down the lit crescent of the body, which the original draws
  out.push(`<path d="${curve([[74, 190], [104, 236], [116, 286], [104, 330], [82, 352]])}"
    fill="none" stroke="#000" stroke-width="4.2"/>`);
}

// ----------------------------------------------- foreground plants and bushes
out.push(bush(38, 428, 52, 30, 31, { lobe: 0.13 }));
out.push(bush(470, 470, 60, 34, 32, { lobe: 0.12 }));
out.push(bush(360, 508, 48, 28, 33, { lobe: 0.13 }));
{
  // the small sprig near the bottom centre
  const sx = 292, sy = 486;
  let g = `<path d="${curve([[sx, sy + 26], [sx - 2, sy], [sx + 2, sy - 26]])}" fill="none" stroke="#000" stroke-width="3"/>`;
  for (const [dx, dy, rx, ry, sd] of [[-19, -8, 16, 8, 41], [18, -14, 15, 7, 42],
                                      [-15, -24, 13, 6, 43], [15, 4, 13, 6, 44]]) {
    const d = blob(sx + dx, sy + dy, rx, ry, sd, 0.34, 22);
    g += `<path d="${d}" fill="#fff" stroke="#000" stroke-width="2.6"/>`;
    g += `<path d="${curve([[sx + dx - rx * 0.8, sy + dy], [sx + dx, sy + dy - ry * 0.3], [sx + dx + rx * 0.8, sy + dy]])}"
      fill="none" stroke="#000" stroke-width="1.6"/>`;
  }
  out.push(g);
}

out.push(`<rect x="3" y="3" width="506" height="506" fill="none" stroke="#000" stroke-width="5"/>`);

const svg = [`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`,
             `<defs>${defs.join('')}</defs>`,
             `<rect width="512" height="512" fill="#fff"/>`,
             ...out, '</svg>'].join('\n');
writeFileSync('field-copy.svg', svg);
console.log('bytes:', svg.length);
