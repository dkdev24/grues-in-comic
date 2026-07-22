/**
 * Balloons — the three Woodring classes of ADR 0004 §2, drawn.
 *
 * Comic Chat's Layout Manager laid balloons out against a **known** window
 * width. Ours is not known: §4a makes panel width an input evaluated per render
 * rather than a constant, which is the one place the port stops being a
 * transcription. Everything here therefore takes a width and measures at that
 * width; nothing caches a break.
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
 */
const TAIL_MIN_EXIT = 2;

/**
 * `AddLine`'s job, reduced to what a single-balloon-per-character panel needs:
 * break text to a width, and report the box it wants.
 *
 * Comic Chat balanced line lengths so a balloon read as a shape rather than a
 * ragged block. That is reproduced here by measuring the natural greedy wrap and
 * then re-wrapping at `total / lines`, which is the cheap version of the same
 * idea and the visible difference between a comic balloon and a text box.
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
 * The thought balloon's tail: shrinking bubbles rather than an arrow. It is the
 * mark that says *interior*, and it is why the class change in §2a is visible
 * at a glance rather than a technicality.
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
 * This is the one shape Comic Chat draws for speech (`CBWoodringNormal::AddArrow`,
 * balloon.cpp) — the tail *always* leaves the bottom, never a side. It stays
 * legible because the layout places the balloon *above* and horizontally over its
 * speaker (`render.ts` straddles the head), so the head is below the box and the
 * tail drops to it. Two rules from the original keep it clean when the head sits
 * off-centre: the root slides along the bottom to sit under the head. Keeping the
 * tail near-vertical is the *layout's* job, not the drawer's — the balloon is
 * placed above and over its speaker with reserved headroom (`render.ts`), so the
 * head is below the box and the drop is tall. The tip is aimed at directly
 * (`target`, the head anchor), never overshot, so a close-up head just below the
 * box stops the tip at the head; `TAIL_MIN_EXIT` only guarantees the tail clears
 * the box before angling toward a near speaker.
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
