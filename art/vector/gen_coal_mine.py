#!/usr/bin/env python3
"""31-coal-mine — Coal Mine Tunnels. Woodring hatch idiom, 1-bit, 512x512.

Scene definition only; all the ink lives in hatch.py. To make another backdrop,
copy this file and change the surfaces, the tone fields and the props.
"""
import math, random
from hatch import (Ink, hatch, stroke_path, fbm, clamp, smoothstep, ragged, poly)

W = H = 512
VX, VY = 256.0, 266.0
XL, XR, YT, YB = -66.0, 578.0, -76.0, 588.0      # tunnel mouth, in screen units
ZVOID = 5.4                                       # depth where the tunnel goes black
rng = random.Random(20250823)

def proj(x, y, s):
    return (VX + (x - VX) * s, VY + (y - VY) * s)

def at(x, y, z):
    return proj(x, y, 1.0 / z)

def scale_at(z):
    return 1.0 / z

def rect(z):
    s = 1.0 / z
    return [proj(XL, YT, s), proj(XR, YT, s), proj(XR, YB, s), proj(XL, YB, s)]

# ------------------------------------------------------------------ light model
# A point at mouth-coord (x, y) seen at depth z sits at real (X*z, Y*z, F*z).
F = 300.0
LAMP = (95.0, -6.0, 1.78)          # miner's lamp hung off the second timber post

def real3(x, y, z):
    return ((x - VX) * z, (y - VY) * z, F * z)

LAMP3 = real3(*LAMP)

def light(x, y, z, radius=215.0):
    p = real3(x, y, z)
    d = math.dist(p, LAMP3)
    return 1.0 / (1.0 + (d / radius) ** 2)

def depth_ramp(z):
    return (z - 1.0) / (ZVOID - 1.0)

def voidward(z):
    return smoothstep(ZVOID * 0.70, ZVOID * 0.99, z)

# ------------------------------------------------------------------ tone fields
def tone_wall(side):
    x_edge = XL if side == "L" else XR
    sd = 11 if side == "L" else 29
    def f(z, y):
        ty = (y - YT) / (YB - YT)
        t = 0.42 + 0.54 * depth_ramp(z)
        t += 0.46 * (1.0 - math.sin(math.pi * clamp(ty)) ** 0.75)   # black at both junctions
        t += 0.26 * math.exp(-((ty - 0.36) / 0.065) ** 2)           # coal seams
        t += 0.18 * math.exp(-((ty - 0.63) / 0.045) ** 2)
        t += (fbm(z * 1.55, ty * 6.4 + z * 0.5, sd) - 0.5) * 0.52
        t -= 1.05 * light(x_edge, y, z)
        return max(clamp(t), voidward(z))
    return f

def tone_ceil(z, x):
    tx = (x - XL) / (XR - XL)
    t = 0.56 + 0.42 * depth_ramp(z)
    t += 0.34 * (1.0 - math.sin(math.pi * clamp(tx)) ** 0.5)
    t += (fbm(z * 1.7, tx * 5.8 + z * 0.4, 47) - 0.5) * 0.46
    t -= 0.92 * light(x, YT, z)
    return max(clamp(t), voidward(z))

def tone_floor(z, x):
    tx = (x - XL) / (XR - XL)
    t = 0.20 + 0.50 * depth_ramp(z)
    t += 0.38 * (1.0 - math.sin(math.pi * clamp(tx)))
    t += (fbm(z * 1.9, tx * 7.2 + z * 0.7, 71) - 0.5) * 0.40
    t -= 1.00 * light(x, YB, z)
    return max(clamp(t), voidward(z))


# ----------------------------------------------------------------------- relief
# Hatch families alone stay flat, however well warped. Rock reads as rock when
# the tone field itself has lumps in it: each outcrop lightens its lamp-facing
# side, darkens its far side, and lays a contact shadow just outside its edge.
# The hatch then bends around the outcrops without being told to.
class Relief:
    __slots__ = ("blobs", "buckets", "nb", "a0", "a1")

    def __init__(self, blobs, a0=1.0, a1=ZVOID, nb=90):
        self.blobs, self.nb = blobs, nb
        self.buckets = [[] for _ in range(nb)]
        for bl in blobs:
            ac, ra = bl[0], bl[2]
            lo = int(clamp((ac - ra * 1.5 - a0) / (a1 - a0)) * (nb - 1))
            hi = int(clamp((ac + ra * 1.5 - a0) / (a1 - a0)) * (nb - 1))
            for k in range(lo, hi + 1):
                self.buckets[k].append(bl)
        self.a0, self.a1 = a0, a1

    def __call__(self, a, b, lamp_dir):
        k = int(clamp((a - self.a0) / (self.a1 - self.a0)) * (self.nb - 1))
        d_tot = 0.0
        for ac, bc, ra, rb, sd in self.buckets[k]:
            dz, db = (a - ac) / ra, (b - bc) / rb
            d = math.hypot(dz, db)
            if d > 1.55:
                continue
            ang = math.atan2(db, dz)
            r = 1.0 + 0.30 * (fbm(math.cos(ang) * 1.6 + 3, math.sin(ang) * 1.6 + 3, sd, 3) - 0.5) * 2
            if d < r:
                # facet shading: away from the lamp direction goes dark
                f = (db * lamp_dir[1] + dz * lamp_dir[0]) / max(0.2, d)
                d_tot += -0.34 + 0.62 * clamp((f + 1) / 2) + 0.22 * (d / r)
            elif d < r * 1.38:
                d_tot += 0.50 * (1.0 - (d - r) / (r * 0.38))
        return d_tot

    def outlines(self, pt, ink, steps=26):
        for ac, bc, ra, rb, sd in self.blobs:
            pts = []
            for i in range(steps + 1):
                ang = 2 * math.pi * i / steps
                r = 1.0 + 0.30 * (fbm(math.cos(ang) * 1.6 + 3, math.sin(ang) * 1.6 + 3, sd, 3) - 0.5) * 2
                a = ac + math.cos(ang) * ra * r
                b = bc + math.sin(ang) * rb * r
                if a < 1.01 or a > ZVOID:
                    if pts:
                        ink.add(stroke_path(pts, 0.7, sd), max(0.5, 1.9 / ac))
                        pts = []
                    continue
                pts.append(pt(a, b))
            if len(pts) > 2:
                ink.add(stroke_path(pts, 0.7, sd), max(0.5, 1.9 / ac))


def make_blobs(n, b0, b1, seed, ra_w=0.20, rb_w=52.0):
    r = random.Random(seed)
    out = []
    for i in range(n):
        # uniform in real depth, so outcrops do not pile up at the mouth
        a = 1.0 + (ZVOID - 1.0) * (r.random() ** 0.75)
        b = r.uniform(b0, b1)
        k = r.uniform(0.55, 1.7)
        out.append((a, b, ra_w * k * a * 0.55, rb_w * k, r.randint(0, 9999)))
    return out

RELIEF = {
    "wallL": (Relief(make_blobs(34, YT, YB, 1201)), (0.0, -1.0)),
    "wallR": (Relief(make_blobs(42, YT, YB, 1307, ra_w=0.24, rb_w=46.0)), (0.0, -1.0)),
    "ceil":  (Relief(make_blobs(36, XL, XR, 1409, rb_w=54.0)), (-0.4, -0.9)),
    "floor": (Relief(make_blobs(16, XL, XR, 1511, rb_w=46.0)), (-0.3, -0.9)),
}

def with_relief(name, tone):
    rel, ldir = RELIEF[name]
    def f(a, b):
        return clamp(tone(a, b) + rel(a, b, ldir))
    return f

# ------------------------------------------------------------------ tone layers
def layers(step_along, cross_c, diag_step, base_w, wamp):
    """Six passes at rising thresholds: open strata -> cross -> full black."""
    # No two families are perpendicular: an orthogonal pair reads as tile grout.
    return [
        dict(kind="along", thr=0.26, step=step_along,        w=base_w,        wob=1.6, samples=130, seed=3,  maxlen=54, warp=(wamp*1.30, 1.1, 0.028, 101)),
        dict(kind="diag",  thr=0.42, step=diag_step, slope=34.0,  w=base_w*0.92, wob=1.5, samples=110, seed=5,  maxlen=44, warp=(wamp*0.85, 1.7, 0.041, 113)),
        dict(kind="cross", thr=0.53, step=cross_c,           w=base_w*0.90, wob=1.3, samples=84,  seed=7,  maxlen=40, warp=(wamp*1.10, 2.3, 0.033, 127)),
        dict(kind="diag",  thr=0.66, step=diag_step*0.85, slope=-27.0, w=base_w*0.88, wob=1.4, samples=110, seed=9,  maxlen=38, warp=(wamp*0.70, 1.4, 0.052, 139)),
        dict(kind="along", thr=0.77, step=step_along*0.78,   w=base_w*0.88, wob=1.5, samples=130, seed=11, maxlen=42, warp=(wamp*1.55, 0.9, 0.022, 151)),
        dict(kind="diag",  thr=0.85, step=diag_step*0.62, slope=52.0,  w=base_w*0.90, wob=1.2, samples=110, seed=13, maxlen=34, warp=(wamp*0.60, 2.8, 0.061, 163)),
        dict(kind="cross", thr=0.90, step=cross_c*0.66,      w=base_w*0.92, wob=1.1, samples=84,  seed=17, maxlen=32, warp=(wamp*0.95, 3.3, 0.045, 179)),
    ]

# -------------------------------------------------------------- solid black mask
def solid_mask(pt, tone, a0, a1, b0, b1, thr, na, nb, amp):
    """Where the tone field saturates, lay ink down as ragged solid black.

    Six hatch families still leave paper showing; the reference art has true
    blacks, so the darkest cells are filled and only their edges kept rough.
    """
    out = []
    for i in range(na):
        za = a0 + (a1 - a0) * (i / na) ** 1.3
        zb = a0 + (a1 - a0) * ((i + 1) / na) ** 1.3
        for j in range(nb):
            ba = b0 + (b1 - b0) * j / nb
            bb = b0 + (b1 - b0) * (j + 1) / nb
            cz, cb = (za + zb) / 2, (ba + bb) / 2
            if tone(cz, cb) < thr:
                continue
            q = [pt(za, ba), pt(zb, ba), pt(zb, bb), pt(za, bb)]
            k = amp * (1.0 / cz)
            out.append(f'<polygon points="{poly(ragged(q, k, rng, 2))}"/>')
    return f'<g fill="#000">{"".join(out)}</g>' if out else ""

# ---------------------------------------------------------------------- assemble
out = []
add = out.append
add(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">')
add('<rect width="512" height="512" fill="#fff"/>')

SURFACES = [
    ("ceil",  lambda z, b: at(b, YT, z), tone_ceil,        XL, XR,  6.0, 0.0072,  7.5, 1.00, 26.0),
    ("floor", lambda z, b: at(b, YB, z), tone_floor,       XL, XR,  8.5, 0.0105, 10.5, 0.92, 18.0),
    ("wallL", lambda z, b: at(XL, b, z), tone_wall("L"),   YT, YB,  5.6, 0.0082,  7.0, 1.00, 22.0),
    ("wallR", lambda z, b: at(XR, b, z), tone_wall("R"),   YT, YB,  6.1, 0.0090,  7.6, 1.00, 30.0),
]

def tune(name, ls):
    """The along-family converges on the vanishing point; left at full strength
    on the ceiling it turns the top corners into a sunburst. Thin it there and
    let the cross/diagonal families carry the tone instead."""
    if name != "ceil":
        return ls
    for L in ls:
        if L["kind"] == "along":
            L["step"] *= 2.1
            L["thr"] = min(0.97, L["thr"] + 0.14)
            L["maxlen"] *= 0.6
        elif L["kind"] == "cross":
            L["step"] *= 1.45          # thinning this too is what kills the plaid
            L["thr"] = min(0.97, L["thr"] + 0.08)
        else:
            L["step"] *= 0.78          # diagonals + relief do the work instead
    return ls

ink = Ink()
outline = Ink()
for name, pt, tone0, b0, b1, step, cc, dstep, bw, wamp in SURFACES:
    tone = with_relief(name, tone0)
    add(solid_mask(pt, tone, 1.0, ZVOID, b0, b1, 0.915, 56, 78, 2.6))
    RELIEF[name][0].outlines(pt, outline)
    for L in tune(name, layers(step, cc, dstep, bw, wamp)):
        hatch(ink, pt, tone, L, rng, 1.0, ZVOID, b0, b1, scale_at=scale_at)
add(ink.svg())
add(outline.svg())

# the void itself
add(f'<polygon points="{poly(ragged(rect(ZVOID), 2.0, rng, 3))}" fill="#000"/>')

# rough rock edges at the four dihedral corners
edge = Ink()
for ci, (wx, wy) in enumerate([(XL, YT), (XR, YT), (XR, YB), (XL, YB)]):
    zs = [1.0 + (ZVOID - 1.0) * (i / 60) ** 1.6 for i in range(61)]
    pts = [at(wx + rng.uniform(-5, 5), wy + rng.uniform(-5, 5), z) for z in zs]
    edge.add(stroke_path(pts, 1.4, ci + 40), 1.5)
add(edge.svg())

# ------------------------------------------------------------------------ timber
def beam(quad, s, grain=9, tone_dark=False):
    """Milled timber: white body, grain, hard outline. Its cleanness is the
    contrast that makes the surrounding rock read as rough."""
    g = [f'<polygon points="{poly(quad)}" fill="#fff" stroke="#000" '
         f'stroke-width="{max(0.7, 2.6 * s):.2f}" stroke-linejoin="round"/>']
    A, B, C, D = quad
    gi = Ink()
    for k in range(1, grain):
        t = k / grain + rng.uniform(-0.03, 0.03)
        a = (A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t)
        b = (D[0] + (C[0] - D[0]) * t, D[1] + (C[1] - D[1]) * t)
        pts = [(a[0] + (b[0] - a[0]) * u / 6, a[1] + (b[1] - a[1]) * u / 6) for u in range(7)]
        gi.add(stroke_path(pts, max(0.5, 2.2 * s), rng.randint(0, 9999)), max(0.4, 0.95 * s))
    if tone_dark:  # shaded face
        for k in range(1, grain * 3):
            t = k / (grain * 3)
            a = (A[0] + (D[0] - A[0]) * t, A[1] + (D[1] - A[1]) * t)
            b = (B[0] + (C[0] - B[0]) * t, B[1] + (C[1] - B[1]) * t)
            gi.add(stroke_path([a, b], max(0.4, 1.4 * s), rng.randint(0, 9999)), max(0.4, 0.8 * s))
    g.append(gi.svg())
    return "".join(g)

def timber_frame(z, brace=False):
    s = 1.0 / z
    tl, tr, br_, bl = rect(z)
    pw, lh = 58 * s, 48 * s
    g = []
    lit_left = light(XL, 0, z) > light(XR, 0, z)
    g.append(beam([(bl[0], bl[1]), (bl[0] + pw, bl[1]), (tl[0] + pw, tl[1]), (tl[0], tl[1])],
                  s, 8, tone_dark=not lit_left))
    g.append(beam([(br_[0] - pw, br_[1]), (br_[0], br_[1]), (tr[0], tr[1]), (tr[0] - pw, tr[1])],
                  s, 8, tone_dark=lit_left))
    g.append(beam([(tl[0], tl[1]), (tr[0], tr[1]), (tr[0], tr[1] + lh), (tl[0], tl[1] + lh)], s, 12))
    if brace:
        b0 = (tl[0] + pw, tl[1] + lh * 1.1)
        b1 = (tl[0] + pw * 3.4, tl[1] + lh * 0.15)
        th = 13 * s
        g.append(beam([(b0[0], b0[1]), (b0[0] + th, b0[1] + th), (b1[0] + th, b1[1] + th),
                       (b1[0], b1[1])], s, 5))
    # shadow the lintel casts down the far side of the frame
    sh = [(tl[0], tl[1] + lh), (tr[0], tr[1] + lh),
          (tr[0], tr[1] + lh * 2.4), (tl[0], tl[1] + lh * 2.4)]
    si = Ink()
    n = max(4, int(26 * s + 6))
    for k in range(n):
        t = k / n
        a = (sh[0][0], sh[0][1] + (sh[3][1] - sh[0][1]) * t)
        b = (sh[1][0], sh[1][1] + (sh[2][1] - sh[1][1]) * t)
        si.add(stroke_path([a, ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2), b], 1.5, rng.randint(0, 999)),
               max(0.45, 1.3 * s))
    g.append(si.svg())
    return "".join(g)

for z, brace in [(4.20, False), (2.72, False), (1.78, True), (1.13, False)]:
    add(timber_frame(z, brace))

# ------------------------------------------------------------------------ rails
def rails():
    g = []
    si = Ink()
    z = ZVOID
    while z > 1.0:
        s = 1.0 / z
        y = VY + (YB - VY) * s
        x1 = VX + (182 - VX) * s
        x2 = VX + (330 - VX) * s
        t = max(0.6, 6.5 * s)
        g.append(f'<polygon points="{poly(ragged([(x1, y - t/2), (x2, y - t/2), (x2, y + t/2), (x1, y + t/2)], 0.8*s+0.2, rng, 2))}" '
                 f'fill="#fff" stroke="#000" stroke-width="{max(0.4, 1.6 * s):.2f}"/>')
        z -= 0.052 * (z ** 1.35) * rng.uniform(0.82, 1.18)
    for xoff in (192, 320):
        pts = [at(xoff, YB, 1.0 + (ZVOID - 1.0) * (i / 40) ** 1.5) for i in range(41)]
        si.add(stroke_path(pts, 0.5, 5), 4.0)
        hl = [(p[0] + 6 * (1.0 / (1 + i * 0.09)), p[1]) for i, p in enumerate(pts)]
        g.append(si.svg()); si = Ink()
        g.append(f'<path d="{stroke_path(hl, 0.3, 6)}" fill="none" stroke="#fff" stroke-width="1.4"/>')
    return "".join(g)
add(rails())

# ------------------------------------------------------------------------- lamp
def lamp():
    p = at(LAMP[0], LAMP[1], LAMP[2])
    s = 1.0 / LAMP[2]
    r = 30 * s
    g = []
    # halo: white disc knocked out of the hatching, ringed with radiating ticks
    g.append(f'<circle cx="{p[0]:.1f}" cy="{p[1]:.1f}" r="{r*2.35:.1f}" fill="#fff"/>')
    # feathered edge: white flecks thinning outward, so the pool has no rim
    fl = []
    for _ in range(900):
        a = rng.uniform(0, 2 * math.pi)
        rr = r * (2.2 + rng.random() ** 0.6 * 1.5)
        if rng.random() > (1.0 - (rr / (r * 3.7)) ** 2.2):
            continue
        fl.append(f'<circle cx="{p[0]+math.cos(a)*rr:.1f}" cy="{p[1]+math.sin(a)*rr:.1f}" '
                  f'r="{rng.uniform(0.6, 2.0):.2f}"/>')
    g.append(f'<g fill="#fff">{"".join(fl)}</g>')
    li = Ink()
    for k in range(46):
        a = 2 * math.pi * k / 46 + rng.uniform(-0.03, 0.03)
        r0 = r * rng.uniform(2.6, 3.0)
        r1 = r0 + r * rng.uniform(0.7, 2.3)
        li.add(stroke_path([(p[0] + math.cos(a) * r0, p[1] + math.sin(a) * r0),
                            (p[0] + math.cos(a) * r1, p[1] + math.sin(a) * r1)], 0.4, k), 1.1)
    g.append(li.svg())
    # the lamp: black silhouette, white flame
    g.append(f'<path d="M{p[0]-r*0.62:.1f},{p[1]-r*0.5:.1f} L{p[0]+r*0.62:.1f},{p[1]-r*0.5:.1f} '
             f'L{p[0]+r*0.5:.1f},{p[1]+r*0.85:.1f} L{p[0]-r*0.5:.1f},{p[1]+r*0.85:.1f} Z" fill="#000"/>')
    g.append(f'<ellipse cx="{p[0]:.1f}" cy="{p[1]+r*0.12:.1f}" rx="{r*0.3:.1f}" ry="{r*0.42:.1f}" fill="#fff"/>')
    g.append(f'<path d="M{p[0]-r*0.62:.1f},{p[1]-r*0.5:.1f} Q{p[0]:.1f},{p[1]-r*1.5:.1f} '
             f'{p[0]+r*0.62:.1f},{p[1]-r*0.5:.1f}" fill="none" stroke="#000" stroke-width="{2.2*s+0.6:.1f}"/>')
    # hanger to the lintel above
    top = at(LAMP[0], YT, LAMP[2])
    g.append(f'<line x1="{p[0]:.1f}" y1="{p[1]-r*1.35:.1f}" x2="{top[0]:.1f}" y2="{top[1]+18*s:.1f}" '
             f'stroke="#000" stroke-width="{1.8*s+0.7:.1f}"/>')
    return "".join(g)
add(lamp())

# ------------------------------------------------------- foreground: pickaxe, spoil
def pickaxe():
    """Foreground prop, drawn as a flat silhouette. At 260px a prop with
    internal white detail stops reading as an object and starts reading as a
    sign; the reference art keeps its foreground shapes solid."""
    g = ['<g transform="translate(414,286) rotate(13)">']
    g.append('<path d="M8,4 L22,2 L34,236 L18,240 Z" fill="#000"/>')
    g.append('<path d="M-56,10 C-34,-14 6,-24 40,-19 L60,-15 L54,-4 '
             'C20,-11 -18,-3 -46,18 Z" fill="#000"/>')
    g.append('<rect x="0" y="-18" width="28" height="30" rx="3" fill="#000"/>')
    # one white nick so the head does not merge with a dark wall behind it
    g.append('<path d="M-46,8 C-24,-8 8,-15 36,-12" fill="none" stroke="#fff" stroke-width="2.2"/>')
    g.append('</g>')
    sh = Ink()
    for k in range(16):
        y = 520 + k * 1.0
        sh.add(stroke_path([(398 + k * 1.5, y), (462 - k * 1.3, y - 4)], 1.2, 300 + k), 1.1)
    g.append(sh.svg())
    return "".join(g)

def lump(cx, cy, r, seed, lit_from=(-0.7, -0.7)):
    rnd = random.Random(seed)
    n = 11
    pts = [(cx + math.cos(2 * math.pi * i / n) * r * rnd.uniform(0.72, 1.16),
            cy + math.sin(2 * math.pi * i / n) * r * rnd.uniform(0.72, 1.16) * 0.66)
           for i in range(n)]
    g = [f'<polygon points="{poly(pts)}" fill="#fff" stroke="#000" stroke-width="2.8" '
         f'stroke-linejoin="round"/>']
    gi = Ink()
    # shade the facets facing away from the lamp
    steps = max(6, int(r / 2.2))
    for k in range(steps):
        t = k / steps
        a = (cx - r + 2 * r * t, cy - r * 0.7)
        b = (cx - r * 0.6 + 2 * r * t, cy + r * 0.75)
        if t < 0.42:
            continue
        gi.add(stroke_path([a, b], 1.4, seed + k), 0.95)
    for k in range(steps):
        t = k / steps
        if t < 0.55:
            continue
        a = (cx - r, cy - r * 0.7 + 1.5 * r * t)
        b = (cx + r, cy - r * 0.95 + 1.5 * r * t)
        gi.add(stroke_path([a, b], 1.2, seed + 90 + k), 0.9)
    c = f"lm{seed}"
    return (f'<clipPath id="{c}"><polygon points="{poly(pts)}"/></clipPath>'
            + g[0] + f'<g clip-path="url(#{c})">{gi.svg()}</g>')

for i, (cx, cy, r) in enumerate([(112, 472, 42), (196, 508, 30), (58, 512, 26),
                                 (466, 486, 34), (392, 512, 24), (300, 500, 18)]):
    add(lump(cx, cy, r, 900 + i))
add(pickaxe())

# coal dust: heaviest in the corners of the floor, absent in the lamp pool
dust = []
for _ in range(2600):
    x = rng.uniform(0, 512); y = rng.uniform(272, 512)
    z = 1.0 / max(0.02, (y - VY) / (YB - VY))
    if z < 1.0 or z > ZVOID:
        continue
    xm = VX + (x - VX) * z
    if rng.random() > clamp(tone_floor(z, xm) * 1.25):
        continue
    dust.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{rng.uniform(0.35, 1.5) / (0.5 + z*0.35):.2f}"/>')
add(f'<g fill="#000">{"".join(dust)}</g>')

add('<rect x="1.5" y="1.5" width="509" height="509" fill="none" stroke="#000" stroke-width="3"/>')
add('</svg>')

open("31-coal-mine.svg", "w").write("\n".join(out))
print("paths:", ink.count(), "bytes:", sum(len(o) for o in out))
