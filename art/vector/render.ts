/**
 * Rasterize the generated SVGs and threshold them to 1-bit, which is the only
 * form worth judging: the engine's whole discipline is that light comes from
 * breaking a black line, and an anti-aliased preview hides every place that
 * failed.
 *
 * qlmanage is the rasterizer (macOS only — see PITFALLS → Tooling; the art
 * itself is platform-independent, the preview pipeline is not). It renders at
 * 4x, this box-filters down and thresholds, and reports the ink ratio that
 * `measure.sh` reports, so a scene can be compared against the decoded
 * originals: field .261, room .381, pastoral .526.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, writeFileSync, rmSync } from "node:fs";
import { encodePng, decodePng } from "../src/png.js";
import type { Raster } from "../src/raster.js";

const SUPER = 4;
const SIZES = [512, 264];
const TMP = "/tmp/grues-vector-render";

/** Box-filter down to `size`, then hard-threshold: no grey survives. */
function downsampleThreshold(src: Raster, size: number, thr = 140): Raster {
  const out = new Uint8ClampedArray(size * size * 4);
  const sx = src.width / size, sy = src.height / size;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let sum = 0, n = 0;
      for (let j = Math.floor(y * sy); j < Math.min(src.height, Math.ceil((y + 1) * sy)); j++) {
        for (let i = Math.floor(x * sx); i < Math.min(src.width, Math.ceil((x + 1) * sx)); i++) {
          const p = (j * src.width + i) * 4;
          const a = src.data[p + 3]! / 255;
          // qlmanage renders on transparency; un-composited alpha reads as ink
          const lum = (0.299 * src.data[p]! + 0.587 * src.data[p + 1]! + 0.114 * src.data[p + 2]!) * a + 255 * (1 - a);
          sum += lum; n++;
        }
      }
      const v = sum / n < thr ? 0 : 255;
      const q = (y * size + x) * 4;
      out[q] = out[q + 1] = out[q + 2] = v;
      out[q + 3] = 255;
    }
  }
  return { width: size, height: size, data: out };
}

function ink(r: Raster): number {
  let dark = 0;
  for (let p = 0; p < r.data.length; p += 4) if (r.data[p]! < 128) dark++;
  return dark / (r.width * r.height);
}

function rasterize(svg: string, px: number): Raster {
  rmSync(TMP, { recursive: true, force: true });
  mkdirSync(TMP, { recursive: true });
  execFileSync("qlmanage", ["-t", "-s", String(px), "-o", TMP, svg], { stdio: "ignore" });
  const f = readdirSync(TMP).find(n => n.endsWith(".png"));
  if (!f) throw new Error(`qlmanage produced nothing for ${svg}`);
  return decodePng(readFileSync(`${TMP}/${f}`));
}

const only = process.argv.slice(2);
const files = readdirSync("early")
  .filter(f => f.endsWith(".svg"))
  .filter(f => only.length === 0 ? !f.startsWith("probe") : only.some(o => f.includes(o)))
  .sort();
if (files.length === 0) throw new Error("no SVGs in early/ — run `node gen_early.mjs` first");
for (const size of SIZES) mkdirSync(`early/png/${size}`, { recursive: true });

console.log("scene                       ink@264   (field .261  room .381  pastoral .526)");
for (const f of files) {
  const base = f.replace(/\.svg$/, "");
  const hi = rasterize(`early/${f}`, 512 * SUPER);
  for (const size of SIZES) {
    const r = downsampleThreshold(hi, size);
    writeFileSync(`early/png/${size}/${base}.png`, encodePng(r));
    if (size === 264) console.log(`${base.padEnd(26)} ${ink(r).toFixed(3)}`);
  }
}
rmSync(TMP, { recursive: true, force: true });
