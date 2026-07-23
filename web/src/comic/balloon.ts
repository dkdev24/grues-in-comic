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
 * (`balloon.cpp:406`) walks each edge and pushes alternate waypoints out along
 * the edge normal, and `CreateBalloonSpline` smooths the result into the wobbly
 * Woodring outline. `WAVE_INTERVAL` is the spacing between ripples, `WAVE_AMP`
 * their depth.
 *
 * Both derive from the original's figure-space constants (`HWAVE/VWAVEINTERVAL =
 * 300`, `waveDiam = 70`, `balloon.cpp:426`) at our ~0.2 CSS-px scale (~60 / ~14),
 * then retuned as a named divergence for two reasons: (1) Zork balloons are
 * small, so the interval is pulled in to ~30 or a compact three-line balloon's
 * edges never reach the two-interval minimum and stay dead straight; (2) our
 * quadratic smoothing shows only ~half the control offset as visible deflection
 * (a beta-spline showed more), so `WAVE_AMP` is the control push, ~8, landing a
 * visible ripple near the faithful ~14/2 rather than an invisible one.
 */
const WAVE_INTERVAL = 30;
const WAVE_AMP = 8;

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
  const goal = Math.sqrt(TARGET_ASPECT * area);
  return Math.min(Math.max(goal, widestWord(ctx, text)), maxWidth);
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

/**
 * One straight edge of the balloon, drawn as a ripple rather than a line — the
 * canvas port of `AddWavies` (`balloon.cpp:406`). It walks from `(ax,ay)` to
 * `(bx,by)` in `WAVE_INTERVAL` steps and pushes alternate control points out
 * along the outward normal `(nx,ny)` by `WAVE_AMP`, so the edge bows in and out;
 * quadratic segments between the on-edge endpoints are the smoothing the
 * original got from its beta-spline. The start point must already be the path's
 * current point (an `arcTo` corner or a prior edge leaves it there).
 *
 * Below two intervals there is no ripple — a straight `lineTo` — exactly as
 * `AddWavies` bails when `nWaves < 2` (`balloon.cpp:409`).
 */
function wavyEdge(
  ctx: CanvasRenderingContext2D,
  ax: number, ay: number, bx: number, by: number, nx: number, ny: number,
): void {
  const dist = Math.hypot(bx - ax, by - ay);
  const n = Math.floor(dist / WAVE_INTERVAL);
  if (n < 2) { ctx.lineTo(bx, by); return; }
  const ux = (bx - ax) / dist, uy = (by - ay) / dist;
  const seg = dist / n;
  for (let i = 1; i <= n; i++) {
    const ex = ax + ux * seg * i, ey = ay + uy * seg * i;
    const mx = ax + ux * seg * (i - 0.5), my = ay + uy * seg * (i - 0.5);
    const sign = i % 2 === 1 ? 1 : -1; // alternate out/in (balloon.cpp:421)
    ctx.quadraticCurveTo(mx + nx * WAVE_AMP * sign, my + ny * WAVE_AMP * sign, ex, ey);
  }
}

/**
 * A speech balloon: a rippled Woodring outline with a bowed tail rooted on the
 * **bottom edge**.
 *
 * The outline is the wobbly closed loop of `CreateBalloonSpline`
 * (`balloon.cpp:431`) — each edge rippled by {@link wavyEdge}, corners rounded —
 * rather than the clean rounded rect we drew before. The tail follows
 * `CBWoodringNormal::AddArrow` (`balloon.cpp:238`): it *always* leaves the bottom
 * edge, never a side, its root sliding along that edge to sit under the speaker
 * (`balloon.cpp:252`), and it is bowed as two curves (`CArc`, `alt = .05·tailLen`,
 * `balloon.cpp:305`) instead of the straight triangle we drew before. It stays
 * legible because the layout places the balloon *above* and over its speaker
 * (`render.ts` straddles the head); the tip aims directly at `target`, and
 * `TAIL_MIN_EXIT` clears the box first.
 *
 * **Remaining named divergence from `AddArrow`:** the 45°-from-vertical angle
 * clamp (`balloon.cpp:284`) is not reproduced — keeping the tail near-vertical is
 * the *layout's* job (the straddle + reserved headroom in `render.ts`), so the
 * tip can aim true.
 */
function roundedSpeech(
  ctx: CanvasRenderingContext2D, box: BalloonBox, target: TailTarget | null,
): void {
  const radius = 12;
  const { x, y, width: w, height: h } = box;
  const right = x + w, bottom = y + h;

  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  wavyEdge(ctx, x + radius, y, right - radius, y, 0, -1); // top, bulging up
  ctx.arcTo(right, y, right, bottom, radius);
  wavyEdge(ctx, right, y + radius, right, bottom - radius, 1, 0); // right, bulging right
  ctx.arcTo(right, bottom, x, bottom, radius);

  if (target) {
    // Root on the bottom edge, under the head as near as the box allows — and far
    // enough from a corner that the tail base (root ± 9) stays on the flat edge.
    const root = Math.min(Math.max(target.x, x + radius + 14), right - radius - 9);
    const rootR = root + 9, rootL = root - 9;
    const tipY = Math.max(target.y, bottom + TAIL_MIN_EXIT);
    const alt = 0.05 * Math.hypot(target.x - root, tipY - bottom); // CArc bow, balloon.cpp:305
    wavyEdge(ctx, right - radius, bottom, rootR, bottom, 0, 1); // bottom, right of the tail
    ctx.quadraticCurveTo((rootR + target.x) / 2 + alt, (bottom + tipY) / 2, target.x, tipY);
    ctx.quadraticCurveTo((target.x + rootL) / 2 - alt, (tipY + bottom) / 2, rootL, bottom);
    wavyEdge(ctx, rootL, bottom, x + radius, bottom, 0, 1); // bottom, left of the tail
  } else {
    wavyEdge(ctx, right - radius, bottom, x + radius, bottom, 0, 1); // whole bottom
  }

  ctx.arcTo(x, bottom, x, y, radius);
  wavyEdge(ctx, x, bottom - radius, x, y + radius, -1, 0); // left, bulging left
  ctx.arcTo(x, y, right, y, radius);
  ctx.closePath();
}
