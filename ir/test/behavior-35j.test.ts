/**
 * Stage 3.5 batch (j) tests: RFATAL. The macro is <PROG () <PUSH 2> <RSTACK>>
 * — it returns gmain.zil's M-FATAL (2) from the *routine*. No new vocabulary:
 * the action-handler protocol is already ordinary values (M-NOT-HANDLED =
 * false, M-HANDLED = 1, M-FATAL = 2), and only the M4 parser loop — a Group A
 * builtin — compares against it.
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

/** Does any `return 2` in this routine sit inside a loop/block activation? */
function fatalDepths(id: string): number[] {
  const depths: number[] = [];
  const walk = (node: unknown, depth: number): void => {
    if (Array.isArray(node)) return node.forEach((n) => walk(n, depth));
    if (typeof node !== "object" || node === null) return;
    const n = node as Record<string, unknown>;
    const value = n["value"] as Record<string, unknown> | undefined;
    if (n["op"] === "return" && value?.["op"] === "const" && value["value"] === 2) {
      depths.push(depth);
    }
    const inner = n["op"] === "loop" || n["op"] === "block" ? depth + 1 : depth;
    for (const key of Object.keys(n)) walk(n[key], inner);
  };
  walk(routineById.get(id)!.body, 0);
  return depths;
}

describe("stage 3.5 batch (j) extraction — RFATAL", () => {
  it("extracts the RFATAL routines", () => {
    for (const id of ["CANDLES-FCN", "ITAKE", "JIGS-UP", "PRE-BOARD", "V-TELL"]) {
      expect(routineById.has(id), `${id} should be extracted`).toBe(true);
    }
  });

  it("no routine still catalogs on RFATAL", () => {
    for (const entry of catalog) {
      expect(entry.reasons.join("; "), `${entry.id}`).not.toContain("RFATAL");
    }
  });

  it("lowers to a plain return of M-FATAL — no new op", () => {
    expect(JSON.stringify(routineById.get("V-TELL"))).toContain(
      '{"op":"return","value":{"op":"const","value":2}}',
    );
  });

  it("returns from the routine even inside a PROG — RSTACK, not RETURN", () => {
    // JIGS-UP ends <PROG () … <RFATAL>)>. Lowered as ZIL's <RETURN> it would
    // have become a `break` and merely left the PROG; RSTACK exits JIGS-UP.
    expect(fatalDepths("JIGS-UP").some((d) => d > 0)).toBe(true);
  });
});

describe("stage 3.5 batch (j) op semantics", () => {
  it("a fatal return inside a loop exits the routine, not the loop", () => {
    const value = runRoutine(
      {
        id: "T",
        body: [
          {
            op: "loop",
            body: [{ op: "return", value: { op: "const", value: 2 } }],
          },
          { op: "value", expr: { op: "const", value: "unreachable" } },
        ],
      },
      makeWorld({ here: "X", verb: "X" }),
    );
    expect(value).toBe(2);
  });

  it("the three handler outcomes stay distinguishable", () => {
    const returns = (value: boolean | number) =>
      runRoutine(
        { id: "T", body: [{ op: "return", value: { op: "const", value } }] },
        makeWorld({ here: "X", verb: "X" }),
      );
    expect(returns(false)).toBe(false); // M-NOT-HANDLED
    expect(returns(1)).toBe(1); // M-HANDLED
    expect(returns(2)).toBe(2); // M-FATAL
  });
});
