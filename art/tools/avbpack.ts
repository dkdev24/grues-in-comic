#!/usr/bin/env tsx
/**
 * Pack a cast for the browser: one sprite sheet per avatar, plus a manifest.
 *
 *   tsx art/tools/avbpack.ts <outdir> <role=file.avb>... [--backdrop <id>=<file.bmp>]...
 *
 * The decisions this bundle encodes are documented on the types it writes —
 * `art/src/pack.ts`. This file is only the CLI around them.
 *
 * `avbdump.ts` remains the *inspection* tool: one PNG per pose, assembled
 * figures under `--composite`, for looking at the corpus. This one is the build.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { parseAvatar } from "../src/avb.js";
import { packAvatar, type CastManifest } from "../src/pack.js";
import { encodePng } from "../src/png.js";
import { decodeBmp } from "../src/bmp.js";

const args = process.argv.slice(2);
const outdir = args.shift();
if (!outdir) {
  console.error("usage: avbpack <outdir> <role=file.avb>... [--backdrop <id>=<file.bmp>]...");
  process.exit(2);
}
mkdirSync(outdir, { recursive: true });

const manifest: CastManifest = { version: 1, cast: {}, backdrops: [] };

for (let i = 0; i < args.length; i++) {
  const arg = args[i]!;
  if (arg === "--backdrop") {
    const spec = args[++i];
    if (!spec) throw new Error("--backdrop needs <id>=<file.bmp>");
    const [id, file] = split(spec);
    const raster = decodeBmp(new Uint8Array(readFileSync(file)));
    writeFileSync(join(outdir, `${id}.png`), encodePng(raster));
    manifest.backdrops.push({ id, file: `${id}.png`, width: raster.width, height: raster.height });
    console.log(`backdrop ${id}: ${raster.width}×${raster.height}`);
    continue;
  }

  const [role, file] = split(arg);
  const av = parseAvatar(new Uint8Array(readFileSync(file)), file);
  const { avatar, sheet } = packAvatar(av, basename(file).replace(/\.avb$/i, ""));
  const png = encodePng(sheet);
  writeFileSync(join(outdir, avatar.sheet), png);
  manifest.cast[role] = avatar;
  console.log(
    `${role} = ${avatar.name} [${avatar.type}] ` +
    `${avatar.faces.length} faces × ${avatar.torsos.length} torsos ` +
    `= ${avatar.faces.length * avatar.torsos.length} figures · ` +
    `sheet ${avatar.sheetWidth}×${avatar.sheetHeight}, ${(png.length / 1024).toFixed(1)} KiB`,
  );
}

writeFileSync(join(outdir, "cast.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`wrote ${join(outdir, "cast.json")}`);

function split(spec: string): [string, string] {
  const at = spec.indexOf("=");
  if (at < 0) throw new Error(`expected <name>=<file>, got ${spec}`);
  return [spec.slice(0, at), spec.slice(at + 1)];
}
