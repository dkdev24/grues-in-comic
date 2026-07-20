/**
 * Turning decoded planes into RGBA.
 *
 * Comic Chat drew a pose as up to three Win32 blits (`bodycam.cpp:438`):
 *
 *     aura    MERGEPAINT   dest = dest | ~src   — punch a white halo
 *     mask    MERGEPAINT   dest = dest | ~src   — punch the figure silhouette
 *     drawing SRCAND       dest = dest & src    — AND the ink in
 *
 * Read as alpha rather than as raster ops, that says: the mask and aura planes
 * define *coverage*, the drawing defines *colour*, and any pixel no plane
 * punched keeps the backdrop — which is transparency. That reading is what this
 * file implements; the three-blit dance is a Win32 implementation detail a
 * renderer with an alpha channel does not need.
 *
 * When a pose has neither plane (every masked-mono pose, which packs all three
 * into one 2bpp bitmap), coverage comes from the drawing itself.
 */
import { decodeImage, type DecodedImage } from "./image.js";
import { adjustOffset } from "./avb.js";
import {
  AIP_DUALMASK, AIP_MASKEDMONO, HEADMASK, TORSOMASK,
  type Avatar, type PartKind, type PoseRecord,
} from "./format.js";

export interface Raster {
  width: number;
  height: number;
  /** RGBA8, row-major, top-down. */
  data: Uint8ClampedArray;
}

/**
 * `AIP_MASKEDMONO` 2bpp semantics: `00` blank, `01` aura, `10` paper, `11` ink.
 *
 * **The header comment is wrong, and this is the one place it matters.**
 * `avbfile.h:93` claims `10 = black, 11 = white`. The conversion that actually
 * runs says otherwise — `CPose::ConvertMasksCommon` (`avbfile.cpp:1636`) splits
 * the pair into three 1bpp DIBs, image/mask/aura:
 *
 *     00 => 0,0,0    01 => 1,0,1    10 => 0,1,1    11 => 1,1,1
 *
 * and every one of those DIBs is given the colour table `[white, black]`, so in
 * the image DIB `10` → 0 → white and `11` → 1 → black: the opposite of the
 * header. (`pbDestBits[0] &= pbDestBits[1]` then forces the aura-only region to
 * white, which is why `01` never carries ink.)
 *
 * Trusting the header inverts every masked-mono figure — white linework on a
 * black silhouette. It is easy to miss because the shapes stay perfectly
 * correct; only the polarity is wrong. `test/polarity.test.ts` pins it.
 *
 * Separately, `MaskedMonoPalette` is *not* these meanings — that array is the
 * colour table used while splitting for BitBlt (gotcha 3). Using it renders the
 * figure dark-red and navy: again the right shape, wrong colour.
 */
const MASKEDMONO_BLANK = 0;
const MASKEDMONO_AURA = 1;
const MASKEDMONO_PAPER = 2;
const MASKEDMONO_INK = 3;

function isMaskedMono(paletteType: number): boolean {
  return paletteType === AIP_MASKEDMONO || paletteType === AIP_DUALMASK;
}

function luminance(c: readonly [number, number, number]): number {
  return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
}

/**
 * Coverage from a mask or aura plane: 1 where the plane punches, 0 elsewhere.
 *
 * Polarity is read from the palette, not assumed. 2833 aura planes in the
 * corpus have the colour table `[white, black]` but **73 have `[black, white]`**
 * — index 0 is not reliably the figure. Testing luminance rather than the raw
 * index is what makes both decode right; assuming either one silently inverts
 * the other group.
 */
export function planeCoverage(img: DecodedImage, paletteType: number): Uint8Array {
  const out = new Uint8Array(img.width * img.height);
  if (isMaskedMono(paletteType)) {
    // A dual-mask plane reuses the masked-mono encoding: anything not blank is
    // covered, so mask and aura ride in a single 2bpp bitmap.
    for (let i = 0; i < out.length; i++) {
      out[i] = img.pixels[i] !== MASKEDMONO_BLANK ? 1 : 0;
    }
    return out;
  }
  const pal = img.palette ?? [];
  const dark = pal.map((c) => (luminance(c) < 128 ? 1 : 0));
  for (let i = 0; i < out.length; i++) out[i] = dark[img.pixels[i]!] ?? 0;
  return out;
}

/**
 * Nearest-neighbour resample.
 *
 * Needed because Win32 blitted every plane into the same destination rectangle
 * — a StretchBlt, not a BitBlt — so a plane whose dimensions disagree with the
 * drawing was silently scaled. One asset relies on this: Xeno's LAUGH face
 * carries 145×150 planes against a 150×158 drawing, in all four versions of
 * the file. Everything else in the corpus matches exactly.
 */
function stretch(
  src: Uint8Array, sw: number, sh: number, dw: number, dh: number,
): Uint8Array {
  if (sw === dw && sh === dh) return src;
  const out = new Uint8Array(dw * dh);
  for (let y = 0; y < dh; y++) {
    const sy = Math.min(sh - 1, ((y * sh) / dh) | 0);
    for (let x = 0; x < dw; x++) {
      const sx = Math.min(sw - 1, ((x * sw) / dw) | 0);
      out[y * dw + x] = src[sy * sw + sx]!;
    }
  }
  return out;
}

/** Which parts honour their mask plane, per the avatar's `AK_FLAGS`. */
export function usesMask(av: Avatar, kind: PartKind): boolean {
  if (kind === "face") return (av.flags & HEADMASK) !== 0;
  if (kind === "torso") return (av.flags & TORSOMASK) !== 0;
  // CBodySingle::DrawBody draws only aura and drawing — a simple avatar's body
  // mask, if the record even carries one, is never blitted.
  return false;
}

export interface RasterizeOptions {
  /**
   * Include the aura — the white halo that lifted a figure off a backdrop.
   * Comic Chat always drew it (`drawNimbus`), but it is pure presentation: a
   * renderer compositing onto its own background may not want it.
   */
  includeAura?: boolean;
}

/**
 * A pose split into the two layers the draw order needs to keep apart.
 *
 * The halo has to be a separate layer because of a compositing rule the paper
 * is explicit about (§4.4): *both* halos are drawn before *either* figure, so
 * that the head's halo cannot erase the body and the body's halo cannot erase
 * the head. Flatten a part into one layer and the second part blitted wipes a
 * halo-shaped bite out of the first at the neck.
 */
export interface PoseLayers {
  /** The white halo, or null when the pose has none. */
  aura: Raster | null;
  /** Ink and paper — the figure proper. */
  figure: Raster;
  width: number;
  height: number;
}

/**
 * Rasterize one pose record, resolving all three planes, as separable layers.
 */
export function rasterizeLayers(
  av: Avatar, rec: PoseRecord, options: RasterizeOptions = {},
): PoseLayers {
  const includeAura = options.includeAura ?? true;
  const img = decodeImage(
    av.bytes, adjustOffset(rec.image, av), rec.imageFormat, rec.imagePalette,
    av.globalPalette,
  );
  const { width, height } = img;
  const maskedMono = isMaskedMono(rec.imagePalette);

  const readPlane = (offset: number, format: number, paletteType: number) => {
    if (!offset) return null;
    const plane = decodeImage(
      av.bytes, adjustOffset(offset, av), format, paletteType, av.globalPalette,
    );
    return stretch(
      planeCoverage(plane, paletteType), plane.width, plane.height, width, height,
    );
  };

  const auraPlane = includeAura ? readPlane(rec.aura, rec.auraFormat, rec.auraPalette) : null;
  const maskPlane = usesMask(av, rec.kind)
    ? readPlane(rec.mask, rec.maskFormat, rec.maskPalette)
    : null;

  // Figure coverage. With a mask plane that plane defines it; otherwise it
  // comes from the drawing — masked-mono carries its own, and for a plain DIB
  // only the ink survives SRCAND onto an unpunched destination.
  const coverage = new Uint8Array(width * height);
  if (maskPlane) {
    coverage.set(maskPlane);
  } else if (maskedMono) {
    for (let i = 0; i < coverage.length; i++) {
      const v = img.pixels[i]!;
      coverage[i] = v === MASKEDMONO_PAPER || v === MASKEDMONO_INK ? 1 : 0;
    }
  } else {
    const pal = img.palette ?? [];
    for (let i = 0; i < coverage.length; i++) {
      const c = pal[img.pixels[i]!];
      coverage[i] = c && luminance(c) < 128 ? 1 : 0;
    }
  }

  // Halo coverage. Masked-mono marks it with pixel value 1 in the same bitmap.
  let auraCoverage: Uint8Array | null = auraPlane;
  if (!auraCoverage && includeAura && maskedMono) {
    auraCoverage = new Uint8Array(width * height);
    for (let i = 0; i < auraCoverage.length; i++) {
      auraCoverage[i] = img.pixels[i] === MASKEDMONO_AURA ? 1 : 0;
    }
  }

  let aura: Raster | null = null;
  if (auraCoverage) {
    aura = createRaster(width, height);
    for (let i = 0; i < auraCoverage.length; i++) {
      if (!auraCoverage[i]) continue;
      aura.data[i * 4] = 255;
      aura.data[i * 4 + 1] = 255;
      aura.data[i * 4 + 2] = 255;
      aura.data[i * 4 + 3] = 255;
    }
  }

  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < coverage.length; i++) {
    if (!coverage[i]) continue;
    let r: number, g: number, b: number;
    if (img.rgb) {
      r = img.rgb[i * 3]!; g = img.rgb[i * 3 + 1]!; b = img.rgb[i * 3 + 2]!;
    } else if (maskedMono) {
      const ink = img.pixels[i] === MASKEDMONO_INK;
      r = g = b = ink ? 0 : 255;
    } else {
      const c = img.palette?.[img.pixels[i]!] ?? ([255, 0, 255] as const);
      [r, g, b] = c;
    }
    data[i * 4] = r; data[i * 4 + 1] = g; data[i * 4 + 2] = b; data[i * 4 + 3] = 255;
  }
  return { aura, figure: { width, height, data }, width, height };
}

/**
 * Rasterize one pose flattened — halo behind figure.
 *
 * Correct for a lone pose. For a face/torso join use {@link rasterizeLayers}
 * and interleave the layers; see `composite.ts`.
 */
export function rasterizePose(
  av: Avatar, rec: PoseRecord, options: RasterizeOptions = {},
): Raster {
  const layers = rasterizeLayers(av, rec, options);
  if (!layers.aura) return layers.figure;
  const out = createRaster(layers.width, layers.height);
  blit(out, layers.aura, 0, 0);
  blit(out, layers.figure, 0, 0);
  return out;
}

/** Copy `src` onto `dst` at (`dx`, `dy`), source alpha wins. */
export function blit(dst: Raster, src: Raster, dx: number, dy: number): void {
  for (let y = 0; y < src.height; y++) {
    const ty = dy + y;
    if (ty < 0 || ty >= dst.height) continue;
    for (let x = 0; x < src.width; x++) {
      const tx = dx + x;
      if (tx < 0 || tx >= dst.width) continue;
      const s = (y * src.width + x) * 4;
      if (!src.data[s + 3]) continue;
      const d = (ty * dst.width + tx) * 4;
      dst.data[d] = src.data[s]!;
      dst.data[d + 1] = src.data[s + 1]!;
      dst.data[d + 2] = src.data[s + 2]!;
      dst.data[d + 3] = src.data[s + 3]!;
    }
  }
}

export function createRaster(width: number, height: number): Raster {
  return { width, height, data: new Uint8ClampedArray(width * height * 4) };
}
