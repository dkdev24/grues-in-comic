/**
 * Deterministic lexer for ZIL (MDL-family) source text.
 *
 * Produces a flat token stream; structural nesting is the parser's job.
 * Follows MDL reader conventions as exercised by the Zork I corpus:
 *   - atoms end at whitespace or any of  < > ( ) [ ] " ; ' , . % ! #
 *   - `\` escapes the next character inside atoms and strings
 *   - `"` delimits strings, which may span lines (`|` is an ordinary char)
 *   - `;` `'` `,` `.` `%` `%%` `#` `!` are prefix tokens
 *   - `!\c` is a character literal; `!>` closes a form like `>`
 *   - decimal (`350`, `-1`) and octal (`*777*`) integers
 */

import type { SourcePos } from "./ast.js";

export type TokenKind =
  | "LANGLE" // <
  | "RANGLE" // >  (also !>)
  | "LPAREN" // (
  | "RPAREN" // )
  | "LBRACKET" // [  (also ![)
  | "RBRACKET" // ]  (also !])
  | "STRING"
  | "ATOM"
  | "NUMBER"
  | "SEMI" // ;
  | "QUOTE" // '
  | "COMMA" // ,
  | "PERIOD" // .
  | "PERCENT" // %
  | "PERCENT2" // %%
  | "HASH" // #
  | "BANG" // !
  | "CHAR" // !\c
  | "EOF";

export interface Token {
  kind: TokenKind;
  /** Decoded value: atom name, string contents, or character. */
  value: string;
  /** Numeric value for NUMBER tokens. */
  num?: number;
  /** Radix for NUMBER tokens. */
  radix?: 8 | 10;
  start: SourcePos;
  end: SourcePos;
}

export class LexError extends Error {
  constructor(
    message: string,
    public pos: SourcePos,
  ) {
    super(`${message} at line ${pos.line}, column ${pos.column}`);
    this.name = "LexError";
  }
}

const WHITESPACE = new Set([" ", "\t", "\n", "\r", "\f", "\v"]);
// Characters that terminate an atom (in addition to whitespace and EOF).
const ATOM_TERMINATORS = new Set([
  "<", ">", "(", ")", "[", "]", '"', ";", "'", ",", ".", "%", "!", "#",
]);

const DECIMAL_RE = /^[+-]?[0-9]+$/;
const OCTAL_RE = /^\*[0-7]+\*$/;

export class Lexer {
  private offset = 0;
  private line = 1;
  private column = 1;

  constructor(private readonly src: string) {}

  private pos(): SourcePos {
    return { offset: this.offset, line: this.line, column: this.column };
  }

  private peek(ahead = 0): string | undefined {
    return this.src[this.offset + ahead];
  }

  private advance(): string {
    const ch = this.src[this.offset];
    if (ch === undefined) {
      throw new LexError("unexpected end of input", this.pos());
    }
    this.offset++;
    if (ch === "\n") {
      this.line++;
      this.column = 1;
    } else {
      this.column++;
    }
    return ch;
  }

  private skipWhitespace(): void {
    while (this.offset < this.src.length) {
      const ch = this.src[this.offset]!;
      if (!WHITESPACE.has(ch)) break;
      this.advance();
    }
  }

  /** Lex the entire input eagerly. Throws LexError on malformed input. */
  tokenize(): Token[] {
    const tokens: Token[] = [];
    for (;;) {
      const token = this.next();
      tokens.push(token);
      if (token.kind === "EOF") return tokens;
    }
  }

  next(): Token {
    this.skipWhitespace();
    const start = this.pos();
    if (this.offset >= this.src.length) {
      return { kind: "EOF", value: "", start, end: start };
    }

    const ch = this.advance();
    const simple = (kind: TokenKind, value: string): Token => ({
      kind,
      value,
      start,
      end: this.pos(),
    });

    switch (ch) {
      case "<":
        return simple("LANGLE", ch);
      case ">":
        return simple("RANGLE", ch);
      case "(":
        return simple("LPAREN", ch);
      case ")":
        return simple("RPAREN", ch);
      case "[":
        return simple("LBRACKET", ch);
      case "]":
        return simple("RBRACKET", ch);
      case ";":
        return simple("SEMI", ch);
      case "'":
        return simple("QUOTE", ch);
      case ",":
        return simple("COMMA", ch);
      case ".":
        return simple("PERIOD", ch);
      case "#":
        return simple("HASH", ch);
      case "%":
        if (this.peek() === "%") {
          this.advance();
          return simple("PERCENT2", "%%");
        }
        return simple("PERCENT", ch);
      case "!": {
        const nextCh = this.peek();
        if (nextCh === "\\") {
          this.advance();
          const literal = this.advance();
          return simple("CHAR", literal);
        }
        // MDL allows `!>` / `!]` as alternative closers.
        if (nextCh === ">") {
          this.advance();
          return simple("RANGLE", "!>");
        }
        if (nextCh === "]") {
          this.advance();
          return simple("RBRACKET", "!]");
        }
        if (nextCh === "[") {
          this.advance();
          return simple("LBRACKET", "![");
        }
        return simple("BANG", ch);
      }
      case '"':
        return this.lexString(start);
      default:
        return this.lexAtomOrNumber(start, ch);
    }
  }

  private lexString(start: SourcePos): Token {
    let value = "";
    for (;;) {
      if (this.offset >= this.src.length) {
        throw new LexError("unterminated string", start);
      }
      const ch = this.advance();
      if (ch === '"') break;
      if (ch === "\\") {
        if (this.offset >= this.src.length) {
          throw new LexError("unterminated string escape", start);
        }
        value += this.advance();
      } else {
        value += ch;
      }
    }
    return { kind: "STRING", value, start, end: this.pos() };
  }

  private lexAtomOrNumber(start: SourcePos, first: string): Token {
    let raw = first; // undecoded text, used for number detection
    let value = "";
    let hadEscape = false;

    if (first === "\\") {
      hadEscape = true;
      value += this.advance();
    } else {
      value += first;
    }

    while (this.offset < this.src.length) {
      const ch = this.src[this.offset]!;
      if (WHITESPACE.has(ch) || ATOM_TERMINATORS.has(ch)) break;
      this.advance();
      if (ch === "\\") {
        hadEscape = true;
        if (this.offset >= this.src.length) {
          throw new LexError("dangling escape in atom", start);
        }
        value += this.advance();
      } else {
        raw += ch;
        value += ch;
      }
    }

    if (!hadEscape) {
      if (DECIMAL_RE.test(raw)) {
        return {
          kind: "NUMBER",
          value: raw,
          num: parseInt(raw, 10),
          radix: 10,
          start,
          end: this.pos(),
        };
      }
      if (OCTAL_RE.test(raw)) {
        return {
          kind: "NUMBER",
          value: raw,
          num: parseInt(raw.slice(1, -1), 8),
          radix: 8,
          start,
          end: this.pos(),
        };
      }
    }

    return { kind: "ATOM", value, start, end: this.pos() };
  }
}

export function tokenize(src: string): Token[] {
  return new Lexer(src).tokenize();
}
