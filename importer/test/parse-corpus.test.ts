import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parse, printProgram, topLevelForms } from "../src/index.js";
import type { ProgramNode, ZilNode } from "../src/ast.js";

const DIR = fileURLToPath(new URL("../../original-projects/zork1/", import.meta.url));

// Ground truth: grep column-1 counts (`grep -c '^<…' file`), corrected where
// hand inspection showed grep over/undercounts real top-level structure:
//   - 1actions.zil: 264 `^<` lines, but 3 are *nested* forms that happen to
//     start at column 1 (a continuation `<TELL` at 1337; `<TABLE (PURE)`
//     inside the TROLL-MELEE / THIEF-MELEE GLOBALs at 3690 / 3736) → 261
//   - gmain.zil: 22 `^<` lines, but 5 (incl. 2 ROUTINEs) sit inside the
//     top-level `%<COND …>` reader macro (lines 180–312) → 17 forms,
//     2 top-level ROUTINEs (the other 2 are macro-conditional)
// `pageBreaks` are the stray top-level atoms produced by historical
// page-break conventions; three spellings occur in the corpus:
//   `\`+form-feed → atom "\f"; literal text `^L`; one `/^L` in gglobals.
const EXPECTED: Record<
  string,
  { forms: number; routines: number; objects: number; rooms: number; pageBreaks: string[] }
> = {
  "1actions.zil": { forms: 261, routines: 186, objects: 0, rooms: 0, pageBreaks: Array(30).fill("\f") },
  "1dungeon.zil": { forms: 254, routines: 4, objects: 122, rooms: 110, pageBreaks: Array(15).fill("\f") },
  "gclock.zil": { forms: 12, routines: 3, objects: 0, rooms: 0, pageBreaks: [] },
  "gglobals.zil": { forms: 30, routines: 10, objects: 18, rooms: 0, pageBreaks: ["/^L"] },
  "gmacros.zil": { forms: 23, routines: 3, objects: 0, rooms: 0, pageBreaks: [] },
  "gmain.zil": { forms: 17, routines: 2, objects: 0, rooms: 0, pageBreaks: [] },
  "gparser.zil": { forms: 147, routines: 42, objects: 0, rooms: 0, pageBreaks: [] },
  "gsyntax.zil": { forms: 347, routines: 0, objects: 0, rooms: 0, pageBreaks: ["^L", "^L", "^L"] },
  "gverbs.zil": { forms: 225, routines: 189, objects: 0, rooms: 0, pageBreaks: ["^L", "^L", "^L"] },
  "zork1.zil": { forms: 19, routines: 0, objects: 0, rooms: 0, pageBreaks: [] },
};

const asts = new Map<string, ProgramNode>(
  Object.keys(EXPECTED).map((f) => [f, parse(readFileSync(DIR + f, "utf8"), f)]),
);

/** Strip positions so structural equality can be compared across reparses. */
function shape(node: ZilNode): unknown {
  const { start: _s, end: _e, ...rest } = node as Record<string, unknown> & ZilNode;
  const out: Record<string, unknown> = { ...rest };
  for (const [k, v] of Object.entries(out)) {
    if (Array.isArray(v)) out[k] = v.map((el) => shape(el as ZilNode));
    else if (v && typeof v === "object" && "type" in (v as object))
      out[k] = shape(v as ZilNode);
  }
  return out;
}

describe("full-corpus parse (stage 1.2 exit criteria)", () => {
  it("parses 100% of the corpus", () => {
    expect(asts.size).toBe(10); // parse() above throws on any failure
  });

  for (const [file, exp] of Object.entries(EXPECTED)) {
    it(`${file}: top-level structure matches ground truth`, () => {
      const ast = asts.get(file)!;
      const forms = ast.body.filter((n) => n.type === "Form");
      expect(forms).toHaveLength(exp.forms);
      expect(topLevelForms(ast, "ROUTINE")).toHaveLength(exp.routines);
      expect(topLevelForms(ast, "OBJECT")).toHaveLength(exp.objects);
      expect(topLevelForms(ast, "ROOM")).toHaveLength(exp.rooms);

      // Only expected node kinds at top level; stray atoms must be page breaks
      const atoms = ast.body.filter((n) => n.type === "Atom");
      expect(atoms.map((a) => a.type === "Atom" && a.name)).toEqual(exp.pageBreaks);
      for (const n of ast.body) {
        expect(["Form", "String", "Comment", "Atom", "MacroEval"]).toContain(n.type);
      }
    });
  }

  it("corpus totals match the feasibility survey (110 rooms / 140 objects / 441 routines)", () => {
    const total = (head: string) =>
      [...asts.values()].reduce((sum, ast) => sum + topLevelForms(ast, head).length, 0);
    expect(total("ROOM")).toBe(110);
    expect(total("OBJECT")).toBe(140);
    // 439 top-level; gmain.zil's %<COND …> reader macro holds 3 more
    // (2 direct + the quoted '<ROUTINE PERFORM …> variant at line 182,
    // which column-1 grep counts miss) → 442 ROUTINE forms in the tree,
    // 441 at column 1 as the feasibility survey reported
    expect(total("ROUTINE")).toBe(439);
    let deepRoutines = 0;
    const walk = (n: ZilNode): void => {
      if (
        n.type === "Form" &&
        n.elements[0]?.type === "Atom" &&
        n.elements[0].name === "ROUTINE"
      )
        deepRoutines++;
      if ("elements" in n) n.elements.forEach(walk);
      if ("value" in n && typeof n.value === "object") walk(n.value);
    };
    for (const ast of asts.values()) ast.body.forEach(walk);
    expect(deepRoutines).toBe(442);
  });

  it("round-trips: parse(print(ast)) is structurally identical for every file", () => {
    for (const [file, ast] of asts) {
      const reparsed = parse(printProgram(ast), `${file} (round-trip)`);
      expect(reparsed.body.length, file).toBe(ast.body.length);
      expect(reparsed.body.map(shape), file).toEqual(ast.body.map(shape));
    }
  });

  it("gmacros.zil: RETURN!- oblist trailers parse as single atoms", () => {
    const src = readFileSync(DIR + "gmacros.zil", "utf8");
    expect(src).toContain("RETURN!-");
    const names = new Set<string>();
    const walk = (n: ZilNode): void => {
      if (n.type === "Atom") names.add(n.name);
      if ("elements" in n) n.elements.forEach(walk);
      if ("value" in n && typeof n.value === "object") walk(n.value);
    };
    asts.get("gmacros.zil")!.body.forEach(walk);
    expect(names.has("RETURN!-")).toBe(true);
    // the misparse shape would have been Segment(Atom "-"); plain "-" atoms
    // are legitimate (subtraction)
    let badSegments = 0;
    const findBad = (n: ZilNode): void => {
      if (n.type === "Segment" && n.value.type === "Atom" && n.value.name === "-")
        badSegments++;
      if ("elements" in n) n.elements.forEach(findBad);
      if ("value" in n && typeof n.value === "object") findBad(n.value);
    };
    for (const ast of asts.values()) ast.body.forEach(findBad);
    expect(badSegments).toBe(0);
  });

  it("gmain.zil: top-level %<COND …> reader macros survive with structure", () => {
    const macros = asts.get("gmain.zil")!.body.filter((n) => n.type === "MacroEval");
    expect(macros.length).toBeGreaterThanOrEqual(1);
    for (const m of macros) {
      expect(m.value).toMatchObject({ type: "Form" });
    }
  });

  it("gsyntax.zil: SYNTAX forms including escaped \\#RANDOM debug verbs", () => {
    const syntax = topLevelForms(asts.get("gsyntax.zil")!, "SYNTAX");
    expect(syntax.length).toBeGreaterThan(100);
    const heads = syntax.map((s) => s.elements[1]);
    expect(
      heads.some((h) => h?.type === "Atom" && h.name === "#RANDOM"),
    ).toBe(true);
  });

  it("gclock.zil / gparser.zil: #DECL and #BYTE chtypes parse", () => {
    const kinds = new Set<string>();
    const walk = (n: ZilNode): void => {
      if (n.type === "Chtype") kinds.add(n.typeName);
      if ("elements" in n) n.elements.forEach(walk);
      if ("value" in n && typeof n.value === "object") walk(n.value);
    };
    for (const ast of asts.values()) ast.body.forEach(walk);
    expect([...kinds].sort()).toEqual(["BYTE", "DECL"]);
  });
});
