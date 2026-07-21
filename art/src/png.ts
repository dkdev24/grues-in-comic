/** Minimal PNG encoder/decoder — RGBA8. Enough for a build-time pipeline. */
import { deflateSync, inflateSync } from "node:zlib";
import { createRaster, type Raster } from "./raster.js";

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let c = -1;
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff]! ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

export function encodePng(raster: Raster): Uint8Array {
  const { width, height, data } = raster;
  // One filter byte (0 = None) per scanline.
  const raw = new Uint8Array(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    raw.set(data.subarray(y * width * 4, (y + 1) * width * 4), y * (1 + width * 4) + 1);
  }

  const ihdr = new Uint8Array(13);
  const view = new DataView(ihdr.buffer);
  view.setUint32(0, width);
  view.setUint32(4, height);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA

  const parts = [
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", new Uint8Array(deflateSync(raw, { level: 9 }))),
    chunk("IEND", new Uint8Array(0)),
  ];
  const total = parts.reduce((n, p) => n + p.length, 0);
  const png = new Uint8Array(total);
  let at = 0;
  for (const p of parts) { png.set(p, at); at += p.length; }
  return png;
}

const paeth = (a: number, b: number, c: number): number => {
  const p = a + b - c;
  const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
};

/** Reverse a scanline's filter in place; `bpp` is bytes per pixel. */
function unfilter(type: number, cur: Uint8Array, prev: Uint8Array, bpp: number): void {
  const n = cur.length;
  switch (type) {
    case 0: break; // None
    case 1: for (let i = bpp; i < n; i++) cur[i] = (cur[i]! + cur[i - bpp]!) & 0xff; break; // Sub
    case 2: for (let i = 0; i < n; i++) cur[i] = (cur[i]! + prev[i]!) & 0xff; break; // Up
    case 3: for (let i = 0; i < n; i++) { // Average
      const a = i >= bpp ? cur[i - bpp]! : 0;
      cur[i] = (cur[i]! + ((a + prev[i]!) >> 1)) & 0xff;
    } break;
    case 4: for (let i = 0; i < n; i++) { // Paeth
      const a = i >= bpp ? cur[i - bpp]! : 0;
      const c = i >= bpp ? prev[i - bpp]! : 0;
      cur[i] = (cur[i]! + paeth(a, prev[i]!, c)) & 0xff;
    } break;
    default: throw new Error(`unsupported PNG filter ${type}`);
  }
}

/**
 * Decode a PNG this module (or any 8-bit non-interlaced encoder) produced, as an
 * opaque `Raster`. Handles colour types 0/2/6 — greyscale, RGB, RGBA — which is
 * what the build pipeline emits; a fuller decoder is not the job here.
 */
export function decodePng(bytes: Uint8Array): Raster {
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < 8; i++) if (bytes[i] !== sig[i]) throw new Error("not a PNG");

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let pos = 8, width = 0, height = 0, bitDepth = 0, colorType = 0;
  const idat: Uint8Array[] = [];
  while (pos < bytes.length) {
    const len = view.getUint32(pos);
    const type = String.fromCharCode(bytes[pos + 4]!, bytes[pos + 5]!, bytes[pos + 6]!, bytes[pos + 7]!);
    const data = bytes.subarray(pos + 8, pos + 8 + len);
    if (type === "IHDR") {
      const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);
      width = dv.getUint32(0); height = dv.getUint32(4);
      bitDepth = data[8]!; colorType = data[9]!;
      if (data[12] !== 0) throw new Error("interlaced PNG unsupported");
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      break;
    }
    pos += 12 + len; // length(4) + type(4) + data + crc(4)
  }
  if (bitDepth !== 8) throw new Error(`unsupported PNG bit depth ${bitDepth}`);
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : colorType === 0 ? 1 : 0;
  if (!channels) throw new Error(`unsupported PNG colour type ${colorType}`);

  let compLen = 0;
  for (const c of idat) compLen += c.length;
  const comp = new Uint8Array(compLen);
  for (let at = 0, i = 0; i < idat.length; i++) { comp.set(idat[i]!, at); at += idat[i]!.length; }
  const raw = new Uint8Array(inflateSync(comp));

  const stride = width * channels;
  const raster = createRaster(width, height);
  let prev = new Uint8Array(stride);
  let cur = new Uint8Array(stride);
  let rp = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[rp++]!;
    cur.set(raw.subarray(rp, rp + stride));
    rp += stride;
    unfilter(filter, cur, prev, channels);
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4;
      if (channels === 4) {
        raster.data[o] = cur[x * 4]!; raster.data[o + 1] = cur[x * 4 + 1]!;
        raster.data[o + 2] = cur[x * 4 + 2]!; raster.data[o + 3] = cur[x * 4 + 3]!;
      } else if (channels === 3) {
        raster.data[o] = cur[x * 3]!; raster.data[o + 1] = cur[x * 3 + 1]!;
        raster.data[o + 2] = cur[x * 3 + 2]!; raster.data[o + 3] = 255;
      } else {
        const v = cur[x]!;
        raster.data[o] = v; raster.data[o + 1] = v; raster.data[o + 2] = v; raster.data[o + 3] = 255;
      }
    }
    [prev, cur] = [cur, prev];
  }
  return raster;
}
