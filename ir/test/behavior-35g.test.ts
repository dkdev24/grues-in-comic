/**
 * Stage 3.5 batch (g) tests: conditionals in expression position (ZIL COND
 * inside AND/OR or as an argument, yielding the taken clause's value) and the
 * MOD / MIN / ABS arithmetic ops leaving the deny list.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { WorldDocument } from "../src/schema.js";
import type { Expr } from "../src/behavior.js";
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
const catalogReasons = new Map(catalog.map((e) => [e.id, e.reasons.join("; ")]));

describe("stage 3.5 batch (g) extraction — expr-position cond + abs/mod/min", () => {
  it("extracts the routines batch (g) unblocks", () => {
    for (const id of ["CANARY-OBJECT", "SHAKE-LOOP", "SAILOR-FCN", "CYCLOPS-FCN"]) {
      expect(routineById.has(id), `${id} should be extracted`).toBe(true);
    }
  });

  it("SAILOR-FCN carries the corpus's only MOD", () => {
    expect(JSON.stringify(routineById.get("SAILOR-FCN"))).toContain('"op":"mod"');
  });

  it("CYCLOPS-FCN carries the corpus's only MIN", () => {
    expect(JSON.stringify(routineById.get("CYCLOPS-FCN"))).toContain('"op":"min"');
  });

  it("the remaining batch (g) targets advance to their next real blocker", () => {
    // ABS and expr-position COND are lowered, so these stop on later frontier
    // forms rather than on anything batch (g) owns.
    expect(catalogReasons.get("I-CYCLOPS")).toContain("<NTH");
    expect(catalogReasons.get("I-THIEF")).toContain(",ROOMS");
    expect(catalogReasons.get("GRATE-FUNCTION")).toContain("String in statement position");
    for (const [id, reason] of catalogReasons) {
      expect(reason, `${id} must not fail on ABS/MOD/MIN`).not.toMatch(/\b(ABS|MOD|MIN)\b/);
    }
  });
});

describe("stage 3.5 batch (g) op semantics", () => {
  const evalExpr = (expr: Expr) =>
    runRoutine({ id: "T", body: [{ op: "value", expr }] }, makeWorld({ here: "X", verb: "X" }));

  const n = (value: number) => ({ op: "const" as const, value });

  it("mod takes the sign of the dividend, as on the Z-machine", () => {
    expect(evalExpr({ op: "mod", a: n(-7), b: n(2) })).toBe(-1);
    expect(evalExpr({ op: "mod", a: n(7), b: n(2) })).toBe(1);
  });

  it("min yields the smaller operand", () => {
    expect(evalExpr({ op: "min", a: n(3), b: n(9) })).toBe(3);
    expect(evalExpr({ op: "min", a: n(-4), b: n(-9) })).toBe(-9);
  });

  it("abs wraps -32768 to itself, as on the Z-machine", () => {
    expect(evalExpr({ op: "abs", arg: n(-5) })).toBe(5);
    expect(evalExpr({ op: "abs", arg: n(-32768) })).toBe(-32768);
  });

  it("expression-position cond yields the taken clause's last value", () => {
    expect(
      evalExpr({
        op: "cond",
        clauses: [
          { when: { op: "const", value: false }, do: [{ op: "value", expr: n(1) }] },
          { when: { op: "const", value: true }, do: [{ op: "value", expr: n(2) }] },
        ],
      }),
    ).toBe(2);
  });

  it("an empty clause body yields the predicate value", () => {
    expect(evalExpr({ op: "cond", clauses: [{ when: n(7), do: [] }] })).toBe(7);
  });

  it("a cond with no firing clause yields false", () => {
    expect(
      evalExpr({
        op: "cond",
        clauses: [{ when: { op: "const", value: false }, do: [{ op: "value", expr: n(1) }] }],
      }),
    ).toBe(false);
  });

  it("a cond nested inside an and gates on the earlier operand", () => {
    const w = makeWorld({ here: "X", verb: "X" });
    const value = runRoutine(
      {
        id: "T",
        body: [
          {
            op: "value",
            expr: {
              op: "and",
              args: [
                { op: "const", value: true },
                {
                  op: "cond",
                  clauses: [
                    { when: { op: "const", value: true }, do: [{ op: "tell", parts: [{ text: "fired" }] }] },
                  ],
                },
              ],
            },
          },
        ],
      },
      w,
    );
    expect(w.output.join("")).toBe("fired");
    expect(value).toBe(true);
  });
});
