/**
 * The browser cast bundle: what `art/tools/avbpack.ts` writes and what the web
 * renderer reads (stage 5.3, ⚑ Gate D).
 *
 * **Types only, and deliberately importing nothing.** This is the contract
 * between a build-time pipeline and a browser, and the browser must be able to
 * name it without pulling it in: `art/` reaches Node's zlib through
 * `inflate.ts`, and every module that touches a pixel leads back there. A
 * type-only import is erased at emit but *not* at type-check — TypeScript still
 * walks the whole graph and emits it — so an interface parked beside the packer
 * puts `node:zlib` in the browser build. Hence a leaf.
 *
 * Three decisions are encoded in the shape below. They are the asset half of
 * Gate D, and none is the obvious choice:
 *
 * **Parts are packed, not figures.** A complex avatar composites faces ×
 * torsos at draw time, so Susan's 220 distinct figures are 31 distinct
 * *drawings*. Baking figures multiplies the payload by an order of magnitude to
 * deliver the same pixels, and it freezes the join — ADR 0004 §8's
 * `m_lastTorso + 1` round-robin exists precisely to keep re-pairing them. The
 * join is ten lines of arithmetic (`composite.ts`) over four numbers per part,
 * and those numbers are in {@link PackedPart}.
 *
 * **Aura and figure are separate sub-rects.** Not an optimization — a
 * correctness requirement. Both halos must go down before either figure (the
 * paper is explicit, §4.4), so a part flattened into one image has the second
 * blit punching a halo-shaped bite out of the first at the neck.
 *
 * **One sheet per avatar.** The alternative — a PNG per part — is ~60 requests
 * for a two-role cast, and the browser draws from a sub-rect with the same
 * `drawImage` call either way, so the sheet costs nothing at the call site.
 * This is the packing `art/README.md` deferred to this stage.
 */

/** A rectangle within a sheet. */
export interface SheetRect { x: number; y: number; width: number; height: number }

/**
 * One drawing in the sheet, plus everything the join needs.
 *
 * The emotion fields come first because that is the half the *selector* reads.
 * `pose.ts` is generic over `{ angle, intensity }`, so these entries feed it
 * directly: the browser runs the real emotion wheel over manifest data and
 * never fabricates a `PoseRecord` to do it.
 */
export interface PackedPart {
  kind: "face" | "torso" | "body";
  index: number;
  emotion: string;
  angle: number;
  intensity: number;
  /** Neck socket (torso), or its counterpart inside the face image. */
  cx: number;
  cy: number;
  /** Per-face nudge on the socket — a tilted head, a thrown-back laugh. */
  cxDelta: number;
  cyDelta: number;
  /** `faceX`: where a balloon tail attaches. */
  x: number;
  figure: SheetRect;
  /** The halo, when the pose has one. Drawn before *any* figure. */
  aura: SheetRect | null;
}

export interface PackedAvatar {
  name: string;
  type: string;
  /** `TORSOFIRST`: whether the collar sits over the jaw or under it. */
  torsoFirst: boolean;
  sheet: string;
  sheetWidth: number;
  sheetHeight: number;
  faces: PackedPart[];
  torsos: PackedPart[];
  /** Simple avatars only; complex avatars leave this empty. */
  bodies: PackedPart[];
}

export interface PackedBackdrop {
  id: string;
  file: string;
  width: number;
  height: number;
}

export interface CastManifest {
  version: 1;
  /** Role (`hero`, `guide`) → avatar. Casting is ADR 0004 §11. */
  cast: Record<string, PackedAvatar>;
  backdrops: PackedBackdrop[];
}

