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
  let beginPaths = 0;
  const ctx = {
    save() {}, restore() {}, fill() {}, stroke() {},
    moveTo() {}, lineTo() {}, arcTo() {}, closePath() { calls.push("closePath"); },
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
  return { ctx, calls, arcs, beginPaths: () => beginPaths };
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
