/**
 * Pixel decoding for the two `.avb` storage formats.
 *
 * Output is always a `DecodedImage`: palette indices plus the palette to read
 * them through. Mapping to RGBA is `raster.ts`'s job, because what an index
 * *means* depends on the palette type, not on how the bytes were stored.
 */
import { Reader } from "./reader.js";
import { inflate } from "./inflate.js";
import {
  AIF_DIB, AIP_GLOBALPALETTE, AIP_LOCALPALETTE, AIP_MASKEDMONO,
  AIP_MONOCHROME, AIP_DUALMASK, AK_COLORPALETTE, BI_RLE4, BI_RLE8, type RGB,
} from "./format.js";

/** `MaskedMonoPalette` (`avbfile.cpp:8`) — a Win32 BitBlt artefact, not render colours. */
export const MASKEDMONO_PALETTE: RGB[] = [
  [255, 255, 255], [0, 0, 0], [128, 0, 0], [0, 0, 128],
];
export const MONO_PALETTE: RGB[] = [[255, 255, 255], [0, 0, 0]];

export interface DecodedImage {
  width: number;
  height: number;
  /** Row-major, top-down, one palette index per pixel. */
  pixels: Uint8Array;
  /** Absent for 24bpp images, where `pixels` is unused and `rgb` is set. */
  palette?: RGB[];
  /** Set only for 24bpp DIBs: packed RGB triples, row-major top-down. */
  rgb?: Uint8Array;
}

interface Bmih {
  width: number;
  height: number;
  bits: number;
  compression: number;
  colorsUsed: number;
}

/** BITMAPINFOHEADER after its leading `biSize`, which the caller has consumed. */
function readBmih(r: Reader): Bmih {
  const width = r.i32();
  const height = r.i32();
  r.u16(); // biPlanes
  const bits = r.u16();
  const compression = r.u32();
  r.u32(); // biSizeImage
  r.u32(); // biXPelsPerMeter
  r.u32(); // biYPelsPerMeter
  const colorsUsed = r.u32();
  r.u32(); // biClrImportant
  return { width, height, bits, compression, colorsUsed };
}

function readPalette(r: Reader): RGB[] {
  const n = r.i16();
  const out: RGB[] = [];
  for (let i = 0; i < n; i++) out.push([r.u8(), r.u8(), r.u8()]);
  return out;
}

/**
 * Unpack DIB rows: 4-byte aligned stride, bottom-up unless the height is
 * negative. Returns top-down, which is what every downstream consumer wants.
 */
function unpackRows(
  data: Uint8Array, width: number, height: number, bits: number, topDown: boolean,
): { pixels: Uint8Array; rgb?: Uint8Array } {
  const stride = (((width * bits + 31) / 32) | 0) * 4;
  if (bits === 24) {
    const rgb = new Uint8Array(width * height * 3);
    for (let y = 0; y < height; y++) {
      const src = y * stride;
      const dst = (topDown ? y : height - 1 - y) * width * 3;
      for (let x = 0; x < width; x++) {
        // DIBs store BGR.
        rgb[dst + x * 3] = data[src + x * 3 + 2] ?? 0;
        rgb[dst + x * 3 + 1] = data[src + x * 3 + 1] ?? 0;
        rgb[dst + x * 3 + 2] = data[src + x * 3] ?? 0;
      }
    }
    return { pixels: new Uint8Array(0), rgb };
  }

  const pixels = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    const src = y * stride;
    const dst = (topDown ? y : height - 1 - y) * width;
    for (let x = 0; x < width; x++) {
      let v: number;
      switch (bits) {
        case 1: v = ((data[src + (x >> 3)] ?? 0) >> (7 - (x & 7))) & 1; break;
        case 2: v = ((data[src + (x >> 2)] ?? 0) >> (6 - 2 * (x & 3))) & 3; break;
        case 4: v = ((data[src + (x >> 1)] ?? 0) >> (x & 1 ? 0 : 4)) & 0xf; break;
        case 8: v = data[src + x] ?? 0; break;
        default: throw new Error(`unsupported bpp ${bits}`);
      }
      pixels[dst + x] = v;
    }
  }
  return { pixels };
}

/**
 * BI_RLE4 / BI_RLE8. Encoded runs plus four escapes: end-of-line,
 * end-of-bitmap, delta, and an absolute run padded to a word boundary.
 * RLE rows are bottom-up, so the result is flipped before returning.
 */
function decodeRle(
  data: Uint8Array, width: number, height: number, bits: number,
): Uint8Array {
  const rows = new Uint8Array(width * height);
  let x = 0, y = 0, p = 0;

  const put = (v: number) => {
    if (x < width && y < height) rows[(height - 1 - y) * width + x] = v;
    x++;
  };

  while (p < data.length - 1 && y < height) {
    const n = data[p]!;
    const v = data[p + 1]!;
    p += 2;
    if (n) {
      for (let i = 0; i < n; i++) {
        if (x >= width) break;
        put(bits === 8 ? v : i % 2 === 0 ? v >> 4 : v & 0xf);
      }
    } else if (v === 0) {
      x = 0;
      y++;
    } else if (v === 1) {
      break;
    } else if (v === 2) {
      x += data[p]!;
      y += data[p + 1]!;
      p += 2;
    } else if (bits === 8) {
      for (let i = 0; i < v; i++) put(data[p + i]!);
      p += v + (v & 1);
    } else {
      for (let i = 0; i < v; i++) {
        const b = data[p + (i >> 1)]!;
        put(i % 2 === 0 ? b >> 4 : b & 0xf);
      }
      const nb = (v + 1) >> 1;
      p += nb + (nb & 1);
    }
  }
  return rows;
}

/**
 * Decode the image at `offset`.
 *
 * `AIF_DIB` means a complete `.BMP` file is embedded there. `AIF_LZDEFLATE`
 * means an optional inline palette, a truncated BITMAPINFOHEADER, then a zlib
 * stream — see `docs/AVB_FORMAT.md`.
 */
export function decodeImage(
  buf: Uint8Array, offset: number, format: number, paletteType: number,
  globalPalette?: RGB[],
): DecodedImage {
  const r = new Reader(buf, offset);

  if (format === AIF_DIB) {
    if (r.u8() !== 0x42 || r.u8() !== 0x4d) throw new Error("not a BMP");
    r.u32(); // bfSize
    r.u32(); // bfReserved
    const bitsOffset = r.u32();
    const headerSize = r.u32();
    if (headerSize !== 40) throw new Error(`unsupported DIB header ${headerSize}`);
    const info = readBmih(r);
    const ncol = info.colorsUsed || (info.bits <= 8 ? 1 << info.bits : 0);
    const palette: RGB[] = [];
    for (let i = 0; i < ncol; i++) {
      const b = r.u8(), g = r.u8(), rr = r.u8();
      r.u8(); // reserved — DIB colour table entries are RGBQUAD
      palette.push([rr, g, b]);
    }
    const data = buf.subarray(offset + bitsOffset);
    const height = Math.abs(info.height);
    if (info.compression === BI_RLE4 || info.compression === BI_RLE8) {
      return {
        width: info.width, height, palette,
        pixels: decodeRle(data, info.width, height, info.bits),
      };
    }
    const { pixels, rgb } = unpackRows(data, info.width, height, info.bits, info.height < 0);
    return rgb
      ? { width: info.width, height, pixels, rgb }
      : { width: info.width, height, pixels, palette };
  }

  // AIF_LZDEFLATE
  let palette: RGB[] | undefined;
  if (paletteType === AIP_LOCALPALETTE) {
    const tag = r.u16();
    r.u16(); // size
    if (tag !== AK_COLORPALETTE) throw new Error(`expected palette tag, got ${tag}`);
    palette = readPalette(r);
  } else if (paletteType === AIP_GLOBALPALETTE) {
    palette = globalPalette;
  } else if (paletteType === AIP_MONOCHROME) {
    palette = MONO_PALETTE;
  } else if (paletteType === AIP_MASKEDMONO || paletteType === AIP_DUALMASK) {
    palette = MASKEDMONO_PALETTE;
  }

  const headerSize = r.u32();
  if (headerSize < 40 || headerSize > 240) throw new Error(`bad header size ${headerSize}`);
  const info = readBmih(r);
  r.pos += headerSize - 40; // skip any extension beyond BITMAPINFOHEADER
  const uncompressed = r.u32();
  const compressed = r.u32();
  const data = inflate(r.raw(compressed));
  if (data.length !== uncompressed) {
    throw new Error(`size mismatch ${data.length} != ${uncompressed}`);
  }
  const height = Math.abs(info.height);
  const { pixels, rgb } = unpackRows(data, info.width, height, info.bits, info.height < 0);
  const out: DecodedImage = { width: info.width, height, pixels };
  if (rgb) out.rgb = rgb;
  if (palette) out.palette = palette;
  return out;
}
