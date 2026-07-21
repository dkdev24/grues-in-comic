/**
 * The Narrative Director (ADR 0005), Slice 3 — beat detection + noise drop.
 *
 * This is where ADR 0004 §6 (one panel per turn) is superseded: the *emitted*
 * stream is no longer the turn stream but the turn stream with `refusal` turns
 * removed. So the invariant replacing the 1:1 count is **emitted === the mapper's
 * full fold minus its refusals** — asserted over every walkthrough, the noise-aware
 * successor to Slice 2's byte-identical equivalence. A synthetic refusal exercises
 * the drop path (the curated walkthroughs are clean winning paths), and a
 * refusal-between-two-moves check proves the mapper's stream state stays whole
 * across a dropped turn.
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

describe("director (Slice 3 — beat detection + noise drop)", () => {
  it("emits every non-refusal turn and drops the refusals, over every walkthrough", () => {
    for (const file of cmdFiles()) {
      const commands = commandsOf(file);

      // Reference: the mapper's full fold, one panel per turn.
      const bare = createSession(doc, { seed: SEED });
      const mapper = createMapper(options());
      const full = [mapper.panel(bare.start())];
      for (const command of commands) full.push(mapper.panel(bare.command(command)));

      const wrapped = createSession(doc, { seed: SEED });
      const director = createDirector(options());
      const emitted = director.ingest(wrapped.start());
      for (const command of commands) emitted.push(...director.ingest(wrapped.command(command)));

      // The edited stream is the full fold minus its refusals — §6's successor.
      const kept = full.filter((panel) => panel.kind !== "refusal");
      expect(emitted).toEqual(kept);
      expect([...director.panels]).toEqual(kept);
      expect(emitted.every((panel) => panel.kind !== "refusal")).toBe(true);
    }
  });

  it("drops a parser refusal: computed to keep state, never emitted", () => {
    const session = createSession(doc, { seed: SEED });
    const director = createDirector(options());
    director.ingest(session.start());
    const before = director.panels.length;
    // A word Zork does not know — the engine refuses on the `system` channel, so
    // the mapper tags it `refusal` (not "xyzzy", which Zork answers as a joke).
    const out = director.ingest(session.command("blorptastic"));
    expect(out).toEqual([]);
    expect(director.panels.length).toBe(before); // nothing added to the stream
  });

  it("keeps the mapper's stream state whole across a dropped turn", () => {
    const session = createSession(doc, { seed: SEED });
    const director = createDirector(options());
    director.ingest(session.start()); // arrival, West of House
    expect(director.ingest(session.command("blorptastic"))).toEqual([]); // dropped
    // The move after a dropped refusal must still classify against up-to-date
    // visited/room state — proving the fold ran even though nothing was emitted.
    const north = director.ingest(session.command("north"));
    expect(north[0]?.kind).toBe("arrival");
    expect(north[0]?.room).toBe("NORTH-OF-HOUSE");
  });
});
