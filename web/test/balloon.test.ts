/**
 * The thought balloon's *shape*, pinned.
 *
 * `cloud()` is not exported — it is reachable only by drawing a `CBWoodringThink`
 * balloon — so this drives `drawBalloon` through a recording 2D context and
 * inspects the path ops it emitted. The bug this guards against (v1.8.0 Last
 * Session): `cloud()` used to stamp a *full* circle at every scallop and add the
 * inner text rectangle, then let the caller stroke the lot, so the balloon read
 * as a chain of overlapping rings around a box. The fix is one continuous closed
 * loop of outward-only half-arcs. Written from the bug: reverting `cloud()` to
 * full circles + rect fails "no full-circle arc" and "no interior rect".
 */

import { describe, expect, it } from "vitest";
import {
  CONTINUATION, drawBalloon, goalWidth, measureAtWidth, splitHeight, type BalloonBox,
} from "../src/comic/balloon.js";
import type { Balloon } from "../src/comic/mapper.js";

interface ArcCall { start: number; end: number }
interface Pt { x: number; y: number }

/** A 2D context that records only the calls this test reasons about. */
function recorder() {
  const calls: string[] = [];
  const arcs: ArcCall[] = [];
  const lines: Pt[] = [];
  // Ordered path vertices (move/line/quad endpoints) — the outline's corners in
  // draw order, which is how the rippled speech balloon is now reasoned about.
  const verts: Pt[] = [];
  let beginPaths = 0;
  const ctx = {
    save() {}, restore() {}, fill() {}, stroke() {},
    moveTo(x: number, y: number) { verts.push({ x, y }); },
    lineTo(x: number, y: number) { lines.push({ x, y }); verts.push({ x, y }); },
    quadraticCurveTo(_cx: number, _cy: number, x: number, y: number) {
      calls.push("quad");
      verts.push({ x, y });
    },
    // The body outline is now a single cardinal spline (a chain of béziers); we
    // track only each segment's endpoint, the on-ring waypoint it lands on.
    bezierCurveTo(
      _c1x: number, _c1y: number, _c2x: number, _c2y: number, x: number, y: number,
    ) {
      calls.push("bezier");
      verts.push({ x, y });
    },
    arcTo() { calls.push("arcTo"); }, closePath() { calls.push("closePath"); },
    fillText() {},
    beginPath() { beginPaths++; calls.push("beginPath"); },
    rect() { calls.push("rect"); },
    arc(_x: number, _y: number, _r: number, start: number, end: number) {
      calls.push("arc");
      arcs.push({ start, end });
    },
    measureText(t: string) { return { width: t.length * 7 }; },
    // Style/state setters the drawer touches; all no-ops that must exist.
    set fillStyle(_v: string) {}, set strokeStyle(_v: string) {},
    set lineWidth(_v: number) {}, set lineJoin(_v: string) {},
    set textBaseline(_v: string) {}, set font(_v: string) {},
  } as unknown as CanvasRenderingContext2D;
  return { ctx, calls, arcs, lines, verts, beginPaths: () => beginPaths };
}

/** A bare context that only measures text, for the pure `goalWidth`. */
const measurer = {
  measureText(t: string) { return { width: t.length * 7 }; },
} as unknown as CanvasRenderingContext2D;

const box: BalloonBox = { x: 20, y: 20, width: 160, height: 90 };
const think: Balloon = { balloonClass: "CBWoodringThink", text: "I should look inside." };

const TWO_PI = Math.PI * 2;

describe("cloud() — the thought balloon outline", () => {
  it("draws no interior rectangle", () => {
    const r = recorder();
    drawBalloon(r.ctx, think, box, ["I should look inside."], null);
    expect(r.calls).not.toContain("rect");
  });

  it("uses only outward half-arcs, never a full circle", () => {
    const r = recorder();
    drawBalloon(r.ctx, think, box, ["I should look inside."], null);
    expect(r.arcs.length).toBeGreaterThan(0);
    for (const a of r.arcs) {
      expect(Math.abs(a.end - a.start)).toBeLessThan(TWO_PI - 1e-6);
    }
  });

  it("is one continuous closed path", () => {
    const r = recorder();
    drawBalloon(r.ctx, think, box, ["I should look inside."], null);
    // A single beginPath…closePath for the shape (no per-bump sub-paths).
    expect(r.beginPaths()).toBe(1);
    expect(r.calls).toContain("closePath");
  });

  it("caption boxes still draw a rect, not scallops", () => {
    const r = recorder();
    const caption: Balloon = { balloonClass: "CBWoodringBox", text: "West of House." };
    drawBalloon(r.ctx, caption, box, ["West of House."], null);
    expect(r.calls).toContain("rect");
    expect(r.arcs.length).toBe(0);
  });
});

/**
 * The speech balloon: a single hand-drawn Woodring loop (`CreateBalloonSpline`,
 * balloon.cpp) — corners and outward edge-bumps splined together — with a bowed
 * tail that *always* roots on the bottom edge (`AddArrow`, balloon.cpp), never a
 * side. The body is one cardinal spline (a chain of béziers whose endpoints are
 * the on-ring waypoints); the tail is two sharp quads dropping to a single tip.
 * Legibility is the layout's job (`render.ts` docks the balloon just above its
 * speaker and caps the tail), so the drawer only ever drops a tail from the
 * bottom, its root sliding under the head. The edges bump *outward* (a bottom
 * bump nudges down by at most `WAVE_AMP`), but only the tail tip hangs far below.
 * Written from the old bug: an interim build grew a *side* tail for a
 * beside-the-head speaker — that would surface here as a vertex jutting far past
 * the left/right edge, or a root off the bottom.
 */
describe("roundedSpeech() — spline outline, bowed tail on the bottom edge", () => {
  const speech = (text: string): Balloon => ({ balloonClass: "CBWoodringNormal", text });
  const right = box.x + box.width, bottom = box.y + box.height;
  // Outward bumps nudge an edge out by up to WAVE_AMP; keep the tolerances above
  // it so a bump is never mistaken for a tail. (WAVE_AMP is 6 in balloon.ts.)
  const BUMP = 8;
  // The tail tip is the lowest-hanging vertex; its path neighbours are the roots.
  const tailOf = (verts: Pt[]) => {
    let tipIdx = 0;
    for (let i = 1; i < verts.length; i++) if (verts[i]!.y > verts[tipIdx]!.y) tipIdx = i;
    return { tipIdx, tip: verts[tipIdx]!, before: verts[tipIdx - 1]!, after: verts[tipIdx + 1]! };
  };

  it("drops one deep tip below the bottom, flanked by two roots on the bottom edge", () => {
    const r = recorder();
    drawBalloon(r.ctx, speech("The leaflet, then."), box, ["The leaflet, then."],
      { x: box.x + box.width / 2, y: bottom + 120 });
    // Only the tail tip hangs far below the bottom edge; bumps stay within WAVE_AMP.
    expect(r.verts.filter((p) => p.y > bottom + BUMP)).toHaveLength(1);
    const t = tailOf(r.verts);
    expect(t.tip.y).toBeGreaterThan(bottom + BUMP);
    expect(Math.abs(t.before.y - bottom)).toBeLessThan(1e-6); // roots sit on the bottom
    expect(Math.abs(t.after.y - bottom)).toBeLessThan(1e-6);
  });

  it("never grows a side tail — no body vertex juts far past the left/right edges", () => {
    const r = recorder();
    drawBalloon(r.ctx, speech("The leaflet, then."), box, ["The leaflet, then."],
      { x: right + 120, y: bottom + 40 });
    const t = tailOf(r.verts);
    r.verts.forEach((p, i) => {
      if (i === t.tipIdx) return; // the tip alone may point toward a side speaker
      expect(p.x).toBeGreaterThanOrEqual(box.x - BUMP);
      expect(p.x).toBeLessThanOrEqual(right + BUMP);
    });
    // The roots stay under the head, clamped inside the box.
    const rootX = (t.before.x + t.after.x) / 2;
    expect(rootX).toBeGreaterThan(box.x);
    expect(rootX).toBeLessThanOrEqual(right);
  });

  it("holds the tail within 45° of vertical even for a side speaker", () => {
    const r = recorder();
    // Head far to the right, only a little below: an unclamped tail would slant
    // well past 45°. The tip's horizontal run must not exceed its vertical drop.
    drawBalloon(r.ctx, speech("Hello."), box, ["Hello."], { x: right + 200, y: bottom + 30 });
    const t = tailOf(r.verts);
    const rootX = (t.before.x + t.after.x) / 2;
    expect(Math.abs(t.tip.x - rootX)).toBeLessThanOrEqual(t.tip.y - bottom + 1e-6);
  });

  it("centres the tail under a speaker directly below", () => {
    const r = recorder();
    drawBalloon(r.ctx, speech("Hello."), box, ["Hello."], { x: box.x + box.width / 2, y: bottom + 80 });
    expect(tailOf(r.verts).tip.x).toBeCloseTo(box.x + box.width / 2, 5);
  });

  it("draws the body as one spline, not straight lines", () => {
    const r = recorder();
    drawBalloon(r.ctx, speech("Hello there, traveller."), box, ["Hello there, traveller."], null);
    expect(r.calls.filter((c) => c === "bezier").length).toBeGreaterThan(2);
    expect(r.lines).toHaveLength(0); // no straight lineTo edges
  });
});

/**
 * The area-based width goal — the port of `GetCloudEstimate`/`AreaEstimate`
 * (panel.cpp) that replaced the old line-balancing hack. A balloon should wrap
 * to a compact shape, not a wide flat strip, and never below its widest word.
 */
describe("goalWidth() — GetCloudEstimate", () => {
  it("keeps short text on one line", () => {
    // 6 chars × 7 = 42px, under the one-line threshold: no wrapping goal imposed.
    expect(goalWidth(measurer, "Taken.", 1000)).toBe(42);
  });

  it("sizes long text down from the free width toward a compact aspect", () => {
    const text = "one two three four five six seven eight nine ten eleven twelve";
    const goal = goalWidth(measurer, text, 1000);
    expect(goal).toBeLessThan(text.length * 7); // narrower than one line
    expect(goal).toBeGreaterThan(100); // but past the one-line threshold
  });

  it("never wraps below the widest single word", () => {
    const text = "a supercalifragilisticexpialidocious b c d e f g h i j k l";
    const widest = "supercalifragilisticexpialidocious".length * 7;
    expect(goalWidth(measurer, text, 1000)).toBeGreaterThanOrEqual(widest);
  });

  it("is capped at the free width it is given", () => {
    const text = "one two three four five six seven eight nine ten eleven twelve";
    expect(goalWidth(measurer, text, 50)).toBe(50);
  });
});

/**
 * `measureAtWidth` / `splitHeight` — the two entry points the ported layout
 * driver needs (ADR 0008 Phase 2b). The first reflows at a width the *caller*
 * chose (`CBalloon::SetBBox`), the second is `CLabel::SplitHeight`: what fits in
 * the box, and the remainder `AddLine` re-adds as a fresh line.
 */
describe("measureAtWidth() — SetBBox", () => {
  const say: Balloon = {
    balloonClass: "CBWoodringNormal",
    text: "one two three four five six seven eight",
  };

  it("wraps into exactly the box width it is handed, chrome included", () => {
    const measured = measureAtWidth(measurer, say, 100);
    expect(measured.width).toBeLessThanOrEqual(100);
    for (const line of measured.lines) expect(line.length * 7).toBeLessThanOrEqual(80);
    expect(measured.lines.length).toBeGreaterThan(1);
  });

  it("gives a wide box a single line", () => {
    expect(measureAtWidth(measurer, say, 1000).lines).toHaveLength(1);
  });
});

describe("splitHeight() — CLabel::SplitHeight", () => {
  const long: Balloon = {
    balloonClass: "CBWoodringNormal",
    text: "one two three four five six seven eight nine ten eleven twelve thirteen",
  };

  it("returns the whole text and no rest when it comfortably fits", () => {
    expect(splitHeight(measurer, long, 400, 200)).toEqual({ text: long.text, rest: null });
  });

  it("splits at the line budget, marking both halves with the continuation", () => {
    const split = splitHeight(measurer, long, 120, 60);
    expect(split.rest).not.toBeNull();
    expect(split.text.endsWith(CONTINUATION)).toBe(true);
    expect(split.rest!.startsWith(CONTINUATION)).toBe(true);
    // Nothing is lost and nothing is repeated: the two halves are the original.
    const words = (s: string) => s.replaceAll(CONTINUATION, " ").split(/\s+/).filter(Boolean);
    expect([...words(split.text), ...words(split.rest!)]).toEqual(words(long.text));
  });

  it("always keeps at least one word, so the leftover cannot be the input", () => {
    const split = splitHeight(measurer, long, 40, 15);
    expect(split.rest).not.toBeNull();
    expect(split.rest).not.toBe(long.text);
    expect(split.text.replace(CONTINUATION, "").trim()).not.toBe("");
  });
});
