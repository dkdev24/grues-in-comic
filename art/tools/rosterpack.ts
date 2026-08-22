#!/usr/bin/env tsx
/**
 * Pack the choosable roster for the browser (F16).
 *
 *   tsx art/tools/rosterpack.ts <outdir>
 *
 * `avbpack.ts` builds the **canonical** bundle — dan, tiki and every backdrop
 * in one `cast.json`, which the pixel gate and the render tools read and which
 * a chosen cast never rewrites. This one builds the *skins*: one sheet plus one
 * `<id>.avatar.json` per choosable character, and a `roster.json` index the
 * picker reads. The split is deliberate. A player's cast is fetched per cast
 * (survey § cost 1: the roster packed whole is ~3× today's payload), and the
 * gate stays pinned to dan/tiki no matter what anyone picks.
 *
 * Each entry is checked against ADR 0004 §11 gates 1 and 2 — complex type, and
 * the face inventory the role's §10 markers ask for. Gates 3 (legibility) and 4
 * (register) are eyeball judgements already made in the survey; nothing here
 * can assert them, so this refuses to pretend it did.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseAvatar, facesOf, torsosOf } from "../src/avb.js";
import { packAvatar } from "../src/pack.js";
import { encodePng } from "../src/png.js";
import {
  SHIPPED_ROSTER, DEFAULT_CAST, ROLE_FACE_REQUIREMENTS, type RosterRole,
} from "../src/roster.js";

export interface RosterCharacter {
  id: string;
  /** Display name as the avatar itself carries it. */
  name: string;
  roles: RosterRole[];
  /** The `PackedAvatar` for this character, relative to the roster directory. */
  manifest: string;
  sheet: string;
  sheetBytes: number;
  /** Face × torso count — how many drawings a default shot picks from. */
  figures: number;
  /** Tallest face and torso, in figure pixels: the framing pass's input (F4). */
  faceHeight: number;
  torsoHeight: number;
  /** §11 tiebreaker: does `parser-miss` draw a shrug, or a resting body? */
  shrugTorso: boolean;
}

export interface RosterIndex {
  version: 1;
  defaults: Record<RosterRole, string>;
  characters: RosterCharacter[];
}

const outdir = process.argv[2];
if (!outdir) {
  console.error("usage: rosterpack <outdir>");
  process.exit(2);
}
mkdirSync(outdir, { recursive: true });

const SOURCE = new URL("../../original-projects/comic-chat/v2.5-beta-1/", import.meta.url).pathname;
const index: RosterIndex = { version: 1, defaults: DEFAULT_CAST, characters: [] };

for (const entry of SHIPPED_ROSTER) {
  const file = `${SOURCE}${entry.pack}/${entry.id}.avb`;
  const av = parseAvatar(new Uint8Array(readFileSync(file)), file);

  if (av.type !== "COMPLEX") throw new Error(`${entry.id}: ADR 0004 §11 gate 1 — not complex`);
  const faceEmotions = new Set(facesOf(av).map((r) => r.emotionName));
  for (const role of entry.roles)
    for (const need of ROLE_FACE_REQUIREMENTS[role])
      if (!faceEmotions.has(need))
        throw new Error(`${entry.id}: gate 2 — no ${need} face, required for ${role}`);

  const { avatar, sheet } = packAvatar(av, entry.id);
  const png = encodePng(sheet);
  writeFileSync(join(outdir, avatar.sheet), png);
  writeFileSync(join(outdir, `${entry.id}.avatar.json`), `${JSON.stringify(avatar)}\n`);

  index.characters.push({
    id: entry.id,
    name: avatar.name,
    roles: entry.roles,
    manifest: `${entry.id}.avatar.json`,
    sheet: avatar.sheet,
    sheetBytes: png.length,
    figures: avatar.faces.length * avatar.torsos.length,
    faceHeight: Math.max(...avatar.faces.map((p) => p.figure.height)),
    torsoHeight: Math.max(...avatar.torsos.map((p) => p.figure.height)),
    shrugTorso: torsosOf(av).some((r) => r.emotionName === "SHRUG"),
  });

  console.log(
    `${entry.id.padEnd(9)} ${entry.roles.join("/").padEnd(5)} ` +
    `${avatar.faces.length}f × ${avatar.torsos.length}t · ` +
    `${(png.length / 1024).toFixed(1)} KiB` + (index.characters.at(-1)!.shrugTorso ? " · SHRUG" : ""),
  );
}

writeFileSync(join(outdir, "roster.json"), `${JSON.stringify(index, null, 2)}\n`);
const total = index.characters.reduce((n, c) => n + c.sheetBytes, 0);
console.log(
  `wrote ${join(outdir, "roster.json")} — ${index.characters.length} characters, ` +
  `${(total / 1024).toFixed(0)} KiB packed whole (never fetched whole)`,
);
