/**
 * AST → canonical ZIL text.
 *
 * Not a formatter: output is single-line-per-top-level-node with minimal
 * spacing. Its purpose is validation — `parse(print(parse(src)))` must yield
 * a structurally identical AST, proving the parser loses no information the
 * reader would see. Also useful for debugging AST slices.
 */

import type { ProgramNode, ZilNode } from "./ast.js";

const NEEDS_ESCAPE = new Set([
  "<", ">", "(", ")", "[", "]", '"', ";", "'", ",", ".", "%", "!", "#", "\\",
  " ", "\t", "\n", "\r", "\f", "\v",
]);

const DECIMAL_RE = /^[+-]?[0-9]+$/;
const OCTAL_RE = /^\*[0-7]+\*$/;

/** Emit an atom name so it re-lexes to exactly the same name. */
export function printAtomName(name: string): string {
  let out = "";
  for (let i = 0; i < name.length; i++) {
    const ch = name[i]!;
    // `!-` is legal atom-interior syntax — keep the oblist trailer verbatim
    if (ch === "!" && name[i + 1] === "-") {
      out += "!-";
      i++;
      continue;
    }
    out += NEEDS_ESCAPE.has(ch) ? `\\${ch}` : ch;
  }
  // a name that would re-lex as a number must have its first char escaped
  if ((DECIMAL_RE.test(out) || OCTAL_RE.test(out)) && !out.startsWith("\\")) {
    out = `\\${out}`;
  }
  return out;
}

export function print(node: ZilNode): string {
  switch (node.type) {
    case "Atom":
      return printAtomName(node.name);
    case "Number":
      return node.radix === 8 ? `*${node.value.toString(8)}*` : String(node.value);
    case "String":
      return `"${node.value.replace(/[\\"]/g, (c) => `\\${c}`)}"`;
    case "Form":
      return `<${node.elements.map(print).join(" ")}>`;
    case "List":
      return `(${node.elements.map(print).join(" ")})`;
    case "Vector":
      return `[${node.elements.map(print).join(" ")}]`;
    case "Comment":
      return `;${print(node.value)}`;
    case "Quote":
      return `'${print(node.value)}`;
    case "GVal":
      return `,${print(node.value)}`;
    case "LVal":
      return `.${print(node.value)}`;
    case "MacroEval":
      return `${node.voided ? "%%" : "%"}${print(node.value)}`;
    case "Segment":
      return `!${print(node.value)}`;
    case "Chtype":
      return `#${printAtomName(node.typeName)} ${print(node.value)}`;
    case "Char":
      return `!\\${node.value}`;
  }
}

export function printProgram(program: ProgramNode): string {
  return program.body.map(print).join("\n") + "\n";
}
