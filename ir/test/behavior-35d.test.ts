/**
 * Stage 3.5 batch (d) tests: daemons/timers.
 *
 * The gclock.zil machinery (QUEUE/INT/CLOCKER, the C-TABLE interrupt table)
 * is engine-builtin territory: records are 3-slot tables addressed by the
 * C-ENABLED?/C-TICK/C-RTN constants (0/1/2), QUEUE/INT return the record so
 * extracted GET/PUT code works on it unchanged, and routine names passed by
 * atom (`<QUEUE I-MATCH 2>`) join the extraction closure. The reference
 * builtins live in poc/world.ts; countdown goldens execute the extracted
 * I-MATCH daemon end-to-end through CLOCKER ticks.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import type { WorldDocument } from "../src/schema.js";
import { runRoutine } from "../poc/interpreter.js";
import { builtins, makeWorld } from "../poc/world.js";

const here = fileURLToPath(new URL(".", import.meta.url));
const world = JSON.parse(
  readFileSync(join(here, "..", "artifacts", "zork1.world.json"), "utf8"),
) as WorldDocument;
const catalog = JSON.parse(
  readFileSync(join(here, "..", "artifacts", "zork1.behavior-catalog.json"), "utf8"),
) as { id: string; reasons: string[] }[];

const routineById = new Map(world.routines!.map((r) => [r.id, r]));
const catalogIds = new Set(catalog.map((c) => c.id));

describe("stage 3.5 batch (d) extraction — daemons/timers", () => {
  it("clock machinery is builtin: absent from routines and catalog", () => {
    for (const id of ["QUEUE", "INT", "CLOCKER"]) {
      expect(routineById.has(id), `${id} should not be extracted`).toBe(false);
      expect(catalogIds.has(id), `${id} should not be catalogued`).toBe(false);
    }
  });

  it("QUEUE name-string targets pull daemon routines into the closure", () => {
    for (const id of [
      "I-MATCH", "I-XBH", "I-XC", "I-REMPTY", "I-MAINT-ROOM", "I-RIVER", "I-FOREST-ROOM",
    ]) {
      expect(routineById.has(id), `${id} should be extracted`).toBe(true);
    }
  });

  it("remaining daemons are catalogued on the builtin frontier, not on QUEUE", () => {
    const reasons = new Map(catalog.map((c) => [c.id, c.reasons.join("; ")]));
    // Batch (h) lowered <REST>, so the lamp/candle daemons now extract; their
    // countdown goldens live in behavior-35h.test.ts.
    expect(reasons.has("I-LANTERN")).toBe(false);
    expect(reasons.has("I-CANDLES")).toBe(false);
    // The <NTH> batch lowered I-CYCLOPS's wrath-message index, so it extracts;
    // its NTH golden lives in behavior-35k.test.ts.
    expect(reasons.has("I-CYCLOPS")).toBe(false);
    for (const [id, reason] of reasons) {
      expect(reason, `${id} must not fail on QUEUE/INT/CLOCKER`).not.toMatch(/QUEUE|CLOCKER/);
    }
  });

  it("MATCH-FUNCTION lowers <ENABLE <QUEUE I-MATCH 2>> to builtin calls", () => {
    const matchFn = JSON.stringify(routineById.get("MATCH-FUNCTION"));
    expect(matchFn).toContain(
      '{"op":"call","routine":"ENABLE","args":[{"op":"call","routine":"QUEUE",' +
        '"args":[{"op":"const","value":"I-MATCH"},{"op":"const","value":2}]}]}',
    );
    expect(matchFn).toContain('{"op":"call","routine":"QUEUE","args":[{"op":"const","value":"I-MATCH"},{"op":"const","value":0}]}');
  });
});

describe("stage 3.5 batch (d) reference clock builtins", () => {
  const w = () => makeWorld({ here: "LIVING-ROOM", verb: "TICK" });

  it("QUEUE/INT return a record that GET/PUT address via constants 0/1/2", () => {
    const world = w();
    const rec = builtins["QUEUE"]!(world, ["I-MATCH", 2]);
    expect(rec).toBe(builtins["INT"]!(world, ["I-MATCH"]));
    // <GET <INT I-MATCH> ,C-TICK> — table-get over the returned id.
    expect(world.tables[rec as string]!.elements).toEqual([0, 2, "I-MATCH"]);
    builtins["ENABLE"]!(world, [rec]);
    expect(world.tables[rec as string]!.elements[0]).toBe(1);
    builtins["DISABLE"]!(world, [rec]);
    expect(world.tables[rec as string]!.elements[0]).toBe(0);
  });

  it("CLOCKER counts down and fires exactly once at tick 1→0", () => {
    const world = w();
    let fired = 0;
    builtins["I-TEST"] = () => (fired++, true);
    try {
      builtins["ENABLE"]!(world, [builtins["QUEUE"]!(world, ["I-TEST", 2])]);
      expect(builtins["CLOCKER"]!(world, [])).toBe(false);
      expect(fired).toBe(0);
      expect(builtins["CLOCKER"]!(world, [])).toBe(true);
      expect(fired).toBe(1);
      expect(builtins["CLOCKER"]!(world, [])).toBe(false);
      expect(fired).toBe(1); // dormant at tick 0
      expect(world.globals["MOVES"]).toBe(3);
    } finally {
      delete builtins["I-TEST"];
    }
  });

  it("a tick of −1 is a demon: fires every turn", () => {
    const world = w();
    let fired = 0;
    builtins["I-DEMON"] = () => (fired++, true);
    try {
      builtins["ENABLE"]!(world, [builtins["QUEUE"]!(world, ["I-DEMON", -1])]);
      builtins["CLOCKER"]!(world, []);
      builtins["CLOCKER"]!(world, []);
      builtins["CLOCKER"]!(world, []);
      expect(fired).toBe(3);
    } finally {
      delete builtins["I-DEMON"];
    }
  });

  it("CLOCK-WAIT skips exactly one tick (ZIL V-WAIT protocol)", () => {
    const world = w();
    let fired = 0;
    builtins["I-TEST"] = () => (fired++, true);
    try {
      builtins["ENABLE"]!(world, [builtins["QUEUE"]!(world, ["I-TEST", 1])]);
      world.globals["CLOCK-WAIT"] = true;
      expect(builtins["CLOCKER"]!(world, [])).toBe(false);
      expect(fired).toBe(0);
      expect(world.globals["CLOCK-WAIT"]).toBe(false);
      expect(builtins["CLOCKER"]!(world, [])).toBe(true);
      expect(fired).toBe(1);
    } finally {
      delete builtins["I-TEST"];
    }
  });
});

describe("stage 3.5 batch (d) countdown golden — the match burns out", () => {
  afterEach(() => {
    delete builtins["I-MATCH"];
    delete builtins["LIT?"];
  });

  it("extracted I-MATCH fires through CLOCKER after two turns", () => {
    const iMatch = routineById.get("I-MATCH")!;
    const world = makeWorld({
      here: "LIVING-ROOM",
      verb: "LAMP-ON",
      flags: { MATCH: ["FLAMEBIT", "ONBIT"] },
      globals: { LIT: true },
    });
    builtins["I-MATCH"] = (w) => runRoutine(iMatch, w);
    builtins["LIT?"] = (w) => w.globals["LIT"] === true; // room lighting stub
    builtins["ENABLE"]!(world, [builtins["QUEUE"]!(world, ["I-MATCH", 2])]);

    builtins["CLOCKER"]!(world, []);
    expect(world.output.join("")).toBe("");
    expect(world.flags["MATCH"]!.has("ONBIT")).toBe(true);

    builtins["CLOCKER"]!(world, []);
    expect(world.output.join("")).toBe("The match has gone out.\n");
    expect(world.flags["MATCH"]!.has("FLAMEBIT")).toBe(false);
    expect(world.flags["MATCH"]!.has("ONBIT")).toBe(false);

    builtins["CLOCKER"]!(world, []);
    expect(world.output.join("")).toBe("The match has gone out.\n"); // fired once
  });
});
