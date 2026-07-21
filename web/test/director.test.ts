/**
 * The Narrative Director (ADR 0005), Slice 4 — traversal collapse (over Slice 3's
 * noise drop).
 *
 * ADR 0004 §6 (one panel per turn) is superseded: the *emitted* stream is the
 * mapper's full fold with (a) `refusal` turns dropped and (b) each maximal run of
 * consecutive `traversal` panels collapsed to its last panel (the run's
 * destination). The invariant replacing the 1:1 count is therefore **emitted ===
 * `edited(full fold)`**, where `edited` is the reference reducer below — asserted
 * over every walkthrough. Focused tests pin the buffering (a back-and-forth walk
 * collapses to one panel at the destination; a trailing run waits for `flush`), and
 * the Slice 3 refusal checks are kept.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import type { WorldDocument } from "@grues-in-comic/ir";
import { createSession } from "../src/session.js";
import { createMapper, type Panel } from "../src/comic/mapper.js";
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

/**
 * The Slice 4 edit, as a pure reducer: drop refusals, collapse each maximal run of
 * consecutive traversals to its last panel. This is the golden the Director must
 * reproduce; keeping it here makes the editing contract executable and reviewable.
 */
function edited(full: readonly Panel[]): Panel[] {
  const out: Panel[] = [];
  let pending: Panel | null = null;
  for (const panel of full) {
    if (panel.kind === "refusal") continue;
    if (panel.kind === "traversal") {
      pending = panel; // keep only the latest — the run's destination so far
      continue;
    }
    if (pending) {
      out.push(pending);
      pending = null;
    }
    out.push(panel);
  }
  if (pending) out.push(pending); // trailing run (= director.flush())
  return out;
}

describe("director (Slice 4 — traversal collapse)", () => {
  it("emits edited(full fold) — refusals dropped, traversal runs collapsed — every walkthrough", () => {
    let keptTotal = 0;
    let emittedTotal = 0;
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
      emitted.push(...director.flush()); // any trailing traversal run

      expect(emitted).toEqual(edited(full));
      expect([...director.panels]).toEqual(edited(full));
      expect(emitted.every((panel) => panel.kind !== "refusal")).toBe(true);

      keptTotal += full.filter((panel) => panel.kind !== "refusal").length;
      emittedTotal += emitted.length;
    }
    // Collapse actually fired: the corpus (esp. the backtracking full game) emits
    // strictly fewer panels than the non-refusal turn count.
    expect(emittedTotal).toBeLessThan(keptTotal);
  });

  it("collapses a back-and-forth walk to one panel at the destination (ADR 0005 §3)", () => {
    const session = createSession(doc, { seed: SEED });
    const director = createDirector(options());
    director.ingest(session.start()); // arrival, WEST-OF-HOUSE
    expect(director.ingest(session.command("north"))[0]?.kind).toBe("arrival"); // NORTH-OF-HOUSE
    expect(director.ingest(session.command("west"))).toEqual([]); // traversal → WEST-OF-HOUSE, buffered
    expect(director.ingest(session.command("north"))).toEqual([]); // traversal → NORTH-OF-HOUSE, buffered
    const flushed = director.ingest(session.command("look")); // ambient ends the run
    expect(flushed).toHaveLength(2);
    expect(flushed[0]?.kind).toBe("traversal");
    expect(flushed[0]?.room).toBe("NORTH-OF-HOUSE"); // the run's destination, not the rooms passed
    expect(flushed[1]?.kind).toBe("ambient");
  });

  it("holds a trailing run until flush(), which is idempotent", () => {
    const session = createSession(doc, { seed: SEED });
    const director = createDirector(options());
    director.ingest(session.start());
    director.ingest(session.command("north")); // arrival
    director.ingest(session.command("west")); // traversal, buffered
    director.ingest(session.command("north")); // traversal, buffered
    const before = director.panels.length;
    const flushed = director.flush();
    expect(flushed).toHaveLength(1);
    expect(flushed[0]?.kind).toBe("traversal");
    expect(director.panels.length).toBe(before + 1);
    expect(director.flush()).toEqual([]); // nothing left to flush
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
