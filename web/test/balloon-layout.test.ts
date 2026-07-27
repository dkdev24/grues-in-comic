/**
 * The multi-balloon layout driver (ADR 0008 Phase 2b), one test per ported
 * branch of `CUnitPanel::LayoutBalloons` and its helpers.
 *
 * Measurement is synthetic — a 7px monospace with the real `LINE_HEIGHT` — so
 * these pin the *arithmetic* the port carries, not a font. The renderer's own
 * metrics (`canvasMetrics`) are exercised through `balloon.test.ts`.
 */

import { describe, expect, it } from "vitest";
import {
  layoutBalloons, makeRandom, panelSeed,
  type BalloonInput, type BalloonMetrics, type LaidBalloon, type Rect,
} from "../src/comic/balloon-layout.js";

const CHAR = 7;
const LINE_HEIGHT = 15;
const CHROME = 10;

function wrap(text: string, inner: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const candidate = line === "" ? word : `${line} ${word}`;
    if (line !== "" && candidate.length * CHAR > inner) {
      lines.push(line);
      line = word;
    } else line = candidate;
  }
  if (line !== "") lines.push(line);
  return lines;
}

const metrics: BalloonMetrics = {
  chrome: CHROME,
  oneLineWidth: (text) => text.length * CHAR,
  widestWord: (text) =>
    Math.max(0, ...text.split(/\s+/).filter(Boolean).map((w) => w.length * CHAR)),
  measure(text, boxWidth) {
    const lines = wrap(text, Math.max(1, boxWidth - CHROME * 2));
    const width = Math.min(
      boxWidth, Math.max(...lines.map((l) => l.length * CHAR)) + CHROME * 2,
    );
    return { lines, width, height: lines.length * LINE_HEIGHT + CHROME * 2 };
  },
  split(text, boxWidth, boxHeight) {
    const lines = wrap(text, Math.max(1, boxWidth - CHROME * 2));
    const maxLines = Math.max(1, Math.floor(boxHeight / LINE_HEIGHT));
    if (lines.length < maxLines) return { text, rest: null };
    const words = text.split(/\s+/).filter(Boolean);
    const kept = Math.max(1, Math.min(
      lines.slice(0, maxLines).reduce((n, l) => n + l.split(" ").length, 0) - 1, words.length,
    ));
    if (kept >= words.length) return { text, rest: null };
    return { text: `${words.slice(0, kept).join(" ")}...`, rest: `...${words.slice(kept).join(" ")}` };
  },
};

const free = (): Rect => ({ left: 10, top: 10, right: 390, bottom: 122 });

function line(speaker: string, text: string, arrowX: number | null, isBox = false): BalloonInput {
  return { speaker, text, arrowX, isBox, metrics };
}

/** Assert the panel laid out, and narrow the union for the assertions below. */
function fitted(result: ReturnType<typeof layoutBalloons>) {
  if (!result.fits) throw new Error("expected the panel to lay out");
  return result;
}

const right = (b: LaidBalloon) => b.box.x + b.box.width;
const bottom = (b: LaidBalloon) => b.box.y + b.box.height;

describe("layoutBalloons — placement", () => {
  it("straddles its speaker: the balloon's span covers the arrow (`panel.cpp:913-919`)", () => {
    const laid = layoutBalloons([line("hero", "Open the mailbox.", 300)], free());
    expect(laid.fits).toBe(true);
    const balloon = fitted(laid).balloons[0]!;
    expect(balloon.box.x).toBeLessThanOrEqual(300);
    expect(right(balloon)).toBeGreaterThanOrEqual(300);
  });

  it("pins a caption to the free rect's left edge (`PE_BOX`, `panel.cpp:911`)", () => {
    const laid = layoutBalloons([line("__caption__", "West of House.", null, true)], free());
    expect(fitted(laid).balloons[0]!.box.x).toBe(10);
  });

  it("docks a balloon that lands near the top edge flush to it (`panel.cpp:938`)", () => {
    const laid = layoutBalloons([line("hero", "Hello.", 200)], free());
    expect(fitted(laid).balloons[0]!.box.y).toBe(14); // freeRect.top + TOP_BORDER
  });

  it("keeps a wrapped balloon inside the free rect and no wider than its text", () => {
    const text = "It is pitch black. You are likely to be eaten by a grue, and soon.";
    const laid = layoutBalloons([line("guide", text, 200)], free());
    const balloon = fitted(laid).balloons[0]!;
    expect(balloon.box.x).toBeGreaterThanOrEqual(10);
    expect(right(balloon)).toBeLessThanOrEqual(390);
    expect(balloon.box.width).toBeLessThanOrEqual(text.length * CHAR + 40); // len + WIDTH_FUDGE
    expect(balloon.lines.length).toBeGreaterThan(1);
  });
});

describe("layoutBalloons — determinism (the seeded roll)", () => {
  it("lays the same panel out the same way every time (`srand(m_seed)`, `panel.cpp:867`)", () => {
    const inputs = () => [
      line("guide", "You are standing in an open field west of a white house.", 120),
      line("hero", "I try the door anyway.", 300),
    ];
    const a = layoutBalloons(inputs(), free());
    const b = layoutBalloons(inputs(), free());
    expect(fitted(a).balloons.map((x) => x.box)).toEqual(fitted(b).balloons.map((x) => x.box));
  });

  it("derives the seed from the panel's content, so two panels differ", () => {
    expect(panelSeed([line("hero", "north", 0)])).not.toBe(panelSeed([line("hero", "south", 0)]));
    expect(panelSeed([line("hero", "north", 0)])).toBe(panelSeed([line("hero", "north", 99)]));
  });

  it("rolls in [0, 1)", () => {
    const random = makeRandom(1234);
    for (let i = 0; i < 200; i++) {
      const value = random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe("layoutBalloons — route regions", () => {
  const both = () => [
    line("guide", "The troll swings his axe at you.", 90),
    line("hero", "I dodge and swing back at him twice.", 320),
  ];

  it("tucks a later balloon alongside one that is clear of it (`panel.cpp:201`)", () => {
    const laid = layoutBalloons(
      [line("guide", "Yes?", 60), line("hero", "No.", 340)], free(),
    );
    const [first, second] = fitted(laid).balloons;
    // Two short balloons at opposite ends share the top band side by side.
    expect(right(first!)).toBeLessThanOrEqual(second!.box.x);
    expect(second!.box.y).toBe(first!.box.y);
  });

  it("keeps a later balloon out of the corridor an earlier tail needs (`QueryRouteRgn`)", () => {
    const laid = layoutBalloons(both(), free());
    // The second speaker is to the right, so nothing it places may reach left
    // past the first speaker's arrow (`leftAllowance = max(toX, …)`, `:1364`).
    expect(fitted(laid).balloons[1]!.box.x).toBeGreaterThanOrEqual(90);
  });

  it("drops a later balloon below one it would overlap (`panel.cpp:204`)", () => {
    const laid = layoutBalloons([
      line("guide", "Take that, troll!", 180),
      line("hero", "Ouch.", 210),
    ], free());
    expect(laid.fits).toBe(true);
    const [first, second] = fitted(laid).balloons;
    expect(second!.box.y).toBeGreaterThan(first!.box.y);
  });

  it("carves the new balloon's span out of the corridors already claimed (`AdjustRouteRgns`)", () => {
    const laid = layoutBalloons(both(), free());
    const [first, second] = fitted(laid).balloons;
    // The second speaker is to the right of the first, so the first's corridor
    // may not reach past the second balloon's left edge (`balloon.cpp:1381`).
    expect(first!.routeRgn.right).toBeLessThanOrEqual(second!.box.x);
  });

  it("leaves every balloon room for its own tail (`MINHOOKHEIGHT`, `panel.cpp:941`)", () => {
    const laid = layoutBalloons(both(), free());
    for (const balloon of fitted(laid).balloons) expect(bottom(balloon)).toBeLessThanOrEqual(122 - 20);
  });
});

describe("layoutBalloons — refusal and overflow", () => {
  const long = "A hollow voice intones that this space is far too small to hold "
    + "everything the narrator has decided to say about the cave and its many exits.";

  it("force-fits and splits a lone balloon that will not fit (`panel.cpp:876`)", () => {
    const laid = layoutBalloons([line("guide", long, 200)], { ...free(), bottom: 60 });
    expect(laid.fits).toBe(true);
    expect(fitted(laid).leftover).toMatch(/^\.\.\./);
    expect(fitted(laid).balloons[0]!.input.text).toMatch(/\.\.\.$/);
    expect(fitted(laid).balloons[0]!.box.x).toBe(10); // the whole free rect
  });

  it("refuses the panel when a *second* balloon will not fit (`panel.cpp:879`)", () => {
    const laid = layoutBalloons(
      [line("guide", long, 90), line("hero", long, 320)], { ...free(), bottom: 90 },
    );
    expect(laid.fits).toBe(false);
  });

  it("refuses a balloon squeezed narrower than its widest word (`ComputeInternals`)", () => {
    const wide = "supercalifragilisticexpialidocious";
    const laid = layoutBalloons(
      [line("guide", "Short.", 30), line("hero", wide, 40)],
      { left: 10, top: 10, right: 120, bottom: 122 },
    );
    expect(laid.fits).toBe(false);
  });
});
