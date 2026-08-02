/**
 * End-to-end through the real world document — 5.2's actual exit criterion is
 * "playable", and the only way to know the contract is consumable from outside
 * the engine is to consume it from outside the engine.
 *
 * These run in Node, not a browser: `session.ts` is deliberately DOM-free so
 * that the half of the shell worth testing can be tested without one.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import type { WorldDocument } from "@grues-in-comic/ir";
import { createSession } from "../src/session.js";

const WORLD = fileURLToPath(new URL("../../ir/artifacts/zork1.world.json", import.meta.url));

let doc: WorldDocument;
beforeAll(() => {
  doc = JSON.parse(readFileSync(WORLD, "utf8")) as WorldDocument;
});

describe("session", () => {
  it("opens West of House with a status line", () => {
    const session = createSession(doc, { seed: 1234 });
    const turn = session.start();
    expect(turn.command).toBeNull();
    expect(turn.status.room).toBe("West of House");
    expect(turn.status.score).toBe(0);
    expect(turn.status.moves).toBe(0);
  });

  it("plays the opening of a walkthrough", () => {
    const session = createSession(doc, { seed: 1234 });
    session.start();
    const opened = session.command("open mailbox");
    expect(text(opened)).toContain("leaflet");

    const moved = session.command("north");
    expect(moved.status.room).toBe("North of House");
    expect(moved.status.moves).toBe(2);
  });

  it("censuses the event mix, including the types the console pane drops", () => {
    const session = createSession(doc, { seed: 1234 });
    session.start();
    for (const command of ["open mailbox", "north", "east", "north"]) session.command(command);
    const mix = session.command("look").mix;

    expect(mix.turns).toBe(6);
    expect(mix.counts.get("narration")).toBeGreaterThan(0);
    // ADR 0004 §Context measured 0 `speech` over all 11 walkthroughs. If this
    // ever fails, the ADR's premise has changed, not the shell.
    expect(mix.counts.get("speech")).toBe(0);
    expect(mix.counts.get("object-moved")).toBeGreaterThan(0);
  });

  it("round-trips a save through JSON, as a browser's localStorage would", () => {
    const session = createSession(doc, { seed: 1234 });
    session.start();
    session.command("open mailbox");
    session.command("north");

    const save = JSON.parse(JSON.stringify(session.save()));
    session.command("north");
    expect(session.status.room).toBe("Forest Path");

    session.load(save);
    expect(session.status.room).toBe("North of House");
    expect(session.status.moves).toBe(2);
  });

  it("refuses a save written against an unknown contract major", () => {
    const session = createSession(doc, { seed: 1234 });
    session.start();
    const save = { ...session.save(), contractVersion: "2.0.0" };
    expect(() => session.load(save)).toThrow(/contract/);
  });

  it("hint() lists what's in scope without costing a turn", () => {
    const session = createSession(doc, { seed: 1234 });
    session.start();
    expect(session.hint()).toContain("small mailbox");
    expect(session.status.moves).toBe(0);
  });
});

function text(turn: { events: readonly { type: string }[] }): string {
  return turn.events
    .map((e) => ("text" in e && typeof e.text === "string" ? e.text : ""))
    .join("");
}
