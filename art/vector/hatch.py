"""Engraving engine for 1-bit backdrops.

The idea, borrowed from wood engraving: tone is never a fill. Every value in the
picture is the *density of ink lines*, and density comes from two places —

  1. perspective (world-constant line spacing compresses with depth), and
  2. a tone field: a scalar 0..1 over the surface, from a light model plus noise.

A tone layer draws its lines only where `tone >= threshold`, so stacking layers
at rising thresholds builds value the way a burin does: open strata in the lit
areas, cross-hatch in the mid-tones, four overlapping families in the blacks.
Strokes break where the field dips, which is what stops it reading as CAD.
"""
import math, random

# ------------------------------------------------------------------ value noise
def _h2(i, j, seed):
    n = (i * 73856093) ^ (j * 19349663) ^ (seed * 83492791)
    n &= 0x7FFFFFFF
    n = (n ^ (n >> 13)) * 1274126177
    n &= 0x7FFFFFFF
    return ((n ^ (n >> 16)) & 0xFFFF) / 65535.0

def _s(t):
    return t * t * (3 - 2 * t)

def vnoise(x, y, seed=0):
    i, j = math.floor(x), math.floor(y)
    u, v = _s(x - i), _s(y - j)
    a, b = _h2(i, j, seed), _h2(i + 1, j, seed)
    c, d = _h2(i, j + 1, seed), _h2(i + 1, j + 1, seed)
    return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v

def fbm(x, y, seed=0, octaves=4):
    amp, f, tot, norm = 1.0, 1.0, 0.0, 0.0
    for k in range(octaves):
        tot += amp * vnoise(x * f, y * f, seed + k * 17)
        norm += amp
        amp *= 0.5
        f *= 2.0
    return tot / norm

def clamp(v, lo=0.0, hi=1.0):
    return lo if v < lo else hi if v > hi else v

def smoothstep(e0, e1, x):
    t = clamp((x - e0) / (e1 - e0))
    return t * t * (3 - 2 * t)

# ---------------------------------------------------------------------- strokes
def stroke_path(points, wob, seed):
    """Smooth quadratic through the points, with coherent perpendicular wobble.

    Coherent, not per-point random: a pen wanders, it does not vibrate.
    """
    n = len(points)
    if n < 2:
        return None
    out = []
    for i, (x, y) in enumerate(points):
        t = i / (n - 1)
        if i == 0:
            dx, dy = points[1][0] - x, points[1][1] - y
        elif i == n - 1:
            dx, dy = x - points[-2][0], y - points[-2][1]
        else:
            dx = points[i + 1][0] - points[i - 1][0]
            dy = points[i + 1][1] - points[i - 1][1]
        L = math.hypot(dx, dy) or 1.0
        w = (fbm(t * 3.4 + seed * 2.7, seed * 5.3, seed, 3) * 2 - 1) * wob
        out.append((x - dy / L * w, y + dx / L * w))
    d = f"M{out[0][0]:.1f},{out[0][1]:.1f}"
    if n == 2:
        d += f" L{out[1][0]:.1f},{out[1][1]:.1f}"
    else:
        for i in range(1, n - 1):
            mx = (out[i][0] + out[i + 1][0]) / 2
            my = (out[i][1] + out[i + 1][1]) / 2
            d += f" Q{out[i][0]:.1f},{out[i][1]:.1f} {mx:.1f},{my:.1f}"
        d += f" L{out[-1][0]:.1f},{out[-1][1]:.1f}"
    return d

class Ink:
    """Collects paths, grouped by stroke width so the SVG stays small."""
    def __init__(self):
        self.buckets = {}
    def add(self, d, w):
        if not d:
            return
        k = round(max(0.4, w) * 4) / 4
        self.buckets.setdefault(k, []).append(d)
    def svg(self):
        parts = []
        for w in sorted(self.buckets):
            body = "".join(f'<path d="{d}"/>' for d in self.buckets[w])
            parts.append(f'<g fill="none" stroke="#000" stroke-width="{w}" '
                         f'stroke-linecap="round" stroke-linejoin="round">{body}</g>')
        return "".join(parts)
    def count(self):
        return sum(len(v) for v in self.buckets.values())

# ----------------------------------------------------------------- tone hatching
def hatch(ink, pt, tone, layer, rng, a0, a1, b0, b1, scale_at=None):
    """Draw one tone layer over a parametric surface.

    `pt(a, b)` -> screen point. `tone(a, b)` -> 0..1 (1 = black).
    `a` is the depth-like axis, `b` runs across the surface.
    """
    thr = layer["thr"]
    kind = layer.get("kind", "along")
    wob = layer.get("wob", 1.6)
    wid = layer.get("w", 0.9)
    drop = layer.get("drop", 0.04)
    slope = layer.get("slope", 0.0)
    seed = layer.get("seed", 1)
    jit = layer.get("jit", 0.30)
    maxlen = layer.get("maxlen", 46.0)
    # Domain warp: bend each line by a smooth noise field before it is drawn.
    # Straight families on a regular lattice always cross into a visible weave;
    # warping makes the strata meander and clump the way rock does.
    wa, wf1, wf2, ws = layer.get("warp", (0.0, 1.0, 1.0, 0))
    def bend(a, b):
        if wa == 0.0:
            return b
        return b + wa * (fbm(a * wf1, b * wf2, ws, 3) - 0.5) * 2.0

    if kind in ("along", "diag"):
        step = layer["step"]
        b = b0 + rng.uniform(0, step)
        lines = []
        while b < b1:
            lines.append(b)
            b += step * rng.uniform(1 - jit, 1 + jit)
        ns = layer.get("samples", 96)
        for bb in lines:
            if rng.random() < drop:
                continue
            pts, run, sd = [], [], rng.randint(0, 9999)
            for i in range(ns + 1):
                t = i / ns
                a = a0 + (a1 - a0) * (t ** layer.get("bias", 1.0))
                b_here = bend(a, bb + slope * (a - a0))
                if not (b0 - 1 <= b_here <= b1 + 1):
                    run = _flush(ink, run, ink_w(wid, scale_at, a), wob, sd, maxlen, rng)
                    continue
                tv = tone(a, b_here) + (fbm(a * 6.1, b_here * 0.09, seed, 2) - 0.5) * 0.16
                if tv >= thr:
                    run.append(pt(a, b_here))
                else:
                    run = _flush(ink, run, ink_w(wid, scale_at, a), wob, sd, maxlen, rng)
            _flush(ink, run, ink_w(wid, scale_at, a1), wob, sd, maxlen, rng)
    else:  # "cross" — lines at constant depth, running across the surface
        a = a0
        c = layer["step"]
        ns = layer.get("samples", 60)
        while a < a1:
            if rng.random() >= drop:
                run, sd = [], rng.randint(0, 9999)
                for i in range(ns + 1):
                    b = bend(a, b0 + (b1 - b0) * i / ns)
                    tv = tone(a, b) + (fbm(a * 5.7, b * 0.11, seed, 2) - 0.5) * 0.16
                    if tv >= thr:
                        run.append(pt(a, b))
                    else:
                        run = _flush(ink, run, ink_w(wid, scale_at, a), wob, sd, maxlen, rng)
                _flush(ink, run, ink_w(wid, scale_at, a), wob, sd, maxlen, rng)
            # constant-ish screen spacing needs da ~ a^2; a^1.55 keeps some
            # depth compression, which is what darkens the far end.
            a += c * (a ** 1.55) * rng.uniform(1 - jit, 1 + jit)

def ink_w(base, scale_at, a):
    if scale_at is None:
        return base
    s = scale_at(a)
    return max(0.45, base * (0.42 + 0.58 * (s ** 0.35)))

def _flush(ink, run, w, wob, seed, maxlen=46.0, rng=None):
    """Emit a run, chopped into pen-length strokes with gaps between them.

    An engraver lifts the burin. One 400px line across a whole wall is the
    single strongest tell that a picture was drawn by a machine.
    """
    if len(run) < 2:
        return []
    rng = rng or random
    piece, acc, target = [run[0]], 0.0, maxlen * rng.uniform(0.55, 1.5)
    for i in range(1, len(run)):
        acc += math.dist(run[i - 1], run[i])
        piece.append(run[i])
        if acc >= target:
            _emit(ink, piece, w, wob, seed + i)
            # lift: skip a short gap before setting down again
            skip = rng.randint(0, 2)
            piece, acc = ([] if skip else [run[i]]), 0.0
            target = maxlen * rng.uniform(0.55, 1.5)
            if skip:
                piece = [run[min(i + skip, len(run) - 1)]]
    _emit(ink, piece, w, wob, seed + 7)
    return []

def _emit(ink, piece, w, wob, seed):
    if len(piece) < 2:
        return
    L = sum(math.dist(piece[i], piece[i + 1]) for i in range(len(piece) - 1))
    if L <= 2.0:
        return
    ink.add(stroke_path(piece, wob * min(1.0, L / 40), seed), w)

# ------------------------------------------------------------------ solid shapes
def ragged(points, amp, rng, per=3):
    """Break a polygon's edges up so filled blacks never have a machined edge."""
    out = []
    n = len(points)
    for i in range(n):
        a, b = points[i], points[(i + 1) % n]
        out.append(a)
        for k in range(1, per):
            t = k / per
            p = (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
            dx, dy = b[0] - a[0], b[1] - a[1]
            L = math.hypot(dx, dy) or 1
            j = rng.uniform(-amp, amp)
            out.append((p[0] - dy / L * j, p[1] + dx / L * j))
    return out

def poly(pts):
    return " ".join(f"{x:.1f},{y:.1f}" for x, y in pts)
