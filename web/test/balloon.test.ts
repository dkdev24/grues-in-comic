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
import { drawBalloon, type BalloonBox } from "../src/comic/balloon.js";
import type { Balloon } from "../src/comic/mapper.js";

interface ArcCall { start: number; end: number }

/** A 2D context that records only the calls this test reasons about. */
function recorder() {
  const calls: string[] = [];
  const arcs: ArcCall[] = [];
  const lines: { x: number; y: number }[] = [];
  let beginPaths = 0;
  const ctx = {
    save() {}, restore() {}, fill() {}, stroke() {},
    moveTo() {}, lineTo(x: number, y: number) { lines.push({ x, y }); },
    arcTo() {}, closePath() { calls.push("closePath"); },
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
  return { ctx, calls, arcs, lines, beginPaths: () => beginPaths };
}

const box: BalloonBox = { x: 20, y: 20, width: 160, height: 90 };
const think: Balloon = { channel: "hero", balloonClass: "CBWoodringThink", text: "I should look inside." };

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
    const caption: Balloon = { channel: "caption", balloonClass: "CBWoodringBox", text: "West of House." };
    drawBalloon(r.ctx, caption, box, ["West of House."], null);
    expect(r.calls).toContain("rect");
    expect(r.arcs.length).toBe(0);
  });
});

/**
 * The speech balloon's tail *always* roots on the bottom edge — Comic Chat's one
 * speech shape (`AddArrow`, balloon.cpp), never a side tail. Legibility is the
 * layout's job (`render.ts` places the balloon above and over its speaker with
 * reserved headroom), so the drawer only ever drops a tail from the bottom, its
 * root sliding under the head. Written from the bug: an interim build grew a *side*
 * tail for a beside-the-head speaker; reverting to that fails these — its roots
 * would carry an x on the box's left/right edge instead of a y on the bottom.
 */
describe("roundedSpeech() — the tail always roots on the bottom edge", () => {
  const speech = (text: string): Balloon => ({ channel: "hero", balloonClass: "CBWoodringNormal", text });
  const right = box.x + box.width, bottom = box.y + box.height;
  const rootsOnBottom = (lines: { x: number; y: number }[]) =>
    lines.filter((p) => Math.abs(p.y - bottom) < 1e-6);
  const rootsOnSide = (lines: { x: number; y: number }[]) =>
    lines.filter((p) => Math.abs(p.x - right) < 1e-6 || Math.abs(p.x - box.x) < 1e-6);

  it("roots on the bottom edge for a speaker below the box", () => {
    const r = recorder();
    drawBalloon(r.ctx, speech("The leaflet, then."), box, ["The leaflet, then."],
      { x: box.x + box.width / 2, y: bottom + 120 });
    expect(rootsOnBottom(r.lines).length).toBe(2);
    expect(r.lines.some((p) => p.y > bottom)).toBe(true); // tip hangs below
    expect(rootsOnSide(r.lines).length).toBe(0);
  });

  it("still roots on the bottom — never a side tail — for an off-centre speaker", () => {
    const r = recorder();
    drawBalloon(r.ctx, speech("The leaflet, then."), box, ["The leaflet, then."],
      { x: right + 120, y: bottom + 40 });
    expect(rootsOnBottom(r.lines).length).toBe(2);
    expect(rootsOnSide(r.lines).length).toBe(0);
    // The root stays under the head as far as the box allows (clamped to the edge).
    const rootX = (rootsOnBottom(r.lines)[0]!.x + rootsOnBottom(r.lines)[1]!.x) / 2;
    expect(rootX).toBeGreaterThan(box.x);
    expect(rootX).toBeLessThanOrEqual(right);
  });
});
