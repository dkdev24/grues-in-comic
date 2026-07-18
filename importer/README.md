# ZIL Semantic Importer

Deterministic tooling that turns the historical ZIL source (`original-projects/zork1/`) into structured data for the Grues in Comic pipeline. Stage 1.1 delivers the foundation: an S-expression lexer/parser producing a fully typed AST with source positions.

The parser is **purely syntactic** — it recognizes MDL-family reader syntax (forms, lists, strings, prefixes like `,GVAL` / `.LVAL` / `;comment`), not ZIL semantics. ROOM/OBJECT/ROUTINE interpretation happens in later importer stages (Milestone 3), which consume this AST.

## Layout

| Path | Purpose |
|---|---|
| `src/ast.ts` | Typed AST node definitions (all nodes carry line/column spans) |
| `src/lexer.ts` | Character stream → token stream |
| `src/parser.ts` | Token stream → `ProgramNode` AST; `parse(src, label)` is the entry point |
| `src/index.ts` | Public API + `topLevelForms()` helper |
| `test/` | Unit tests per syntax feature + full-file integration test against `1dungeon.zil` |

## Usage

```bash
npm install
npm test          # all tests, incl. full parse of 1dungeon.zil
npm run typecheck
```

```ts
import { parse, topLevelForms } from "./src/index.js";
const ast = parse(zilSource, "1dungeon.zil");
topLevelForms(ast, "ROOM").length; // 110
```

## Syntax notes discovered from the corpus

- `\` escapes the next character in atoms (`FCD\#3` → atom `FCD#3`) and strings (`\"`)
- `;` comments out the **next expression** (atom, string, or form) — preserved as `Comment` nodes for fidelity
- `<>` (ZIL FALSE) is a `Form` with zero elements
- Top-level bare strings are file headers / `"SUBTITLE …"` section markers
- `\` + form-feed is a historical page-break convention; it reads (correctly, per MDL rules) as an atom whose name is the form-feed character — 15 occur in `1dungeon.zil`
- `!>` closes a form like `>`; `!\c` is a character literal; `%`/`%%` are read-time macro evaluation
