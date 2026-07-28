/**
 * The ADR 0008 Phase 3 pixel-parity gate — the fixture set, and what is pinned.
 *
 * Phases 1–2b replaced three reimplementations with ports (`LayoutAvatars`,
 * `AddLine` panelization, the multi-balloon driver). Every one of them changes
 * where ink lands, and two of them are *seeded* — `balloon-layout.ts` rolls a
 * mulberry32 stream keyed by a hash of the panel's own speakers and text — so an
 * innocuous edit to that hash, or to a line of the mapper's prose, silently
 * re-rolls the placement of every balloon in the strip. Nothing in the suite
 * would have noticed. This is what notices.
 *
 * **What a golden holds, and why not the PNG itself.** Per case: the SHA-256 of
 * the rendered PNG, and the {@link PanelTrace} that produced it. The hash is the
 * pixel gate proper — it covers compositing, poses, backdrop alpha, spline ink,
 * everything a committed image would. The trace is what makes a failure legible:
 * a hash alone says "something moved", while the trace says *the DM's balloon
 * dropped 14px and re-wrapped to three lines*. Committing the images too would
 * add ~300 KB of binary per case and rewrite all of it on every accepted re-roll,
 * for the one thing the pair cannot give you — a visual diff — which
 * {@link ACTUAL_DIR} covers instead: a failing run writes its PNGs there to be
 * looked at beside a re-render of the previous commit.
 *
 * **Both halves of the stack are staged through `page.ts`.** The fixtures are
 * *not* hand-built panels. `render-bodies.ts` builds those, and its panels can
 * carry four or five balloons that real panelization would have split — which is
 * useful for eyeballing `stackBalloons`, and wrong for a gate, because it pins a
 * panel the product cannot produce. Every case here is fed as lines to a `Page`
 * carrying the real {@link createFitTest}, so what is pinned is what the pane
 * would draw.
 *
 * Usage:
 *   tsx tools/gate.ts            # check against the golden, report, exit 1 on drift
 *   tsx tools/gate.ts --accept   # re-write the golden (a deliberate re-roll)
 */

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import type { WorldDocument } from "@grues-in-comic/ir";
import { createSession } from "../src/session.js";
import { objectNameTable } from "../src/status.js";
import { backdropFor } from "../src/comic/backdrop.js";
import { createFitTest } from "../src/comic/fit.js";
import { UNIT } from "../src/comic/layout.js";
import { CAPTION, createMapper, type Panel } from "../src/comic/mapper.js";
import { addScript, createPage, BM_ACTION, BM_SAY, type PageLine, type PanelContext }
  from "../src/comic/page.js";
import { renderPanel, type PanelTrace } from "../src/comic/render.js";
import type { Cast } from "../src/comic/figure.js";
import type { CastManifest } from "../../art/src/cast-manifest.js";
import { FIXTURE_ROLES, NEUTRAL, loadFixtureCast } from "./cast-fixture.js";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const WORLD = join(ROOT, "ir", "artifacts", "zork1.world.json");
const WALKTHROUGHS = join(ROOT, "verification", "walkthroughs");
const ASSETS = join(ROOT, "web", "assets", "comic");

/** The committed golden. Small enough to read in a diff, which is the point. */
export const GOLDEN = join(ROOT, "web", "test", "golden", "panel-gate.json");
/** Where a failing run drops its PNGs, so drift can be looked at. Gitignored. */
export const ACTUAL_DIR = join(ROOT, "web", "tools", "out", "gate-actual");

/**
 * The seed `engine/test/completion.test.ts` pins the walkthrough parity run to.
 * The gate has to share it: a different seed is a different world, and every
 * panel downstream of it moves.
 */
const SEED = 1234;

/**
 * Panels are rendered at {@link UNIT}, their native size — *not* at the 480×400
 * `render-panel.ts` uses to eyeball. ADR 0007 §2 made the panel fixed and the
 * pane reflow, and `fit.ts` measures panelization at `UNIT`, so this is the one
 * size at which what is drawn and what was panelized agree.
 */
const { width: PANEL_W, height: PANEL_H } = UNIT;

/** A rendered case: the PNG bytes, and the geometry that placed them. */
export interface GateRecord {
  name: string;
  camera: string;
  /** Bodies staged, in layout order — the `IsSpeaker` gate's visible answer. */
  bodies: string[];
  sha256: string;
  /** `PanelTrace`, rounded — see {@link round}. */
  trace: PanelTrace;
}

/**
 * Geometry is compared as JSON, so it is rounded first: the placement maths runs
 * through `Math.sqrt`/division and the last bits of a double are not a fact
 * about the comic. A tenth of a pixel is well below anything visible and well
 * above float noise.
 */
function round(n: number): number {
  return Math.round(n * 10) / 10;
}

function roundTrace(trace: PanelTrace): PanelTrace {
  return {
    bodies: trace.bodies.map((b) => ({ ...b, x: round(b.x), y: round(b.y), scale: round(b.scale) })),
    balloons: trace.balloons.map((b) => ({
      speaker: b.speaker,
      box: { x: round(b.box.x), y: round(b.box.y), width: round(b.box.width), height: round(b.box.height) },
      lines: b.lines,
      tail: b.tail ? { x: round(b.tail.x), y: round(b.tail.y) } : null,
    })),
    stacked: trace.stacked,
  };
}

async function loadShippedCast(): Promise<Cast> {
  const manifest = JSON.parse(readFileSync(join(ASSETS, "cast.json"), "utf8")) as CastManifest;
  const sheets = new Map<string, Awaited<ReturnType<typeof loadImage>>>();
  const backdrops = new Map<string, Awaited<ReturnType<typeof loadImage>>>();
  for (const role of Object.keys(manifest.cast)) {
    sheets.set(role, await loadImage(join(ASSETS, manifest.cast[role]!.sheet)));
  }
  for (const backdrop of manifest.backdrops) {
    backdrops.set(backdrop.id, await loadImage(join(ASSETS, backdrop.file)));
  }
  // napi Images satisfy every `drawImage` call site, which is all the renderer
  // asks of them (same cast `render-panel.ts` builds).
  return { manifest, sheets, backdrops } as unknown as Cast;
}

/** A page wired to the real fit test, measuring on its own scratch canvas. */
function fittedPage() {
  const measure = createCanvas(1, 1).getContext("2d") as unknown as CanvasRenderingContext2D;
  return createPage({ fit: createFitTest(measure) });
}

/**
 * The production half: a real walkthrough, read by the real mapper, panelized by
 * the real page. These are the panels the browser draws today, so drift here is
 * drift a player would see.
 */
function productionPanels(file: string): Panel[] {
  const doc = JSON.parse(readFileSync(WORLD, "utf8")) as WorldDocument;
  const session = createSession(doc, { seed: SEED });
  // The same two scripts `render-panel.ts` injects, so a DM balloon and a beat
  // caption are both in the pinned set (they are the two-balloon cases).
  const guideScript = new Map([["WEST-OF-HOUSE", "The empire notices what leaves it."]]);
  const beatScript = new Map([["reveal", "It was waiting to be found."]]);
  const mapper = createMapper({
    names: objectNameTable(doc.objects), guideScript, beatScript, guideCooldown: 0,
  });
  const page = fittedPage();
  addScript(page, mapper.read(session.start()));
  const commands = readFileSync(join(WALKTHROUGHS, file), "utf8")
    .split("\n").map((l) => l.trim()).filter((l) => l.length > 0 && !l.startsWith("#"));
  for (const command of commands) addScript(page, mapper.read(session.command(command)));
  return [...page.panels];
}

/**
 * The multi-party half — the N-body coverage the shipped two-role cast cannot
 * reach (ADR 0008 Phase 0's reason for existing).
 *
 * Read this as a *scene*, not as a panel: it is handed to the page one line at a
 * time and the page decides where the panel breaks. That is the whole point of
 * pinning it — the 5-element cap, the `BM_ACTION`-starts-a-panel rule and the
 * fit test's refusal all get to act on it, and the gate records how many panels
 * came out. A hand-built 3-balloon panel would have pinned none of that.
 */
function mobPanels(roles: readonly string[]): Panel[] {
  const context: PanelContext = {
    turn: 1, camera: "medium", emphatic: false, room: "TROLL-ROOM",
    focus: null, marker: null, kind: "action",
  };
  const said: Record<string, string> = {
    hero: "I take the lamp and go west.",
    guide: "The passage narrows ahead of you.",
    "mob-a": "A troll blocks the way, axe raised.",
    "mob-b": "Something moves in the dark behind you.",
  };
  const lines: PageLine[] = [
    // A caption first: `BM_ACTION` unconditionally opens a panel (`panel.cpp:1064`),
    // so this pins the caption rule as well as the layout.
    {
      speaker: CAPTION, modes: BM_ACTION, emotion: [], bodiless: true,
      text: "The troll room, lit by a failing lamp.",
    },
    ...roles.map((speaker) => ({
      speaker, modes: BM_SAY, emotion: NEUTRAL, text: said[speaker] ?? "…",
    })),
  ];

  const page = fittedPage();
  for (const line of lines) page.addLine(line, context);
  return [...page.panels];
}

export interface GateCase {
  name: string;
  panel: Panel;
  cast: Cast;
  backdrop: string | undefined;
}

/** Every case the gate pins, in a stable order. */
export async function gateCases(): Promise<GateCase[]> {
  const cases: GateCase[] = [];

  const shipped = await loadShippedCast();
  for (const [i, panel] of productionPanels("01-west-of-house.cmd").entries()) {
    cases.push({
      name: `wk01-p${String(i).padStart(2, "0")}-${panel.camera}`,
      panel, cast: shipped, backdrop: backdropFor(panel.room),
    });
  }

  const fixture = await loadFixtureCast();
  const roles = Object.keys(FIXTURE_ROLES);
  // Three and four participants: the first N where `LayoutAvatars`' equal-margin
  // and shrink-to-fit branches both fire, and where the balloon driver has more
  // than one corridor to route around.
  for (const n of [3, 4]) {
    for (const [i, panel] of mobPanels(roles.slice(0, n)).entries()) {
      cases.push({
        name: `mob${n}-p${String(i).padStart(2, "0")}-${panel.camera}`,
        panel, cast: fixture, backdrop: "troll-room",
      });
    }
  }

  return cases;
}

/** Render every case. Returns the records to compare and the PNGs to dump. */
export async function runGate(): Promise<{ records: GateRecord[]; png: Map<string, Buffer> }> {
  const records: GateRecord[] = [];
  const png = new Map<string, Buffer>();

  for (const { name, panel, cast, backdrop } of await gateCases()) {
    const canvas = createCanvas(PANEL_W, PANEL_H);
    const ctx = canvas.getContext("2d") as unknown as CanvasRenderingContext2D;
    const trace: PanelTrace = { bodies: [], balloons: [], stacked: false };
    renderPanel(ctx, panel, cast, PANEL_W, PANEL_H, { ...(backdrop ? { backdrop } : {}), trace });

    const bytes = canvas.toBuffer("image/png");
    png.set(name, bytes);
    records.push({
      name,
      camera: panel.camera,
      bodies: trace.bodies.map((b) => b.speaker),
      sha256: createHash("sha256").update(bytes).digest("hex"),
      trace: roundTrace(trace),
    });
  }

  return { records, png };
}

export function readGolden(): GateRecord[] {
  return JSON.parse(readFileSync(GOLDEN, "utf8")) as GateRecord[];
}

async function main(): Promise<void> {
  const accept = process.argv.includes("--accept");
  const { records, png } = await runGate();

  if (accept) {
    mkdirSync(join(GOLDEN, ".."), { recursive: true });
    writeFileSync(GOLDEN, `${JSON.stringify(records, null, 2)}\n`);
    console.log(`accepted ${records.length} case(s) → ${GOLDEN}`);
    return;
  }

  const golden = readGolden();
  const byName = new Map(golden.map((r) => [r.name, r]));
  const drifted: string[] = [];
  for (const record of records) {
    const was = byName.get(record.name);
    if (!was) { drifted.push(`${record.name}  NEW (not in golden)`); continue; }
    if (was.sha256 !== record.sha256) drifted.push(`${record.name}  pixels changed`);
    else if (JSON.stringify(was.trace) !== JSON.stringify(record.trace)) {
      drifted.push(`${record.name}  geometry changed with identical pixels (?)`);
    }
  }
  for (const was of golden) {
    if (!records.some((r) => r.name === was.name)) drifted.push(`${was.name}  GONE`);
  }

  if (drifted.length === 0) {
    console.log(`gate clean — ${records.length} case(s) match the golden`);
    return;
  }
  mkdirSync(ACTUAL_DIR, { recursive: true });
  for (const [name, bytes] of png) writeFileSync(join(ACTUAL_DIR, `${name}.png`), bytes);
  console.error(`gate DRIFT (${drifted.length}):`);
  for (const line of drifted) console.error(`  ${line}`);
  console.error(`\nactual PNGs → ${ACTUAL_DIR}`);
  console.error("If the change is intended: tsx tools/gate.ts --accept");
  process.exitCode = 1;
}

// Only when run as a script; the test imports `runGate` instead.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => { console.error(err); process.exit(1); });
}
