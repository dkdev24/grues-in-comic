/**
 * Stage 6.6 — HINT and HELP.
 *
 * Neither is a ZIL verb; both are registered on the lexicon by `engine.ts`
 * (see `addHostVerb`) and dispatched as ordinary builtins. These tests cover
 * the parser accepting the words and the two builtins' output, not gameplay.
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

describe("HINT", () => {
  it("lists objects in scope at the start room without naming a verb", () => {
    engine.start();
    const out = text(engine.command("hint").events);
    expect(out).toMatch(/mailbox/i);
    expect(out).not.toMatch(/\bTAKE\b|\bOPEN\b|\bEXAMINE\b/);
  });

  it("does not advance real time, only the turn count like other verbs", () => {
    engine.start();
    const before = engine.snapshot().globals["SCORE"];
    engine.command("hint");
    expect(engine.snapshot().globals["SCORE"]).toBe(before);
  });
});

describe("HELP", () => {
  it("explains command syntax and points to HINT", () => {
    engine.start();
    const out = text(engine.command("help").events);
    expect(out).toMatch(/verb/i);
    expect(out).toMatch(/\bHINT\b/);
  });
});
