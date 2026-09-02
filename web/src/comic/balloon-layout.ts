/**
 * The multi-balloon layout driver — ADR 0008 Phase 2b.
 *
 * A port of `CUnitPanel::LayoutBalloons` (`panel.cpp:855`) and everything under
 * it: `GetCloudEstimate:885`, `LayoutBalloon:925`, `GetInterveningBBox:167`,
 * `LowestPreviousBottom:213`, `AdjustRouteRgns:247`, `ForceFitBalloon:153`, and
 * the route-region arithmetic of `CBalloon::QueryRouteRgn`/`SetRouteRgn`
 * (`balloon.cpp:1358,1375`). It replaces the vertical stack `render.ts` used to
 * run, which was correct only under the "one or two balloons per panel"
 * assumption that a multi-party comic retires (ADR 0008 §Coverage audit).
 *
 * **What the driver is for.** Balloons in a Comic Chat panel are not stacked;
 * each one is placed over *its own speaker* and then pushed out of the way of
 * the balloons already down, so that every tail can still reach its head
 * without crossing another balloon. That "without crossing" is the route
 * region: a horizontal corridor each balloon reserves between itself and its
 * speaker. A later balloon may not be placed inside a corridor an earlier one
 * owns, and once placed it carves its own span out of theirs. When a balloon
 * cannot be placed at all the *panel* is refused, which is exactly the signal
 * `CUnitPanelPage::AddLine` needs to start a new one — the `FitTest` seam
 * `page.ts` has been carrying since Phase 2.
 *
 * **Coordinates.** The original works in figure space with y pointing *up*: the
 * panel's top edge is 0 and its bottom is negative (`GetBalloonRect`,
 * `panel.cpp:840`). We work in CSS px with y pointing *down*, so every `min` on
 * a y in the source is a `max` here and vice versa, and "dock upward" subtracts
 * where the source adds. Each such flip is marked at its site. Lengths carry
 * the ~0.2 figure-space→px ratio already used throughout `balloon.ts` (a 400px
 * panel against `m_unitWidth` in the low thousands).
 *
 * **Named divergence — the roll.** `LayoutBalloons` seeds itself with
 * `srand(m_seed)` (`:867`) so a panel always lays out the same way, then rolls
 * `randfloat()` for the width goal and the horizontal straddle. We keep the
 * *structure* of both rolls but draw them from a small deterministic PRNG
 * seeded by the panel's own content ({@link panelSeed}), so the panel stream
 * stays a pure function of the event stream (ADR 0006's third invariant) and
 * `replayPanels` still reproduces a strip exactly. Matching the 1996 RNG stream
 * would buy nothing: the font metrics differ, so the pixels cannot match anyway
 * (ADR 0008 §Named divergence).
 */

import type { BalloonBox } from "./balloon.js";
import {
  AREA_FUDGE, LINE_HEIGHT, ONE_LINE_THRESHOLD,
  chromeFor, measureAtWidth, splitHeight, widestWord,
} from "./balloon.js";
import type { Balloon } from "./mapper.js";

/** A rectangle in panel space, y down: `top` is the smaller y. */
export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/**
 * The corridor a balloon reserves between itself and its speaker
 * (`CBalloon::m_routeRgn`). `bottom` is the balloon's lowest ink, which is what
 * `LayoutBalloon` tests for hook room (`:941`).
 */
export interface RouteRgn {
  left: number;
  right: number;
  bottom: number;
}

/** Measurement, injected so the driver itself never touches a canvas. */
export interface BalloonMetrics {
  /** The whole text on one line — `AreaEstimate`'s `*piLen` (`balloon.cpp:712`). */
  oneLineWidth(text: string): number;
  /** `CLabel::WidestWord` (`balloon.cpp:719`) — the floor a wrap may not go below. */
  widestWord(text: string): number;
  /** Reflow `text` into a box of exactly `boxWidth` — `CBalloon::SetBBox`. */
  measure(text: string, boxWidth: number): { lines: string[]; width: number; height: number };
  /** `CLabel::SplitHeight` — what fits in `boxHeight`, and the remainder. */
  split(text: string, boxWidth: number, boxHeight: number): { text: string; rest: string | null };
  /** Chrome each side, so the driver can tell when a span is too narrow to build. */
  chrome: number;
}

/** One balloon offered to the driver, in the panel's element order. */
export interface BalloonInput {
  /** Speaker id, so the caller can match a laid-out box back to its line. */
  speaker: string;
  /** A caption (`PE_BOX`): pinned left, and it reserves no corridor. */
  isBox: boolean;
  /**
   * The x a tail must reach — `m_speaker->m_arrowX`. `null` for a speaker with
   * no body on stage, which the original cannot express (a balloon always has a
   * `m_speaker`); such a balloon is placed like a caption and, like a caption,
   * blocks nobody's route.
   */
  arrowX: number | null;
  text: string;
  metrics: BalloonMetrics;
}

/**
 * The production {@link BalloonMetrics}: a real canvas, measuring in the class's
 * own chrome. `ctx.font` must already be set to `balloonFont(scale)` — the same
 * `scale` passed here — the caller sets it once for the whole panel, as the
 * original selects the font once per DC.
 */
export function canvasMetrics(
  ctx: CanvasRenderingContext2D, balloon: Balloon, scale = 1,
): BalloonMetrics {
  const as = (text: string): Balloon => (text === balloon.text ? balloon : { ...balloon, text });
  return {
    chrome: chromeFor(balloon, scale),
    oneLineWidth: (text) => ctx.measureText(text).width,
    widestWord: (text) => widestWord(ctx, text),
    measure: (text, boxWidth) => measureAtWidth(ctx, as(text), boxWidth, scale),
    split: (text, boxWidth, boxHeight) => splitHeight(ctx, as(text), boxWidth, boxHeight, scale),
  };
}

/** A placed balloon: where it goes, how its text broke, what corridor it owns. */
export interface LaidBalloon {
  input: BalloonInput;
  box: BalloonBox;
  lines: readonly string[];
  routeRgn: RouteRgn;
}

export type LayoutResult =
  | { fits: true; balloons: LaidBalloon[]; leftover: string | null }
  | { fits: false };

/** `MINHOOKHEIGHT` (`panel.cpp:41`) — the drop a tail needs below the balloon. */
const MIN_HOOK_HEIGHT = 20;
/** `MINROUTEWIDTH` (`balloon.cpp:53`) — the width a corridor may not shrink past. */
const MIN_ROUTE_WIDTH = 60;
/**
 * `Dock`'s shift (`balloon.cpp:568`): `TOPBORDER + YBORDER + HWAVEHEIGHT`, i.e.
 * −20 + 40 + 70, lifted off a cloud box before its bottom is used as the next
 * balloon's ceiling.
 *
 * It is **zero here**, and that is the port, not an omission. What the source
 * subtracts is the overhang its `GetCloudBBox` includes and ours does not: that
 * box is the spline's extent — border, wave crests and the tail hook — so
 * without the lift a second balloon would be pushed below the *tail* of the
 * first. Our `box` is already the text box alone (the tail is drawn from it,
 * not measured into it), so the correction is built in, and applying it again
 * would pull each balloon back over the text of the one above.
 */
const DOCK_DELTA = 0;
/**
 * `DockAtTop` (`balloon.cpp:1234`) sets the top to `height + TOPBORDER`, and
 * `TOPBORDER` is −20 — twenty units *below* the edge in a y-up world, so four
 * px below it here.
 */
const TOP_BORDER = 4;
/**
 * `if (m_bbox.Top > -250) DockAtTop(...)` (`panel.cpp:938`) — snap a balloon
 * that came out near the top edge flush to it, so the band starts clean.
 *
 * We apply it only to a balloon **nothing pushed down**, which is the condition
 * the source's constant expresses at *its* scale and not at ours. `-250` is
 * measured against `m_bbox.Top` after `SetBBox` has offset it by the cloud's own
 * overhang (`balloon.cpp:1417`), so it is a tolerance of roughly half a line of
 * the original's text — comfortably less than the drop any earlier balloon
 * imposes there. Our text is proportionally smaller against the panel (13px
 * lines in a 400px panel, against a font sized for `m_unitWidth` in the low
 * thousands), so the same length in px would exceed a whole balloon's height
 * and snap the second balloon back on top of the first. The *rule* — dock the
 * unobstructed balloon, leave a pushed one where the intervening boxes put it —
 * survives the scale change; the literal constant does not.
 */
/** The `+200` fudge `GetCloudEstimate` adds twice (`panel.cpp:909,910`). */
const WIDTH_FUDGE = 40;
/** `LARGEINTEGER` (`vector2d.h:27`), as an unbounded allowance. */
const LARGE = Infinity;

/**
 * A deterministic stand-in for `srand`/`randfloat` — mulberry32, chosen because
 * it is four lines and has no state to carry between panels. Every roll the
 * port makes comes from here, so a panel with the same content always lays out
 * the same way, which is what `srand(m_seed)` bought the original.
 */
export function makeRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The panel's `m_seed`, derived from its own content (FNV-1a over each
 * speaker and line) rather than handed down from a chat server. Two panels that
 * say the same thing lay out the same way, and a replayed panel lays out as it
 * did the first time.
 */
export function panelSeed(inputs: readonly BalloonInput[]): number {
  let hash = 0x811c9dc5;
  for (const input of inputs) {
    for (const ch of `${input.speaker} ${input.text}`) {
      hash ^= ch.codePointAt(0) ?? 0;
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
  }
  return hash >>> 0;
}

/**
 * Port of `CUnitPanel::LayoutBalloons` (`panel.cpp:855`): place every balloon in
 * element order, and give up on the whole panel the moment one will not go.
 *
 * The single exception is the original's, verbatim (`:876`): a panel holding
 * exactly one balloon that will not fit is *force-fitted* into the free rect and
 * split, because refusing it would refuse a panel that a fresh, empty panel
 * could not hold either — the recursion `AddLine` would spin on.
 */
export function layoutBalloons(
  inputs: readonly BalloonInput[], freeRect: Rect, seed = panelSeed(inputs), scale = 1,
): LayoutResult {
  const random = makeRandom(seed); // `srand(m_seed)` — always lay out the same way (`:867`)
  const laid: LaidBalloon[] = [];

  for (let i = 0; i < inputs.length; i++) {
    const balloon = layoutBalloon(inputs[i]!, laid, freeRect, random, scale);
    if (!balloon) {
      if (i === 0 && inputs.length === 1) return forceFitBalloon(inputs[0]!, freeRect, scale);
      return { fits: false };
    }
    laid.push(balloon);
  }
  return { fits: true, balloons: laid, leftover: null };
}

/**
 * **Considered and dropped (2026-09-02): a `toonstrip` v0.7.10 divergence,
 * `speakerCorridors`, pre-allocating each speaker's horizontal budget before
 * the first balloon is even estimated.** It fixed a real bug there — a wide,
 * unbounded first-balloon estimate leaving a second speaker's balloon
 * nowhere but *below* it, refusing panels the driver had genuine room for.
 * Ported here, it regressed this repo's own `density.test.ts` baseline
 * across every walkthrough (`12-full-game.cmd`: 667→691 panels,
 * `panelsBothSpeakers` 297→273) with **no** compensating benefit —
 * `test/gate.test.ts`'s "nothing falls back to the balloon stack" was
 * already an empty set before this divergence and stayed empty without it.
 * Root cause: `fit.ts`'s panelization pre-check (`createFitTest`) calls this
 * *exact* `layoutBalloons`, undifferentiated from the renderer's own call —
 * a narrower first-balloon estimate at fit-test time makes `AddLine` refuse
 * to clone-append a line into its current panel more often, which is a
 * *packing-density* regression, not a fallback-avoidance win. `toonstrip`
 * has no such shared pre-check (`layoutStrip`'s panels are formed by
 * different, simpler upstream logic), which is why its real-world
 * `stackBalloons` fallback problem — the reason this divergence exists —
 * does not occur here in the first place. See `HANDOFF.md`/`WORKLOG.md` and
 * `docs/TOONSTRIP_SYNC.md` for the full investigation.
 */

/** Port of `CUnitPanel::LayoutBalloon` (`panel.cpp:925`) — one balloon's placement. */
function layoutBalloon(
  input: BalloonInput, laid: readonly LaidBalloon[], freeRect: Rect,
  random: () => number, scale = 1,
): LaidBalloon | null {
  const brect = getCloudEstimate(input, laid, freeRect, random, scale); // best guess
  // squeezed between the corridors, and pushed below anything in the way
  const pushed = getInterveningBBox(input, laid, freeRect, brect, scale);

  const span = brect.right - brect.left;
  // `SetBBox` → `ComputeInternals` fails when the balloon cannot be built that
  // narrow (`balloon.cpp:1407`). Our wrap never refuses, so the test is explicit:
  // a span that cannot hold the widest single word is not a balloon.
  if (span - input.metrics.chrome * 2 < input.metrics.widestWord(input.text)) return null;

  const measured = input.metrics.measure(input.text, span);
  const box: BalloonBox = {
    x: brect.left, y: brect.top, width: measured.width, height: measured.height,
  };
  // `if (m_bbox.Top > -250) DockAtTop(freeRect.top)` (`:938`) — see DOCK note.
  if (!pushed) box.y = freeRect.top + TOP_BORDER * scale;

  // The roll placed the *span* so that it covers the arrow — "randomly place
  // brect in x, guaranteeing that it overlaps character" (`:908`). Our wrap is
  // word-granular, so the true box can come back narrower than the span it was
  // granted and the guarantee can slip; when it does, slide the shrunken box
  // back over the arrow (inside the free rect), rather than leave a tail
  // reaching out of the balloon it belongs to.
  if (input.arrowX !== null && !input.isBox
    && (input.arrowX < box.x || input.arrowX > box.x + box.width)) {
    box.x = Math.max(
      freeRect.left, Math.min(input.arrowX - box.width / 2, freeRect.right - box.width),
    );
  }

  const routeRgn: RouteRgn = {
    left: box.x, right: box.x + box.width, bottom: box.y + box.height,
  };
  // `if (m_routeRgn.Bottom < freeRect.bottom + MINHOOKHEIGHT) return FALSE` (`:941`):
  // a balloon hanging that low leaves its own tail no room. y-flip: our `>`.
  if (routeRgn.bottom > freeRect.bottom - MIN_HOOK_HEIGHT * scale) return null;

  adjustRouteRgns(input, laid, routeRgn); // `:943`
  return { input, box, lines: measured.lines, routeRgn };
}

/**
 * Port of `CUnitPanel::GetCloudEstimate` (`panel.cpp:885`): how wide this
 * balloon wants to be, and where along x it wants to sit. Only `left`/`right`
 * are decided here — "top and bottom of brect computed elsewhere" (`:921`).
 *
 * `canBeTall` is hardcoded `TRUE` in v2.5-beta-1 (`:892`, with `NoneToLeft`
 * commented out), so the "aim for two or three lines" branch below it is dead
 * code in the shipped build. We port the live branches only, and note the dead
 * one here rather than carrying an unreachable arm.
 */
function getCloudEstimate(
  input: BalloonInput, laid: readonly LaidBalloon[], freeRect: Rect,
  random: () => number, scale = 1,
): Rect {
  const len = input.metrics.oneLineWidth(input.text);
  // `AreaEstimate` (`balloon.cpp:715`): `1.3 · cx · (cy + lineHeight)`, and `cy`
  // of a one-line string is one line — so 1.3 · len · 2 · lineHeight.
  const area = AREA_FUDGE * len * 2 * (LINE_HEIGHT * scale);
  const maxWidth = freeRect.right - freeRect.left;

  let goalWidth: number;
  if (len <= ONE_LINE_THRESHOLD * scale) {
    goalWidth = len; // short enough to stay on one line (`:893`)
  } else {
    // The height this balloon could use if it grew down to the hook line — y-flip
    // of `LowestPreviousBottom(...) - freeRect.bottom + MINHOOKHEIGHT` (`:896`).
    const potentialHeight = freeRect.bottom - lowestPreviousBottom(laid, freeRect.top)
      + MIN_HOOK_HEIGHT * scale;
    const minWidth = Math.max(area / potentialHeight, input.metrics.widestWord(input.text));
    // Named divergence from `:899` (ADR 0008 §Named divergence, "the roll") —
    // the original draws this roll uniform, and we kept that for a full
    // release cycle. A uniform roll picks "barely past minWidth" as often as
    // "use the free rect," and a narrow *first* balloon in a panel wraps to
    // more lines, grows taller, and pushes the next speaker's balloon down
    // into their own head — reported against a live multi-balloon strip
    // (toonstrip's astro blog example) where it was reproducible enough to be
    // the common case, not an edge case. `1 - random()**2` keeps the same
    // structure and the same seeded determinism, only skewed toward
    // `maxWidth`, so a wide balloon is now the common roll and a narrow one
    // the rare exception. Comic Chat's own balloons were not immune to this —
    // matching that specific quirk buys nothing our port already doesn't
    // otherwise reproduce faithfully.
    goalWidth = minWidth + (1 - random() ** 2) * (maxWidth - minWidth);
  }

  const widthFudge = WIDTH_FUDGE * scale;
  goalWidth = Math.min(goalWidth + widthFudge, maxWidth); // `:909`
  goalWidth = Math.min(goalWidth, len + widthFudge); // never wider than the text (`:910`)

  let left: number;
  if (input.isBox || input.arrowX === null) {
    left = freeRect.left; // `if (balloon->GetType() & PE_BOX)` (`:911`)
  } else {
    // Straddle the speaker: the balloon's left is rolled inside
    // `[arrowX − goalWidth, arrowX]`, which guarantees the span covers `arrowX`
    // and so the tail drops straight (`:913-919`).
    const leftLimit = input.arrowX - goalWidth;
    let startX = leftLimit + random() * (input.arrowX - leftLimit);
    if (startX < freeRect.left) startX = freeRect.left;
    if (startX + goalWidth > freeRect.right) startX = freeRect.right - goalWidth;
    left = startX;
  }
  return { left, right: left + goalWidth, top: freeRect.top, bottom: freeRect.bottom };
}

/**
 * Port of `GetInterveningBBox` (`panel.cpp:167`): shrink or shift `brect` into
 * the gap left by the corridors already claimed, then drop its top below
 * whatever is already in the way. Mutates `brect`, as the original does.
 *
 * The original returns BOOL but only ever `TRUE` (`:209`) — the failure it
 * hints at is caught downstream, by the width test in {@link layoutBalloon}. We
 * return instead whether anything actually pushed the top down, which is what
 * decides the dock (see `DOCK_THRESHOLD`'s note).
 */
function getInterveningBBox(
  input: BalloonInput, laid: readonly LaidBalloon[], freeRect: Rect, brect: Rect, scale = 1,
): boolean {
  const toPtX = input.arrowX ?? freeRect.left;

  let mostLeft = freeRect.left;
  let mostRight = freeRect.right;
  for (const prev of laid) {
    const { leftAllowance, rightAllowance } = queryRouteRgn(prev, toPtX, scale);
    mostLeft = Math.max(leftAllowance, mostLeft);
    mostRight = Math.min(rightAllowance, mostRight);
  }

  if (mostLeft > brect.left || mostRight < brect.right) { // can't be placed as is (`:181`)
    const clearance = mostRight - mostLeft;
    if (clearance >= brect.right - brect.left) { // shift it (`:183`)
      const delta = mostLeft > brect.left ? mostLeft - brect.left : mostRight - brect.right;
      brect.left += delta;
      brect.right += delta;
    } else { // grab maximal clearance (`:189`)
      brect.left = mostLeft;
      brect.right = mostRight;
    }
  }

  // Then the top: below the bottom of anything overlapping in x, and below the
  // *top* of anything clear of it (`:198-207`). Every `min` there is a `max`
  // here — the source's "higher" is our smaller y.
  brect.top = freeRect.top;
  for (const prev of laid) {
    const cloud = prev.box;
    if (cloud.x + cloud.width < brect.left) { // clear to one side — tuck alongside
      brect.top = Math.max(brect.top, cloud.y);
    } else {
      // `Dock(cloudbox)` lifts the box by `DOCK_DELTA` before its bottom is
      // read, so overlapping balloons nest a little instead of stacking flush.
      brect.top = Math.max(brect.top, cloud.y + cloud.height - DOCK_DELTA);
    }
  }
  return brect.top > freeRect.top;
}

/**
 * Port of `LowestPreviousBottom` (`panel.cpp:213`). "Lowest" is the source's
 * `min` on a y-up axis, so it is our `max`: the balloon whose ink reaches
 * furthest down the panel.
 */
function lowestPreviousBottom(laid: readonly LaidBalloon[], lowY: number): number {
  let lowest = lowY;
  for (const prev of laid) lowest = Math.max(lowest, prev.box.y + prev.box.height);
  return lowest;
}

/**
 * Port of `CBalloon::QueryRouteRgn` (`balloon.cpp:1358`): how far a *new*
 * balloon aiming at `otherToX` may extend before it would block this one's tail.
 * A balloon only defends the side its own speaker is on, and never lets its
 * corridor be squeezed below `MINROUTEWIDTH`.
 *
 * A caption defends nothing (`CBWoodringBox::QueryRouteRgn`, `balloon.cpp:1911`
 * returns the whole line), and so — by extension, this being ours — does a
 * balloon whose speaker has no body on stage: neither one drops a tail.
 */
function queryRouteRgn(
  prev: LaidBalloon, otherToX: number, scale = 1,
): { leftAllowance: number; rightAllowance: number } {
  if (prev.input.isBox || prev.input.arrowX === null) {
    return { leftAllowance: -LARGE, rightAllowance: LARGE };
  }
  const toX = prev.input.arrowX;
  const minRouteWidth = MIN_ROUTE_WIDTH * scale;
  if (otherToX > toX) {
    return {
      leftAllowance: Math.max(toX, prev.routeRgn.left + minRouteWidth),
      rightAllowance: LARGE,
    };
  }
  return {
    leftAllowance: -LARGE,
    rightAllowance: Math.min(toX, prev.routeRgn.right - minRouteWidth),
  };
}

/**
 * Port of `AdjustRouteRgns` (`panel.cpp:247`) over `CBalloon::SetRouteRgn`
 * (`balloon.cpp:1375`): the balloon just placed carves its own span out of every
 * corridor claimed before it, so the balloons that follow are squeezed by the
 * accumulated result rather than by the original rects.
 */
function adjustRouteRgns(
  input: BalloonInput, laid: readonly LaidBalloon[], routeRgn: RouteRgn,
): void {
  const toX = input.arrowX;
  if (toX === null) return; // no tail, nothing to route around
  for (const prev of laid) {
    if (prev.input.arrowX === null) continue;
    if (toX > prev.input.arrowX) prev.routeRgn.right = Math.min(prev.routeRgn.right, routeRgn.left);
    else prev.routeRgn.left = Math.max(prev.routeRgn.left, routeRgn.right);
  }
}

/**
 * Port of `ForceFitBalloon` (`panel.cpp:153`): give the balloon the whole free
 * rect, split off whatever hangs past the bottom, and dock it at the top. Only
 * ever reached for a lone balloon in an otherwise empty panel — the case where
 * refusing would achieve nothing.
 */
function forceFitBalloon(input: BalloonInput, freeRect: Rect, scale = 1): LayoutResult {
  const width = freeRect.right - freeRect.left;
  const split = input.metrics.split(input.text, width, freeRect.bottom - freeRect.top);
  const measured = input.metrics.measure(split.text, width);
  const box: BalloonBox = {
    x: freeRect.left, y: freeRect.top + TOP_BORDER * scale,
    width: measured.width, height: measured.height,
  };
  return {
    fits: true,
    balloons: [{
      input: { ...input, text: split.text },
      box,
      lines: measured.lines,
      routeRgn: { left: box.x, right: box.x + box.width, bottom: box.y + box.height },
    }],
    leftover: split.rest,
  };
}
