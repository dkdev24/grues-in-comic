/**
 * Stage 3.5 batch (i) tests: computed application (ZIL `<APPLY <GETP .O
 * ,P?ACTION> …>`) — calling a routine named at run time, the routine-name
 * string convention batch (d) established for QUEUE targets.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import type { WorldDocument } from "../src/schema.js";
import type { BehaviorValue, Expr } from "../src/behavior.js";
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

describe("stage 3.5 batch (i) extraction — computed application", () => {
  it("extracts the APPLY routines", () => {
    for (const id of ["TROLL-FCN", "AWAKEN", "DESCRIBE-OBJECT", "V-BOARD"]) {
      expect(routineById.has(id), `${id} should be extracted`).toBe(true);
    }
  });

  it("no routine still catalogs on APPLY", () => {
    for (const entry of catalog) {
      expect(entry.reasons.join("; "), `${entry.id}`).not.toContain("APPLY");
    }
  });

  it("V-BOARD applies PRSO's action property with M-ENTER", () => {
    expect(JSON.stringify(routineById.get("V-BOARD"))).toContain(
      '{"op":"apply","routine":{"op":"prop","entity":{"op":"global","id":"PRSO"},"prop":"action"},' +
        '"args":[{"op":"const","value":2}]}',
    );
  });
});

describe("stage 3.5 batch (i) op semantics", () => {
  afterEach(() => {
    delete builtins["TEST-FCN"];
  });

  const run = (expr: Expr, init: Parameters<typeof makeWorld>[0]) =>
    runRoutine({ id: "T", body: [{ op: "value", expr }] }, makeWorld(init));

  const base = { here: "X", verb: "X" } as const;

  it("calls the routine the name string identifies, passing the args", () => {
    const seen: BehaviorValue[][] = [];
    builtins["TEST-FCN"] = (_w, args) => (seen.push(args), "called");
    const value = run(
      {
        op: "apply",
        routine: { op: "const", value: "TEST-FCN" },
        args: [{ op: "const", value: 4 }],
      },
      base,
    );
    expect(value).toBe("called");
    expect(seen).toEqual([[4]]);
  });

  it("reads the name out of a property, as the corpus does", () => {
    builtins["TEST-FCN"] = () => "from-prop";
    expect(
      run(
        {
          op: "apply",
          routine: { op: "prop", entity: { op: "entity", id: "O" }, prop: "action" },
          args: [],
        },
        { ...base, properties: { O: { action: "TEST-FCN" } } },
      ),
    ).toBe("from-prop");
  });

  it("yields false without calling when the object has no action property", () => {
    // ZIL relies on the Z-machine returning 0 for a call to address 0 — this
    // is how <APPLY <GETP .O ,P?ACTION> ,F-BUSY?> probes an ordinary object.
    let called = false;
    builtins["TEST-FCN"] = () => ((called = true), true);
    expect(
      run(
        {
          op: "apply",
          routine: { op: "prop", entity: { op: "entity", id: "O" }, prop: "action" },
          args: [],
        },
        { ...base, properties: { O: {} } },
      ),
    ).toBe(false);
    expect(called).toBe(false);
  });

  it("rejects a target that is neither a routine name nor false", () => {
    expect(() =>
      run({ op: "apply", routine: { op: "const", value: 17 }, args: [] }, base),
    ).toThrow(/routine name/);
  });
});

describe("stage 3.5 batch (i) golden — AWAKEN revives an unconscious villain", () => {
  afterEach(() => {
    delete builtins["TEST-FCN"];
  });

  it("flips negative strength positive and applies F-CONSCIOUS to the action", () => {
    const args: BehaviorValue[][] = [];
    builtins["TEST-FCN"] = (_w, a) => (args.push(a), true);
    const w = makeWorld({
      here: "TROLL-ROOM",
      verb: "X",
      properties: { TROLL: { strength: -3, action: "TEST-FCN" } },
    });
    expect(runRoutine(routineById.get("AWAKEN")!, w, ["TROLL"])).toBe(true);
    expect(w.properties["TROLL"]!["strength"]).toBe(3);
    expect(args).toEqual([[4]]); // ,F-CONSCIOUS
  });

  it("leaves a conscious villain alone — no application at all", () => {
    let called = false;
    builtins["TEST-FCN"] = () => ((called = true), true);
    const w = makeWorld({
      here: "TROLL-ROOM",
      verb: "X",
      properties: { TROLL: { strength: 2, action: "TEST-FCN" } },
    });
    expect(runRoutine(routineById.get("AWAKEN")!, w, ["TROLL"])).toBe(true);
    expect(w.properties["TROLL"]!["strength"]).toBe(2);
    expect(called).toBe(false);
  });
});
