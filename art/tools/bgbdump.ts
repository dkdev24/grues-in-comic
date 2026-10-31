/**
 * Decode Comic Chat `.bgb` backdrops (the original Jim Woodring art) to PNG.
 *
 * A backdrop is the same container as an avatar (`AF_MAGIC_NEW`, type
 * `AT_BACKDROP`) but carries no pose records — the image hangs off a single
 * `AK_BACKDROP` (258) record: a u32 offset, a u8 image format and a u8 palette
 * type. `parseAvatar` therefore reports zero records for these files, which is
 * correct and is why they need their own reader.
 *
 * The offset is subject to `AK_OFFSET_ADJUSTMENT` like every other offset in
 * the format; without applying it the offset lands inside the copyright string.
 *
 *   pnpm exec tsx tools/bgbdump.ts <out-dir> <file.bgb>...
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { basename, join } from "node:path";
import { Reader } from "../src/reader.js";
import { decodeImage } from "../src/image.js";
import { encodePng } from "../src/png.js";

const AK_STARTDATA = 6, AK_ICON_NEW = 256, AK_BACKDROP = 258, AK_OFFSET_ADJUSTMENT = 263;

const [outDir, ...files] = process.argv.slice(2);
if (!outDir || files.length === 0) {
  console.error("usage: bgbdump.ts <out-dir> <file.bgb>...");
  process.exit(2);
}
mkdirSync(outDir, { recursive: true });

for (const path of files) {
  const bytes = new Uint8Array(readFileSync(path));
  const r = new Reader(bytes);
  r.u16(); r.u16(); r.u16();            // magic, type, version
  let img, adjust = 0;
  for (;;) {
    const tag = r.u16();
    if (tag === AK_STARTDATA) break;
    const size = tag >= AK_ICON_NEW ? r.u16() : 0;
    if (tag === AK_OFFSET_ADJUSTMENT) { adjust += r.i32(); continue; }
    if (tag === AK_BACKDROP) {
      const offset = r.u32(), format = r.u8(), pal = r.u8();
      img = decodeImage(bytes, offset + adjust, format, pal);
      break;
    }
    r.raw(size);
  }
  if (!img) { console.error(`${path}: no AK_BACKDROP record`); continue; }

  const { width, height, pixels, palette, rgb } = img;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const c = rgb ? [rgb[i * 3], rgb[i * 3 + 1], rgb[i * 3 + 2]] : (palette?.[pixels[i]!] ?? [0, 0, 0]);
    data.set([c[0]!, c[1]!, c[2]!, 255], i * 4);
  }
  const out = join(outDir, `${basename(path, ".bgb")}.png`);
  writeFileSync(out, encodePng({ width, height, data }));
  console.log(`${out}  ${width}x${height}  ${rgb ? "rgb" : `pal${palette?.length}`}`);
}
