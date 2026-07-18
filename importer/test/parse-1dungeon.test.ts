import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parse, topLevelForms } from "../src/index.js";

const FILE = fileURLToPath(
  new URL("../../original-projects/zork1/1dungeon.zil", import.meta.url),
);

// Ground truth from the source file (cross-checked with grep):
//   grep -c '^<ROOM' → 110, '^<OBJECT' → 122, '^<GLOBAL' → 17,
//   '^<ROUTINE' → 4, '^<DIRECTIONS' → 1, total '^<' → 254, '^;' → 2
describe("full-file parse of 1dungeon.zil (stage 1.1 exit criteria)", () => {
  const src = readFileSync(FILE, "utf8");
  const ast = parse(src, "1dungeon.zil");

  it("parses the entire file", () => {
    expect(ast.type).toBe("Program");
    expect(ast.body.length).toBeGreaterThan(0);
    expect(ast.end.line).toBe(src.split("\n").length);
  });

  it("finds exactly the expected top-level definitions", () => {
    expect(topLevelForms(ast, "ROOM")).toHaveLength(110);
    expect(topLevelForms(ast, "OBJECT")).toHaveLength(122);
    expect(topLevelForms(ast, "GLOBAL")).toHaveLength(17);
    expect(topLevelForms(ast, "ROUTINE")).toHaveLength(4);
    expect(topLevelForms(ast, "DIRECTIONS")).toHaveLength(1);
    const forms = ast.body.filter((n) => n.type === "Form");
    expect(forms).toHaveLength(254);
  });

  it("top level contains only forms, strings, comments, and page-break atoms", () => {
    const types = new Set(ast.body.map((n) => n.type));
    expect([...types].sort()).toEqual(["Atom", "Comment", "Form", "String"]);
    expect(ast.body.filter((n) => n.type === "Comment")).toHaveLength(2);
    // Historical page-break convention: `\` + form feed reads as an atom whose
    // name is the form-feed character. Preserved faithfully, 15 in this file.
    const pageBreaks = ast.body.filter((n) => n.type === "Atom");
    expect(pageBreaks).toHaveLength(15);
    expect(pageBreaks.every((n) => n.type === "Atom" && n.name === "\f")).toBe(true);
  });

  it("every ROOM and OBJECT has an atom name and property lists", () => {
    for (const head of ["ROOM", "OBJECT"] as const) {
      for (const form of topLevelForms(ast, head)) {
        expect(form.elements[1]?.type).toBe("Atom");
        for (const clause of form.elements.slice(2)) {
          // clauses are property lists, except inline ;comments kept for fidelity
          expect(["List", "Comment"]).toContain(clause.type);
        }
      }
    }
  });

  it("parses a known room correctly: WEST-OF-HOUSE", () => {
    const rooms = topLevelForms(ast, "ROOM");
    const west = rooms.find(
      (r) => r.elements[1]?.type === "Atom" && r.elements[1].name === "WEST-OF-HOUSE",
    );
    expect(west).toBeDefined();
    const descClause = west!.elements.find(
      (e) =>
        e.type === "List" &&
        e.elements[0]?.type === "Atom" &&
        e.elements[0].name === "DESC",
    );
    expect(descClause).toMatchObject({
      type: "List",
      elements: [{ type: "Atom" }, { type: "String", value: "West of House" }],
    });
  });

  it("decodes escaped atoms: dam object synonym FCD#3", () => {
    const src = "(SYNONYM DAM GATE GATES FCD\\#3)";
    const clause = parse(src).body[0];
    expect(clause).toMatchObject({
      type: "List",
      elements: [
        { type: "Atom", name: "SYNONYM" },
        { type: "Atom", name: "DAM" },
        { type: "Atom", name: "GATE" },
        { type: "Atom", name: "GATES" },
        { type: "Atom", name: "FCD#3" },
      ],
    });
  });
});
