/**
 * The Comic Chat / Jim Woodring drawing engine, shared by every scene here.
 *
 * Calibrated against the original art decoded by `art/tools/bgbdump.ts` into
 * `reference/backdrops-original/`. Its rules:
 *
 *   1. ONE line family per region, at CONSTANT pitch. Never cross-hatching.
 *   2. Tone is line THICKNESS, not spacing.
 *   3. Lines follow the CONTOUR of the form they describe.
 *   4. Bold closed outlines; bulbous, organic shapes.
 *   5. Flat frieze composition; white foregrounds marked only with sparse ticks.
 *
 * Because tone is thickness and SVG cannot vary `stroke-width` along a path,
 * the primitive is a RIBBON: a filled polygon around a centreline whose width
 * varies per point.
 */

// ------------------------------------------------------------------ numbers
export const clamp = (v, lo = 0, hi = 1) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); };
export const fx = n => (Math.round(n * 10) / 10).toString();

export function rng(seed) {
  let s = seed >>> 0;
  const f = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  f.range = (a, b) => a + (b - a) * f();
  return f;
}

function h2(i, j, seed) {
  let n = (Math.imul(i, 73856093) ^ Math.imul(j, 19349663) ^ Math.imul(seed, 83492791)) & 0x7fffffff;
  n = Math.imul(n ^ (n >>> 13), 1274126177) & 0x7fffffff;
  return ((n ^ (n >>> 16)) & 0xffff) / 65535;
}
const sm = t => t * t * (3 - 2 * t);
export function vnoise(x, y, seed = 0) {
  const i = Math.floor(x), j = Math.floor(y), u = sm(x - i), v = sm(y - j);
  const a = h2(i, j, seed), b = h2(i + 1, j, seed), c = h2(i, j + 1, seed), d = h2(i + 1, j + 1, seed);
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}
export function fbm(x, y, seed = 0, oct = 3) {
  let amp = 1, f = 1, tot = 0, norm = 0;
  for (let k = 0; k < oct; k++) { tot += amp * vnoise(x * f, y * f, seed + k * 17); norm += amp; amp *= 0.5; f *= 2; }
  return tot / norm;
}

/**
 * The three-scale weight mottle every line family in the originals carries.
 *
 * Measured off the art: a line swells and thins along its own length at three
 * wavelengths at once. The fast term is the one that is easy to miss -- without
 * it, breaks come out as long mechanical dashes instead of a fine mottle. `k`
 * decorrelates neighbouring lines so no two thicken in the same places.
 *
 * Using this on EVERY family is what stops a scene looking like vector art: in
 * the originals the sky, the forms and the ground are all clearly one hand.
 */
export function mottle(x, k, { micro = 0.62, fine = 0.85, broad = 0.40, line = 0.30, seed = 0 } = {}) {
  return (fbm(x * 0.34, k * 3.1 + 90, 17 + seed, 2) - 0.5) * micro
       + (fbm(x * 0.072, k * 3.1, 7 + seed, 3) - 0.5) * fine
       + (fbm(x * 0.026, k * 3.1 + 40, 11 + seed, 2) - 0.5) * broad
       + (fbm(k * 0.85, 5, 13 + seed, 2) - 0.5) * line;
}

// ------------------------------------------------------------------ ribbons
/** Filled polygon around a centreline, width per point. The whole engine. */
export function ribbon(pts, widths) {
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
  return 'M' + L.concat(R).map(p => `${fx(p[0])},${fx(p[1])}`).join('L') + 'Z';
}

/**
 * One family of lines. `line(t)` walks the family; `tone(x,y)` sets weight.
 *
 * `cut` is the important one for 1-bit output. The art these are calibrated
 * against is pure black and white, so a line cannot carry light by thinning
 * below a pixel -- at that width it just renders grey and the whole field goes
 * soft. The originals break the line instead: full black everywhere it exists,
 * absent where it does not. Where `tone < cut` the line is therefore omitted
 * rather than thinned, which is what produces the chain-of-dashes texture.
 * `wmin` should stay at or above one output pixel for the same reason.
 */
export function lineField({ n, line, tone, wmin = 0.6, wmax = 4.6, gamma = 1, cut = 0, minRun = 1.5 }) {
  const ds = [];
  for (let i = 0; i <= n; i++) {
    const pts = line(i / n);
    if (!pts || pts.length < 2) continue;
    const ws = pts.map(([x, y]) => clamp(tone(x, y)));
    if (cut <= 0) {
      ds.push(ribbon(pts, ws.map(t => lerp(wmin, wmax, Math.pow(t, gamma)))));
      continue;
    }
    let run = [], runW = [];
    const flush = () => {
      if (run.length >= 2) {
        let L = 0;
        for (let k = 1; k < run.length; k++) L += Math.hypot(run[k][0] - run[k - 1][0], run[k][1] - run[k - 1][1]);
        if (L >= minRun) ds.push(ribbon(run, runW));
      }
      run = []; runW = [];
    };
    for (let k = 0; k < pts.length; k++) {
      if (ws[k] >= cut) {
        run.push(pts[k]);
        // remap the surviving range onto wmin..wmax so breaking does not also
        // flatten what tone is left
        runW.push(lerp(wmin, wmax, Math.pow(clamp((ws[k] - cut) / (1 - cut)), gamma)));
      } else flush();
    }
    flush();
  }
  return ds.length ? `<path d="${ds.join('')}"/>` : '';
}

/** A horizontal run with a slow hand wave — the sky family in the originals. */
export function waveLine(x0, x1, y, { amp = 1.6, freq = 0.013, seed = 1, n = 90, bend = 0 } = {}) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = lerp(x0, x1, t);
    pts.push([x, y + (fbm(x * freq, y * 0.02 + seed, seed, 3) - 0.5) * 2 * amp + bend * Math.sin(Math.PI * t)]);
  }
  return pts;
}

/** Short tapered marks — grass, scrub, coal dust. Density, not weight. */
export function dashes({ n, pick, angle, len, w0 = 2.0, w1 = 0.3, rand }) {
  const ds = [];
  for (let i = 0; i < n; i++) {
    const p = pick(i);
    if (!p) continue;
    const a = angle(p, i), L = len(p, i);
    ds.push(ribbon([[p[0], p[1]], [p[0] + Math.cos(a) * L, p[1] + Math.sin(a) * L]], [w0, w1]));
  }
  return ds.length ? `<path d="${ds.join('')}"/>` : '';
}

/** A lumpy closed outline — bushes, spoil, hills. */
export function blob(cx, cy, rx, ry, seed, wobble = 0.30, n = 48) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = (Math.PI * 2 * i) / n;
    const k = 1 - wobble / 2 + wobble * fbm(Math.cos(a) * 1.9 + 4, Math.sin(a) * 1.9 + 4, seed, 3);
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  return 'M' + pts.map(p => `${fx(p[0])},${fx(p[1])}`).join('L') + 'Z';
}

/** A path through points, smoothed. */
export function curve(pts) {
  let d = `M${fx(pts[0][0])},${fx(pts[0][1])}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
    d += `Q${fx(pts[i][0])},${fx(pts[i][1])} ${fx(mx)},${fx(my)}`;
  }
  const last = pts[pts.length - 1];
  return d + `L${fx(last[0])},${fx(last[1])}`;
}

/**
 * A bulbous form with contour lines that bow with its surface.
 *
 * `profile(t)` -> [centreX, halfWidth] for t in 0..1 down the form. The contour
 * family runs across it, bowing by an amount set by the local width, so the
 * family itself describes the round. `lit` places the highlight crescent in
 * surface coordinates (-1 left edge .. +1 right edge), where the lines thin
 * away to nothing.
 */
export function bulb({ yTop, yBot, profile, pitch = 5.0, lit = 0.45, litWidth = 0.30,
                       wmin = 1.35, wmax = 3.4, dark = 0.86, bend = 0.30, seed = 1, id,
                       cut = 0.17, wander = 1.1, texture = {} }) {
  const N = 90;
  const P = [];
  for (let i = 0; i <= N; i++) P.push(profile(i / N));

  // The outline's top and bottom caps must bow by exactly the same amount as
  // the contour family inside, or the form reads as a stacked cylinder with
  // flat lids instead of as a barrel. This is the difference between a segment
  // that looks turned on a lathe and one that looks drawn.
  const cap = (y, cx, hw, dir) => {
    const pts = [];
    const m = 24;
    for (let i = 0; i <= m; i++) {
      const t = i / m;
      const x = cx - hw + hw * 2 * (dir > 0 ? t : 1 - t);
      const st = dir > 0 ? t : 1 - t;
      pts.push([x, y + Math.sin(Math.PI * st) * hw * bend]);
    }
    return pts;
  };
  const left = [], right = [];
  for (let i = 0; i <= N; i++) {
    const y = lerp(yTop, yBot, i / N);
    left.push([P[i][0] - P[i][1], y + Math.sin(0) * 0]);
    right.push([P[i][0] + P[i][1], y]);
  }
  const ring = cap(yTop, P[0][0], P[0][1], 1)
    .concat(right)
    .concat(cap(yBot, P[N][0], P[N][1], -1))
    .concat(left.slice().reverse());
  const outline = 'M' + ring.map(p => `${fx(p[0])},${fx(p[1])}`).join('L') + 'Z';

  const at = t => P[Math.min(N, Math.max(0, Math.round(t * N)))];
  const tone = (x, y) => {
    const t = clamp((y - yTop) / (yBot - yTop));
    const [cx, hw] = at(t);
    const u = (x - cx) / Math.max(1, hw);
    let v = dark - (dark + 0.10) * Math.exp(-(((u - lit) / litWidth) ** 2));
    v += 0.30 * smoothstep(0.55, 1.0, u);        // the far edge turns away again
    v += 0.22 * smoothstep(-0.55, -1.0, u);      // and so does the near one
    // the same mottle the sky carries -- this is what keeps the form from
    // reading as a smoothly shaded vector object
    v += mottle(x, y, { seed, ...texture });
    return clamp(v);
  };

  // The bow displaces every line downward, so the family has to start above the
  // form by the maximum bow or the top of the shape is left blank.
  const maxHw = P.reduce((m, p) => Math.max(m, p[1]), 0);
  const overshoot = maxHw * bend + 4;
  const field = lineField({
    n: Math.round((yBot - yTop + overshoot) / pitch),
    line: t => {
      const y = lerp(yTop - overshoot, yBot + 2, t);
      const [cx, hw] = at(clamp((y - yTop) / (yBot - yTop)));
      const pts = [];
      // dense enough to resolve the fast mottle, as in the sky
      const m = Math.max(40, Math.round(hw * 0.55));
      for (let i = 0; i <= m; i++) {
        const s = i / m, x = cx - hw * 1.15 + hw * 2.3 * s;
        // the bow is what makes a flat family read as a round surface; the
        // wander keeps the line from being a drafted arc
        pts.push([x, y + Math.sin(Math.PI * s) * hw * bend
                    + (fbm(x * 0.05, y * 0.9 + seed, seed + 3, 3) - 0.5) * 2 * wander]);
      }
      return pts;
    },
    tone, wmin, wmax, gamma: 1.0, cut, minRun: 1.2,
  });

  return {
    outline,
    svg: `<path d="${outline}" fill="#fff"/>`
       + `<g clip-path="url(#${id})" fill="#000">${field}</g>`
       + `<path d="${outline}" fill="none" stroke="#000" stroke-width="4.6" stroke-linejoin="round"/>`,
    clipDef: `<clipPath id="${id}"><path d="${outline}"/></clipPath>`,
  };
}


/**
 * Foliage — bushes, scrub, tree canopies.
 *
 * NOT a scribble inside an outline: the originals draw a bush as a packed
 * cluster of small rounded LOBES, each one a white lit cap with a crescent of
 * shadow around its lower right. The silhouette is the bumpy edge of the outer
 * lobes, never a drawn outline. Lobes are laid down back to front so each one
 * occludes part of the shadow behind it, and the shadows deepen toward the
 * bottom of the mass where the light does not reach.
 */
export function foliage({ cx, cy, rx, ry, seed, lobe = 0.13, jitter = 0.40,
                          light = [-0.7, -0.7], dark = 1.0, id }) {
  const r = rng(seed);
  const R = Math.max(3.2, rx * lobe);
  // lobes must only just overlap: at heavy overlap each row's white cap
  // erases the crescent of the row behind it and only the front row survives
  const cols = Math.ceil((rx * 2) / (R * 1.16));
  const rows = Math.ceil((ry * 2) / (R * 1.00));
  const lobes = [];
  for (let j = 0; j <= rows; j++) {
    for (let i = 0; i <= cols; i++) {
      const ox = (j % 2) * R * 0.55;
      let x = cx - rx + ox + (i / cols) * rx * 2;
      let y = cy - ry + (j / rows) * ry * 2;
      x += r.range(-R, R) * jitter;
      y += r.range(-R, R) * jitter;
      const u = (x - cx) / rx, v = (y - cy) / ry;
      // a dome sitting on the ground: full width at the base, tapering over the
      // top. A plain ellipse floats and reads as a cloud.
      const edge = 1.02 + 0.30 * (fbm(Math.atan2(v, u) * 2.2 + 5, 3, seed, 3) - 0.5) * 2;
      const vv = v < 0 ? v : v * 0.72;
      if (u * u + vv * vv > edge * edge) continue;
      lobes.push([x, y, R * r.range(0.80, 1.22), r.range(0, 1)]);
    }
  }
  // back to front: lower lobes overlap the ones behind them
  lobes.sort((a, b) => a[1] - b[1]);

  // Interleaved, back to front: each lobe's white cap occludes the shadow of
  // the lobe behind it. Drawing all the caps and then all the shadows piles the
  // crescents on top of each other and the mass fills in solid.
  //
  // The crescent is a black disc with a white disc offset over it toward the
  // light. At these radii that reads far crisper than a tapered arc, and it is
  // how the shading actually looks in the originals: a lunette thick on the
  // shaded side and closing to nothing on the lit side.
  const parts = [];
  const [lx, ly] = light;
  const ln = Math.hypot(lx, ly) || 1;
  for (const [x, y, rad, q] of lobes) {
    const depth = clamp((y - (cy - ry)) / (2 * ry));
    // deeper into the mass, the cap shrinks and the crescent fattens
    const capR = rad * (0.90 - 0.26 * depth * dark);
    const off = rad * (0.16 + 0.16 * depth * dark);
    parts.push(`<circle cx="${fx(x)}" cy="${fx(y)}" r="${fx(rad)}" fill="#000"/>`);
    if (!(depth > 0.74 && q < 0.16)) {
      parts.push(`<circle cx="${fx(x + (lx / ln) * off)}" cy="${fx(y + (ly / ln) * off)}" r="${fx(capR)}" fill="#fff"/>`);
    }
  }
  return parts.join('');
}
