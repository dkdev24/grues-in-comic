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
 * Break text to a width and report the box it wants — the job `BreakIntoLines`
 * (`balloon.cpp:96`) does in the original, reduced to a single-balloon panel.
 *
 * **Named divergence (line balancing).** The original `BreakIntoLines` is a
 * *plain greedy wrap* — it packs each line to the width and stops; there is no
 * balancing pass (`balloon.cpp:96`). A Comic Chat balloon still reads as a
 * *shape* rather than a ragged block, but that comes from the **permuted spline
 * outline** its `CreateBalloonSpline`/`PermutePt` wraps around the text
 * (`balloon.cpp:165`, `XPERMUTE`/`YPERMUTE`/`XBORDER`/`YBORDER` at `:159`), not
 * from the line breaks — `ShiftLines`'s per-line jitter is off in v1.0
 * (`MAXCENTERSHIFT`/`MAXLEFTSHIFT = 0`, `balloon.cpp:135`). We draw a clean
 * rounded rect ({@link roundedSpeech}), not that wobbly spline, so greedy text
 * inside it would read as a text box. Balancing the lines is **our** substitute
 * for the outline we don't draw — a deliberate deviation, not the original's
 * behaviour — so it is stated here rather than attributed to Comic Chat. It
 * measures the greedy wrap, then re-wraps at `total / lines`.
 */
export function wrap(
  ctx: CanvasRenderingContext2D, text: string, maxWidth: number,
): string[] {
  const greedy = greedyWrap(ctx, text, maxWidth);
  if (greedy.length < 2) return greedy;
  const widest = Math.max(...greedy.map((line) => ctx.measureText(line).width));
  const balanced = greedyWrap(ctx, text, Math.max(widest / greedy.length, widest * 0.72));
  // Re-wrapping narrower can spill an extra line; keep it only if it did not.
  return balanced.length === greedy.length ? balanced : greedy;
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
  const lines = wrap(ctx, balloon.text, maxWidth - pad * 2);
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
 * A rounded speech balloon with a straight tail rooted on the **bottom edge**.
 *
 * The tail follows `CBWoodringNormal::AddArrow` (`balloon.cpp:238`): it *always*
 * leaves the bottom edge, never a side, and its root slides along that edge to
 * sit under the speaker (`balloon.cpp:252`, the route-region midpoint clamped
 * toward the head). It stays legible because the layout places the balloon
 * *above* and horizontally over its speaker (`render.ts` straddles the head), so
 * the head is below the box and the tail drops to it. The tip is aimed directly
 * at `target` (the head anchor), never overshot, so a close-up head just below
 * the box stops the tip at the head; `TAIL_MIN_EXIT` clears the box first.
 *
 * **Two named divergences from `AddArrow`:**
 * - *Shape.* The original builds the tail as two curved arcs (`CArc`, bowed by
 *   `alt = .05 * tailLen`, `balloon.cpp:305`); we draw a straight triangle. The
 *   curve is a hand-drawn flourish the rounded-rect balloon does not invite.
 * - *Angle clamp.* `AddArrow` limits the tail to 45° from vertical, walking the
 *   break point back toward the speaker when it would exceed that
 *   (`balloon.cpp:284`). We do not clamp in the drawer — keeping the tail
 *   near-vertical is the *layout's* job (the straddle + reserved headroom in
 *   `render.ts` keep the head roughly under the box), so the tip can aim true.
 */
function roundedSpeech(
  ctx: CanvasRenderingContext2D, box: BalloonBox, target: TailTarget | null,
): void {
  const radius = 12;
  const { x, y, width: w, height: h } = box;
  const right = x + w, bottom = y + h;

  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(right, y, right, bottom, radius);
  ctx.arcTo(right, bottom, x, bottom, radius);

  if (target) {
    // Root on the bottom edge, under the head as near as the box allows.
    const root = Math.min(Math.max(target.x, x + radius + 14), right - radius);
    const tipY = Math.max(target.y, bottom + TAIL_MIN_EXIT);
    ctx.lineTo(root + 9, bottom);
    ctx.lineTo(target.x, tipY);
    ctx.lineTo(root - 9, bottom);
  }

  ctx.arcTo(x, bottom, x, y, radius);
  ctx.arcTo(x, y, right, y, radius);
  ctx.closePath();
}
