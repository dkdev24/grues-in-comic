/**
 * Renders a 4-panel TL;DR strip (blog embed use case) with the real comic
 * renderer (`renderPanel`) and shipped cast/backdrop assets — hand-authored
 * `Panel`s in `EN`/`KO` below instead of a session replay. Dev-only PNG
 * harness, same lineage as `render-panel.ts`.
 *
 * Not invoked directly — `render-tldr.ts` is the entry point. This half only
 * exists as a separate file so a KO run can be its own child process with
 * `BALLOON_FONT`/`TITLE_FONT` patched on disk *before* this module (and the
 * `render.js`/`balloon.js` it imports) is ever loaded; see the parent's
 * docstring for why that ordering is load-bearing.
 */

import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createCanvas, loadImage, GlobalFonts } from "@napi-rs/canvas";
import { KR_FONT_FAMILY, KR_FONT_PATH } from "./render-tldr-font.js";
import { GUIDE, HERO, type Body, type Line, type Panel } from "../src/comic/mapper.js";
import { renderPanel } from "../src/comic/render.js";
import type { Cast } from "../src/comic/figure.js";
import type { CastManifest } from "../../art/src/cast-manifest.js";
import { EMOTION_NAMES, emotionAngle } from "../../art/src/format.js";
import type { EmotionOption } from "../../art/src/pose.js";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const ASSETS = join(ROOT, "web", "assets", "comic");
const OUT = join(ROOT, "web", "tools", "out", "tldr");

const PANEL_W = 480;
const PANEL_H = 420;
const GAP = 16;

function emo(name: (typeof EMOTION_NAMES)[number], intensity: number, priority = 1): EmotionOption {
  const index = EMOTION_NAMES.indexOf(name);
  return { angle: emotionAngle(index), intensity, priority };
}

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
  return { manifest, sheets, backdrops } as unknown as Cast;
}

interface Beat {
  backdrop: string;
  roomTitle?: string;
  hero?: { text: string; emotion: EmotionOption; think?: boolean };
  guide?: { text: string; emotion?: EmotionOption };
  camera: Panel["camera"];
}

function toPanel(turn: number, b: Beat): Panel {
  const bodies: Body[] = [];
  const speakers: Line[] = [];
  if (b.guide) {
    bodies.push({ speaker: GUIDE, emotion: [b.guide.emotion ?? emo("NEUTRAL", 0)], requested: true });
    speakers.push({ speaker: GUIDE, balloonClass: "CBWoodringNormal", text: b.guide.text });
  }
  if (b.hero) {
    bodies.push({ speaker: HERO, emotion: [b.hero.emotion], requested: true });
    speakers.push({
      speaker: HERO,
      balloonClass: b.hero.think ? "CBWoodringThink" : "CBWoodringNormal",
      text: b.hero.text,
    });
  }
  return {
    turn, camera: b.camera, emphatic: false, room: b.backdrop,
    roomTitle: b.roomTitle ?? null, dark: false, focus: null,
    bodies, speakers, marker: null, kind: "ambient",
  };
}

async function renderStrip(name: string, beats: Beat[]): Promise<void> {
  const cast = await loadCastFromDisk();
  const strip = createCanvas(beats.length * PANEL_W + (beats.length - 1) * GAP, PANEL_H);
  const sctx = strip.getContext("2d") as unknown as CanvasRenderingContext2D;
  sctx.fillStyle = "#eef0f2";
  sctx.fillRect(0, 0, strip.width, strip.height);

  beats.forEach((beat, i) => {
    const panel = toPanel(i, beat);
    const canvas = createCanvas(PANEL_W, PANEL_H);
    const ctx = canvas.getContext("2d") as unknown as CanvasRenderingContext2D;
    renderPanel(ctx, panel, cast, PANEL_W, PANEL_H, { backdrop: beat.backdrop });
    writeFileSync(join(OUT, `${name}-p${i}.png`), canvas.toBuffer("image/png"));
    sctx.drawImage(canvas as unknown as CanvasImageSource, i * (PANEL_W + GAP), 0);
  });

  writeFileSync(join(OUT, `${name}-strip.png`), strip.toBuffer("image/png"));
  console.log(`${name}-strip.png → ${strip.width}x${strip.height}`);
}

const EN: Beat[] = [
  {
    backdrop: "pastoral", camera: "establishing", roomTitle: "THE ARCHIVES",
    hero: { text: "MS just open-sourced Zork... AND Comic Chat. Same week.", emotion: emo("HAPPY", 0.9) },
  },
  {
    backdrop: "attic", camera: "close-up",
    hero: { text: "Old text adventure + comic panels. Nobody needs a manual again.", emotion: emo("COY", 0.7) },
  },
  {
    backdrop: "studio", camera: "wide",
    guide: { text: "You didn't write a line of this.", emotion: emo("BORED", 0.4) },
    hero: { text: "I just... vibed.", emotion: emo("HAPPY", 0.5) },
  },
  {
    backdrop: "cellar", camera: "reaction",
    hero: { text: "Two weeks later: full Zork I, live in your browser. Bring a lamp.", emotion: emo("SCARED", 0.5) },
  },
];

const KO: Beat[] = [
  {
    backdrop: "pastoral", camera: "establishing", roomTitle: "고문서 보관소",
    hero: { text: "MS가 Zork랑 Comic Chat을 같은 주에 오픈소스로 풀었다고?", emotion: emo("HAPPY", 0.9) },
  },
  {
    backdrop: "attic", camera: "close-up",
    hero: { text: "옛날 텍스트 어드벤처 + 만화 패널. 이제 공략집 없이도 할 수 있다.", emotion: emo("COY", 0.7) },
  },
  {
    backdrop: "studio", camera: "wide",
    guide: { text: "이거 한 줄도 네가 안 짰잖아.", emotion: emo("BORED", 0.4) },
    hero: { text: "난 그냥... 바이브 탔다.", emotion: emo("HAPPY", 0.5) },
  },
  {
    backdrop: "cellar", camera: "reaction",
    hero: { text: "2주 후: Zork I 전체를 브라우저에서. 램프는 꼭 챙기세요.", emotion: emo("SCARED", 0.5) },
  },
];

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  const which = process.argv[2];
  if (which === "ko") {
    // A brand-new family name, never a collision with an already-installed
    // one: aliasing onto the real "Comic Sans MS" (which macOS/Office already
    // provide, Latin-only) silently loses to that pre-existing face and
    // renders Hangul as .notdef tofu — verified the hard way, by OCR, not by
    // eye (@napi-rs/canvas's tofu is legible-*looking* enough at comic-panel
    // scale to misread as real text on a quick glance).
    GlobalFonts.registerFromPath(KR_FONT_PATH, KR_FONT_FAMILY);
    await renderStrip("ko", KO);
  } else {
    await renderStrip("en", EN);
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
