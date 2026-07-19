/**
 * World-document gap 3 — nested table elements and ITABLE storage.
 *
 * Two ZIL table forms the document could not carry:
 *
 *  - A `<TABLE …>` nested inside a table. VILLAINS is an LTABLE of one row per
 *    villain, each row itself an anonymous table. ZIL stores an *address* in
 *    the parent slot, which is why `<GET ,VILLAINS .CNT>` hands HERO-BLOW
 *    something it can `<GET .OO ,V-VILLAIN>` straight through. Extraction gives
 *    the nested table a derived `parent#index` id and stores the pointer the
 *    runtime already understands — no new behavior op.
 *  - `<ITABLE NONE n>` — n zero-filled words, the parser's scratch buffers
 *    (P-PRSO/P-PRSI). NOT-HERE-OBJECT-F only reads the pointer, but the global
 *    has to exist for it to read.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { Table, TableRef, WorldDocument } from "../src/schema.js";
import { validateWorld } from "../src/validate.js";
import { runRoutine } from "../poc/interpreter.js";
import { makeWorld, type RuntimeTable } from "../poc/world.js";

const here = fileURLToPath(new URL(".", import.meta.url));
const world = JSON.parse(
  readFileSync(join(here, "..", "artifacts", "zork1.world.json"), "utf8"),
) as WorldDocument;

const tableById = new Map(world.tables.map((t) => [t.id, t]));
const globalById = new Map(world.globals.map((g) => [g.id, g]));

const isPointer = (v: unknown): v is TableRef =>
  typeof v === "object" && v !== null && "table" in v;

describe("nested table elements — VILLAINS", () => {
  it("stores a pointer per row, each resolving to its own table", () => {
    const villains = tableById.get("VILLAINS")!;
    expect(villains.kind).toBe("ltable");
    expect(villains.elements).toHaveLength(3);

    for (const [i, el] of villains.elements.entries()) {
      expect(isPointer(el), `row ${i} is a pointer`).toBe(true);
      const row = tableById.get((el as TableRef).table);
      expect(row, `row ${i} table exists`).toBeDefined();
      expect((el as TableRef).offset).toBe(0);
      // [V-VILLAIN, V-WEAPON, V-BEST-ADV, V-PROB, V-MSGS] — see 1actions.zil.
      expect(row!.elements).toHaveLength(5);
    }
  });

  it("keeps the row layout HERO-BLOW indexes by the V-* constants", () => {
    const troll = tableById.get(
      (world.tables.find((t) => t.id === "VILLAINS")!.elements[0] as TableRef).table,
    )!;
    expect(troll.elements[0]).toEqual({ ref: "TROLL" }); // V-VILLAIN
    expect(troll.elements[1]).toEqual({ ref: "SWORD" }); // V-WEAPON
    expect(troll.elements[3]).toBe(0); // V-PROB
    expect(isPointer(troll.elements[4])).toBe(true); // V-MSGS → TROLL-MELEE
    expect((troll.elements[4] as TableRef).table).toBe("TROLL-MELEE");
  });

  it("gives the cyclops a false weapon slot, not a denial", () => {
    // `<TABLE CYCLOPS <> 0 0 CYCLOPS-MELEE>` — a bare `<>` is an empty slot.
    const cyclops = tableById.get(
      (tableById.get("VILLAINS")!.elements[2] as TableRef).table,
    )!;
    expect(cyclops.elements[0]).toEqual({ ref: "CYCLOPS" });
    expect(cyclops.elements[1]).toBe(false);
  });

  it("pulls the melee message tables into the closure, nesting and all", () => {
    // TROLL-MELEE is a table of per-outcome LTABLEs of message LTABLEs, and
    // the leaf rows interleave strings with the F-WEP/F-DEF marker constants.
    const melee = tableById.get("TROLL-MELEE")!;
    const outcome = tableById.get((melee.elements[0] as TableRef).table)!;
    const message = tableById.get((outcome.elements[0] as TableRef).table)!;
    expect(message.pure).toBe(true);
    expect(message.elements[0]).toBe("The troll swings his axe, but it misses.");

    // A leaf carrying a marker: F-WEP is CONSTANT 0, inline between chunks.
    const armSlash = tableById.get("TROLL-MELEE")!;
    const flat: unknown[] = [];
    const walk = (t: Table): void => {
      for (const el of t.elements) {
        if (isPointer(el)) walk(tableById.get(el.table)!);
        else flat.push(el);
      }
    };
    walk(armSlash);
    expect(flat).toContain(0);
    expect(flat.some((e) => typeof e === "string" && e.includes("axe"))).toBe(true);
  });

  it("gives nested tables derived ids that never collide with ZIL names", () => {
    const derived = world.tables.filter((t) => t.id.includes("#"));
    expect(derived.length).toBeGreaterThan(0);
    // A derived id is `parent#index`, and its parent must itself be a table.
    for (const t of derived) {
      const parent = t.id.slice(0, t.id.lastIndexOf("#"));
      expect(tableById.has(parent), `${t.id} parent`).toBe(true);
    }
    // Derived ids are anonymous storage — no ZIL variable points at them.
    for (const t of derived) expect(globalById.has(t.id)).toBe(false);
  });
});

describe("ITABLE storage — P-PRSO", () => {
  it("emits a zero-filled table plus the pointer NOT-HERE-OBJECT-F reads", () => {
    const t = tableById.get("P-PRSO")!;
    expect(t.kind).toBe("itable");
    expect(t.elements).toHaveLength(50);
    expect(new Set(t.elements)).toEqual(new Set([0]));
    expect(globalById.get("P-PRSO")!.value).toEqual({ table: "P-PRSO", offset: 0 });
  });

  it("unblocks NOT-HERE-OBJECT-F, which was catalogued on the missing global", () => {
    expect(world.routines!.some((r) => r.id === "NOT-HERE-OBJECT-F")).toBe(true);
  });
});

describe("runtime + validator", () => {
  it("reads a villain row through the stored pointer, as HERO-BLOW does", () => {
    const tables: Record<string, RuntimeTable> = {};
    for (const t of world.tables) {
      tables[t.id] = {
        kind: t.kind,
        elements: t.elements.map((e) =>
          typeof e === "object" && "ref" in e ? e.ref : e,
        ),
      };
    }
    const w = makeWorld({
      here: "TROLL-ROOM",
      verb: "ATTACK",
      globals: { VILLAINS: { table: "VILLAINS", offset: 0 } },
      tables,
    });

    // `<GET ,VILLAINS 0>` — an ltable answers its element count at index 0.
    const len = runRoutine(
      {
        id: "T-LEN",
        params: [],
        body: [
          {
            op: "return",
            value: {
              op: "table-get",
              table: { op: "global", id: "VILLAINS" },
              index: { op: "const", value: 0 },
            },
          },
        ],
      },
      w,
    );
    expect(len).toBe(3);

    // `<GET <GET ,VILLAINS 1> ,V-VILLAIN>` — row 1, slot 0.
    const villain = runRoutine(
      {
        id: "T-VILLAIN",
        params: [],
        body: [
          {
            op: "return",
            value: {
              op: "table-get",
              table: {
                op: "table-get",
                table: { op: "global", id: "VILLAINS" },
                index: { op: "const", value: 1 },
              },
              index: { op: "const", value: 0 },
            },
          },
        ],
      },
      w,
    );
    expect(villain).toBe("TROLL");
  });

  it("accepts the artifact and rejects a pointer to a table that is not there", () => {
    expect(validateWorld(world).errors).toEqual([]);

    const broken = structuredClone(world);
    broken.tables.find((t) => t.id === "VILLAINS")!.elements[0] = {
      table: "NO-SUCH-TABLE",
      offset: 0,
    };
    expect(validateWorld(broken).errors.map((e) => `${e.path}: ${e.message}`).join("\n")).toMatch(/unknown table "NO-SUCH-TABLE"/);
  });
});
