/**
 * Stage 3.5 batch (b) tests: loops (`loop`/`block`/`break`/`continue`) and
 * object-tree iteration (`first`/`next` over ordered child lists).
 *
 * Extraction assertions against the committed artifact, unit semantics for
 * the new ops, and real extracted corpus routines (FIND-WEAPON, OTVAL-FROB,
 * TOUCH-ALL) executed by the reference interpreter over a miniature object
 * tree.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import type { BehaviorRoutine, Stmt } from "../src/behavior.js";
import type { WorldDocument } from "../src/schema.js";
import { runRoutine } from "../poc/interpreter.js";
import { builtins, makeWorld } from "../poc/world.js";

const here = fileURLToPath(new URL(".", import.meta.url));
const world = JSON.parse(
  readFileSync(join(here, "..", "artifacts", "zork1.world.json"), "utf8"),
) as WorldDocument;
const catalog = JSON.parse(
  readFileSync(join(here, "..", "artifacts", "zork1.behavior-catalog.json"), "utf8"),
) as { id: string }[];

const routineById = new Map(world.routines!.map((r) => [r.id, r]));
const catalogIds = new Set(catalog.map((c) => c.id));

describe("stage 3.5 batch (b) extraction", () => {
  it("extracts the loop/iteration routines", () => {
    for (const id of [
      "FIND-WEAPON", "OTVAL-FROB", "TOUCH-ALL", "WEIGHT", "ROB",
      "THIEF-IN-TREASURE", "V-OPEN", "V-INVENTORY", "V-WAIT", "DESCRIBE-OBJECTS",
    ]) {
      expect(routineById.has(id), `${id} should be extracted`).toBe(true);
      expect(catalogIds.has(id), `${id} should not be catalogued`).toBe(false);
    }
  });

  it("records arity-based optional defaults from the corpus", () => {
    expect(routineById.get("OTVAL-FROB")!.defaults).toEqual({
      O: { op: "entity", id: "TROPHY-CASE" },
    });
    expect(routineById.get("V-WAIT")!.defaults).toEqual({
      NUM: { op: "const", value: 3 },
    });
  });

  it("treats clock machinery as engine builtins since batch (d)", () => {
    for (const id of ["QUEUE", "INT", "CLOCKER"]) {
      expect(routineById.has(id), `${id} should not be extracted`).toBe(false);
      expect(catalogIds.has(id), `${id} should not be catalogued`).toBe(false);
    }
  });

  it("lowers RETURN-inside-REPEAT to break, not routine return", () => {
    const findWeapon = JSON.stringify(routineById.get("FIND-WEAPON"));
    expect(findWeapon).toContain('"op":"loop"');
    expect(findWeapon).toContain('"op":"break"');
  });
});

describe("stage 3.5 batch (e) extraction — compile-time macro resolution", () => {
  it("extracts the %<COND>-gated and DECL/empty-form routines", () => {
    for (const id of [
      "V-PRAY", "V-LOOK-INSIDE", "V-ATTACK", "V-SCORE", "V-TREASURE", "PRE-PUT",
      "CRETIN-FCN", "AXE-F", "ROBBER-FUNCTION", "PRINT-CONT", "SCORE-UPD",
    ]) {
      expect(routineById.has(id), `${id} should be extracted`).toBe(true);
    }
  });

  it("selects the ZORK-NUMBER=1 clause and drops the Zork II/III variants", () => {
    // V-PRAY's Zork I gate: (EQUAL? HERE SOUTH-TEMPLE → GOTO FOREST-1);
    // the Zork II/III alternative is '(<NULL-F> <RTRUE>).
    const vPray = JSON.stringify(routineById.get("V-PRAY"));
    expect(vPray).toContain("SOUTH-TEMPLE");
    expect(vPray).toContain("FOREST-1");
    expect(vPray).not.toContain("NULL-F");
  });

  it("AXE-F's empty-form clause body yields false (ZIL <>)", () => {
    const axeF = routineById.get("AXE-F")!;
    const w = makeWorld({ here: "TROLL-ROOM", verb: "X", globals: { "TROLL-FLAG": true } });
    expect(runRoutine(axeF, w)).toBe(false);
  });
});

describe("stage 3.5 batch (b) op semantics", () => {
  const run = (body: Stmt[], routine: Partial<BehaviorRoutine> = {}) =>
    runRoutine({ id: "T", body, ...routine }, makeWorld({ here: "X", verb: "X" }));

  it("loop repeats until break and yields the break value", () => {
    const value = run(
      [
        { op: "set-local", id: "N", value: { op: "const", value: 0 } },
        {
          op: "loop",
          body: [
            { op: "set-local", id: "N", value: { op: "add", a: { op: "local", id: "N" }, b: { op: "const", value: 1 } } },
            {
              op: "cond",
              clauses: [
                {
                  when: { op: "gt?", a: { op: "local", id: "N" }, b: { op: "const", value: 4 } },
                  do: [{ op: "break", value: { op: "local", id: "N" } }],
                },
              ],
            },
          ],
        },
      ],
      { locals: ["N"] },
    );
    expect(value).toBe(5);
  });

  it("block runs once and yields its last statement's value", () => {
    expect(
      run([
        { op: "block", body: [{ op: "tell", parts: [{ text: "hi" }] }, { op: "value", expr: { op: "const", value: 7 } }] },
      ]),
    ).toBe(7);
  });

  it("continue restarts a block (ZIL AGAIN in PROG)", () => {
    // Block: bump G; if G < 3 continue (restart); else fall off end yielding G.
    const value = runRoutine(
      {
        id: "T-AGAIN",
        locals: ["G"],
        body: [
          { op: "set-local", id: "G", value: { op: "const", value: 0 } },
          {
            op: "block",
            body: [
              { op: "set-local", id: "G", value: { op: "add", a: { op: "local", id: "G" }, b: { op: "const", value: 1 } } },
              {
                op: "cond",
                clauses: [
                  {
                    when: { op: "lt?", a: { op: "local", id: "G" }, b: { op: "const", value: 3 } },
                    do: [{ op: "continue" }],
                  },
                  { when: { op: "const", value: true }, do: [{ op: "value", expr: { op: "local", id: "G" } }] },
                ],
              },
            ],
          },
        ],
      },
      makeWorld({ here: "X", verb: "X" }),
    );
    expect(value).toBe(3);
  });

  it("break exits only the nearest enclosing loop", () => {
    const value = run([
      {
        op: "loop",
        body: [
          { op: "loop", body: [{ op: "break", value: { op: "const", value: "inner" } }] },
          { op: "break", value: { op: "const", value: "outer" } },
        ],
      },
    ]);
    expect(value).toBe("outer");
  });

  it("first/next walk sibling order; move inserts at the front", () => {
    const w = makeWorld({
      here: "X",
      verb: "X",
      locations: { AXE: "TROLL", STILETTO: "THIEF", EGG: "THIEF" },
    });
    const evalIn = (body: Stmt[]) => runRoutine({ id: "T", body }, w);
    const first = (id: string) =>
      evalIn([{ op: "value", expr: { op: "first", entity: { op: "entity", id } } }]);
    const next = (id: string) =>
      evalIn([{ op: "value", expr: { op: "next", entity: { op: "entity", id } } }]);

    expect(first("TROLL")).toBe("AXE");
    expect(first("THIEF")).toBe("STILETTO");
    expect(next("STILETTO")).toBe("EGG");
    expect(next("EGG")).toBe(false);
    expect(first("EGG")).toBe(false);

    // Z-machine insert_obj: a moved object becomes the FIRST child.
    evalIn([{ op: "move", entity: { op: "entity", id: "AXE" }, to: { op: "entity", id: "THIEF" } }]);
    expect(first("THIEF")).toBe("AXE");
    expect(next("AXE")).toBe("STILETTO");
    expect(first("TROLL")).toBe(false);

    evalIn([{ op: "remove", entity: { op: "entity", id: "STILETTO" } }]);
    expect(next("AXE")).toBe("EGG");
  });
});

describe("stage 3.5 batch (b) corpus routines over a mini object tree", () => {
  afterEach(() => {
    delete builtins["OTVAL-FROB"];
    delete builtins["TOUCH-ALL"];
  });

  it("FIND-WEAPON finds the troll's axe and refuses the empty-handed thief", () => {
    const findWeapon = routineById.get("FIND-WEAPON")!;
    const w = makeWorld({
      here: "TROLL-ROOM",
      verb: "X",
      locations: { GARLIC: "TROLL", AXE: "TROLL" },
    });
    expect(runRoutine(findWeapon, w, ["TROLL"])).toBe("AXE");
    expect(runRoutine(findWeapon, w, ["THIEF"])).toBe(false);
  });

  it("OTVAL-FROB sums treasure values recursively, defaulting to the trophy case", () => {
    const otvalFrob = routineById.get("OTVAL-FROB")!;
    const w = makeWorld({
      here: "LIVING-ROOM",
      verb: "X",
      locations: { EGG: "TROPHY-CASE", COFFIN: "TROPHY-CASE", SCEPTRE: "COFFIN" },
      properties: {
        EGG: { treasureValue: 5 },
        COFFIN: { treasureValue: 15 },
        SCEPTRE: { treasureValue: 6 },
      },
    });
    builtins["OTVAL-FROB"] = (world, [o]) => runRoutine(otvalFrob, world, o === undefined ? [] : [o]);
    // No argument: the OPT default kicks in (O = TROPHY-CASE). Historical
    // quirk preserved: the original ZIL discards the recursive call's value
    // (`<COND (<FIRST? .F> <OTVAL-FROB .F>)>`), so nested treasure (the
    // sceptre inside the coffin) does NOT count — 5 + 15, not 26.
    expect(runRoutine(otvalFrob, w)).toBe(20);
    expect(runRoutine(otvalFrob, w, ["COFFIN"])).toBe(6);
  });

  it("TOUCH-ALL sets TOUCHBIT through the whole subtree", () => {
    const touchAll = routineById.get("TOUCH-ALL")!;
    const w = makeWorld({
      here: "LIVING-ROOM",
      verb: "X",
      locations: { SACK: "KITCHEN", LUNCH: "SACK", GARLIC: "SACK", BOTTLE: "KITCHEN" },
    });
    builtins["TOUCH-ALL"] = (world, [o]) => runRoutine(touchAll, world, [o!]);
    runRoutine(touchAll, w, ["KITCHEN"]);
    for (const id of ["SACK", "LUNCH", "GARLIC", "BOTTLE"]) {
      expect(w.flags[id]?.has("TOUCHBIT"), `${id} should be touched`).toBe(true);
    }
  });
});
