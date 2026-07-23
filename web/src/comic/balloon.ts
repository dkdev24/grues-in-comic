/**
 * Balloons — the three Woodring classes of ADR 0004 §2, drawn.
 *
 * Comic Chat's Layout Manager laid balloons out against a **known, fixed**
 * window width. ADR 0007 §2 restores that: the panel is native-sized, so the
 * width these routines receive is (near-)constant again — the ADR 0004 §4a
 * caveat that "the port stops being a transcription" here is withdrawn. Every
 * function still *takes* a width and measures at it (nothing caches a break),
 * it simply receives a stable one now.
 *
 * The caption and Guide classes are fixed per channel; the Hero's is now chosen
 * per line (ADR 0006 §3), so class is a property of the balloon, not the drawer:
 *
 * - `CBWoodringNormal` — a speech balloon. The Guide/DM, and now the Hero when he
 *   speaks across the table to the DM (ADR 0006 §3, Slice 1).
 * - `CBWoodringThink` — a thought balloon. Retained for the Hero's interior asides
 *   the DM doesn't hear; the second of his two registers.
 * - `CBWoodringBox` — the caption. A verbatim pull-quote from the narration.
 */

import type { Balloon } from "./mapper.js";

export interface BalloonBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Where the tail should point: the figure's face anchor, in panel space. */
export interface TailTarget {
  x: number;
  y: number;
}

const PADDING = 10;
/**
 * A thought balloon's scallops bulge *outward from* its text box, so the text
 * has to be inset by a bump radius or the first and last words sit under the
 * cloud's own outline. A speech balloon and a caption need no such allowance.
 */
const THINK_INSET = 9;
const LINE_HEIGHT = 15;
/**
 * The tail reaches its speaker. Comic Chat's balloons sit directly over their
 * speaker, so its tails are short; ours stack from the top of the panel while
 * the figures stand at the bottom, so a tail capped short of that distance ends
 * in mid-air, connected to nobody — the single-column panel, tall enough to put
 * the head far below the balloon, made this plainly wrong. A balloon's tail is
 * how a comic names its speaker, so it must land on the head however far that
 * is: `target` is already the head anchor (`render.ts`), and the tail runs to it
 * directly — never *past* it, which on a close-up (head right below the balloon)
 * would punch the tip through the face. `TAIL_MIN_EXIT` only guarantees the tail
 * clears the box before angling toward a speaker that sits close.
 *
 * This is a named divergence from the original's `MINTAILHEIGHT = 100`
 * (`balloon.cpp:235`, enforced at `:273`), which forces the *tail itself* to a
 * minimum length by pushing the balloon up off the speaker. Our balloon docks
 * at the panel top and the speaker stands at the bottom (`render.ts`), so the
 * drop is already tall; we need only the 2px exit, not the original's 100.
 */
const TAIL_MIN_EXIT = 2;

/**
 * The balloon outline ripples instead of running dead straight — `AddWavies`
 * (`balloon.cpp:560`) walks each edge and pushes alternate waypoints *outward*
 * along the edge normal (bump / on-edge / bump / on-edge — never inward), and
 * `CreateBalloonSpline` (`balloon.cpp:1652`) feeds the whole resulting ring,
 * corners included, through one `CBeta` spline. That single-spline-through-
 * everything is what makes the Woodring outline read hand-drawn: the corners are
 * not circular arcs and the edges are not straight baselines, they are one
 * continuous soft curve. We reproduce it with a closed cardinal spline
 * ({@link strokeCardinal}) over an outward-bumped ring ({@link pushWaves}),
 * replacing the earlier rounded-rect (hard `arcTo` corners + in/out quadratic
 * ripples) that still read as vector art.
 *
 * `WAVE_INTERVAL` is the spacing between bumps, `WAVE_AMP` their outward depth.
 * Both derive from the original's figure-space constants (`HWAVE/VWAVEINTERVAL =
 * 300`, `waveDiam = 70`, `balloon.cpp:57`) at our ~0.2 CSS-px scale, then retuned
 * as a named divergence: Zork balloons are small, so the interval is pulled in to
 * ~22 or a compact edge never reaches the two-interval minimum and stays dead
 * straight (`AddWavies` bails when `nWaves < 2`, `balloon.cpp:564`). Because the
 * cardinal spline now carries the whole ring, an outward bump shows close to its
 * full depth, so `WAVE_AMP` returns near the faithful ~70/10.
 */
const WAVE_INTERVAL = 22;
const WAVE_AMP = 6;

/**
 * Cardinal-spline tension for the outline — 0.5 is the Catmull-Rom value, the
 * deterministic stand-in for the original's `CBeta` beta-spline
 * (`CreateBalloonSpline`, `balloon.cpp:1685`). Higher pulls the curve tighter to
 * its waypoints (more angular); 0.5 keeps the soft Woodring wobble.
 */
const SPLINE_TENSION = 0.5;

/**
 * Below this one-line width, a balloon stays a single line rather than being
 * wrapped for shape (`ONELINETHRESHOLD = 500`, `panel.cpp:751`, `:761`). Our
 * unit is CSS px against a native 400px panel where the original's is figure
 * space (`m_unitWidth` in the low thousands), so the constant is scaled by the
 * ~0.2 ratio those `~×5` panel widths imply — a named unit conversion, applied
 * to every ported figure-space length in this file.
 */
const ONE_LINE_THRESHOLD = 100;
/**
 * The width:height a wrapped balloon trends toward. This is the deterministic
 * stand-in for `GetCloudEstimate`'s goal width (`panel.cpp:753`): the original
 * derives width from `area / available-height` and then rolls a random point in
 * `[minWidth, maxWidth]` (`panel.cpp:767`), which ADR 0004 §5 forbids (the panel
 * stream must be a pure function). We instead pick the width that gives a fixed
 * target aspect for the text's area — square-ish but a touch wide, as a speech
 * balloon reads — which needs no roll and no coupling to stacking order.
 */
const TARGET_ASPECT = 1.9;
/** `AreaEstimate`'s fudge factor (`balloon.cpp:775`), carried through verbatim. */
const AREA_FUDGE = 1.3;
/**
 * How far the compact goal is pushed toward the free width. The original does
 * not stop at the area estimate: `GetCloudEstimate` rolls a random point up to
 * `maxWidth` (`panel.cpp:890`) and then fudges `+200` figure-space toward it
 * (`panel.cpp:900`), so a balloon that owns the panel spreads across most of it
 * and only tightens when other balloons shrink its free rect. ADR 0004 §5 forbids
 * the roll (the panel stream is a pure function), so we take a *fixed* fraction of
 * the compact→free gap instead of a random one — the deterministic midpoint-style
 * stand-in already used for the horizontal straddle (`render.ts`). Never wider
 * than the text on one line, exactly as the original caps at `len+200`
 * (`panel.cpp:901`): past that the balloon is just air.
 */
const WIDTH_BIAS = 0.5;

/** Widest single word, the floor a balloon may not wrap below (`WidestWord`, `balloon.cpp:778`). */
function widestWord(ctx: CanvasRenderingContext2D, text: string): number {
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  return words.length === 0 ? 0 : Math.max(...words.map((w) => ctx.measureText(w).width));
}

/**
 * The width a balloon *wants* to wrap at — a port of `GetCloudEstimate`
 * (`panel.cpp:753`) reduced to what a deterministic single-balloon panel needs.
 *
 * This replaces the old line-*balancing* hack. The hack existed because the
 * original's balloons read as shapes and ours (plain greedy-wrapped into a box)
 * read as text blocks — but the original never balances lines (`BreakIntoLines`
 * is a plain greedy wrap, `balloon.cpp:96`). It gets its shape from choosing a
 * good *width goal* first, then greedy-wrapping into it: short text stays one
 * line (`panel.cpp:761`); longer text is sized from its ink area so the balloon
 * is compact rather than a wide flat strip (`AreaEstimate`, `balloon.cpp:775`),
 * floored by the widest word (`panel.cpp:766`) and capped at the free width
 * (`panel.cpp:777`). Wrapping at this width is what makes a balloon a balloon;
 * balancing was a symptom-fix for not doing it.
 */
export function goalWidth(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): number {
  const oneLine = ctx.measureText(text).width;
  if (oneLine <= ONE_LINE_THRESHOLD) return Math.min(oneLine, maxWidth);
  // area ≈ ink area laid on one line; for a box of width W the height is ≈ area/W,
  // so aspect W/(area/W) = W²/area = TARGET_ASPECT ⇒ W = √(TARGET_ASPECT · area).
  const area = AREA_FUDGE * oneLine * LINE_HEIGHT;
  const compact = Math.sqrt(TARGET_ASPECT * area);
  // Spread toward the free width (`GetCloudEstimate`'s roll-then-fudge), but never
  // past the one-line width — beyond that the balloon is empty air (`panel.cpp:901`).
  const ceiling = Math.min(maxWidth, oneLine);
  const goal = compact + WIDTH_BIAS * (ceiling - compact);
  return Math.min(Math.max(goal, widestWord(ctx, text)), ceiling);
}

/**
 * The greedy fit itself, ported from `BreakIntoLines` (`balloon.cpp:96`): pack
 * words onto a line until the next would overflow, then break. Like the original
 * (`balloon.cpp:115`, "the first word alone is wider than the text area") a word
 * longer than the whole width is kept intact on its own line rather than split
 * mid-character — the guard is `line !== ""`, which only breaks *between* words.
 * The original then lets the balloon grow to that word; we instead clamp the box
 * to `maxWidth` in {@link measureBalloon} so a stray long token cannot push a
 * balloon past its native panel — a named divergence forced by §2's fixed panel.
 */
function greedyWrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter((w) => w.length > 0)) {
    const candidate = line === "" ? word : `${line} ${word}`;
    if (line !== "" && ctx.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line !== "") lines.push(line);
  return lines;
}

export function measureBalloon(
  ctx: CanvasRenderingContext2D, balloon: Balloon, maxWidth: number,
): { lines: string[]; width: number; height: number } {
  const pad = PADDING + (balloon.balloonClass === "CBWoodringThink" ? THINK_INSET : 0);
  const lines = greedyWrap(ctx, balloon.text, goalWidth(ctx, balloon.text, maxWidth - pad * 2));
  const width = Math.min(
    maxWidth,
    Math.max(...lines.map((line) => ctx.measureText(line).width)) + pad * 2,
  );
  return { lines, width, height: lines.length * LINE_HEIGHT + pad * 2 };
}

/**
 * Draw a balloon in its class's shape, with a tail toward `target` when the
 * class has one. Captions do not: a box is the narrator's, spoken by nobody.
 */
export function drawBalloon(
  ctx: CanvasRenderingContext2D, balloon: Balloon, box: BalloonBox,
  lines: readonly string[], target: TailTarget | null,
): void {
  ctx.save();
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#000";
  ctx.fillStyle = "#fff";
  ctx.lineWidth = 1.5;

  switch (balloon.balloonClass) {
    case "CBWoodringBox":
      ctx.beginPath();
      ctx.rect(box.x, box.y, box.width, box.height);
      ctx.fill();
      ctx.stroke();
      break;
    case "CBWoodringThink":
      cloud(ctx, box);
      ctx.fill();
      ctx.stroke();
      if (target) bubbleTrail(ctx, box, target);
      break;
    case "CBWoodringNormal":
      roundedSpeech(ctx, box, target);
      ctx.fill();
      ctx.stroke();
      break;
  }

  ctx.fillStyle = "#000";
  ctx.textBaseline = "top";
  const pad = PADDING + (balloon.balloonClass === "CBWoodringThink" ? THINK_INSET : 0);
  for (const [i, line] of lines.entries()) {
    // Centred, because the balanced wrap above only reads as a balloon if the
    // ragged edge is shared between both sides.
    const width = ctx.measureText(line).width;
    ctx.fillText(line, box.x + (box.width - width) / 2, box.y + pad + i * LINE_HEIGHT);
  }
  ctx.restore();
}

/**
 * A scalloped outline — the thought balloon's edge, drawn as one continuous
 * closed path of outward-bulging arcs.
 *
 * **Reimplementation, not a port.** The original gets its cloud from the same
 * permuted `CreateBalloonSpline` as the speech balloon, rendered with the
 * Woodring pen (`CBWoodringThink::Draw`, `balloon.cpp:648`, "will draw the cloud
 * properly") — there is no standalone scallop routine to transcribe. We generate
 * the scallops directly instead, so this is ours by necessity; the source only
 * fixes the *look* (an outward-bulging closed loop), not the arithmetic.
 *
 * The earlier version stamped a *full* circle at every bump and added the inner
 * rectangle, then let the caller stroke the lot. That strokes each circle's
 * inner half and the box edge too, so the balloon read as a chain of overlapping
 * rings around a rectangle rather than a cloud. Here each bump contributes only
 * its outer half-arc, and consecutive arcs share an endpoint, so fill and stroke
 * both see a single clean scalloped loop with no interior lines.
 */
function cloud(ctx: CanvasRenderingContext2D, box: BalloonBox): void {
  const cols = Math.max(4, Math.round(box.width / 26));
  const rows = Math.max(2, Math.round(box.height / 24));
  const rx = box.width / (cols * 2);
  const ry = box.height / (rows * 2);
  const { x, y, width: w, height: h } = box;

  ctx.beginPath();
  ctx.moveTo(x, y);
  // Top edge, left → right, each scallop bulging up.
  for (let i = 0; i < cols; i++) {
    ctx.arc(x + (w * (i + 0.5)) / cols, y, rx, Math.PI, 2 * Math.PI, false);
  }
  // Right edge, top → bottom, bulging right.
  for (let i = 0; i < rows; i++) {
    ctx.arc(x + w, y + (h * (i + 0.5)) / rows, ry, -Math.PI / 2, Math.PI / 2, false);
  }
  // Bottom edge, right → left, bulging down.
  for (let i = cols - 1; i >= 0; i--) {
    ctx.arc(x + (w * (i + 0.5)) / cols, y + h, rx, 0, Math.PI, false);
  }
  // Left edge, bottom → top, bulging left.
  for (let i = rows - 1; i >= 0; i--) {
    ctx.arc(x, y + (h * (i + 0.5)) / rows, ry, Math.PI / 2, (3 * Math.PI) / 2, false);
  }
  ctx.closePath();
}

/**
 * The thought balloon's tail: a line of bubbles rather than an arrow, ported in
 * spirit from `CBWoodringThink::Draw` (`balloon.cpp:648`) — the original walks a
 * chain of ellipses from the speaker up to the balloon, small near the speaker
 * and widening toward the cloud. It is the mark that says *interior*, and it is
 * why the class change in §2a is visible at a glance rather than a technicality.
 *
 * **Named divergences.** The original derives the bubble *count* from the gap
 * (`nBubbles`, `balloon.cpp:660`) and spaces them across it (`balloon.cpp:669`);
 * we draw a fixed three at even `t`, since our tail height is stable (§2) and
 * three reads as a trail at panel scale. Sizing is ours too (radius `6 - i·1.4`
 * vs the original's `BUBBLEHEIGHT`→`ENDBUBBLEWIDTH` ramp), but the direction
 * matches: smallest bubble nearest the speaker.
 */
function bubbleTrail(ctx: CanvasRenderingContext2D, box: BalloonBox, target: TailTarget): void {
  const from = { x: box.x + box.width / 2, y: box.y + box.height };
  for (let i = 1; i <= 3; i++) {
    const t = i / 4;
    ctx.beginPath();
    ctx.arc(
      from.x + (target.x - from.x) * t,
      from.y + (target.y - from.y) * t,
      6 - i * 1.4, 0, Math.PI * 2,
    );
    ctx.fill();
    ctx.stroke();
  }
}

interface Pt { x: number; y: number }

/**
 * Walk edge `a→b` and append its outward bumps to `pts` — the point-producing
 * port of `AddWavies` (`balloon.cpp:560`). The original steps along the edge in
 * `interval`-sized waves and emits *alternating* waypoints: a bump pushed out by
 * `waveDiam` along the normal, then a point left on the edge, then a bump, and so
 * on — the offset is always `+normal`, so the outline only ever bulges outward,
 * never pinches in. `(nx,ny)` is that outward normal. The corner points that
 * bracket each edge are pushed by the caller; here we add only the between-corner
 * bumps, and the cardinal spline ({@link strokeCardinal}) rounds the lot.
 *
 * Below two intervals there are no bumps — the edge stays a straight spline
 * chord — exactly as `AddWavies` bails when `nWaves < 2` (`balloon.cpp:564`).
 */
function pushWaves(
  pts: Pt[], ax: number, ay: number, bx: number, by: number, nx: number, ny: number,
): void {
  const dist = Math.hypot(bx - ax, by - ay);
  const n = Math.floor(dist / WAVE_INTERVAL);
  if (n < 2) return;
  const ux = (bx - ax) / dist, uy = (by - ay) / dist;
  const seg = dist / n;
  for (let i = 1; i < n; i++) {
    const px = ax + ux * seg * i, py = ay + uy * seg * i;
    // Odd steps bulge out, even steps stay on the edge (`!(i&1)` in AddWavies).
    if (i % 2 === 1) pts.push({ x: px + nx * WAVE_AMP, y: py + ny * WAVE_AMP });
    else pts.push({ x: px, y: py });
  }
}

/**
 * Render a ring of waypoints as one smooth loop — the canvas stand-in for the
 * original's `CBeta` spline (`CreateBalloonSpline`, `balloon.cpp:1685`). A
 * Catmull-Rom curve is laid through every point (including the box corners), each
 * segment converted to a cubic Bézier with control points `p ± (next−prev)·t/3`;
 * `t = SPLINE_TENSION = 0.5` gives the standard uniform Catmull-Rom (the `/6`
 * form). `open` leaves a gap between the last and first point (the bottom stretch
 * the tail bridges); otherwise the loop closes on itself. Assumes the path is
 * already open and positions the current point itself.
 */
function strokeCardinal(ctx: CanvasRenderingContext2D, pts: readonly Pt[], open: boolean): void {
  const n = pts.length;
  if (n < 2) return;
  const f = SPLINE_TENSION / 3;
  const at = (i: number): Pt =>
    open ? pts[Math.min(Math.max(i, 0), n - 1)]! : pts[(i + n) % n]!;
  ctx.moveTo(pts[0]!.x, pts[0]!.y);
  const last = open ? n - 1 : n;
  for (let i = 0; i < last; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    ctx.bezierCurveTo(
      p1.x + (p2.x - p0.x) * f, p1.y + (p2.y - p0.y) * f,
      p2.x - (p3.x - p1.x) * f, p2.y - (p3.y - p1.y) * f,
      p2.x, p2.y,
    );
  }
}

/**
 * A speech balloon: a hand-drawn Woodring outline with a bowed tail rooted on the
 * **bottom edge**.
 *
 * The outline is the single soft loop of `CreateBalloonSpline`
 * (`balloon.cpp:1652`): the corners and the outward edge-bumps ({@link pushWaves})
 * are gathered into one ring and drawn as a single cardinal spline
 * ({@link strokeCardinal}) — not the rounded rect (hard `arcTo` corners + in/out
 * ripples) we drew before, which still read as vector art. The tail follows
 * `CBWoodringNormal::AddArrow` (`balloon.cpp:1404`): it *always* leaves the bottom
 * edge, never a side, its root sliding along that edge to sit under the speaker,
 * and it is bowed as two curves (`CArc`, `alt = .05·tailLen`, `balloon.cpp:1471`)
 * with a sharp tip (kept off the body spline so the point stays crisp).
 *
 * The 45°-from-vertical clamp *is* now reproduced (`balloon.cpp:1450`): with the
 * balloon docked close above its speaker (`render.ts` caps the tail length), a
 * head off to the side would otherwise drag the tip out past 45°, so the tip is
 * pulled horizontally back until its run no longer exceeds its drop.
 */
function roundedSpeech(
  ctx: CanvasRenderingContext2D, box: BalloonBox, target: TailTarget | null,
): void {
  const { x, y, width: w, height: h } = box;
  const right = x + w, bottom = y + h;

  if (!target) {
    // No speaker: one closed ring — top, right, bottom, left — all corners and
    // bumps splined together into the plain Woodring blob.
    const ring: Pt[] = [];
    ring.push({ x, y });
    pushWaves(ring, x, y, right, y, 0, -1); // top, bulging up
    ring.push({ x: right, y });
    pushWaves(ring, right, y, right, bottom, 1, 0); // right, bulging right
    ring.push({ x: right, y: bottom });
    pushWaves(ring, right, bottom, x, bottom, 0, 1); // bottom, bulging down
    ring.push({ x, y: bottom });
    pushWaves(ring, x, bottom, x, y, -1, 0); // left, bulging left
    ctx.beginPath();
    strokeCardinal(ctx, ring, false);
    ctx.closePath();
    return;
  }

  // Tail roots ride the bottom edge under the head, far enough from a corner that
  // both roots stay on the flat run.
  const root = Math.min(Math.max(target.x, x + 16), right - 16);
  const rootR = root + 9, rootL = root - 9;
  const tipY = Math.max(target.y, bottom + TAIL_MIN_EXIT);
  // 45° clamp (`AddArrow`, balloon.cpp:1450): the tip's horizontal run may not
  // exceed its vertical drop, so a side speaker cannot flatten the tail.
  const dy = tipY - bottom;
  const tipX = Math.min(Math.max(target.x, root - dy), root + dy);
  const alt = 0.05 * Math.hypot(tipX - root, dy); // CArc bow, balloon.cpp:1471

  // Body ring, open along the bottom between the two roots: start at rootR, run
  // the bottom out to the right corner, up and over and down, back along the
  // bottom to rootL. The tail then bridges rootL→tip→rootR as sharp quads.
  const ring: Pt[] = [];
  ring.push({ x: rootR, y: bottom });
  pushWaves(ring, rootR, bottom, right, bottom, 0, 1); // bottom, right of the tail
  ring.push({ x: right, y: bottom });
  pushWaves(ring, right, bottom, right, y, 1, 0); // right, bulging right
  ring.push({ x: right, y });
  pushWaves(ring, right, y, x, y, 0, -1); // top, bulging up
  ring.push({ x, y });
  pushWaves(ring, x, y, x, bottom, -1, 0); // left, bulging left
  ring.push({ x, y: bottom });
  pushWaves(ring, x, bottom, rootL, bottom, 0, 1); // bottom, left of the tail
  ring.push({ x: rootL, y: bottom });

  ctx.beginPath();
  strokeCardinal(ctx, ring, true); // ends at rootL (current point)
  ctx.quadraticCurveTo((rootL + tipX) / 2 - alt, (bottom + tipY) / 2, tipX, tipY);
  ctx.quadraticCurveTo((tipX + rootR) / 2 + alt, (tipY + bottom) / 2, rootR, bottom);
  ctx.closePath();
}
