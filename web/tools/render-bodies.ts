/**
 * N-body PNG harness (dev-only) — the eyeball half of ADR 0008 Phase 0.
 *
 * `render-panel.ts` renders *real* walkthrough panels from the built cast, which
 * means it can never show more than the two roles that bundle contains. This one
 * renders synthetic panels from `cast-fixture.ts` instead: 1–4 real avatars on
 * stage, across the camera rungs, with and without balloons. It is how Phase 1's
 * `LayoutAvatars` port is looked at before Phase 3 turns the same images into a
 * byte-diff gate — same `renderPanel` entry point the browser calls, so what
 * comes out is what the pane would draw if the mapper staged four participants.
 *
 * Usage:  tsx tools/render-bodies.ts [outDir]
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createCanvas } from "@napi-rs/canvas";
import { CAPTION, type CameraPreset, type Panel } from "../src/comic/mapper.js";
import { renderPanel } from "../src/comic/render.js";
import { FIXTURE_ROLES, NEUTRAL, fixtureBodies, loadFixtureCast } from "./cast-fixture.js";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const PANEL_W = 480;
const PANEL_H = 400;
const BACKDROP = "troll-room";

const ROLES = Object.keys(FIXTURE_ROLES);

/** One line per body, so multi-speaker panels stack real balloons. */
const LINES: Record<string, string> = {
  hero: "I take the lamp and go west.",
  guide: "The passage narrows ahead of you.",
  "mob-a": "A troll blocks the way, axe raised.",
  "mob-b": "Something moves in the dark behind you.",
};

function panel(n: number, camera: CameraPreset, speaking: number): Panel {
  const roles = ROLES.slice(0, n);
  return {
    turn: n,
    camera,
    emphatic: false,
    room: "TROLL-ROOM",
    focus: null,
    bodies: fixtureBodies(roles, NEUTRAL),
    speakers: [
      { speaker: CAPTION, balloonClass: "CBWoodringBox", text: "The troll room, lit by a failing lamp." },
      ...roles.slice(0, speaking).map((speaker) => ({
        speaker,
        balloonClass: "CBWoodringNormal" as const,
        text: LINES[speaker] ?? "…",
      })),
    ],
    marker: null,
    kind: "action",
  };
}

async function main(): Promise<void> {
  const outDir = process.argv[2] ?? join(ROOT, "web", "tools", "out", "bodies");
  mkdirSync(outDir, { recursive: true });
  const cast = await loadFixtureCast();

  const cameras: CameraPreset[] = ["medium", "wide", "close-up"];
  let count = 0;
  for (let n = 1; n <= ROLES.length; n++) {
    for (const camera of cameras) {
      // Silent bodies matter as much as speaking ones: Phase 1's `IsSpeaker`
      // gating changes who is *staged*, so both ends of that range get an image.
      for (const speaking of new Set([1, n])) {
        const canvas = createCanvas(PANEL_W, PANEL_H);
        const ctx = canvas.getContext("2d") as unknown as CanvasRenderingContext2D;
        renderPanel(ctx, panel(n, camera, speaking), cast, PANEL_W, PANEL_H, { backdrop: BACKDROP });
        const name = `n${n}-${camera}-speak${speaking}.png`;
        writeFileSync(join(outDir, name), canvas.toBuffer("image/png"));
        console.log(`${name}  bodies=${n} speaking=${speaking}`);
        count++;
      }
    }
  }
  console.log(`\n${count} panel(s) → ${outDir}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
