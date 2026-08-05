/**
 * The `light-changed` event (contract v1.1.0).
 *
 * Darkness is the one piece of world state a UI cannot recover from the prose
 * without parsing it: "It is pitch black" is a sentence, and a comic panel has
 * to *look* dark. So the engine reports it, and these tests pin the three
 * properties a consumer folds the stream on — an opening baseline, a report on
 * every flip, and silence in between.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import type { WorldDocument } from "@grues-in-comic/ir";
import { createEngine } from "../src/engine.js";
import type { EngineEvent, TurnResult } from "../src/events.js";

const doc = JSON.parse(
  readFileSync(new URL("../../ir/artifacts/zork1.world.json", import.meta.url), "utf8"),
) as WorldDocument;

const lights = (result: TurnResult): EngineEvent[] =>
  result.events.filter((e) => e.type === "light-changed");

describe("light-changed", () => {
  it("baselines the light on the opening turn", () => {
    const engine = createEngine(doc, { seed: 1 });
    expect(lights(engine.start())).toEqual([{ type: "light-changed", lit: true }]);
  });

  it("opens dark when the game opens in the dark", () => {
    const engine = createEngine(doc, { seed: 1, start: "CELLAR" });
    expect(lights(engine.start())).toEqual([{ type: "light-changed", lit: false }]);
  });

  it("stays silent on a turn that did not change the light", () => {
    const engine = createEngine(doc, { seed: 1, start: "CELLAR" });
    engine.start();
    expect(lights(engine.command("look"))).toEqual([]);
  });

  it("reports walking into the dark and lighting the lamp", () => {
    const engine = createEngine(doc, { seed: 1, start: "LIVING-ROOM" });
    engine.start();
    for (const setup of ["take lamp", "move rug", "open trap door"]) {
      expect(lights(engine.command(setup))).toEqual([]);
    }
    expect(lights(engine.command("down"))).toEqual([{ type: "light-changed", lit: false }]);
    expect(lights(engine.command("turn on lamp"))).toEqual([{ type: "light-changed", lit: true }]);
    expect(lights(engine.command("turn off lamp"))).toEqual([{ type: "light-changed", lit: false }]);
  });

  it("re-baselines across a restore, so the next turn reports nothing", () => {
    const engine = createEngine(doc, { seed: 1, start: "LIVING-ROOM" });
    engine.start();
    for (const setup of ["take lamp", "move rug", "open trap door", "down", "turn on lamp"]) {
      engine.command(setup);
    }
    const save = engine.snapshot();

    // A fresh engine is lit (West of House); restoring drops it into a lit
    // cellar. `restore` emits nothing, so the host reads the light out of the
    // save — and the *next* turn must not invent a change to cover the gap.
    const restored = createEngine(doc, { seed: 1 });
    restored.start();
    restored.restore(save);
    expect(lights(restored.command("look"))).toEqual([]);
    expect(lights(restored.command("turn off lamp"))).toEqual([
      { type: "light-changed", lit: false },
    ]);
  });
});
