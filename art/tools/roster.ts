#!/usr/bin/env tsx
/**
 * Survey the whole avatar corpus for casting (ADR 0004 §11, F16).
 *
 * Emits one JSON row per distinct character across `comicart/` and `artpack1/`
 * — pose counts, which §10 marker emotions exist as a face and/or a torso, and
 * the figure count a default shot draws from. Four names appear in both packs;
 * the richer `artpack1` cut wins, which is why the corpus is 31 and not 35.
 *
 *   tsx art/tools/roster.ts > roster.json
 *
 * Inventory is not legibility: see `docs/casting-roster-survey.md`. Pair this
 * with `roster-sheet.ts` and *look at the output* before casting anything.
 */
import { readFileSync, readdirSync } from "node:fs";
import { parseAvatar, facesOf, torsosOf, bodiesOf } from "../src/avb.js";

const ROOT = new URL("../../original-projects/comic-chat/v2.5-beta-1/", import.meta.url).pathname;
const packs = ["comicart", "artpack1"];
const chosen = new Map<string, string>(); // basename -> path (artpack1 wins)
for (const p of packs)
  for (const f of readdirSync(`${ROOT}${p}`).filter((f) => f.endsWith(".avb")))
    chosen.set(f, `${ROOT}${p}/${f}`);

const MARKERS = ["SCARED","SHOUT","ANGRY","HAPPY","POINTOTHER","COY","BORED","SHRUG","NEUTRAL"];
const rows: any[] = [];
for (const [file, path] of [...chosen].sort()) {
  const av = parseAvatar(new Uint8Array(readFileSync(path)), path);
  const complex = av.type === "COMPLEX";
  const faces = complex ? facesOf(av) : bodiesOf(av);
  const torsos = complex ? torsosOf(av) : bodiesOf(av);
  const fe = new Set(faces.map((r: any) => r.emotionName));
  const te = new Set(torsos.map((r: any) => r.emotionName));
  rows.push({
    file: file.replace(".avb",""), name: av.name, type: av.type,
    pack: path.includes("artpack1") ? "artpack1" : "comicart",
    nf: faces.length, nt: torsos.length,
    figures: complex ? faces.length * torsos.length : faces.length,
    face: MARKERS.filter((m) => fe.has(m)), torso: MARKERS.filter((m) => te.has(m)),
    allFace: [...fe].sort(), allTorso: [...te].sort(),
    gestures: ["WAVE","POINTOTHER","POINTSELF","DOUBLEPOINT","SHRUG"].filter((g) => te.has(g)),
  });
}
console.log(JSON.stringify(rows, null, 1));
