/**
 * World-document gap 2 — table-valued globals: `<GLOBAL X <TABLE …>>`.
 *
 * ZIL's one form declares *two* things — the table storage and a variable
 * holding a pointer to it — and the variable is genuinely mutable: the lamp
 * and candle countdowns advance by `<SETG LAMP-TABLE <REST .TBL 4>>`. World
 * extraction emitted only the table, so `,LAMP-TABLE` read a global that did
 * not exist and an engine had nothing to bind at load time (the batch (h)
 * golden seeded the pointer by hand).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import type { Table, WorldDocument } from "../src/schema.js";
import type { BehaviorValue } from "../src/behavior.js";
import { validateWorld } from "../src/validate.js";
import { runRoutine } from "../poc/interpreter.js";
import { builtins, makeWorld, type RuntimeTable } from "../poc/world.js";

const here = fileURLToPath(new URL(".", import.meta.url));
const world = JSON.parse(
  readFileSync(join(here, "..", "artifacts", "zork1.world.json"), "utf8"),
) as WorldDocument;

const routineById = new Map(world.routines!.map((r) => [r.id, r]));
const globalById = new Map(world.globals.map((g) => [g.id, g]));
const tableById = new Map(world.tables.map((t) => [t.id, t]));

describe("table-valued globals — extraction", () => {
  it("emits both the table and a variable pointing at it", () => {
    expect(tableById.has("LAMP-TABLE")).toBe(true);
    expect(globalById.get("LAMP-TABLE")!.value).toEqual({ table: "LAMP-TABLE", offset: 0 });
  });

  it("binds every table-valued global the corpus reads, not just the lamp's", () => {
    // Every *named* table came from a `<GLOBAL X <TABLE …>>` form, so each one
    // must have its pointer variable. Nested anonymous tables are exempt: ZIL
    // never gave them a variable, and they carry a derived `parent#index` id.
    for (const table of world.tables) {
      if (table.id.includes("#")) continue;
      expect(globalById.get(table.id)?.value, `${table.id} pointer`).toEqual({
        table: table.id,
        offset: 0,
      });
    }
  });

  it("leaves no behavior read pointing at an unbound global", () => {
    // The regression this gap caused: `,YUKS` and friends lowered to
    // {op:"global"} with nothing in `globals` to resolve against.
    const unbound: string[] = [];
    const walk = (node: unknown): void => {
      if (node === null || typeof node !== "object") return;
      if (Array.isArray(node)) return node.forEach(walk);
      const n = node as Record<string, unknown>;
      if (n.op === "global" && typeof n.id === "string" && !globalById.has(n.id)) {
        unbound.push(n.id);
      }
      for (const value of Object.values(n)) walk(value);
    };
    walk(world.routines);
    expect(unbound).toEqual([]);
  });

  it("keeps the pointer a variable, not a constant — the corpus retargets it", () => {
    // I-LANTERN ends `<SETG LAMP-TABLE <REST .TBL 4>>`, which is why a
    // constant table reference would have been the wrong representation.
    expect(JSON.stringify(routineById.get("I-LANTERN"))).toContain(
      '{"op":"set-global","id":"LAMP-TABLE","value":{"op":"table-rest"',
    );
  });
});

describe("table-valued globals — validation", () => {
  const base = (): Record<string, unknown> => ({
    irVersion: world.irVersion,
    flags: [],
    globals: [{ id: "T", value: { table: "T", offset: 0 } }],
    tables: [{ id: "T", kind: "table", elements: [1, 2] }],
    rooms: [],
    objects: [],
  });

  const errors = (doc: Record<string, unknown>) =>
    validateWorld(doc)
      .errors.map((e) => e.message)
      .join("; ");

  it("accepts a table and its pointer sharing the one ZIL name", () => {
    expect(validateWorld(base()).valid).toBe(true);
  });

  it("rejects a pointer at a table that does not exist", () => {
    const doc = base();
    doc.globals = [{ id: "P", value: { table: "MISSING", offset: 0 } }];
    expect(errors(doc)).toContain('unknown table "MISSING"');
  });

  it("rejects a negative offset", () => {
    const doc = base();
    doc.globals = [{ id: "T", value: { table: "T", offset: -1 } }];
    expect(errors(doc)).toContain("must not be negative");
  });

  it("still rejects an id collision that is not a table and its pointer", () => {
    const doc = base();
    doc.globals = [{ id: "T", value: 0 }];
    expect(errors(doc)).toContain('duplicate id "T"');
  });

  it("now rejects a behavior read of a global that does not exist", () => {
    // Before this fix the validator accepted `{op:"global"}` naming a table,
    // which is exactly what hid the unbound reads.
    const doc = base();
    doc.routines = [{ id: "R", body: [{ op: "value", expr: { op: "global", id: "NOPE" } }] }];
    expect(errors(doc)).toContain('unknown global "NOPE"');
  });
});

describe("table-valued globals — golden: the lamp burns out on document state alone", () => {
  afterEach(() => {
    for (const id of ["I-LANTERN", "LIGHT-INT", "HELD?", "QUEUE", "ENABLE"]) delete builtins[id];
  });

  /** What an M4 engine does at load time: bind globals and table storage. */
  const loadWorld = () => {
    const globals: Record<string, BehaviorValue> = {};
    for (const g of world.globals) globals[g.id] = g.value as BehaviorValue;
    // Where the player is and who they are is boot state gmain.zil sets up
    // (`<SETG WINNER ,ADVENTURER>`), not something the document declares —
    // the point of the golden is that the *table* state needs no such help.
    delete globals["HERE"];
    globals["WINNER"] = "ADVENTURER";
    const tables: Record<string, RuntimeTable> = {};
    for (const t of world.tables) tables[t.id] = toRuntimeTable(t);
    return makeWorld({
      here: "LIVING-ROOM",
      verb: "LAMP-ON",
      globals,
      flags: { LAMP: ["ONBIT"] },
      locations: { LAMP: "LIVING-ROOM" },
      names: { LAMP: "brass lantern" },
      tables,
    });
  };

  const toRuntimeTable = (t: Table): RuntimeTable => ({
    kind: t.kind,
    // Entity refs flatten to id strings; table pointers pass through as-is.
    elements: t.elements.map((e) =>
      typeof e === "object" && "ref" in e ? e.ref : e,
    ),
  });

  it("dims through all three stages and dies, with nothing seeded by hand", () => {
    const w = loadWorld();
    builtins["I-LANTERN"] = (world_) => runRoutine(routineById.get("I-LANTERN")!, world_);
    builtins["LIGHT-INT"] = (world_, args) => runRoutine(routineById.get("LIGHT-INT")!, world_, args);
    builtins["HELD?"] = () => false;

    const stages: string[] = [];
    for (let i = 0; i < 4; i++) {
      w.output.length = 0;
      builtins["I-LANTERN"]!(w, []);
      stages.push(w.output.join(""));
    }

    expect(stages).toEqual([
      "The lamp appears a bit dimmer.\n",
      "The lamp is definitely dimmer now.\n",
      "The lamp is nearly out.\n",
      "You'd better have more light than from the brass lantern.\n",
    ]);
    // The pointer advanced from the document's offset 0 to the terminator.
    expect(w.globals["LAMP-TABLE"]).toEqual({ table: "LAMP-TABLE", offset: 6 });
    expect(w.flags["LAMP"]!.has("ONBIT")).toBe(false);
    // PURE table: the daemon moved a pointer and never wrote storage.
    expect(w.tables["LAMP-TABLE"]!.elements).toEqual(tableById.get("LAMP-TABLE")!.elements);
  });
});
