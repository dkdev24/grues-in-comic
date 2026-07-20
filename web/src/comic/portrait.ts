/**
 * Character portraits (stage 5.4) — the cast of the strip, named and shown.
 *
 * **This one is not a port, and the reason is worth recording.** Comic Chat has
 * the feature: the member list draws each participant as an avatar icon when
 * `m_bIconMembers` is set (`memblst.cpp:391`), keyed by `CAvatar::m_iconIndex`.
 * But in the shipped v2.5 source that field is assigned exactly once — to `-1`,
 * in the constructor (`avatar.cpp:896`) — and nothing ever populates it or the
 * image list behind it. There is no source site to port from, so the crop rule
 * below is ours and is documented as a decision rather than cited as fidelity.
 *
 * The rule: **a portrait is the avatar's neutral face, alone.**
 *
 * - *Face, not figure.* A portrait answers "who is this", and at nick-list size
 *   a whole figure is a 20-pixel-tall person. The face is the identifying half
 *   and it is already a separately packed sub-rect, so the crop is free.
 * - *Neutral, not the panel's emotion.* The tempting version tracks the Hero's
 *   current mood, and it is wrong twice: the cast bar is a roster and would
 *   flicker once per turn, and ADR 0004 §9's whole point is that the Hero's
 *   emotion belongs to the panel, which is the thing that has a *turn*. A
 *   roster does not.
 *
 * Pure and canvas-free above the draw call, on purpose: {@link portraitCrop} is
 * the decision and is testable in Node against the real manifest, while
 * {@link drawPortrait} is the four lines that put it on a context.
 */

import { firstNeutral } from "../../../art/src/pose.js";
import type { PackedAvatar, PackedPart, SheetRect } from "../../../art/src/cast-manifest.js";

/** Native portrait box. Square, so a cast bar is a row of same-sized chips. */
export const PORTRAIT = 56;

export interface Portrait {
  /** The face part the portrait is cropped from. */
  part: PackedPart;
  /** The sub-rect of the sheet to draw. */
  source: SheetRect;
}

/**
 * The neutral face of an avatar, as a sheet sub-rect.
 *
 * `firstNeutral` is `pose.ts`'s own resolver, the same one the figure path
 * uses, so a portrait and a NEUTRAL panel show the same drawing — which is the
 * property that makes the bar read as *this character* rather than as a second
 * piece of art of them. It falls back to the first face for an avatar with no
 * neutral at all, and returns `null` only for an avatar with no faces, which
 * §11 already excludes from casting.
 */
export function portraitCrop(avatar: PackedAvatar): Portrait | null {
  const part = firstNeutral(avatar.faces);
  if (!part) return null;
  return { part, source: part.figure };
}

/**
 * Draw a portrait into a `size`-square box at `(x, y)`, letterboxed.
 *
 * Faces are not square — they are taller than wide, or the reverse for a hat —
 * so the crop is scaled to fit and centred rather than stretched to fill.
 * Stretching would distort a face, which is the one thing the whole uniform-
 * scale rule in `drawFigure` exists to prevent (§4a); it would be a strange
 * place to give it up.
 */
export function drawPortrait(
  ctx: CanvasRenderingContext2D, sheet: CanvasImageSource, portrait: Portrait,
  x: number, y: number, size: number,
): void {
  const { source } = portrait;
  const scale = Math.min(size / source.width, size / source.height);
  const width = source.width * scale;
  const height = source.height * scale;
  ctx.drawImage(
    sheet, source.x, source.y, source.width, source.height,
    x + (size - width) / 2, y + (size - height) / 2, width, height,
  );
}
