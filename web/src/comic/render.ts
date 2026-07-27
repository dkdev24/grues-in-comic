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

import { CAPTION, type Body, type CameraPreset, type Line, type Panel } from "./mapper.js";
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

/**
 * When a panel carries a **speech or thought balloon**, no figure may grow wider
 * than this fraction of the panel. A speech balloon straddles the head from above,
 * so it needs to be *wider* than the head to sit over it and still read; capping
 * the figure keeps that width available even on the `close-up` rung, whose fill
 * alone would let the Hero span most of the frame.
 *
 * The cap is deliberately *conditional*: the game-over `reaction` rung carries no
 * such balloon (only, at most, a caption box pinned to the top edge), and a face
 * that fills the frame is the whole point of that beat — so it is left uncapped.
 */
export const MAX_FIGURE_WIDTH = 0.55;

/**
 * Reserved band at the top of the panel for a straddling speech balloon and its
 * tail. A speech balloon sits *above* its speaker and drops a near-vertical tail
 * (Comic Chat's whole layout), which only works if the head is far enough down
 * to leave room. On tight rungs (`close-up`) the head's own fill would otherwise
 * reach the top edge, so when such a balloon is present the figure is pushed down
 * until its head-top clears this fraction of the panel height. The game-over
 * `reaction` rung carries no speech balloon and keeps its full, uncropped face.
 */
export const BALLOON_HEADROOM = 0.36;

/** A laid-out body: its speaker id, figure, and placement in panel space. */
export interface PlacedBody {
  speaker: string;
  figure: Figure;
  x: number;
  y: number;
  scale: number;
  mirror: boolean;
}

export function renderPanel(
  ctx: CanvasRenderingContext2D, panel: Panel, cast: Cast,
  width: number, height: number, options: RenderOptions = {},
): void {
  const shot = SHOTS[panel.camera];
  const cycles = options.cycles ?? new Map<string, PoseCycle>();
  // A speech or thought balloon needs a column beside the head; a caption is a
  // top box and does not, so a caption-only panel never shrinks its figures.
  const hasColumnBalloon = panel.speakers.some((line) => line.balloonClass !== "CBWoodringBox");
  const widthCap = hasColumnBalloon ? width * MAX_FIGURE_WIDTH : Infinity;

  ctx.save();
  ctx.clearRect(0, 0, width, height);
  ctx.beginPath();
  ctx.rect(0, 0, width, height);
  ctx.clip();

  drawBackdrop(ctx, cast, width, height, shot, options.backdrop);

  // The bodies to lay out are the panel's on-stage participants (`m_bodies`,
  // `panel.cpp:734`), filtered to those that earn the stage — `IsSpeaker`, applied
  // before any dimension is read, exactly as the original discards non-speakers
  // ahead of `GetDimInfo` (`panel.cpp:741-749`). Each figure's pose comes from its
  // **own** body's emotion (ADR 0008 §2) — the DM's neutral set, the Hero's
  // world-derived affect — so N participants pose independently, never sharing one
  // panel emotion. Unknown speaker ids (no sheet) are skipped.
  const bodies: Array<{ body: Body; figure: Figure }> = [];
  for (const body of panel.bodies) {
    if (!isSpeaker(body, panel.speakers)) continue;
    const avatar = cast.manifest.cast[body.speaker];
    if (!avatar || !cast.sheets.get(body.speaker)) continue;
    const figure = figureFor(avatar, body.emotion, cycleFor(cycles, body.speaker));
    if (figure) bodies.push({ body, figure });
  }

  const placed = layoutAvatars(bodies, width, height, shot, widthCap);

  // Reserve headroom for a straddling speech balloon: push each figure down until
  // its head-top clears the top band, so the balloon has room to sit above and
  // drop its tail. Only when such a balloon exists (the reaction close-up has none).
  if (hasColumnBalloon) {
    const minHeadTop = height * BALLOON_HEADROOM;
    for (const item of placed) item.y = Math.max(item.y, minHeadTop);
  }

  for (const item of placed) {
    const sheet = cast.sheets.get(item.speaker);
    if (sheet) drawFigure(ctx, sheet, item.figure, item.x, item.y, item.scale, item.mirror);
  }

  drawBalloons(ctx, panel, width, placed);

  // The panel border last, so nothing overdraws it.
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, width - 2, height - 2);
  ctx.restore();
}

/**
 * A body earns the stage — the port of `CUnitPanel::IsSpeaker` (`panel.cpp:822`).
 *
 * Requested first (`m_requested`, `:823` — "sort of makes them a speaker"), then a
 * scan of the panel's balloons for one this body speaks (`:826-833`). Everything
 * else is dropped before layout, which is what keeps a silent, unrequested
 * participant from standing mutely in the frame once mobs can join a panel.
 */
export function isSpeaker(body: Body, speakers: readonly Line[]): boolean {
  if (body.requested) return true;
  return speakers.some((line) => line.speaker === body.speaker);
}

/**
 * Stage order and facing — the stubbed port of `OrderAvatars` (`panel.cpp:424`,
 * called from `LayoutAvatars` `:753`) and `UpdateHistoresis` (`:435`).
 *
 * The original decides both at once, and both from data we do not have yet. Order
 * comes from `DoGreedyOrdering` (`:403`), which inserts each body at the seat
 * minimising `EvalPlacement` (`:358`); facing (`m_flip`) falls out of the same
 * scoring. The score is driven by the **talk-to graph** (`AddTalkTos`, `:316` —
 * who is addressing whom) and by **histeresis** (`m_lastLeft`/`m_lastRight`/
 * `m_lastDir`, `:435`, which keep a participant in the seat they held last panel).
 * We have neither: nothing authors mob dialogue yet, so no body addresses another,
 * and with an empty talk-to graph the greedy degenerates — every rating ties and
 * the seat chosen is an artefact of the tie-break, not of the scene. Fabricating a
 * talk-to graph to feed it would be inventing semantics in the mechanical layer,
 * exactly what ADR 0008 forbids. So order is **stable by insertion** until the
 * mob-dialogue slice supplies the missing input, and this returns facings only.
 *
 * Facing *is* ported, because the no-talk-to branch of `EvalPair` (`:293-297`) is
 * complete on its own: a body is charged 4 when it does not face a neighbour and 2
 * when a neighbour does not face it, summed over pairs. Reduced over a fixed row,
 * every left-hand neighbour costs 6 to face away from and every right-hand one the
 * same, so each body faces its **larger side** — the leftmost faces right, the
 * rightmost faces left, and the row turns inward. An exact tie (the middle of an
 * odd row) is `EvalPlacement`'s `m_lastDir` case (`:396-398`); with histeresis
 * stubbed that is the avatar's initial `m_lastDir = FALSE` (`avatar.cpp:894`) —
 * the art's rightward default.
 *
 * This supersedes the geometric "past the panel's centre" rule: the original
 * settles facing from adjacency in `OrderAvatars`, *before* any coordinate exists.
 * At N≤2 the two rules agree, which is why nothing in play changes.
 */
export function orderBodies<T>(bodies: readonly T[]): Array<{ body: T; flip: boolean }> {
  const n = bodies.length;
  return bodies.map((body, i) => {
    const left = i;
    const right = n - 1 - i;
    // Facing right costs 6 per body on the left, facing left 6 per body on the
    // right; the cheaper wins, and a tie keeps `m_lastDir` (stubbed FALSE).
    return { body, flip: right < left };
  });
}

/**
 * Place N bodies across the panel floor — the port of `CUnitPanel::LayoutAvatars`
 * (`panel.cpp:726`).
 *
 * Each body is scaled to the camera's fill height — our `shot.fill` stands in for
 * the original's `maxBodyHeight = unitHeight/1.9`, the §7 ladder choosing it. That
 * common height is **faithful, not a divergence**: the scale is
 * `maxBodyHeight · normHeight/maxNorm` (`panel.cpp:765`), and `normHeight` is
 * hardcoded to `100` for every body in the shipped source (`avatar.cpp:64,110`,
 * both marked `XXX ... we're assuming characters are the same height`), so the
 * ratio is 1 and every body normalizes to the same target. Our art carries no
 * per-avatar `normHeight` either, and now it does not need one.
 *
 * Widths are summed; if the row overruns the panel the whole set is reduced by one
 * factor (`panel.cpp:777-786`). Bodies are then spread with **equal margins**,
 * including the two edges (`margin = (unitWidth − Σw)/(n+1)`, `panel.cpp:807-816`).
 * Facing comes from {@link orderBodies}, as `m_flip` comes from `OrderAvatars`
 * (`:753`) — adjacency, not coordinates.
 *
 * We do **not** port the `zoomIn` branch (`panel.cpp:788-804`): the camera ladder
 * already chooses figure size per rung, and `MAX_SCALE`/`fit` cap it (§7).
 */
export function layoutAvatars(
  bodies: ReadonlyArray<{ body: Body; figure: Figure }>,
  width: number, height: number, shot: Shot, widthCap = Infinity,
): PlacedBody[] {
  const n = bodies.length;
  if (n === 0) return [];

  const ordered = orderBodies(bodies);
  const scales = bodies.map((b) => fit(b.figure, height, shot.fill, widthCap));
  const widths = bodies.map((b, i) => b.figure.width * scales[i]!);
  const sumWidth = widths.reduce((a, w) => a + w, 0);

  // Shrink the whole row to fit when it overruns the panel (`panel.cpp:577`).
  if (sumWidth > width) {
    const reduction = width / sumWidth;
    for (let i = 0; i < n; i++) {
      scales[i]! *= reduction;
      widths[i]! *= reduction;
    }
  }

  const bodyWidth = widths.reduce((a, w) => a + w, 0);
  const margin = (width - bodyWidth) / (n + 1);
  const placed: PlacedBody[] = [];
  let x = margin;
  for (let i = 0; i < n; i++) {
    const { body, figure } = bodies[i]!;
    const scale = scales[i]!;
    const w = widths[i]!;
    placed.push({
      speaker: body.speaker, figure, scale, x,
      y: height - figure.height * scale * shot.reveal,
      mirror: ordered[i]!.flip,
    });
    x += w + margin;
  }
  return placed;
}

function cycleFor(cycles: Map<string, PoseCycle>, role: string): PoseCycle {
  let cycle = cycles.get(role);
  if (!cycle) {
    cycle = newCycle();
    cycles.set(role, cycle);
  }
  return cycle;
}

export function fit(figure: Figure, height: number, fill: number, widthCap = Infinity): number {
  return Math.min((height * fill) / figure.height, MAX_SCALE, widthCap / figure.width);
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
  placed: ReadonlyArray<PlacedBody>,
): void {
  ctx.font = '13px "Comic Sans MS", "Comic Neue", ui-rounded, cursive';

  // Each on-stage head, keyed by speaker id, as an anchor + keep-out box in panel
  // space. A balloon over a face is the one thing comics never do, so balloons
  // route *around* these; a speech tail lands on the box's near edge.
  const anchors = new Map<string, { x: number; y: number }>();
  const faceBox = new Map<string, { left: number; right: number; top: number; bottom: number }>();
  const faces: Array<{ left: number; right: number; top: number; bottom: number }> = [];
  for (const item of placed) {
    // A mirrored figure's face is at `width - faceX` from its left edge, so the
    // balloon tail must follow it or it would point at the back of the head.
    const faceX = item.mirror ? item.figure.width - item.figure.faceX : item.figure.faceX;
    const ax = item.x + faceX * item.scale;
    const headH = item.figure.headHeight * item.scale;
    anchors.set(item.speaker, {
      x: ax,
      // The crown anchor, used by *thought* balloons (their bubbles float up to
      // the head centre). Depth is a capped fraction of head height: `headH * 0.2`
      // is the crown on a wide shot, but on a close-up that fraction reaches the
      // forehead, so the cap keeps it in the hairline at any scale. Speech tails
      // do not use this — they land on the head's edge via `headEdgeTip`.
      y: item.y + Math.min(headH * 0.2, 16),
    });
    const halfW = headH * 0.44;
    const box = { left: ax - halfW, right: ax + halfW, top: item.y, bottom: item.y + headH };
    faceBox.set(item.speaker, box);
    faces.push(box);
  }
  const faceCentre = (f?: { left: number; right: number }) =>
    f ? (f.left + f.right) / 2 : null;

  // Empty margins, still used to float a *thought* aside off in open space the
  // way Comic Chat floats its clouds; a *speech* balloon straddles its speaker.
  const faceLeft = faces.length > 0 ? Math.min(...faces.map((f) => f.left)) : width;
  const faceRight = faces.length > 0 ? Math.max(...faces.map((f) => f.right)) : 0;
  const asideSide: "left" | "right" = width - 10 - faceRight >= faceLeft - 10 ? "right" : "left";

  // The panel's balloons in draw order, each bound to its speaker's head (ADR 0008
  // §2): the caption and any bodiless speaker route with no anchor, the rest
  // straddle. This is Comic Chat's element list, `panel.cpp:397`.
  const queue = panel.speakers.map((balloon) => {
    const face = balloon.speaker === CAPTION ? undefined : faceBox.get(balloon.speaker);
    const anchor = balloon.speaker === CAPTION ? null : (anchors.get(balloon.speaker) ?? null);
    return { balloon, anchor, face, headX: faceCentre(face) };
  });

  // A balloon that owns the panel spreads across most of it; the original only
  // tightens the free rect when *other* balloons share the width
  // (`GetCloudEstimate`, `panel.cpp:876`). Since our balloons always stack
  // vertically, "shares the width" reduces to "there is more than one".
  const cap = queue.length === 1 ? width - 20 : width * 0.66;
  // The tail is capped, not stretched: Comic Chat grows a balloon *up from* its
  // speaker, so the tail is short and the slack falls *above* the balloon
  // (`MINTAILHEIGHT` is a floor, `balloon.cpp:1439`, with no matching stretch —
  // the balloon simply docks near the head). We pin balloons to the panel top,
  // so on a tall panel the head sits far below and the tail runs the whole drop.
  // `TAIL_MAX` restores the original feel: a tailed balloon is dropped toward its
  // head until the tail is no longer than this, leaving the empty space above it.
  const TAIL_MAX = 70;

  let y = 8;
  for (const item of queue) {
    const balloon = item.balloon;
    const isSpeech = balloon.balloonClass === "CBWoodringNormal";
    // A thought balloon's scallops bulge outward; keep that bulge clear too.
    const bulge = balloon.balloonClass === "CBWoodringThink" ? 14 : 0;
    const measured = measureBalloon(ctx, balloon, cap);
    // Drop a tailed balloon toward its speaker so the tail stays short. The head
    // top is the face box's top for speech, the crown anchor for a thought.
    const headTopY = item.face ? item.face.top : (item.anchor ? item.anchor.y : null);
    if (headTopY !== null && balloon.balloonClass !== "CBWoodringBox") {
      y = Math.max(y, headTopY - TAIL_MAX - measured.height);
    }
    let x: number;
    if (isSpeech && item.headX !== null) {
      // Straddle the speaker: the head's x sits inside the balloon's span, so the
      // bottom tail drops straight to it. Comic Chat places the balloon's left in
      // `[headX − width, headX]` (`GetCloudEstimate`, `panel.cpp:781`) and picks a
      // point in that range at *random* (`randfloat`, `:784`). We cannot: ADR 0004
      // §5 makes the panel stream a deterministic pure function, so we take the
      // range's midpoint (`headX − width/2`) — the symmetric straddle — instead of
      // a roll, then clamp inside the panel as the original clamps into freeRect.
      x = Math.max(10, Math.min(item.headX - measured.width / 2, width - measured.width - 10));
    } else if (balloon.balloonClass === "CBWoodringBox") {
      x = 10; // a caption is a top box, pinned left, spoken by nobody.
    } else {
      // A thought aside floats in the roomier margin, clear of every face.
      x = asideSide === "right" ? width - measured.width - 10 : 10;
      x = clearOfFaces(x, y, measured.width, measured.height, bulge, faces, width);
    }
    const box: BalloonBox = { x, y, width: measured.width, height: measured.height };
    // A speech tail lands on the head's silhouette nearest the balloon (its crown,
    // since the balloon straddles from above); a thought aside keeps the crown anchor.
    const target = isSpeech && item.face ? headEdgeTip(box, item.face) : item.anchor;
    drawBalloon(ctx, balloon, box, measured.lines, target);
    y += measured.height + 8;
  }
}

interface Face { left: number; right: number; top: number; bottom: number; }

/**
 * Where a speech tail should end: the point on the head's silhouette (its face
 * keep-out box) nearest the balloon. Aiming at the head's *centre* was the bug
 * ADR 0006 §3's speech balloon exposed — when the balloon sits beside the head,
 * a line to the centre crosses the face and lands on the nose. The nearest edge
 * point is where a comic tail actually touches its speaker: the crown when the
 * balloon is above, the temple when it is to the side.
 */
function headEdgeTip(box: BalloonBox, face: Face): { x: number; y: number } {
  const headCx = (face.left + face.right) / 2;
  // The tail root rides the balloon's bottom edge, as near the head as it fits.
  const rootX = Math.min(Math.max(headCx, box.x), box.x + box.width);
  const rootY = box.y + box.height;
  return {
    x: Math.min(Math.max(rootX, face.left), face.right),
    y: Math.min(Math.max(rootY, face.top), face.bottom),
  };
}

/**
 * Slide a box horizontally until it no longer overlaps any face box, moving it
 * toward whichever side needs less travel and still fits the panel. When the box
 * is too wide to clear at all (a face that spans the panel), it is left where it
 * was — an overlap the caller has already decided to tolerate over an unreadable
 * layout — and only nudged back inside the panel edges.
 */
export function clearOfFaces(
  x: number, y: number, w: number, h: number, bulge: number,
  faces: ReadonlyArray<{ left: number; right: number; top: number; bottom: number }>,
  width: number,
): number {
  for (const f of faces) {
    const top = y - bulge;
    const bottom = y + h + bulge + 24; // the tail can reach below the box
    if (bottom <= f.top || top >= f.bottom) continue; // clears vertically
    const left = x - bulge;
    const right = x + w + bulge;
    if (right <= f.left || left >= f.right) continue; // already clears horizontally
    const toRight = f.right + bulge + 6 - left; // x delta to sit right of the head
    const toLeft = f.left - bulge - 6 - right; // (negative) to sit left of it
    const canRight = x + toRight + w + 10 <= width;
    const canLeft = x + toLeft >= 10;
    if (canRight && (!canLeft || toRight <= -toLeft)) x += toRight;
    else if (canLeft) x += toLeft;
  }
  return Math.max(10, Math.min(x, width - w - 10));
}
