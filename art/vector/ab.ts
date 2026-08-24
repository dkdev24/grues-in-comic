/**
 * Build the A/B page: each vector backdrop beside the image-model backdrop it
 * would replace, both at cell size, both thresholded to 1-bit.
 *
 * The plates are embedded as data URIs because a published artifact cannot
 * fetch anything from another host.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { decodePng } from "../src/png.js";
import type { Raster } from "../src/raster.js";

const REF: Record<string, string> = {
  field: "02-field.png",
  pastoral: "01-pastoral.png",
  "grating-clearing": "04-grating-clearing.png",
  "barrow-exterior": "03-barrow-exterior.png",
};

function ink(r: Raster, thr = 140): number {
  let dark = 0;
  for (let p = 0; p < r.data.length; p += 4) {
    const a = r.data[p + 3]! / 255;
    const lum = (0.299 * r.data[p]! + 0.587 * r.data[p + 1]! + 0.114 * r.data[p + 2]!) * a + 255 * (1 - a);
    if (lum < thr) dark++;
  }
  return dark / (r.width * r.height);
}

const uri = (path: string) => `data:image/png;base64,${readFileSync(path).toString("base64")}`;

const { scenes } = await import("./gen_early.mjs");
const data = scenes.map((s: any) => {
  const base = s.file.replace(/\.mjs$/, "");
  const small = `early/png/264/${base}.png`;
  const big = `early/png/512/${base}.png`;
  const ref = `../../reference/backdrops/${REF[s.pairsWith]}`;
  return {
    id: s.id,
    title: s.title,
    rooms: s.rooms,
    replaces: s.pairsWith,
    inkVector: ink(decodePng(readFileSync(small))).toFixed(3),
    inkModel: ink(decodePng(readFileSync(ref))).toFixed(3),
    vector: uri(small),
    vectorBig: uri(big),
    model: uri(ref),
  };
});

mkdirSync("ab", { recursive: true });
const html = readFileSync("ab/template.html", "utf8").replace("/*__DATA__*/", JSON.stringify(data));
writeFileSync("ab/index.html", html);
console.log(`ab/index.html  ${(html.length / 1024 / 1024).toFixed(2)} MB  ${data.length} pairs`);
for (const d of data) console.log(`  ${d.title.padEnd(20)} vector ${d.inkVector}   model ${d.inkModel}   (${d.replaces})`);
