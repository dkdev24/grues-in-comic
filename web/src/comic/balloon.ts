/**
 * Balloons — the three Woodring classes of ADR 0004 §2, drawn.
 *
 * Comic Chat's Layout Manager laid balloons out against a **known** window
 * width. Ours is not known: §4a makes panel width an input evaluated per render
 * rather than a constant, which is the one place the port stops being a
 * transcription. Everything here therefore takes a width and measures at that
 * width; nothing caches a break.
 *
 * Balloon class is fixed per channel and is never a per-panel choice:
 *
 * - `CBWoodringThink` — the Hero. A thought balloon, never speech (§2a). The
 *   player's command is an imperative *addressed to* the Hero, and the engine
 *   emits zero `speech` events across every walkthrough, so a speech balloon
 *   would assert on each panel something the contract never said.
 * - `CBWoodringBox` — the caption. A verbatim pull-quote from the narration.
 * - `CBWoodringNormal` — the Guide, the only speaker and the only authored text.
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
const TAIL_DEPTH = 22;
/**
 * The tail reaches its speaker. Comic Chat's balloons sit directly over their
 * speaker, so its tails are short; ours stack from the top of the panel while
 * the figures stand at the bottom, so a tail capped short of that distance ends
 * in mid-air, connected to nobody — the single-column panel, tall enough to put
 * the head far below the balloon, made this plainly wrong. A balloon's tail is
 * how a comic names its speaker, so it must land on the head however far that
 * is: `target` is already the head anchor (`render.ts`), and the tail now runs
 * to it directly. `TAIL_DEPTH` still guarantees the tail leaves the box before
 * turning toward a speaker that sits close.
 */

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

/** A rounded speech balloon with a straight tail. */
function roundedSpeech(
  ctx: CanvasRenderingContext2D, box: BalloonBox, target: TailTarget | null,
): void {
  const radius = 12;
  ctx.beginPath();
  ctx.moveTo(box.x + radius, box.y);
  ctx.arcTo(box.x + box.width, box.y, box.x + box.width, box.y + box.height, radius);
  ctx.arcTo(box.x + box.width, box.y + box.height, box.x, box.y + box.height, radius);

  if (target) {
    const root = Math.min(Math.max(target.x, box.x + radius + 14), box.x + box.width - radius);
    const tip = target;
    ctx.lineTo(root + 9, box.y + box.height);
    ctx.lineTo(tip.x, Math.max(tip.y, box.y + box.height + TAIL_DEPTH));
    ctx.lineTo(root - 9, box.y + box.height);
  }

  ctx.arcTo(box.x, box.y + box.height, box.x, box.y, radius);
  ctx.arcTo(box.x, box.y, box.x + box.width, box.y, radius);
  ctx.closePath();
}
