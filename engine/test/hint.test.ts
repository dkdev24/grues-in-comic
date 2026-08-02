/**
 * Stage 6.6 (revised) — `/hint`.
 *
 * HINT was never a ZIL verb, and it is no longer dispatched as one either:
 * `engine.hint()` is a query, not a turn (the shell's `/hint`, not a typed
 * command a player could stumble into). HELP moved out of the engine
 * entirely — its text is static and needs no world state, so it is now
 * pure shell-side content (`main.ts`'s `/help`).
 */

import { beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import type { WorldDocument } from "@grues-in-comic/ir";
import { createEngine, type Engine } from "../src/engine.js";
import { transcriptText, type EngineEvent } from "../src/events.js";

const doc = JSON.parse(
  readFileSync(new URL("../../ir/artifacts/zork1.world.json", import.meta.url), "utf8"),
) as WorldDocument;

let engine: Engine;

beforeEach(() => {
  engine = createEngine(doc, { seed: 1 });
});

const text = (events: EngineEvent[]): string => transcriptText(events);

describe("hint()", () => {
  it("lists objects in scope at the start room", () => {
    engine.start();
    expect(engine.hint()).toContain("small mailbox");
  });

  it("is not a turn — the turn counter and score are untouched", () => {
    engine.start();
    const before = engine.snapshot();
    engine.hint();
    const after = engine.snapshot();
    expect(after.turn).toBe(before.turn);
    expect(after.globals["SCORE"]).toBe(before.globals["SCORE"]);
  });
});

describe("HINT and HELP as typed commands", () => {
  it("are not recognized — neither is a ZIL verb, and neither is host-registered anymore", () => {
    engine.start();
    const hint = text(engine.command("hint").events);
    const help = text(engine.command("help").events);
    expect(hint).toMatch(/don't know the word/i);
    expect(help).toMatch(/don't know the word/i);
  });
});
