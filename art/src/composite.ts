/**
 * Face-onto-torso compositing for `AT_COMPLEX` avatars.
 *
 * A complex avatar stores headless torsos and separate faces, and joins them at
 * render time. That is why Tiki ships 20 faces × 12 torsos rather than 32 fixed
 * poses — the combinatorics, not the file size, are the point.
 *
 * The join is defined by three numbers per part, all in the *drawing's* own
 * pixel space:
 *
 *   torso.cx/cy    where on the torso a head attaches — the neck socket
 *   face.cx/cy     the corresponding anchor inside the face image
 *   face.cxDelta   a per-face nudge, letting one face sit differently on the
 *   face.cyDelta   same socket (a tilted head, a thrown-back laugh)
 *
 * so the face is drawn at `torso.c + face.delta - face.c`, which lands
 * `face.c` on the socket and then applies the nudge. Ported from
 * `CBodyDouble::GetBodyBox` (`bodycam.cpp:527`) and `GetDimInfo`
 * (`avatar.cpp:106`), which compute the same offset independently.
 */
import {
  blit, createRaster, rasterizeLayers, rasterizePose,
  type Raster, type RasterizeOptions,
} from "./raster.js";
import { TORSOFIRST, type Avatar, type PoseRecord } from "./format.js";

export interface CompositeBody {
  raster: Raster;
  /** Where the head ends, measured from the top of the composite. */
  headHeight: number;
  /**
   * Horizontal anchor for a speech-balloon tail, in composite coordinates.
   * `faceX` in the original — the pose record's `x` field, relocated.
   */
  faceX: number;
  /** Placement of each part within the composite, for debugging and sheets. */
  face: { x: number; y: number; width: number; height: number };
  torso: { x: number; y: number; width: number; height: number };
}

/**
 * Composite a face onto a torso.
 *
 * The bounding box is the union of the torso at the origin and the face at its
 * computed offset — the offset can be negative, so the box may extend above and
 * left of the torso, and everything is then rebased onto that box.
 *
 * Draw order comes from the avatar's `TORSOFIRST` flag. It matters: whichever
 * part is drawn second overlaps the first at the neck, so the flag decides
 * whether a collar sits over the jaw or under it.
 *
 * Both halos go down before either figure. The paper states the rule outright
 * (§4.4) and `CBodyDouble::DrawBody` implements it — the alternative wipes a
 * halo-shaped bite out of whichever part was drawn first.
 */
export function compositeBody(
  av: Avatar, face: PoseRecord, torso: PoseRecord, options: RasterizeOptions = {},
): CompositeBody {
  const faceLayers = rasterizeLayers(av, face, options);
  const torsoLayers = rasterizeLayers(av, torso, options);
  const faceRaster = faceLayers.figure;
  const torsoRaster = torsoLayers.figure;

  const xOffset = (torso.cx ?? 0) + (face.cxDelta ?? 0) - (face.cx ?? 0);
  const yOffset = (torso.cy ?? 0) + (face.cyDelta ?? 0) - (face.cy ?? 0);

  const left = Math.min(0, xOffset);
  const top = Math.min(0, yOffset);
  const right = Math.max(torsoRaster.width, xOffset + faceRaster.width);
  const bottom = Math.max(torsoRaster.height, yOffset + faceRaster.height);

  const raster = createRaster(right - left, bottom - top);
  const facePos = { x: xOffset - left, y: yOffset - top };
  const torsoPos = { x: -left, y: -top };

  // Halos first, both of them, before any ink lands.
  if (torsoLayers.aura) blit(raster, torsoLayers.aura, torsoPos.x, torsoPos.y);
  if (faceLayers.aura) blit(raster, faceLayers.aura, facePos.x, facePos.y);

  // TORSOFIRST puts the torso underneath; otherwise the head is drawn first
  // and the torso overlaps it.
  const torsoFirst = (av.flags & TORSOFIRST) !== 0;
  if (torsoFirst) {
    blit(raster, torsoRaster, torsoPos.x, torsoPos.y);
    blit(raster, faceRaster, facePos.x, facePos.y);
  } else {
    blit(raster, faceRaster, facePos.x, facePos.y);
    blit(raster, torsoRaster, torsoPos.x, torsoPos.y);
  }

  return {
    raster,
    headHeight: yOffset + faceRaster.height - top,
    faceX: (face.x ?? 0) + xOffset - left,
    face: { ...facePos, width: faceRaster.width, height: faceRaster.height },
    torso: { ...torsoPos, width: torsoRaster.width, height: torsoRaster.height },
  };
}

/**
 * A simple avatar's body needs no join, but reports the same geometry so a
 * caller can treat both avatar types uniformly.
 *
 * `headHeight` is `height / 2` — the original's own guess, commented "for now,
 * be conservative — head = half body!". Nothing in the file records where a
 * simple avatar's head actually ends.
 */
export function compositeSimpleBody(
  av: Avatar, body: PoseRecord, options: RasterizeOptions = {},
): CompositeBody {
  const raster = rasterizePose(av, body, options);
  const geometry = { x: 0, y: 0, width: raster.width, height: raster.height };
  return {
    raster,
    headHeight: Math.floor(raster.height / 2),
    faceX: body.x ?? Math.floor(raster.width / 2),
    face: geometry,
    torso: geometry,
  };
}
