/**
 * Stage 3.5 batch (f) tests: output and flag mutation in expression position
 * (ZIL TELL / CRLF / PRINTN / FSET / FCLEAR inside AND/OR predicates), the
 * same shapes as the statement ops, yielding true — batch (c) precedent.
 * PRINTN leaves the deny list and lowers to a TELL number part.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { WorldDocument } from "../src/schema.js";
import { runRoutine } from "../poc/interpreter.js";
import { makeWorld } from "../poc/world.js";

const here = fileURLToPath(new URL(".", import.meta.url));
const world = JSON.parse(
  readFileSync(join(here, "..", "artifacts", "zork1.world.json"), "utf8"),
) as WorldDocument;
const catalog = JSON.parse(
  readFileSync(join(here, "..", "artifacts", "zork1.behavior-catalog.json"), "utf8"),
) as { id: string; reasons: string[] }[];

const routineById = new Map(world.routines!.map((r) => [r.id, r]));

describe("stage 3.5 batch (f) extraction — expression-position statement ops", () => {
  it("extracts the TELL/FSET-in-predicate and PRINTN routines", () => {
    for (const id of [
      "I-XB", "RUSTY-KNIFE-FCN", "I-RFILL", "SAND-FUNCTION", "V-DIAGNOSE",
      "I-CURE", "FIGHT-STRENGTH", // pulled in by V-DIAGNOSE's closure
    ]) {
      expect(routineById.has(id), `${id} should be extracted`).toBe(true);
    }
  });

  it("TROLL-FCN moves to its next real blocker (APPLY — batch i)", () => {
    expect(catalog.find((e) => e.id === "TROLL-FCN")?.reasons).toEqual(["operator APPLY"]);
  });

  it("RUSTY-KNIFE-FCN carries a tell inside an and", () => {
    expect(JSON.stringify(routineById.get("RUSTY-KNIFE-FCN"))).toMatch(
      /"op":"and","args":\[\{"op":"in\?".*\{"op":"tell"/,
    );
  });

  it("I-RFILL carries a set-flag inside an and", () => {
    expect(JSON.stringify(routineById.get("I-RFILL"))).toMatch(
      /"op":"and","args":\[\{"op":"in\?".*\{"op":"set-flag"/,
    );
  });

  it("V-DIAGNOSE lowers PRINTN to a TELL number part", () => {
    expect(JSON.stringify(routineById.get("V-DIAGNOSE"))).toContain('"parts":[{"expr":');
  });
});

describe("stage 3.5 batch (f) op semantics", () => {
  it("expression-position tell emits output and yields true", () => {
    const w = makeWorld({ here: "X", verb: "X" });
    const value = runRoutine(
      {
        id: "T",
        body: [
          {
            op: "value",
            expr: { op: "and", args: [{ op: "tell", parts: [{ text: "hi" }] }] },
          },
        ],
      },
      w,
    );
    expect(value).toBe(true);
    expect(w.output.join("")).toBe("hi");
  });

  it("expression-position set-flag mutates and yields true", () => {
    const w = makeWorld({ here: "X", verb: "X", locations: { LAMP: "X" } });
    const value = runRoutine(
      {
        id: "T",
        body: [
          {
            op: "value",
            expr: {
              op: "and",
              args: [{ op: "set-flag", entity: { op: "entity", id: "LAMP" }, flag: "ONBIT" }],
            },
          },
        ],
      },
      w,
    );
    expect(value).toBe(true);
    expect(w.flags["LAMP"]!.has("ONBIT")).toBe(true);
  });

  it("extracted I-XB warns the wraiths at the Entrance to Hades", () => {
    const w = makeWorld({
      here: "ENTRANCE-TO-HADES",
      verb: "X",
      globals: { XC: false, XB: true },
    });
    runRoutine(routineById.get("I-XB")!, w);
    expect(w.output.join("")).toContain("the wraiths, amused but shaken");
    expect(w.globals["XB"]).toBe(false);
  });
});
