/**
 * Recursive-descent parser: token stream → typed ZIL AST.
 *
 * Grammar (expr is the unit of recursion):
 *   program  := expr* EOF
 *   expr     := prefix expr | form | list | vector | STRING | ATOM | NUMBER | CHAR
 *   prefix   := ";" | "'" | "," | "." | "%" | "%%" | "!" | "#" ATOM
 *   form     := "<" expr* ">"
 *   list     := "(" expr* ")"
 *   vector   := "[" expr* "]"
 */

import type { ProgramNode, SourcePos, ZilNode } from "./ast.js";
import { Lexer, type Token } from "./lexer.js";

export class ParseError extends Error {
  constructor(
    message: string,
    public pos: SourcePos,
  ) {
    super(`${message} at line ${pos.line}, column ${pos.column}`);
    this.name = "ParseError";
  }
}

class Parser {
  private tokens: Token[];
  private index = 0;

  constructor(
    src: string,
    private readonly source: string,
  ) {
    this.tokens = new Lexer(src).tokenize();
  }

  private peek(): Token {
    return this.tokens[this.index]!;
  }

  private advance(): Token {
    const token = this.tokens[this.index]!;
    if (token.kind !== "EOF") this.index++;
    return token;
  }

  parseProgram(): ProgramNode {
    const body: ZilNode[] = [];
    while (this.peek().kind !== "EOF") {
      body.push(this.parseExpr());
    }
    const eof = this.peek();
    const start = body[0]?.start ?? eof.start;
    const end = body[body.length - 1]?.end ?? eof.end;
    return { type: "Program", source: this.source, body, start, end };
  }

  parseExpr(): ZilNode {
    const token = this.advance();
    switch (token.kind) {
      case "LANGLE":
        return this.parseSequence("Form", token, "RANGLE", ">");
      case "LPAREN":
        return this.parseSequence("List", token, "RPAREN", ")");
      case "LBRACKET":
        return this.parseSequence("Vector", token, "RBRACKET", "]");
      case "STRING":
        return { type: "String", value: token.value, start: token.start, end: token.end };
      case "NUMBER":
        return {
          type: "Number",
          value: token.num!,
          radix: token.radix!,
          start: token.start,
          end: token.end,
        };
      case "ATOM":
        return { type: "Atom", name: token.value, start: token.start, end: token.end };
      case "CHAR":
        return { type: "Char", value: token.value, start: token.start, end: token.end };
      case "SEMI": {
        const value = this.parsePrefixOperand("comment (;)", token);
        return { type: "Comment", value, start: token.start, end: value.end };
      }
      case "QUOTE": {
        const value = this.parsePrefixOperand("quote (')", token);
        return { type: "Quote", value, start: token.start, end: value.end };
      }
      case "COMMA": {
        const value = this.parsePrefixOperand("global reference (,)", token);
        return { type: "GVal", value, start: token.start, end: value.end };
      }
      case "PERIOD": {
        const value = this.parsePrefixOperand("local reference (.)", token);
        return { type: "LVal", value, start: token.start, end: value.end };
      }
      case "PERCENT":
      case "PERCENT2": {
        const value = this.parsePrefixOperand(`macro (${token.value})`, token);
        return {
          type: "MacroEval",
          voided: token.kind === "PERCENT2",
          value,
          start: token.start,
          end: value.end,
        };
      }
      case "BANG": {
        const value = this.parsePrefixOperand("segment (!)", token);
        return { type: "Segment", value, start: token.start, end: value.end };
      }
      case "HASH": {
        const typeToken = this.advance();
        if (typeToken.kind !== "ATOM" && typeToken.kind !== "NUMBER") {
          throw new ParseError(
            `expected type name after # but found ${describe(typeToken)}`,
            typeToken.start,
          );
        }
        const value = this.parsePrefixOperand("chtype (#)", token);
        return {
          type: "Chtype",
          typeName: typeToken.value,
          value,
          start: token.start,
          end: value.end,
        };
      }
      case "RANGLE":
      case "RPAREN":
      case "RBRACKET":
        throw new ParseError(`unexpected ${describe(token)}`, token.start);
      case "EOF":
        throw new ParseError("unexpected end of input", token.start);
    }
  }

  private parsePrefixOperand(what: string, prefix: Token): ZilNode {
    const next = this.peek();
    if (next.kind === "EOF") {
      throw new ParseError(`${what} has no operand before end of input`, prefix.start);
    }
    if (next.kind === "RANGLE" || next.kind === "RPAREN" || next.kind === "RBRACKET") {
      throw new ParseError(`${what} has no operand before ${describe(next)}`, prefix.start);
    }
    return this.parseExpr();
  }

  private parseSequence(
    type: "Form" | "List" | "Vector",
    open: Token,
    closeKind: Token["kind"],
    closeText: string,
  ): ZilNode {
    const elements: ZilNode[] = [];
    for (;;) {
      const next = this.peek();
      if (next.kind === closeKind) {
        this.advance();
        return { type, elements, start: open.start, end: next.end };
      }
      if (next.kind === "EOF") {
        throw new ParseError(
          `unclosed ${type.toLowerCase()} (missing ${closeText}) opened`,
          open.start,
        );
      }
      elements.push(this.parseExpr());
    }
  }
}

function describe(token: Token): string {
  if (token.kind === "EOF") return "end of input";
  return `${token.kind} \`${token.value}\``;
}

/**
 * Parse ZIL source text into a Program AST.
 * @param src    the source text
 * @param source label for diagnostics (usually the file path)
 */
export function parse(src: string, source = "<input>"): ProgramNode {
  return new Parser(src, source).parseProgram();
}
