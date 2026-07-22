/**
 * <NTH> table index + bare-String-in-statement batch — the two idioms that
 * cleared the extraction catalog's tail.
 *
 * NTH is ZILCH's 1-based table read; it lowers to the IR's 0-based table-get
 * with the index shifted down by one, which unblocks I-CYCLOPS's wrath
 * messages. A bare String ending a COND clause is that clause's value (exactly
 * like a Number), which unblocks GRATE-FUNCTION's OPEN-CLOSE message argument.
 *
 * The remaining catalog tail is engine-owned by design and stays catalogued:
 * GOTO (movement) and PICK-ONE (randomness) are Group A builtins, and V-SAY
 * stops on the parser's P-LEXV lex buffer — none is an idiom gap.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { WorldDocument } from "../src/schema.js";
import type { Expr } from "../src/behavior.js";
import type { RuntimeTable } from "../poc/world.js";
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
const catalogIds = new Set(catalog.map((c) => c.id));

describe("stage 3.5 batch (k) — <NTH> and string-in-statement clear the tail", () => {
  it("I-CYCLOPS and GRATE-FUNCTION now extract, not catalogue", () => {
    for (const id of ["I-CYCLOPS", "GRATE-FUNCTION"]) {
      expect(routineById.has(id), `${id} should be extracted`).toBe(true);
      expect(catalogIds.has(id), `${id} should no longer be catalogued`).toBe(false);
    }
  });

  it("NTH lowers its 1-based index to a 0-based table-get", () => {
    // `<NTH ,CYCLOMAD <- <ABS ,CYCLOWRATH> 1>>`: the ZIL index already
    // subtracts one; NTH subtracts one more (1-based → 0-based), so the
    // shape carries a double `sub`. Reverting the lowering catalogues the
    // routine and this shape disappears.
    expect(JSON.stringify(routineById.get("I-CYCLOPS"))).toContain(
      '{"op":"table-get","table":{"op":"global","id":"CYCLOMAD"},"index":' +
        '{"op":"sub","a":{"op":"sub","a":{"op":"abs","arg":{"op":"global","id":"CYCLOWRATH"}},' +
        '"b":{"op":"const","value":1}},"b":{"op":"const","value":1}}}',
    );
  });

  it("the extracted index selects the real wrath message for a given CYCLOWRATH", () => {
    // Drive the real extracted CYCLOMAD table through the lowered index. The
    // daemon increments CYCLOWRATH before the read, so magnitude 2 shows the
    // first message and 6 the last-but-one — the off-by-one is what this pins.
    const cyclomad = world.tables!.find((t) => t.id === "CYCLOMAD")!;
    // CYCLOMAD is a PURE string table; its IR elements are the decoded strings.
    const elements = cyclomad.elements.filter((e): e is string => typeof e === "string");
    const index: Expr = {
      op: "sub",
      a: { op: "sub", a: { op: "abs", arg: { op: "global", id: "CYCLOWRATH" } }, b: { op: "const", value: 1 } },
      b: { op: "const", value: 1 },
    };
    const get: Expr = { op: "table-get", table: { op: "global", id: "CYCLOMAD" }, index };
    const read = (wrath: number) =>
      runRoutine(
        { id: "T", body: [{ op: "value", expr: get }] },
        makeWorld({
          here: "X",
          verb: "X",
          globals: { CYCLOMAD: "CYCLOMAD", CYCLOWRATH: wrath },
          tables: { CYCLOMAD: { kind: "table", elements: [...elements] } as RuntimeTable },
        }),
      );
    expect(read(2)).toBe("The cyclops seems somewhat agitated.");
    expect(read(6)).toBe("The cyclops is moving toward you in an unfriendly manner.");
  });

  it("a String ending a COND clause is the clause's value", () => {
    // GRATE-FUNCTION passes the taken clause's string to OPEN-CLOSE as its
    // open-message. The clause body ends in a bare String, lowered to a value
    // statement; reverting the support catalogues the routine.
    expect(JSON.stringify(routineById.get("GRATE-FUNCTION"))).toContain(
      '{"op":"value","expr":{"op":"const","value":"The grating opens."}}',
    );
    const value = runRoutine(
      {
        id: "T",
        body: [
          {
            op: "cond",
            clauses: [
              { when: { op: "const", value: true }, do: [{ op: "value", expr: { op: "const", value: "opened" } }] },
            ],
          },
        ],
      },
      makeWorld({ here: "X", verb: "X" }),
    );
    expect(value).toBe("opened");
  });

  it("the engine-owned tail stays catalogued by design", () => {
    // Not idiom gaps: GOTO/PICK-ONE are Group A builtins; V-SAY stops on the
    // parser's P-LEXV lex buffer. None should have been drawn into extraction.
    for (const id of ["GOTO", "PICK-ONE", "V-SAY"]) {
      expect(routineById.has(id), `${id} should not be extracted`).toBe(false);
      expect(catalogIds.has(id), `${id} should stay catalogued`).toBe(true);
    }
  });
});
