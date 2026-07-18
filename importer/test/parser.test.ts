import { describe, expect, it } from "vitest";
import { parse, ParseError } from "../src/parser.js";
import type { CommentNode, FormNode, GValNode, ListNode } from "../src/ast.js";

describe("parser", () => {
  it("parses a representative OBJECT definition", () => {
    const ast = parse(`<OBJECT BOARD
\t(IN LOCAL-GLOBALS)
\t(SYNONYM BOARDS BOARD)
\t(DESC "board")
\t(FLAGS NDESCBIT)
\t(ACTION BOARD-F)>`);
    expect(ast.body).toHaveLength(1);
    const form = ast.body[0] as FormNode;
    expect(form.type).toBe("Form");
    expect(form.elements[0]).toMatchObject({ type: "Atom", name: "OBJECT" });
    expect(form.elements[1]).toMatchObject({ type: "Atom", name: "BOARD" });
    const clauses = form.elements.slice(2) as ListNode[];
    expect(clauses.map((c) => c.type)).toEqual(["List", "List", "List", "List", "List"]);
    expect(clauses[2]!.elements[1]).toMatchObject({ type: "String", value: "board" });
  });

  it("parses <> as an empty Form (ZIL FALSE)", () => {
    const ast = parse("<GLOBAL FALSE-FLAG <>>");
    const global = ast.body[0] as FormNode;
    expect(global.elements[2]).toMatchObject({ type: "Form", elements: [] });
  });

  it("parses ; comments as Comment nodes wrapping the next expression", () => {
    const ast = parse('(ADJECTIVE LARGE STORM ;"-TOSSED")');
    const list = ast.body[0] as ListNode;
    expect(list.elements).toHaveLength(4);
    const comment = list.elements[3] as CommentNode;
    expect(comment.type).toBe("Comment");
    expect(comment.value).toMatchObject({ type: "String", value: "-TOSSED" });
  });

  it("parses atom comments inside room exits", () => {
    const ast = parse("(NW TO RESERVOIR-SOUTH) ;COFFIN-CURE");
    expect(ast.body[1]).toMatchObject({
      type: "Comment",
      value: { type: "Atom", name: "COFFIN-CURE" },
    });
  });

  it("parses GVal/LVal/Quote/Segment prefixes", () => {
    const ast = parse("<COND (<EQUAL? ,GRATE-REVEALED .RARG> '!<A B>)>");
    const cond = ast.body[0] as FormNode;
    const clause = cond.elements[1] as ListNode;
    const test = clause.elements[0] as FormNode;
    expect(test.elements[1]).toMatchObject({
      type: "GVal",
      value: { type: "Atom", name: "GRATE-REVEALED" },
    });
    expect(test.elements[2]).toMatchObject({
      type: "LVal",
      value: { type: "Atom", name: "RARG" },
    });
    expect(clause.elements[1]).toMatchObject({
      type: "Quote",
      value: { type: "Segment", value: { type: "Form" } },
    });
  });

  it("parses nested GVal inside forms", () => {
    const ast = parse("<PUT ,GRATE ,P?LEXV 0>");
    const form = ast.body[0] as FormNode;
    const gval = form.elements[1] as GValNode;
    expect(gval.value).toMatchObject({ type: "Atom", name: "GRATE" });
  });

  it("parses MacroEval and Chtype", () => {
    const ast = parse('%<COND (<==? ,ZORK-NUMBER 1> "yes")> #DECL ((X) FIX)');
    expect(ast.body[0]).toMatchObject({ type: "MacroEval", voided: false });
    expect(ast.body[1]).toMatchObject({ type: "Chtype", typeName: "DECL" });
  });

  it("keeps top-level bare strings (file headers, SUBTITLEs)", () => {
    const ast = parse('"SUBTITLE OBJECTS"\n<OBJECT X (DESC "x")>');
    expect(ast.body[0]).toMatchObject({ type: "String", value: "SUBTITLE OBJECTS" });
  });

  it("records accurate source spans", () => {
    const ast = parse("<ROOM KITCHEN\n      (DESC \"Kitchen\")>");
    const room = ast.body[0] as FormNode;
    expect(room.start).toMatchObject({ line: 1, column: 1 });
    expect(room.end).toMatchObject({ line: 2 });
    const desc = room.elements[2] as ListNode;
    expect(desc.start).toMatchObject({ line: 2, column: 7 });
  });

  it("rejects unbalanced and malformed input with positions", () => {
    expect(() => parse("<OBJECT BOARD")).toThrow(ParseError);
    expect(() => parse(")")).toThrow(ParseError);
    expect(() => parse("<FOO )>")).toThrow(ParseError);
    expect(() => parse(";")).toThrow(ParseError);
    try {
      parse("\n\n   <UNCLOSED");
    } catch (err) {
      expect((err as ParseError).pos).toMatchObject({ line: 3, column: 4 });
    }
  });
});
