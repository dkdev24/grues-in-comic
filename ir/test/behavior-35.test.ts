/**
 * Stage 3.5 batch (a)+(c) tests: property/table access, arithmetic, optional
 * parameter defaults, and expression-position assignment.
 *
 * Two layers:
 * 1. Extraction — the committed IR artifact contains the routines these ops
 *    unlock, and designated engine-builtin/Z-machine routines stay catalogued.
 * 2. Execution — the reference interpreter runs extracted routines against
 *    the golden transcripts (V-READ on the leaflet reproduces the frotz
 *    output), plus unit semantics for each new op.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { BehaviorRoutine } from "../src/behavior.js";
import type { WorldDocument } from "../src/schema.js";
import { runRoutine } from "../poc/interpreter.js";
import { makeWorld } from "../poc/world.js";

const here = fileURLToPath(new URL(".", import.meta.url));
const world = JSON.parse(
  readFileSync(join(here, "..", "artifacts", "zork1.world.json"), "utf8"),
) as WorldDocument;
const catalog = JSON.parse(
  readFileSync(join(here, "..", "artifacts", "zork1.behavior-catalog.json"), "utf8"),
) as { id: string }[];
const golden = readFileSync(
  join(here, "..", "..", "verification", "golden", "01-west-of-house.txt"),
  "utf8",
);

const routineById = new Map(world.routines!.map((r) => [r.id, r]));
const catalogIds = new Set(catalog.map((c) => c.id));

describe("stage 3.5 extraction (batches a + c)", () => {
  it("extracts the property/table/arithmetic/SET-expression routines", () => {
    for (const id of [
      "BAD-EGG", "CHALICE-FCN", "LARGE-BAG-F", "PAINTING-FCN", "TREASURE-ROOM-FCN",
      "V-EXAMINE", "V-READ", // batch (a): prop / table-get
      "BASKET-F", "CAVE2-ROOM", "SCORE-OBJ", "V-CLOSE", "V-STAB", // batch (c): SET/SETG exprs
      "LIVING-ROOM-FCN", "MATCH-FUNCTION", "V-PUT", // arithmetic
    ]) {
      expect(routineById.has(id), `${id} should be extracted`).toBe(true);
      expect(catalogIds.has(id), `${id} should not be catalogued`).toBe(false);
    }
  });

  it("keeps engine-builtin and Z-machine-level routines catalogued", () => {
    // PICK-ONE is a designated engine builtin (seeded RNG); V-SCRIPT pokes
    // the Z-machine header (transcript bit) — neither belongs in the IR.
    for (const id of ["PICK-ONE", "V-SCRIPT", "V-UNSCRIPT", "PRE-FILL"]) {
      expect(routineById.has(id), `${id} should not be extracted`).toBe(false);
      expect(catalogIds.has(id), `${id} should stay catalogued`).toBe(true);
    }
  });

  it("uses IR field names, not ZIL P?-atoms, as property keys", () => {
    const json = JSON.stringify(world.routines);
    expect(json).not.toContain("P?");
    expect(JSON.stringify(routineById.get("V-READ"))).toContain('"prop":"text"');
    expect(JSON.stringify(routineById.get("PAINTING-FCN"))).toContain('"prop":"treasureValue"');
  });
});

describe("stage 3.5 execution against the golden transcript", () => {
  const advertisement = world.objects.find((o) => o.id === "ADVERTISEMENT")!;
  const vRead = routineById.get("V-READ")!;

  const readWorld = (flags: string[]) =>
    makeWorld({
      here: "WEST-OF-HOUSE",
      verb: "READ",
      globals: { PRSO: "ADVERTISEMENT" },
      flags: { ADVERTISEMENT: flags },
      names: { ADVERTISEMENT: advertisement.name },
      properties: { ADVERTISEMENT: { text: advertisement.text! } },
    });

  it("V-READ on the leaflet reproduces the golden transcript text", () => {
    const w = readWorld(["READBIT"]);
    runRoutine(vRead, w);
    // The golden is frotz-wrapped at 80 columns; the IR decodes source wraps
    // to spaces — compare with whitespace normalized.
    const flat = (s: string) => s.replace(/\s+/g, " ").trim();
    const goldenLeaflet = golden.slice(golden.indexOf('"WELCOME'), golden.indexOf('one!"') + 5);
    expect(flat(w.output.join(""))).toBe(flat(goldenLeaflet));
  });

  it("V-READ refuses an unreadable object by name", () => {
    const w = readWorld([]);
    runRoutine(vRead, w);
    expect(w.output.join("")).toBe("How does one read a leaflet?\n");
  });

  it("V-EXAMINE falls through to the default description", () => {
    const w = makeWorld({
      here: "WEST-OF-HOUSE",
      verb: "EXAMINE",
      globals: { PRSO: "FRONT-DOOR" },
      names: { "FRONT-DOOR": "door" },
    });
    runRoutine(routineById.get("V-EXAMINE")!, w);
    expect(w.output.join("")).toBe("There's nothing special about the door.\n");
  });
});

describe("stage 3.5 op semantics (reference interpreter)", () => {
  it("prop reads world properties; absent properties are false", () => {
    const routine: BehaviorRoutine = {
      id: "T-PROP",
      body: [
        { op: "value", expr: { op: "prop", entity: { op: "entity", id: "EGG" }, prop: "size" } },
      ],
    };
    const w = makeWorld({ here: "X", verb: "X", properties: { EGG: { size: 5 } } });
    expect(runRoutine(routine, w)).toBe(5);
    expect(runRoutine({ ...routine, body: [{ op: "value", expr: { op: "prop", entity: { op: "entity", id: "EGG" }, prop: "text" } }] }, w)).toBe(false);
  });

  it("set-prop writes and yields its entity (ZIL PUTP)", () => {
    const w = makeWorld({ here: "X", verb: "X" });
    const returned = runRoutine(
      {
        id: "T-SETPROP",
        body: [
          {
            op: "set-prop",
            entity: { op: "entity", id: "SWORD" },
            prop: "treasureValue",
            value: { op: "const", value: 1 },
          },
        ],
      },
      w,
    );
    expect(returned).toBe("SWORD");
    expect(w.properties["SWORD"]).toEqual({ treasureValue: 1 });
  });

  it("table-get/table-set follow ltable length-at-0 indexing", () => {
    const w = makeWorld({
      here: "X",
      verb: "X",
      tables: { DROPS: { kind: "ltable", elements: ["a", "b", "c"] } },
    });
    const get = (index: number): BehaviorRoutineReturn =>
      runRoutine(
        {
          id: "T-GET",
          body: [
            {
              op: "value",
              expr: {
                op: "table-get",
                table: { op: "const", value: "DROPS" },
                index: { op: "const", value: index },
              },
            },
          ],
        },
        w,
      );
    expect(get(0)).toBe(3); // ltable answers its element count at index 0
    expect(get(1)).toBe("a");
    expect(get(3)).toBe("c");
    runRoutine(
      {
        id: "T-PUT",
        body: [
          {
            op: "table-set",
            table: { op: "const", value: "DROPS" },
            index: { op: "const", value: 2 },
            value: { op: "const", value: "B" },
          },
        ],
      },
      w,
    );
    expect(w.tables["DROPS"]!.elements).toEqual(["a", "B", "c"]);
  });

  it("arithmetic is 16-bit signed with ZIL truncation", () => {
    const calc = (op: "add" | "sub" | "mul" | "div", a: number, b: number) =>
      runRoutine(
        {
          id: "T-ARITH",
          body: [
            {
              op: "value",
              expr: { op, a: { op: "const", value: a }, b: { op: "const", value: b } },
            },
          ],
        },
        makeWorld({ here: "X", verb: "X" }),
      );
    expect(calc("add", 3, 4)).toBe(7);
    expect(calc("add", 32767, 1)).toBe(-32768); // Z-machine wraparound
    expect(calc("sub", 0, 5)).toBe(-5); // unary minus lowering
    expect(calc("div", -7, 2)).toBe(-3); // truncates toward zero
  });

  it("optional-parameter defaults apply by arity, not by value", () => {
    const routine: BehaviorRoutine = {
      id: "T-DEFAULT",
      params: ["OBJ"],
      defaults: { OBJ: { op: "global", id: "TROPHY-HOLDER" } },
      body: [{ op: "value", expr: { op: "local", id: "OBJ" } }],
    };
    const w = () => makeWorld({ here: "X", verb: "X", globals: { "TROPHY-HOLDER": "CASE" } });
    expect(runRoutine(routine, w())).toBe("CASE"); // omitted → default
    expect(runRoutine(routine, w(), [false])).toBe(false); // explicit false wins
  });

  it("set-local/set-global in expression position yield the assigned value", () => {
    const w = makeWorld({ here: "X", verb: "X", globals: { SCORE: 0 } });
    const returned = runRoutine(
      {
        id: "T-SETEXPR",
        locals: ["G"],
        body: [
          {
            op: "cond",
            clauses: [
              {
                when: {
                  op: "equal?",
                  args: [
                    { op: "set-local", id: "G", value: { op: "const", value: 1 } },
                    { op: "set-global", id: "SCORE", value: { op: "const", value: 1 } },
                  ],
                },
                do: [{ op: "value", expr: { op: "local", id: "G" } }],
              },
            ],
          },
        ],
      },
      w,
    );
    expect(returned).toBe(1);
    expect(w.globals["SCORE"]).toBe(1);
  });
});

type BehaviorRoutineReturn = ReturnType<typeof runRoutine>;
