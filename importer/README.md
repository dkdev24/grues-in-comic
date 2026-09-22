# ZIL Semantic Importer

Deterministic tooling that turns the historical ZIL source (`original-projects/zork1/`) into structured data for the Grues in Comic pipeline. Stages 1.1–1.2 deliver the foundation: an S-expression lexer/parser producing a fully typed AST with source positions, validated against **100% of the Zork I corpus** (all 10 `.zil` files) with per-file ground-truth counts and print→reparse round-trip stability.

The parser is **purely syntactic** — it recognizes MDL-family reader syntax (forms, lists, strings, prefixes like `,GVAL` / `.LVAL` / `;comment`), not ZIL semantics. ROOM/OBJECT/ROUTINE interpretation happens in later importer stages (Milestone 3), which consume this AST.

## Layout

| Path | Purpose |
|---|---|
| `src/ast.ts` | Typed AST node definitions (all nodes carry line/column spans) |
| `src/lexer.ts` | Character stream → token stream |
| `src/parser.ts` | Token stream → `ProgramNode` AST; `parse(src, label)` is the entry point |
| `src/printer.ts` | AST → canonical text; validation (`parse(print(ast))` must equal `ast`) and debugging |
| `src/index.ts` | Public API + `topLevelForms()` helper |
| `src/stats.ts` | Per-file and corpus statistics over parsed ASTs |
| `src/cli.ts` | Artifact generator — writes `artifacts/` (run via `pnpm run artifacts`) |
| `artifacts/` | **Committed, generated** — `ast/*.json` (full ASTs with positions), `stats.json`, `STATS.md`. Regenerate, never edit |
| `test/` | Unit tests per syntax feature + integration tests: `1dungeon.zil` in depth, then the full corpus with ground-truth counts and round-trips |

## Usage

```bash
pnpm install
pnpm test           # all tests, incl. full-corpus parse + round-trip
pnpm run typecheck
pnpm run artifacts  # regenerate artifacts/ (deterministic; clean diff when source unchanged)
```

```ts
import { parse, topLevelForms } from "./src/index.js";
const ast = parse(zilSource, "1dungeon.zil");
topLevelForms(ast, "ROOM").length; // 110
```

## Syntax notes discovered from the corpus (stages 1.1–1.2 catalogue)

- `\` escapes the next character in atoms (`FCD\#3` → atom `FCD#3`, `\#RANDOM` debug verbs in `gsyntax.zil`) and strings (`\"`)
- `;` comments out the **next expression** (atom, string, or form) — preserved as `Comment` nodes for fidelity
- `<>` (ZIL FALSE) is a `Form` with zero elements
- Top-level bare strings are file headers / `"SUBTITLE …"` section markers
- **Page breaks come in three spellings**, each reading as a harmless top-level atom: `\`+form-feed (45×: `1dungeon.zil` 15, `1actions.zil` 30), literal `^L` text (3× each in `gsyntax.zil`/`gverbs.zil`), and one `/^L` (`gglobals.zil`)
- **`!-` is the MDL oblist trailer and continues an atom**: `RETURN!-` in `gmacros.zil` is a single atom (a naive `!`-as-delimiter lexer silently splits it)
- `!>` closes a form like `>`; `!\c` is a character literal; `!.X` is a segment of an LVAL
- `%<COND …>` read-time macros appear at top level in `gmain.zil` (lines 180–312) and mid-form in `gparser.zil`; the gmain one conditionally defines 2 ROUTINEs plus a quoted `'<ROUTINE PERFORM …>` variant
- Only `#DECL` and `#BYTE` CHTYPE literals occur in the corpus
- Column-1 grep is *not* ground truth for top-level structure: 3 nested forms in `1actions.zil` start at column 1 (`<TELL` continuation at 1337, `<TABLE (PURE)` at 3690/3736)

## Corpus totals (validated by `test/parse-corpus.test.ts`)

110 ROOM · 140 OBJECT · 439 top-level ROUTINE (442 ROUTINE forms in the whole tree) · all 10 files parse and round-trip.
