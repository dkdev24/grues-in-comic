/**
 * The Narrative Director (ADR 0005), Slice 2 skeleton.
 *
 * The whole claim of Slice 2 is **no behaviour change**: the Director wraps the
 * mapper and returns exactly one panel per turn, so its flattened output must
 * equal the mapper's panel sequence over every walkthrough. This is the parity
 * seam — when Slice 3 gives the Director beat detection and it starts dropping
 * and collapsing turns, this equality breaks *on purpose* and is replaced by a
 * golden panel-sequence per walkthrough (ADR 0005, superseding the mapper's §6
 * one-panel-per-turn count).
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import type { WorldDocument } from "@grues-in-comic/ir";
import { createSession } from "../src/session.js";
import { createMapper } from "../src/comic/mapper.js";
import { createDirector } from "../src/comic/director.js";
import { objectNameTable } from "../src/status.js";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const WALKTHROUGHS = join(ROOT, "verification", "walkthroughs");
const WORLD = join(ROOT, "ir", "artifacts", "zork1.world.json");
const SEED = 1234;

let doc: WorldDocument;
beforeAll(() => {
  doc = JSON.parse(readFileSync(WORLD, "utf8")) as WorldDocument;
});

function commandsOf(file: string): string[] {
  return readFileSync(join(WALKTHROUGHS, file), "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));
}

function cmdFiles(): string[] {
  return readdirSync(WALKTHROUGHS).filter((f) => f.endsWith(".cmd"));
}

/** Options shared by both pipelines, so the only variable is the wrapper. */
function options() {
  return { names: objectNameTable(doc.objects) };
}

describe("director (Slice 2 skeleton)", () => {
  it("emits exactly one panel per turn, identical to the mapper's", () => {
    for (const file of cmdFiles()) {
      const commands = commandsOf(file);

      const bare = createSession(doc, { seed: SEED });
      const mapper = createMapper(options());
      const mapperPanels = [mapper.panel(bare.start())];
      for (const command of commands) mapperPanels.push(mapper.panel(bare.command(command)));

      const wrapped = createSession(doc, { seed: SEED });
      const director = createDirector(options());
      const emitted = director.ingest(wrapped.start());
      for (const command of commands) emitted.push(...director.ingest(wrapped.command(command)));

      // 1:1 today: one panel per turn (start + every command).
      expect(emitted).toHaveLength(commands.length + 1);
      // And byte-identical to the mapper — Slice 2 changes structure, not output.
      expect(emitted).toEqual(mapperPanels);
      // `.panels` is the same running stream the view reads.
      expect([...director.panels]).toEqual(emitted);
    }
  });
});
