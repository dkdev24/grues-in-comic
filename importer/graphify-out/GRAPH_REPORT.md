# Graph Report - .  (2026-07-18)

## Corpus Check
- Corpus is ~5,568 words - fits in a single context window. You may not need a graph.

## Summary
- 83 nodes · 202 edges · 6 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- AST Node Types
- Public API & Printer
- Artifacts CLI & Statistics
- Lexer Implementation
- Parser
- Token Types & Lexing API

## God Nodes (most connected - your core abstractions)
1. `NodeBase` - 16 edges
2. `Lexer` - 12 edges
3. `SourcePos` - 9 edges
4. `Token` - 9 edges
5. `Parser` - 9 edges
6. `ZilNode` - 8 edges
7. `ProgramNode` - 8 edges
8. `parse()` - 8 edges
9. `fileStats` - 7 edges
10. `FormNode` - 4 edges

## Surprising Connections (you probably didn't know these)
- `kinds()` --calls--> `tokenize()`  [EXTRACTED]
  test/lexer.test.ts → src/lexer.ts
- `Token` --references--> `SourcePos`  [EXTRACTED]
  src/lexer.ts → src/ast.ts
- `Parser` --references--> `Token`  [EXTRACTED]
  src/parser.ts → src/lexer.ts

## Import Cycles
- None detected.

## Communities (6 total, 0 thin omitted)

### Community 0 - "AST Node Types"
Cohesion: 0.24
Nodes (16): AtomNode, CharNode, ChtypeNode, CommentNode, FormNode, GValNode, ListNode, LValNode (+8 more)

### Community 1 - "Public API & Printer"
Cohesion: 0.23
Nodes (11): ProgramNode, topLevelForms(), parse(), NEEDS_ESCAPE, print(), printAtomName(), printProgram(), FILE (+3 more)

### Community 2 - "Artifacts CLI & Statistics"
Cohesion: 0.24
Nodes (12): CORPUS, files, OUT, perFile, stats, bump(), corpusStats, fileStats (+4 more)

### Community 3 - "Lexer Implementation"
Cohesion: 0.32
Nodes (4): SourcePos, Lexer, WHITESPACE, ParseError

### Community 4 - "Parser"
Cohesion: 0.44
Nodes (4): ZilNode, Token, describe(), Parser

### Community 5 - "Token Types & Lexing API"
Cohesion: 0.36
Nodes (5): ATOM_TERMINATORS, LexError, tokenize(), TokenKind, kinds()

## Knowledge Gaps
- **9 isolated node(s):** `CORPUS`, `OUT`, `files`, `perFile`, `stats` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Lexer` connect `Lexer Implementation` to `Public API & Printer`, `Parser`, `Token Types & Lexing API`?**
  _High betweenness centrality (0.143) - this node is a cross-community bridge._
- **Why does `SourcePos` connect `Lexer Implementation` to `AST Node Types`, `Parser`, `Token Types & Lexing API`?**
  _High betweenness centrality (0.085) - this node is a cross-community bridge._
- **Why does `ZilNode` connect `Parser` to `AST Node Types`, `Public API & Printer`, `Artifacts CLI & Statistics`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **What connects `CORPUS`, `OUT`, `files` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._