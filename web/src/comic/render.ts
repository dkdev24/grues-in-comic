/**
 * A panel, drawn. The camera ladder of ADR 0004 §7 becomes actual framing here.
 *
 * The renderer is a pure function of a {@link Panel} plus the cast: it reads no
 * events, no engine and no session. That separation is what makes the mapper
 * testable in Node without a canvas, and it is why a preset arrives as a name —
 * `establishing`, `close-up` — rather than as numbers the mapper chose. The
 * mapper decides *what shot this is*; this file decides what that shot looks
 * like at the current panel size, which §4a makes a per-render question.
 */

import type { CameraPreset, Panel } from "./mapper.js";
import { drawFigure, figureFor, newCycle, type Cast, type Figure, type PoseCycle } from "./figure.js";
import { drawBalloon, measureBalloon, type BalloonBox } from "./balloon.js";

/** A camera preset, as the numbers a render needs. */
interface Shot {
  /** Figure height as a fraction of panel height. */
  fill: number;
  /** Vertical framing: 1 shows the whole figure, lower crops toward the head. */
  reveal: number;
  /** How much of the backdrop is visible behind the figures. */
  backdrop: number;
}

/**
 * §7's six rungs as framing. Read this as a table of authoring choices sitting
 * *on top of* the ADR, not as part of it: the ADR fixes which rung fires, and
 * these are the first values that made each rung legible. They are the obvious
 * thing to tune when the comic is looked at rather than measured.
 */
const SHOTS: Record<CameraPreset, Shot> = {
  // Tight on the Hero: the head fills the frame and the body is cropped away.
  // This rung fires on game-over (§7 rung 0) — the biggest emotional beat — so
  // the backdrop is pushed almost out: a house behind the head fights the face.
  reaction: { fill: 2.1, reveal: 0.4, backdrop: 0.18 },
  // A new room is the one moment the backdrop is the subject.
  establishing: { fill: 0.5, reveal: 1, backdrop: 1 },
  // A room already seen: both figures, small, the room incidental.
  wide: { fill: 0.58, reveal: 1, backdrop: 0.9 },
  // No object art exists, so the "close-up on the object" is played as a
  // close-up on the Hero handling it, with the caption naming what moved.
  "close-up": { fill: 1.35, reveal: 0.62, backdrop: 0.5 },
  // Guide foreground, Hero addressed past its shoulder. The Hero is the smaller,
  // *addressed* figure here, not the subject, so its fill stays below 1: at 1.0
  // the Hero's far arm clipped the right frame edge (the Guide sits at x≈0.06,
  // the Hero at x≈0.94, so a full-size Hero has nowhere to go).
  "over-shoulder": { fill: 0.86, reveal: 0.78, backdrop: 0.6 },
  medium: { fill: 0.78, reveal: 0.95, backdrop: 0.75 },
};

/** The Guide's own emotion set. It reacts to nothing; it comments. */
const GUIDE_EMOTION = [{ angle: 0, intensity: 0, priority: 1 }];

export interface RenderOptions {
  /**
   * Per-role pose cycles (§8's `m_lastTorso + 1`). Owned by the caller so that
   * re-rendering the same panel — a resize, a re-paint — is idempotent, while a
   * *new* panel advances the cycle. Without this split, a resize would silently
   * redraw every panel with different bodies.
   */
  cycles?: Map<string, PoseCycle>;
  /** Backdrop id. Room→backdrop assignment is an open M5 question, not 5.3's. */
  backdrop?: string;
}

/**
 * Panel scale is capped rather than free (§4a): this art is roughly 400×400 at
 * native size, so the common case on any real viewport is downscaling, and the
 * narrow risk is a large window blowing a figure up into its own pixels.
 */
const MAX_SCALE = 1.6;

export function renderPanel(
  ctx: CanvasRenderingContext2D, panel: Panel, cast: Cast,
  width: number, height: number, options: RenderOptions = {},
): void {
  const shot = SHOTS[panel.camera];
  const cycles = options.cycles ?? new Map<string, PoseCycle>();

  ctx.save();
  ctx.clearRect(0, 0, width, height);
  ctx.beginPath();
  ctx.rect(0, 0, width, height);
  ctx.clip();

  drawBackdrop(ctx, cast, width, height, shot, options.backdrop);

  const hero = cast.manifest.cast["hero"];
  const guide = cast.manifest.cast["guide"];
  const heroSheet = cast.sheets.get("hero");
  const guideSheet = cast.sheets.get("guide");

  // The Hero's emotion is the panel's, which is derived from the world's reply
  // and never from the Hero's own balloon (§9). Getting this backwards — the
  // Comic Chat data flow, read from the speaker's text — is the single most
  // likely implementation error in this milestone, and it would look almost
  // right: a Hero permanently flat, because `take lamp` has no affect.
  const heroFigure = hero
    ? figureFor(hero, panel.emotion, cycleFor(cycles, "hero"))
    : null;
  // **The Guide is on stage exactly when it speaks**, whatever the rung. It is
  // tempting to make this a property of the preset — a "two-shot" flag — but a
  // Guide balloon drawn over an empty stage is a speech balloon with no
  // speaker, which is precisely the misattribution §2a spent three paragraphs
  // avoiding. §7 rung 5 is about when the Guide's presence *changes the shot*,
  // not about whether it is drawn.
  const guideFigure = guide && panel.guide !== null
    ? figureFor(guide, GUIDE_EMOTION, cycleFor(cycles, "guide"))
    : null;

  const placed: Array<{ figure: Figure; x: number; y: number; scale: number; mirror: boolean }> = [];

  if (guideFigure && guideSheet) {
    const scale = fit(guideFigure, height, shot.fill * 0.92);
    // The Guide sits at the left facing right — the art's default — so it already
    // looks toward the Hero and is not mirrored.
    placed.push({
      figure: guideFigure, scale, mirror: false,
      x: width * 0.06,
      y: height - guideFigure.height * scale * shot.reveal,
    });
  }
  if (heroFigure && heroSheet) {
    const scale = fit(heroFigure, height, shot.fill);
    const solo = guideFigure === null;
    // In a two-shot the Hero is the right-hand figure; mirror it so it faces the
    // Guide instead of out of frame (ADR 0005 §4 — the "faces away" symptom). Solo,
    // it keeps the art's default facing.
    placed.push({
      figure: heroFigure, scale, mirror: !solo,
      x: solo
        ? (width - heroFigure.width * scale) / 2
        : width * 0.94 - heroFigure.width * scale,
      y: height - heroFigure.height * scale * shot.reveal,
    });
  }

  for (const item of placed) {
    const sheet = cast.sheets.get(item.figure.avatar === hero ? "hero" : "guide");
    if (sheet) drawFigure(ctx, sheet, item.figure, item.x, item.y, item.scale, item.mirror);
  }

  drawBalloons(ctx, panel, width, placed);

  // The panel border last, so nothing overdraws it.
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, width - 2, height - 2);
  ctx.restore();
}

function cycleFor(cycles: Map<string, PoseCycle>, role: string): PoseCycle {
  let cycle = cycles.get(role);
  if (!cycle) {
    cycle = newCycle();
    cycles.set(role, cycle);
  }
  return cycle;
}

function fit(figure: Figure, height: number, fill: number): number {
  return Math.min((height * fill) / figure.height, MAX_SCALE);
}

function drawBackdrop(
  ctx: CanvasRenderingContext2D, cast: Cast, width: number, height: number,
  shot: Shot, id: string | undefined,
): void {
  ctx.fillStyle = "#fdfcf7";
  ctx.fillRect(0, 0, width, height);

  const image = id ? cast.backdrops.get(id) : undefined;
  if (!image) return;
  // Cover, anchored low: the shipped backdrops are 315×315 squares and the
  // horizon sits in their lower half, so anchoring to the top puts the figures
  // in the sky on any panel wider than it is tall.
  const scale = Math.max(width / 315, height / 315);
  const w = 315 * scale;
  const h = 315 * scale;
  ctx.save();
  ctx.globalAlpha = shot.backdrop;
  ctx.drawImage(image, (width - w) / 2, height - h, w, h);
  ctx.restore();
}

/**
 * Balloons stack from the top; the figures own the bottom. That is Comic Chat's
 * own arrangement and it is also what keeps a tail short enough to read.
 *
 * Order is caption, Guide, Hero — narration frames the panel, the Guide speaks
 * into it, and the Hero's thought sits closest to the Hero.
 */
function drawBalloons(
  ctx: CanvasRenderingContext2D, panel: Panel, width: number,
  placed: ReadonlyArray<{ figure: Figure; x: number; y: number; scale: number; mirror: boolean }>,
): void {
  ctx.font = '13px "Comic Sans MS", "Comic Neue", ui-rounded, cursive';

  const anchors = new Map<Figure, { x: number; y: number }>();
  for (const item of placed) {
    // A mirrored figure's face is at `width - faceX` from its left edge, so the
    // balloon tail must follow it or it would point at the back of the head.
    const faceX = item.mirror ? item.figure.width - item.figure.faceX : item.figure.faceX;
    anchors.set(item.figure, {
      x: item.x + faceX * item.scale,
      y: item.y + item.figure.headHeight * item.scale * 0.35,
    });
  }
  const heroAnchor = placed.length > 0 ? anchors.get(placed[placed.length - 1]!.figure) : undefined;
  const guideAnchor = placed.length > 1 ? anchors.get(placed[0]!.figure) : undefined;

  const queue = [
    { balloon: panel.caption, target: null, align: "left" as const },
    { balloon: panel.guide, target: guideAnchor ?? null, align: "left" as const },
    { balloon: panel.hero, target: heroAnchor ?? null, align: "right" as const },
  ].filter((item) => item.balloon !== null);

  let y = 8;
  for (const item of queue) {
    const balloon = item.balloon!;
    const measured = measureBalloon(ctx, balloon, width * 0.62);
    const box: BalloonBox = {
      x: item.align === "right" ? width - measured.width - 10 : 10,
      y,
      width: measured.width,
      height: measured.height,
    };
    drawBalloon(ctx, balloon, box, measured.lines, item.target);
    y += measured.height + 8;
  }
}
