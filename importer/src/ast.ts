/**
 * Typed AST for ZIL (MDL-family) source.
 *
 * The AST is purely syntactic: it represents S-expression structure, not ZIL
 * semantics (ROOM/OBJECT/ROUTINE recognition happens in later importer stages).
 * Every node carries source positions so downstream tools and LLM-assisted
 * extraction can always point back at the original text.
 */

export interface SourcePos {
  /** 0-based byte offset into the source string */
  offset: number;
  /** 1-based line number */
  line: number;
  /** 1-based column number */
  column: number;
}

export interface Span {
  start: SourcePos;
  end: SourcePos;
}

interface NodeBase extends Span {
  type: string;
}

/** Bare identifier, e.g. `LIVING-ROOM`, `FCD\#3` (escapes decoded into `name`). */
export interface AtomNode extends NodeBase {
  type: "Atom";
  name: string;
}

/** Integer literal: decimal (`350`, `-1`) or MDL octal (`*777*`). */
export interface NumberNode extends NodeBase {
  type: "Number";
  value: number;
  radix: 8 | 10;
}

/** Double-quoted string; `\` escapes decoded, embedded newlines preserved. */
export interface StringNode extends NodeBase {
  type: "String";
  value: string;
}

/** Angle-bracket form `<F ...>`. `<>` (ZIL FALSE) is a Form with no elements. */
export interface FormNode extends NodeBase {
  type: "Form";
  elements: ZilNode[];
}

/** Parenthesized list `( ... )`, e.g. object property clauses. */
export interface ListNode extends NodeBase {
  type: "List";
  elements: ZilNode[];
}

/** Square-bracket vector `[ ... ]`. */
export interface VectorNode extends NodeBase {
  type: "Vector";
  elements: ZilNode[];
}

/** `;expr` — the commented-out expression is preserved for fidelity. */
export interface CommentNode extends NodeBase {
  type: "Comment";
  value: ZilNode;
}

/** `'expr` (QUOTE). */
export interface QuoteNode extends NodeBase {
  type: "Quote";
  value: ZilNode;
}

/** `,expr` — global value reference (GVAL). */
export interface GValNode extends NodeBase {
  type: "GVal";
  value: ZilNode;
}

/** `.expr` — local value reference (LVAL). */
export interface LValNode extends NodeBase {
  type: "LVal";
  value: ZilNode;
}

/** `%expr` / `%%expr` — read-time macro evaluation. */
export interface MacroEvalNode extends NodeBase {
  type: "MacroEval";
  /** true for `%%` (evaluate, discard result) */
  voided: boolean;
  value: ZilNode;
}

/** `#type expr` — CHTYPE literal, e.g. `#DECL (...)`, `#BYTE 0`. */
export interface ChtypeNode extends NodeBase {
  type: "Chtype";
  typeName: string;
  value: ZilNode;
}

/** `!\c` — character literal. */
export interface CharNode extends NodeBase {
  type: "Char";
  value: string;
}

/** `!expr` — segment reference, e.g. `!.X`, `!<REST .Y>`. */
export interface SegmentNode extends NodeBase {
  type: "Segment";
  value: ZilNode;
}

export type ZilNode =
  | AtomNode
  | NumberNode
  | StringNode
  | FormNode
  | ListNode
  | VectorNode
  | CommentNode
  | QuoteNode
  | GValNode
  | LValNode
  | MacroEvalNode
  | ChtypeNode
  | CharNode
  | SegmentNode;

/** One parsed source file: an ordered sequence of top-level expressions. */
export interface ProgramNode extends Span {
  type: "Program";
  /** Source path or label the program was parsed from (for diagnostics). */
  source: string;
  body: ZilNode[];
}
