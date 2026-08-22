/**
 * Stage 5.5 — the routines and the scope rule that let a full winning game run
 * to the barrow. Each targets one fix found by replaying the full-game
 * walkthrough (`verification/walkthroughs/12-full-game.cmd`):
 *
 *  - the Loud Room "echo" puzzle (`LOUD-ROOM-FCN`, game-actions.ts),
 *  - the Stone Barrow win (`STONE-BARROW-FCN`, the engine's first victory),
 *  - taking an object out of an open container you hold (scope's `originAllowed`).
 *
 * The first two are reached by placing the player rather than driving the whole
 * game to them — a save-state relocate, the same trick a UI's "restore" uses —
 * so the test states what it arranges and asserts only what the events report.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import type { WorldDocument } from "@grues-in-comic/ir";
import { createEngine, type Engine } from "../src/engine.js";
import { transcriptText, type EngineEvent } from "../src/events.js";

const doc = JSON.parse(
  readFileSync(new URL("../../ir/artifacts/zork1.world.json", import.meta.url), "utf8"),
) as WorldDocument;

const text = (events: EngineEvent[]): string => transcriptText(events);

/** Relocate the player into a room, as a restored save would. */
function teleport(engine: Engine, room: string, extraGlobals: Record<string, unknown> = {}): void {
  const s = engine.snapshot();
  for (const key of Object.keys(s.children)) {
    s.children[key] = s.children[key]!.filter((id) => id !== "ADVENTURER");
  }
  s.locations["ADVENTURER"] = room;
  (s.children[room] ??= []).unshift("ADVENTURER");
  s.globals["HERE"] = room;
  s.globals["ALWAYS-LIT"] = true; // most underground rooms are dark; keep tests about behaviour, not grues
  Object.assign(s.globals, extraGlobals);
  s.visited = [...new Set([...s.visited, room])];
  engine.restore(s);
}

describe("Loud Room — the echo puzzle (LOUD-ROOM-FCN)", () => {
  it("reads as deafening until echoed, then eerie", () => {
    const engine = createEngine(doc, { seed: 1 });
    engine.start();
    teleport(engine, "LOUD-ROOM");

    expect(text(engine.command("look").events)).toMatch(/deafeningly loud/);
    const echo = engine.command("echo").events;
    expect(text(echo)).toMatch(/acoustics of the room change/);
    expect(text(engine.command("look").events)).toMatch(/eerie in its quietness/);
  });

  it("echo sets LOUD-FLAG and unsanctifies the platinum bar", () => {
    const engine = createEngine(doc, { seed: 1 });
    engine.start();
    teleport(engine, "LOUD-ROOM");

    expect(engine.snapshot().flags["BAR"]).toContain("SACREDBIT");
    engine.command("echo");
    const after = engine.snapshot();
    expect(after.globals["LOUD-FLAG"]).toBe(true);
    // SACREDBIT keeps the thief off the bar; clearing it is the echo's job.
    expect(after.flags["BAR"] ?? []).not.toContain("SACREDBIT");
    expect(text(engine.command("take bar").events)).toMatch(/Taken/);
  });
});

describe("Stone Barrow — the win (STONE-BARROW-FCN)", () => {
  it("walking west into the barrow ends the game in victory", () => {
    const engine = createEngine(doc, { seed: 1 });
    engine.start();
    // WON-FLAG is what SCORE-UPD sets at 350; the barrow itself is the last step.
    teleport(engine, "STONE-BARROW", { "WON-FLAG": true });

    const events = engine.command("w").events;
    expect(text(events)).toMatch(/mastered the first part of the ZORK trilogy/);
    const over = events.find((e) => e.type === "game-over");
    expect(over).toMatchObject({ type: "game-over", outcome: "victory" });
  });

  it("prints the ending's heading on the room-title channel", () => {
    // "Inside the Barrow" is a place name in the position a room title holds,
    // for a room the map does not contain — a UI that boxes titles (the comic
    // pane) has no other way to know that, and reading it as prose runs it into
    // the sentence after it. The concatenated text is unchanged, which is what
    // transcript parity measures.
    const engine = createEngine(doc, { seed: 1 });
    engine.start();
    teleport(engine, "STONE-BARROW", { "WON-FLAG": true });

    const events = engine.command("w").events;
    const title = events.find((e) => e.type === "narration" && e.channel === "room-title");
    expect(title).toMatchObject({ text: "Inside the Barrow\n" });
    expect(text(events)).toMatch(/Inside the Barrow\nAs you enter the barrow/);
  });

  it("entering the barrow wins too", () => {
    const engine = createEngine(doc, { seed: 1 });
    engine.start();
    teleport(engine, "STONE-BARROW", { "WON-FLAG": true });

    const over = engine.command("enter barrow").events.find((e) => e.type === "game-over");
    expect(over).toMatchObject({ outcome: "victory" });
  });
});

describe("scope — taking from a container you hold", () => {
  it("takes the lunch out of the open sack in your hands", () => {
    const engine = createEngine(doc, { seed: 1 });
    engine.start();
    for (const cmd of ["s", "e", "open window", "enter house", "take sack", "open sack"]) {
      engine.command(cmd);
    }
    // The sack is held and open; the lunch inside is `carried` origin. ZIL's
    // GET-OBJECT always searches the player, so a bare TAKE must find it even
    // though the TAKE rule lists only (ON-GROUND IN-ROOM).
    expect(text(engine.command("take lunch").events)).toMatch(/Taken/);
  });
});
