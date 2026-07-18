export * from "./ast.js";
export { Lexer, LexError, tokenize, type Token, type TokenKind } from "./lexer.js";
export { parse, ParseError } from "./parser.js";

import type { FormNode, ProgramNode } from "./ast.js";

/**
 * Top-level forms whose head is the given atom name, e.g. `topLevelForms(ast, "ROOM")`.
 * Convenience for corpus statistics and tests; ignores commented-out forms.
 */
export function topLevelForms(program: ProgramNode, head: string): FormNode[] {
  return program.body.filter(
    (node): node is FormNode =>
      node.type === "Form" &&
      node.elements[0]?.type === "Atom" &&
      node.elements[0].name === head,
  );
}
