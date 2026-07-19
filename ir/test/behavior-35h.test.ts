/**
 * Stage 3.5 batch (h) tests: table views (ZIL `<REST tbl bytes>` → an element
 * offset over the same storage), which unblock the I-LANTERN / I-CANDLES
 * countdown tables and complete the batch (d) daemon goldens.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import type { WorldDocument } from "../src/schema.js";
import type { Expr } from "../src/behavior.js";
import { runRoutine } from "../poc/interpreter.js";
import { builtins, makeWorld, type RuntimeTable } from "../poc/world.js";

const here = fileURLToPath(new URL(".", import.meta.url));
const world = JSON.parse(
  readFileSync(join(here, "..", "artifacts", "zork1.world.json"), "utf8"),
) as WorldDocument;
const catalog = JSON.parse(
  readFileSync(join(here, "..", "artifacts", "zork1.behavior-catalog.json"), "utf8"),
) as { id: string; reasons: string[] }[];

const routineById = new Map(world.routines!.map((r) => [r.id, r]));
const tableById = new Map(world.tables!.map((t) => [t.id, t]));

/**
 * The countdown table as the extractor emitted it — pairs of tick + message.
 * Document elements may be entity refs, which the runtime flattens to ids.
 */
const lampTable = (): Record<string, RuntimeTable> => ({
  "LAMP-TABLE": {
    kind: "table",
    elements: tableById
      .get("LAMP-TABLE")!
      .elements.map((e) => (typeof e === "object" && e !== null && "ref" in e ? e.ref : e)),
  },
});

describe("stage 3.5 batch (h) extraction — table views", () => {
  it("extracts the lamp/candle daemons and their shared helper", () => {
    for (const id of ["I-LANTERN", "I-CANDLES", "LIGHT-INT"]) {
      expect(routineById.has(id), `${id} should be extracted`).toBe(true);
    }
    for (const id of ["I-LANTERN", "I-CANDLES"]) {
      expect(catalog.some((e) => e.id === id), `${id} should no longer be catalogued`).toBe(false);
    }
  });

  it("halves the ZIL byte count: <REST .TBL 4> advances two elements", () => {
    expect(JSON.stringify(routineById.get("I-LANTERN"))).toContain(
      '{"op":"table-rest","table":{"op":"local","id":"TBL"},"offset":{"op":"const","value":2}}',
    );
  });

  it("no routine still catalogs on <REST>", () => {
    for (const entry of catalog) {
      // PICK-ONE keeps its REST, but as a Group A engine builtin it is never
      // extracted in the first place — it must not be catalogued for it.
      // (Matched with the ellipsis so V-RESTART/V-RESTORE do not count.)
      expect(entry.reasons.join("; "), `${entry.id}`).not.toContain("<REST …>");
    }
  });
});

describe("stage 3.5 batch (h) op semantics", () => {
  const run = (expr: Expr, tables: Record<string, RuntimeTable>) =>
    runRoutine(
      { id: "T", body: [{ op: "value", expr }] },
      makeWorld({ here: "X", verb: "X", tables }),
    );

  const T = { op: "const" as const, value: "T1" };
  const tables = (): Record<string, RuntimeTable> => ({
    T1: { kind: "table", elements: [10, "a", 20, "b", 0] },
  });

  it("a view yields a table pointer carrying its element offset", () => {
    expect(run({ op: "table-rest", table: T, offset: { op: "const", value: 2 } }, tables())).toEqual({
      table: "T1",
      offset: 2,
    });
  });

  it("reads through a view are offset from the view's base", () => {
    const view: Expr = { op: "table-rest", table: T, offset: { op: "const", value: 2 } };
    expect(run({ op: "table-get", table: view, index: { op: "const", value: 0 } }, tables())).toBe(20);
    expect(run({ op: "table-get", table: view, index: { op: "const", value: 1 } }, tables())).toBe("b");
  });

  it("views compose — a view of a view sums the offsets", () => {
    const inner: Expr = { op: "table-rest", table: T, offset: { op: "const", value: 2 } };
    const outer: Expr = { op: "table-rest", table: inner, offset: { op: "const", value: 2 } };
    expect(run(outer, tables())).toEqual({ table: "T1", offset: 4 });
    expect(run({ op: "table-get", table: outer, index: { op: "const", value: 0 } }, tables())).toBe(0);
  });

  it("a bare table id is the same pointer at offset 0", () => {
    expect(run({ op: "table-get", table: T, index: { op: "const", value: 0 } }, tables())).toBe(10);
  });

  it("refuses to view an ltable, whose count sits in the skipped slot", () => {
    expect(() =>
      run({ op: "table-rest", table: T, offset: { op: "const", value: 2 } }, {
        T1: { kind: "ltable", elements: [10, 20] },
      }),
    ).toThrow(/ltable/);
  });
});

describe("stage 3.5 batch (h) countdown golden — the lamp burns out", () => {
  afterEach(() => {
    delete builtins["I-LANTERN"];
    delete builtins["LIGHT-INT"];
    delete builtins["HELD?"];
  });

  /** Fire the daemon once per scheduled expiry and return what it printed. */
  const burn = () => {
    const iLantern = routineById.get("I-LANTERN")!;
    const lightInt = routineById.get("LIGHT-INT")!;
    const w = makeWorld({
      here: "LIVING-ROOM",
      verb: "LAMP-ON",
      globals: { "LAMP-TABLE": "LAMP-TABLE" },
      flags: { LAMP: ["ONBIT"] },
      locations: { LAMP: "LIVING-ROOM" },
      names: { LAMP: "brass lantern" },
      tables: lampTable(),
    });
    builtins["I-LANTERN"] = (world) => runRoutine(iLantern, world);
    builtins["LIGHT-INT"] = (world, args) => runRoutine(lightInt, world, args);
    builtins["HELD?"] = () => false; // the lamp is on the floor, not carried

    const stages: string[] = [];
    for (let i = 0; i < 4; i++) {
      w.output.length = 0;
      builtins["I-LANTERN"]!(w, []);
      stages.push(w.output.join(""));
    }
    return { w, stages };
  };

  it("prints each dimming message in turn, then dies at tick 0", () => {
    const { w, stages } = burn();
    expect(stages).toEqual([
      "The lamp appears a bit dimmer.\n",
      "The lamp is definitely dimmer now.\n",
      "The lamp is nearly out.\n",
      "You'd better have more light than from the brass lantern.\n",
    ]);
    expect(w.flags["LAMP"]!.has("ONBIT")).toBe(false);
    expect(w.flags["LAMP"]!.has("RMUNGBIT")).toBe(true);
  });

  it("advances LAMP-TABLE two elements per stage, then stops at the 0 terminator", () => {
    const { w } = burn();
    // Four firings, but the last (tick 0) does not advance: 3 × 2 elements.
    expect(w.globals["LAMP-TABLE"]).toEqual({ table: "LAMP-TABLE", offset: 6 });
    // The table itself is PURE — the daemon moves a pointer, never writes.
    expect(w.tables["LAMP-TABLE"]!.elements).toEqual(lampTable()["LAMP-TABLE"]!.elements);
  });

  it("re-queues itself with the tick it just consumed", () => {
    const { w } = burn();
    const record = w.tables[w.clock[0]!]!;
    expect(record.elements[2]).toBe("I-LANTERN");
    expect(record.elements[1]).toBe(0); // the terminator tick, so it lies dormant
  });
});
