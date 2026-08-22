/**
 * `SHOTS` × cast contact sheets (dev-only, F4).
 *
 * `render-panel.ts` renders the *packed* cast — dan and tiki — which is exactly
 * what the pixel gate wants and exactly what the framing table was tuned on. F16
 * made a Hero a runtime skin, and the roster's Heroes are 445–480px tall against
 * dan's 388, with head fractions from 0.295 to 0.345 of the figure. Every one of
 * those numbers moves where a rung crops. This renders one rung across every
 * Hero so the drift is visible side by side, and prints the geometry underneath
 * it so it is also measurable.
 *
 * Usage:  tsx tools/shots-grid.ts [outDir] [--heroes a,b,c] [--guide tiki]
 * Writes `<rung>.png` (one row, one Hero per cell) plus a `metrics.tsv`.
 */

import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import type { WorldDocument } from "@grues-in-comic/ir";
import { createSession } from "../src/session.js";
import {
  CAPTION, GUIDE, HERO, createMapper, lineOf, type CameraPreset, type Line, type Panel,
} from "../src/comic/mapper.js";
import { objectNameTable } from "../src/status.js";
import { backdropFor } from "../src/comic/backdrop.js";
import {
  renderPanel, selectFigures, MAX_FIGURE_WIDTH, type PanelTrace,
} from "../src/comic/render.js";
import { addScript, createPage } from "../src/comic/page.js";
import type { Cast, PoseCycle, RosterIndex } from "../src/comic/figure.js";
import type { PackedAvatar } from "../../art/src/cast-manifest.js";
import type { CastManifest } from "../../art/src/cast-manifest.js";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const WORLD = join(ROOT, "ir", "artifacts", "zork1.world.json");
const WALKTHROUGHS = join(ROOT, "verification", "walkthroughs");
const ASSETS = join(ROOT, "web", "assets", "comic");
const ROSTER = join(ASSETS, "roster");
const SEED = 1234;

/** The panel size the layout is authored at (`layout.ts` UNIT), not the strip's. */
const PANEL_W = 400;
const PANEL_H = 340;
const PAD = 10;
const LABEL_H = 22;

const PRESETS: CameraPreset[] = [
  "establishing", "wide", "medium", "close-up", "over-shoulder", "reaction",
];

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

async function loadBase(): Promise<{ manifest: CastManifest; cast: Cast }> {
  const manifest = JSON.parse(readFileSync(join(ASSETS, "cast.json"), "utf8")) as CastManifest;
  const sheets = new Map<string, Awaited<ReturnType<typeof loadImage>>>();
  const backdrops = new Map<string, Awaited<ReturnType<typeof loadImage>>>();
  for (const [role, avatar] of Object.entries(manifest.cast)) {
    sheets.set(role, await loadImage(join(ASSETS, avatar.sheet)));
  }
  for (const backdrop of manifest.backdrops) {
    backdrops.set(backdrop.id, await loadImage(join(ASSETS, backdrop.file)));
  }
  return { manifest, cast: { manifest, sheets, backdrops } as unknown as Cast };
}

/** The runtime skin of `loadCast`, off disk: one manifest and one sheet per role. */
async function skin(base: Cast, role: string, id: string): Promise<Cast> {
  const avatar = JSON.parse(
    readFileSync(join(ROSTER, `${id}.avatar.json`), "utf8"),
  ) as PackedAvatar;
  const sheets = new Map(base.sheets);
  sheets.set(role, await loadImage(join(ROSTER, avatar.sheet)) as never);
  const manifest = { ...base.manifest, cast: { ...base.manifest.cast, [role]: avatar } };
  return { ...base, manifest, sheets } as unknown as Cast;
}

function panels(file: string): Panel[] {
  const doc = JSON.parse(readFileSync(WORLD, "utf8")) as WorldDocument;
  const session = createSession(doc, { seed: SEED });
  const guideScript = new Map([["WEST-OF-HOUSE", "The empire notices what leaves it."]]);
  const mapper = createMapper({
    names: objectNameTable(doc.objects), guideScript, guideCooldown: 0,
  });
  const page = createPage();
  addScript(page, mapper.read(session.start()));
  const commands = readFileSync(join(WALKTHROUGHS, file), "utf8")
    .split("\n").map((l) => l.trim()).filter((l) => l.length > 0 && !l.startsWith("#"));
  for (const command of commands) addScript(page, mapper.read(session.command(command)));
  return [...page.panels];
}

async function main(): Promise<void> {
  const outDir = process.argv[2]?.startsWith("--")
    ? join(ROOT, "web", "tools", "out", "shots")
    : (process.argv[2] ?? join(ROOT, "web", "tools", "out", "shots"));
  mkdirSync(outDir, { recursive: true });

  const roster = JSON.parse(readFileSync(join(ROSTER, "roster.json"), "utf8")) as RosterIndex;
  const heroes = (arg("heroes")?.split(",") ?? roster.characters
    .filter((c) => c.roles.includes("hero")).map((c) => c.id));
  const guide = arg("guide") ?? roster.defaults.guide ?? "tiki";

  const { cast: base } = await loadBase();
  const casts = new Map<string, Cast>();
  for (const id of heroes) casts.set(id, await skin(await skin(base, "guide", guide), "hero", id));

  // One real panel, held constant: real backdrop, real pose, real balloons. Only
  // the rung and the Hero vary, which is the whole point of the sheet.
  const all = panels("01-west-of-house.cmd");
  const solo = all.find((p) => lineOf(p, HERO) !== null && backdropFor(p.room) !== undefined)
    ?? all[all.length - 1]!;
  const duo = all.find((p) => lineOf(p, HERO) !== null && lineOf(p, GUIDE) !== null) ?? solo;
  // `reaction` is the game-over rung, and its numbers only mean anything on the
  // panel it actually fires on: a caption box, no speech balloon, so neither
  // MAX_FIGURE_WIDTH nor BALLOON_HEADROOM applies. Rendering it over a talking
  // panel measures a shot the game never draws.
  const over: Line = {
    speaker: CAPTION, balloonClass: "CBWoodringBox", text: "You have died.",
  };
  const dead: Panel = {
    ...solo, speakers: [over],
    // And the Hero alone on stage: a death opens its own frame (`mapper.ts`), so
    // the Guide is never beside him on this rung.
    bodies: solo.bodies.filter((b) => b.speaker === HERO),
  };

  const rows: string[] = ["rung\thero\tfigH\theadFrac\tscale\tcapped\theadTop%\tchin%\tfeet%"];

  for (const preset of PRESETS) {
    const source = preset === "over-shoulder" ? duo : preset === "reaction" ? dead : solo;
    const panel: Panel = { ...source, camera: preset };
    const sheetW = PAD + heroes.length * (PANEL_W + PAD);
    const canvas = createCanvas(sheetW, PAD + PANEL_H + LABEL_H);
    const sheet = canvas.getContext("2d") as unknown as CanvasRenderingContext2D;
    sheet.fillStyle = "#2b2b2b";
    sheet.fillRect(0, 0, sheetW, PAD + PANEL_H + LABEL_H);

    for (const [i, id] of heroes.entries()) {
      const cast = casts.get(id)!;
      const cell = createCanvas(PANEL_W, PANEL_H);
      const ctx = cell.getContext("2d") as unknown as CanvasRenderingContext2D;
      const trace: PanelTrace = { bodies: [], balloons: [], stacked: false };
      renderPanel(ctx, panel, cast, PANEL_W, PANEL_H, {
        cycles: new Map<string, PoseCycle>(),
        backdrop: backdropFor(panel.room, panel.marker),
        trace,
      });
      const x = PAD + i * (PANEL_W + PAD);
      sheet.drawImage(cell as never, x, PAD);
      sheet.fillStyle = "#eee";
      sheet.font = "13px sans-serif";
      sheet.fillText(`${id}${trace.stacked ? "  [stacked]" : ""}`, x, PAD + PANEL_H + 15);

      // The trace is authoritative for placement (it includes the headroom
      // push); the figure it placed is re-derived with a fresh cycle map, which
      // yields the identical pose, so these numbers describe the pixels above.
      const figures = selectFigures(panel, cast, new Map<string, PoseCycle>());
      for (const drawn of trace.bodies) {
        const figure = figures.find((f) => f.body.speaker === drawn.speaker)?.figure;
        if (!figure) continue;
        const h = figure.height * drawn.scale;
        const head = figure.headHeight * drawn.scale;
        const capped = figure.width * drawn.scale >= PANEL_W * MAX_FIGURE_WIDTH - 0.5;
        rows.push([
          preset, `${id}/${drawn.speaker}`, figure.height.toFixed(0),
          (figure.headHeight / figure.height).toFixed(3),
          drawn.scale.toFixed(3), capped ? "cap" : "-",
          pct(drawn.y), pct(drawn.y + head), pct(drawn.y + h),
        ].join("\t"));
      }
    }
    writeFileSync(join(outDir, `${preset}.png`), canvas.toBuffer("image/png"));
  }

  writeFileSync(join(outDir, "metrics.tsv"), rows.join("\n") + "\n");
  console.log(rows.join("\n"));
  console.log(`\n${PRESETS.length} sheet(s) → ${outDir}`);
}

function pct(v: number): string {
  return (100 * v / PANEL_H).toFixed(1);
}

main().catch((err) => { console.error(err); process.exit(1); });
