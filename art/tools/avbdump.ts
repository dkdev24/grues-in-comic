#!/usr/bin/env tsx
/**
 * Dump an `.avb` file: every pose as a PNG, plus a JSON manifest.
 *
 * With `--composite`, a complex avatar is emitted as assembled figures — every
 * face against a neutral torso, and every torso under a neutral face — which is
 * the useful view when checking that the join geometry is right.
 *
 *   tsx art/bin/avbdump.ts <file.avb> <outdir> [--composite] [--no-aura]
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseAvatar, facesOf, torsosOf } from "../src/avb.js";
import { rasterizePose } from "../src/raster.js";
import { compositeBody } from "../src/composite.js";
import { firstNeutral } from "../src/pose.js";
import { encodePng } from "../src/png.js";

const [src, outdir, ...flags] = process.argv.slice(2);
if (!src || !outdir) {
  console.error("usage: avbdump <file.avb> <outdir> [--composite] [--no-aura]");
  process.exit(2);
}

const options = { includeAura: !flags.includes("--no-aura") };
const av = parseAvatar(new Uint8Array(readFileSync(src)), src);
mkdirSync(outdir, { recursive: true });

console.log(
  `${av.name ?? "?"} [${av.type}] v${av.version} flags=${av.flags} ` +
  `records=${av.records.length} adjust=${av.offsetAdjustment}`,
);

const manifest: unknown[] = [];
const label = (r: { kind: string; index: number; emotionName: string; intensity: number }) =>
  `${r.kind}${String(r.index).padStart(2, "0")}_${r.emotionName}_${r.intensity.toFixed(1)}`;

if (flags.includes("--composite") && av.type === "COMPLEX") {
  const faces = facesOf(av);
  const torsos = torsosOf(av);
  const neutralFace = firstNeutral(faces);
  const neutralTorso = firstNeutral(torsos);
  if (!neutralFace || !neutralTorso) throw new Error("no neutral pose to composite against");

  const pairs = [
    ...faces.map((face) => [face, neutralTorso] as const),
    ...torsos.map((torso) => [neutralFace, torso] as const),
  ];
  for (const [face, torso] of pairs) {
    const body = compositeBody(av, face, torso, options);
    const name = `${label(face)}+${label(torso)}.png`;
    writeFileSync(join(outdir, name), encodePng(body.raster));
    manifest.push({
      file: name, face: label(face), torso: label(torso),
      width: body.raster.width, height: body.raster.height,
      headHeight: body.headHeight, faceX: body.faceX,
    });
  }
} else {
  for (const rec of av.records) {
    const raster = rasterizePose(av, rec, options);
    const name = `${label(rec)}.png`;
    writeFileSync(join(outdir, name), encodePng(raster));
    manifest.push({
      file: name, kind: rec.kind, index: rec.index,
      emotion: rec.emotionName, intensity: rec.intensity,
      width: raster.width, height: raster.height,
      cx: rec.cx, cy: rec.cy, cxDelta: rec.cxDelta, cyDelta: rec.cyDelta,
      x: rec.x, y: rec.y,
    });
  }
}

writeFileSync(
  join(outdir, "manifest.json"),
  JSON.stringify({ name: av.name, type: av.type, flags: av.flags, poses: manifest }, null, 2),
);
console.log(`wrote ${manifest.length} images -> ${outdir}`);
