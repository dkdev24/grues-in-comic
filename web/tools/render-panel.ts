/**
 * PNG render harness (dev-only). Renders real panels to disk with the same
 * `renderPanel` path the browser uses, so tail/placement geometry can be
 * eyeballed without launching the app.
 *
 * Not a test: it depends on `@napi-rs/canvas` (a devDependency) and the built
 * cast assets, and it writes images, so it lives in `tools/`, beside `serve.ts`.
 *
 * Usage:  tsx tools/render-panel.ts [walkthrough.cmd] [outDir]
 * Renders every panel of the walkthrough that carries a Hero balloon (the
 * close-ups this validates), plus a filmstrip note to stdout.
 */

import { readFileSync } from "node:fs";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import type { WorldDocument } from "@grues-in-comic/ir";
import { createSession } from "../src/session.js";
import { CAPTION, GUIDE, HERO, createMapper, lineOf, type Line, type Panel } from "../src/comic/mapper.js";
import { objectNameTable } from "../src/status.js";
import { backdropFor } from "../src/comic/backdrop.js";
import { renderPanel } from "../src/comic/render.js";
import type { Cast } from "../src/comic/figure.js";
import type { CastManifest } from "../../art/src/cast-manifest.js";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const WORLD = join(ROOT, "ir", "artifacts", "zork1.world.json");
const WALKTHROUGHS = join(ROOT, "verification", "walkthroughs");
const ASSETS = join(ROOT, "web", "assets", "comic");
const SEED = 1234;

const PANEL_W = 480;
const PANEL_H = 400;

async function loadCastFromDisk(): Promise<Cast> {
  const manifest = JSON.parse(readFileSync(join(ASSETS, "cast.json"), "utf8")) as CastManifest;
  const sheets = new Map<string, Awaited<ReturnType<typeof loadImage>>>();
  const backdrops = new Map<string, Awaited<ReturnType<typeof loadImage>>>();
  for (const [role, avatar] of Object.entries(manifest.cast)) {
    sheets.set(role, await loadImage(join(ASSETS, avatar.sheet)));
  }
  for (const backdrop of manifest.backdrops) {
    backdrops.set(backdrop.id, await loadImage(join(ASSETS, backdrop.file)));
  }
  // The Cast type wants ImageBitmap|HTMLImageElement; napi Images satisfy the
  // `drawImage` call sites at runtime, which is all render.ts uses them for.
  return { manifest, sheets, backdrops } as unknown as Cast;
}

function panels(file: string): Panel[] {
  const doc = JSON.parse(readFileSync(WORLD, "utf8")) as WorldDocument;
  const session = createSession(doc, { seed: SEED });
  // A tiny script so a Guide two-shot renders too (distant-tail regression check).
  const guideScript = new Map([["WEST-OF-HOUSE", "The empire notices what leaves it."]]);
  const beatScript = new Map([["reveal", "It was waiting to be found."]]);
  const mapper = createMapper({
    names: objectNameTable(doc.objects), guideScript, beatScript, guideCooldown: 0,
  });
  mapper.panel(session.start());
  const commands = readFileSync(join(WALKTHROUGHS, file), "utf8")
    .split("\n").map((l) => l.trim()).filter((l) => l.length > 0 && !l.startsWith("#"));
  for (const command of commands) mapper.panel(session.command(command));
  return [...mapper.panels];
}

async function main(): Promise<void> {
  const file = process.argv[2] ?? "01-west-of-house.cmd";
  const outDir = process.argv[3] ?? join(ROOT, "web", "tools", "out");
  mkdirSync(outDir, { recursive: true });

  const cast = await loadCastFromDisk();
  const all = panels(file);

  // A two-line caption reproduces the reported bug: it pushes the Hero balloon
  // down *beside* the head, where the tail aimed at face-centre crosses the face.
  const TALL_CAPTION = "In disturbing the pile of leaves, a grating is revealed.";

  let n = 0;
  const variants: Array<{ suffix: string; panel: Panel }> = [];
  for (const [i, panel] of all.entries()) {
    const hero = lineOf(panel, HERO);
    if (hero === null && lineOf(panel, GUIDE) === null) continue; // balloons under test
    variants.push({ suffix: `p${String(i).padStart(2, "0")}-${panel.camera}`, panel });
    // For close-up Hero panels, also render a beside-head variant.
    if (hero !== null && panel.camera === "close-up") {
      const tallCap: Line = { speaker: CAPTION, balloonClass: "CBWoodringBox", text: TALL_CAPTION };
      // Prepend the caption (draw order: box first), replacing any existing one.
      const speakers = [tallCap, ...panel.speakers.filter((l) => l.speaker !== CAPTION)];
      variants.push({
        suffix: `p${String(i).padStart(2, "0")}-${panel.camera}-tallcap`,
        panel: { ...panel, speakers },
      });
    }
  }
  for (const { suffix, panel } of variants) {
    const canvas = createCanvas(PANEL_W, PANEL_H);
    const ctx = canvas.getContext("2d") as unknown as CanvasRenderingContext2D;
    renderPanel(ctx, panel, cast, PANEL_W, PANEL_H, { backdrop: backdropFor(panel.room) });
    const name = `${file.replace(/\.cmd$/, "")}-${suffix}.png`;
    writeFileSync(join(outDir, name), canvas.toBuffer("image/png"));
    const heroLine = lineOf(panel, HERO);
    const guideLine = lineOf(panel, GUIDE);
    console.log(
      `${name}  camera=${panel.camera}` +
      `${heroLine ? ` hero="${heroLine.text}" (${heroLine.balloonClass})` : ""}` +
      `${guideLine ? ` guide="${guideLine.text}"` : ""}`,
    );
    n++;
  }
  console.log(`\n${n} panel(s) with a Hero balloon → ${outDir}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
