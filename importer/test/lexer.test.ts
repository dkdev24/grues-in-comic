import { describe, expect, it } from "vitest";
import { tokenize, LexError } from "../src/lexer.js";

function kinds(src: string): string[] {
  return tokenize(src).map((t) => t.kind);
}

describe("lexer", () => {
  it("lexes brackets and angle forms", () => {
    expect(kinds("<GLOBAL SCORE-MAX 350>")).toEqual([
      "LANGLE",
      "ATOM",
      "ATOM",
      "NUMBER",
      "RANGLE",
      "EOF",
    ]);
    expect(kinds("( [ ] )")).toEqual(["LPAREN", "LBRACKET", "RBRACKET", "RPAREN", "EOF"]);
  });

  it("lexes atoms with hyphens and question marks", () => {
    const [token] = tokenize("LIVING-ROOM");
    expect(token).toMatchObject({ kind: "ATOM", value: "LIVING-ROOM" });
    expect(tokenize("TROPHY-CASE-FLAG?")[0]!.value).toBe("TROPHY-CASE-FLAG?");
  });

  it("decodes backslash escapes in atoms (FCD\\#3) and disables number detection", () => {
    const [token] = tokenize("FCD\\#3");
    expect(token).toMatchObject({ kind: "ATOM", value: "FCD#3" });
    expect(tokenize("\\123")[0]!.kind).toBe("ATOM");
  });

  it("lexes decimal and octal numbers", () => {
    expect(tokenize("350")[0]).toMatchObject({ kind: "NUMBER", num: 350, radix: 10 });
    expect(tokenize("-1")[0]).toMatchObject({ kind: "NUMBER", num: -1, radix: 10 });
    expect(tokenize("*777*")[0]).toMatchObject({ kind: "NUMBER", num: 511, radix: 8 });
    // starred non-octal falls back to atom
    expect(tokenize("*ABC*")[0]!.kind).toBe("ATOM");
  });

  it("lexes strings with escaped quotes and embedded newlines", () => {
    const src = '"say \\"hi\\" twice|\nsecond line"';
    const [token] = tokenize(src);
    expect(token).toMatchObject({
      kind: "STRING",
      value: 'say "hi" twice|\nsecond line',
    });
  });

  it("throws on unterminated strings", () => {
    expect(() => tokenize('"never ends')).toThrow(LexError);
  });

  it("lexes prefix characters as distinct tokens", () => {
    expect(kinds(";C")).toEqual(["SEMI", "ATOM", "EOF"]);
    expect(kinds(",GRATE")).toEqual(["COMMA", "ATOM", "EOF"]);
    expect(kinds(".RARG")).toEqual(["PERIOD", "ATOM", "EOF"]);
    expect(kinds("'FOO")).toEqual(["QUOTE", "ATOM", "EOF"]);
    expect(kinds("%<FOO>")).toEqual(["PERCENT", "LANGLE", "ATOM", "RANGLE", "EOF"]);
    expect(kinds("%%<FOO>")).toEqual(["PERCENT2", "LANGLE", "ATOM", "RANGLE", "EOF"]);
    expect(kinds("#DECL (X)")).toEqual(["HASH", "ATOM", "LPAREN", "ATOM", "RPAREN", "EOF"]);
    expect(kinds("!.X")).toEqual(["BANG", "PERIOD", "ATOM", "EOF"]);
  });

  it("prefixes terminate atoms: ,X.Y is three tokens", () => {
    expect(kinds(",X.Y")).toEqual(["COMMA", "ATOM", "PERIOD", "ATOM", "EOF"]);
  });

  it("keeps MDL oblist trailers (!-) inside atoms", () => {
    // gmacros.zil uses <RETURN!-> — RETURN!- is a single atom, not RETURN + segment
    expect(tokenize("<RETURN!->").map((t) => [t.kind, t.value])).toEqual([
      ["LANGLE", "<"],
      ["ATOM", "RETURN!-"],
      ["RANGLE", ">"],
      ["EOF", ""],
    ]);
    expect(tokenize("RETURN!- 5")[0]).toMatchObject({ kind: "ATOM", value: "RETURN!-" });
  });

  it("lexes character literals and bang-closers", () => {
    expect(tokenize("!\\c")[0]).toMatchObject({ kind: "CHAR", value: "c" });
    expect(tokenize("!\\ ")[0]).toMatchObject({ kind: "CHAR", value: " " });
    expect(kinds("<FOO !>")).toEqual(["LANGLE", "ATOM", "RANGLE", "EOF"]);
  });

  it("tracks line and column positions", () => {
    const tokens = tokenize("<A\n  B>");
    expect(tokens[0]!.start).toMatchObject({ line: 1, column: 1 });
    expect(tokens[2]!.start).toMatchObject({ line: 2, column: 3 });
  });
});
