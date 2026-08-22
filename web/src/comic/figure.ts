/**
 * Figures in the browser: pose selection and the face-onto-torso join.
 *
 * This is the runtime half of the Gate D asset decision. `art/` decoded the
 * `.avb` files at build time and emitted parts on a sheet; what is left at run
 * time is the emotion wheel (pure arithmetic, imported from `art/src/pose.ts`
 * unchanged) and ten lines of join geometry, re-expressed as `drawImage` calls
 * against the sheet instead of `blit` calls against a raster.
 *
 * The join is ported from `art/src/composite.ts`, which is itself the port of
 * `CBodyDouble::GetBodyBox`. Both must stay in step; the reason there are two
 * is that one composites *pixels it owns* and the other composites *sub-rects
 * of a texture it does not*, and merging them would drag the decoder — and so
 * Node's zlib — into the browser bundle.
 */

import { selectComplexPose, type EmotionOption } from "../../../art/src/pose.js";
import type { CastManifest, PackedAvatar, PackedPart } from "../../../art/src/cast-manifest.js";

export interface Cast {
  manifest: CastManifest;
  /** Role → decoded sheet, ready for `drawImage`. */
  sheets: Map<string, ImageBitmap | HTMLImageElement>;
  backdrops: Map<string, ImageBitmap | HTMLImageElement>;
  /** Role → the character id actually loaded, default cast included (F16). */
  choice: CastChoice;
}

/** Role → roster character id. A partial choice keeps the packed default. */
export type CastChoice = Record<string, string>;

/** One choosable character, as `roster.json` lists it (`art/tools/rosterpack.ts`). */
export interface RosterCharacter {
  id: string;
  name: string;
  roles: string[];
  manifest: string;
  sheet: string;
  sheetBytes: number;
  figures: number;
  faceHeight: number;
  torsoHeight: number;
  shrugTorso: boolean;
}

export interface RosterIndex {
  version: 1;
  defaults: CastChoice;
  characters: RosterCharacter[];
}

/** Where `rosterpack.ts` writes, relative to the cast bundle. */
const ROSTER_DIR = "roster";

/**
 * The picker's index: who may be cast, in which role.
 *
 * Separate from `loadCast` on purpose — the index is a few KB and the sheets it
 * names are 60–130 KiB each, so the picker reads names without pulling art.
 */
export async function loadRoster(base: string): Promise<RosterIndex> {
  return (await (await fetch(`${base}/${ROSTER_DIR}/roster.json`)).json()) as RosterIndex;
}

/** A chosen figure: which parts, and the box they occupy in figure space. */
export interface Figure {
  avatar: PackedAvatar;
  face: PackedPart;
  torso: PackedPart;
  width: number;
  height: number;
  /** Where the head ends, from the top — the balloon tail's vertical target. */
  headHeight: number;
  /** Horizontal anchor for a balloon tail. */
  faceX: number;
  facePos: { x: number; y: number };
  torsoPos: { x: number; y: number };
}

/**
 * Load the cast bundle, optionally re-skinned with the player's chosen cast.
 *
 * `cast.json` stays the canonical bundle in both cases: it carries the
 * backdrops and the default cast, and it is what the pixel gate renders. A
 * chosen character is a **runtime skin** — one extra manifest and one extra
 * sheet fetched per role that differs from the default, never a re-pack (F16;
 * ADR 0004 §11, amended 2026-08-22). That is also why the roster is fetched per
 * cast rather than shipped whole: 15 sheets is ~1.4 MiB, one cast is ~150 KiB.
 *
 * A chosen character that fails to load falls back to the packed default rather
 * than failing the boot — the game is playable with the default cast, and a
 * reader who once picked rebecca should not be met with an error page.
 */
export async function loadCast(base: string, choice?: CastChoice): Promise<Cast> {
  const manifest = (await (await fetch(`${base}/cast.json`)).json()) as CastManifest;
  const sheets = new Map<string, ImageBitmap | HTMLImageElement>();
  const backdrops = new Map<string, ImageBitmap | HTMLImageElement>();
  const loaded: CastChoice = {};

  await Promise.all([
    ...Object.keys(manifest.cast).map(async (role) => {
      const wanted = choice?.[role];
      if (wanted) {
        try {
          const avatar = (await (await fetch(
            `${base}/${ROSTER_DIR}/${wanted}.avatar.json`,
          )).json()) as PackedAvatar;
          manifest.cast[role] = avatar;
          sheets.set(role, await loadImage(`${base}/${ROSTER_DIR}/${avatar.sheet}`));
          loaded[role] = wanted;
          return;
        } catch {
          // fall through to the packed default
        }
      }
      const avatar = manifest.cast[role]!;
      sheets.set(role, await loadImage(`${base}/${avatar.sheet}`));
      loaded[role] = defaultIdOf(avatar);
    }),
    ...manifest.backdrops.map(async (backdrop) => {
      backdrops.set(backdrop.id, await loadImage(`${base}/${backdrop.file}`));
    }),
  ]);

  return { manifest, sheets, backdrops, choice: loaded };
}

/** The packed cast names its sheet after the avatar file it came from. */
function defaultIdOf(avatar: PackedAvatar): string {
  return avatar.sheet.replace(/\.png$/i, "");
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`could not load ${url}`));
    image.src = url;
  });
}

/**
 * Per-role memory for ADR 0004 §8's round-robin.
 *
 * The monotony risk in this corpus is *not* a shortage of drawings — a strong
 * complex avatar carries 220–306 figures. It is that `nearestByAngle` is a
 * deterministic argmax and returns the same drawing forever. Comic Chat's own
 * answer was `m_lastTorso + 1`: begin the scan after the pose used last, so a
 * repeated emotion cycles through whatever variants exist.
 *
 * `selectComplexPose` takes no `start` — the `CEmotionOpts` path in the
 * original had none either — so the cycle is applied by **rotating the arrays**
 * before the search. That is equivalent (both search functions prefer the first
 * candidate encountered among equals) and it keeps the port in `art/` unedited.
 */
export interface PoseCycle {
  face: number;
  torso: number;
}

export function newCycle(): PoseCycle {
  return { face: -1, torso: -1 };
}

function rotate<T>(items: readonly T[], start: number): T[] {
  if (items.length === 0) return [];
  const from = ((start % items.length) + items.length) % items.length;
  return [...items.slice(from), ...items.slice(0, from)];
}

/**
 * Choose a figure for an emotion set and assemble its geometry.
 *
 * The offsets are `composite.ts`'s: the face lands at
 * `torso.c + face.delta - face.c`, and the union box may extend above and left
 * of the torso, so everything is rebased onto it.
 */
export function figureFor(
  avatar: PackedAvatar, options: readonly EmotionOption[], cycle: PoseCycle,
): Figure | null {
  const faces = rotate(avatar.faces, cycle.face + 1);
  const torsos = rotate(avatar.torsos, cycle.torso + 1);
  const chosen = selectComplexPose(faces, torsos, options);
  const face = chosen.face;
  const torso = chosen.torso;
  if (!face || !torso) return null;

  cycle.face = avatar.faces.indexOf(face);
  cycle.torso = avatar.torsos.indexOf(torso);

  const xOffset = torso.cx + face.cxDelta - face.cx;
  const yOffset = torso.cy + face.cyDelta - face.cy;
  const left = Math.min(0, xOffset);
  const top = Math.min(0, yOffset);
  const right = Math.max(torso.figure.width, xOffset + face.figure.width);
  const bottom = Math.max(torso.figure.height, yOffset + face.figure.height);

  const facePos = { x: xOffset - left, y: yOffset - top };
  const torsoPos = { x: -left, y: -top };
  return {
    avatar, face, torso,
    width: right - left,
    height: bottom - top,
    headHeight: yOffset + face.figure.height - top,
    faceX: face.x + xOffset - left,
    facePos, torsoPos,
  };
}

/**
 * Draw a figure at `(x, y)`, scaled uniformly.
 *
 * **Uniform is the constraint, not a convenience** (ADR 0004 §4a): the whole
 * figure scales as a unit, so a face never scales differently from the torso it
 * is composited onto. Compositing happens in figure space; the viewport scale
 * is applied afterwards, here, to the assembled result.
 *
 * Draw order is the paper's (§4.4) and the flag's: both halos before either
 * figure, then `TORSOFIRST` decides whether the collar sits over the jaw.
 */
export function drawFigure(
  ctx: CanvasRenderingContext2D, sheet: CanvasImageSource, figure: Figure,
  x: number, y: number, scale: number, mirror = false,
): void {
  const { face, torso, facePos, torsoPos } = figure;
  // `mirror` flips the figure horizontally about its own box so it faces the
  // other way (ADR 0005 §4): in a two-shot the right-hand figure is drawn
  // mirrored so the two look at each other instead of both facing out. Done with
  // a transform rather than per-part x maths so the face/torso join is flipped as
  // one unit — the whole point of compositing in figure space first.
  ctx.save();
  if (mirror) {
    ctx.translate(x + figure.width * scale, y);
    ctx.scale(-1, 1);
  } else {
    ctx.translate(x, y);
  }
  const part = (p: PackedPart, rect: typeof p.figure | null, pos: { x: number; y: number }) => {
    if (!rect) return;
    ctx.drawImage(
      sheet, rect.x, rect.y, rect.width, rect.height,
      // The aura rect and the figure rect have the same dimensions, so one
      // placement serves both; that is only true because they were packed as a
      // pair, which is what `pack.ts` guarantees.
      pos.x * scale, pos.y * scale, rect.width * scale, rect.height * scale,
    );
  };

  part(torso, torso.aura, torsoPos);
  part(face, face.aura, facePos);
  if (figure.avatar.torsoFirst) {
    part(torso, torso.figure, torsoPos);
    part(face, face.figure, facePos);
  } else {
    part(face, face.figure, facePos);
    part(torso, torso.figure, torsoPos);
  }
  ctx.restore();
}
