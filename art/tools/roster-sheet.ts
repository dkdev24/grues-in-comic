#!/usr/bin/env tsx
/**
 * Contact sheet of the corpus — one figure per character, on a grid.
 *
 * The legibility gate of ADR 0004 §11 cannot be measured from pose counts, so
 * this renders the roster for a human to look at. With an emotion argument each
 * character is drawn wearing that face (falling back to neutral where it owns
 * none), which is how "lance's BORED is his NEUTRAL in a paper bag" is seen.
 *
 *   tsx art/tools/roster.ts > roster.json
 *   tsx art/tools/roster-sheet.ts roster.json sheet.png [EMOTION]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { parseAvatar, facesOf, torsosOf, bodiesOf } from "../src/avb.js";
import { compositeBody, compositeSimpleBody } from "../src/composite.js";
import { createRaster, blit, type Raster } from "../src/raster.js";
import { encodePng } from "../src/png.js";
import { firstNeutral } from "../src/pose.js";

const [rosterPath, outPath, want] = process.argv.slice(2);
if (!rosterPath || !outPath) {
  console.error("usage: roster-sheet <roster.json> <out.png> [EMOTION]");
  process.exit(2);
}
const inv = JSON.parse(readFileSync(rosterPath, "utf8"));
const ROOT = new URL("../../original-projects/comic-chat/v2.5-beta-1/", import.meta.url).pathname;
const CELL_W = 150, CELL_H = 190, COLS = 6;

function bodyOf(path: string, emotion?: string): Raster {
  const av = parseAvatar(new Uint8Array(readFileSync(path)), path);
  const opts = { includeAura: false };
  if (av.type !== "COMPLEX") {
    const b = bodiesOf(av);
    const body = (emotion ? b.find((r: any) => r.emotionName === emotion) : undefined) ?? firstNeutral(b) ?? b[0]!;
    return compositeSimpleBody(av, body, opts).raster;
  }
  const faces = facesOf(av), torsos = torsosOf(av);
  const face = (emotion ? faces.find((r: any) => r.emotionName === emotion) : undefined) ?? firstNeutral(faces) ?? faces[0]!;
  const torso = firstNeutral(torsos) ?? torsos[0]!;
  return compositeBody(av, face, torso, opts).raster;
}

function scaled(r: Raster, maxW: number, maxH: number): Raster {
  const s = Math.min(1, maxW / r.width, maxH / r.height);
  if (s >= 1) return r;
  const w = Math.max(1, Math.round(r.width * s)), h = Math.max(1, Math.round(r.height * s));
  const out = createRaster(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const sx = Math.min(r.width - 1, Math.floor(x / s)), sy = Math.min(r.height - 1, Math.floor(y / s));
    for (let c = 0; c < 4; c++) out.data[(y * w + x) * 4 + c] = r.data[(sy * r.width + sx) * 4 + c]!;
  }
  return out;
}

const rows = Math.ceil(inv.length / COLS);
const sheet = createRaster(CELL_W * COLS, CELL_H * rows);
sheet.data.fill(255);
inv.forEach((a: any, i: number) => {
  const r = scaled(bodyOf(`${ROOT}${a.pack}/${a.file}.avb`, want), CELL_W - 10, CELL_H - 10);
  const x = (i % COLS) * CELL_W + Math.floor((CELL_W - r.width) / 2);
  const y = Math.floor(i / COLS) * CELL_H + Math.floor((CELL_H - r.height) / 2);
  blit(sheet, r, x, y);
});
const line = (i: number) => { sheet.data[i] = sheet.data[i+1] = sheet.data[i+2] = 190; sheet.data[i+3] = 255; };
for (let g = 1; g < COLS; g++) for (let y = 0; y < sheet.height; y++) line((y * sheet.width + g * CELL_W) * 4);
for (let g = 1; g < rows; g++) for (let x = 0; x < sheet.width; x++) line((g * CELL_H * sheet.width + x) * 4);
writeFileSync(outPath, encodePng(sheet));
console.log(inv.map((a: any, i: number) => `${i}:${a.file}`).join(" "));
