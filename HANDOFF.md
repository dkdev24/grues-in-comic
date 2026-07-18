# HANDOFF.md

Cross-session context memory. Update this file at the end of every session.

---

## Current Version

**0.3.0**

---

## Project Status

Project renamed from **Comic-Zork** to **Grues in Comic** (trademark-safe: "grue" predates Zork and is not an Activision trademark). GitHub repo renamed to `dkdev24/grues-in-comic`. Historical source code imported for both reference projects:

- `original-projects/zork1/` — ZIL source for Zork I
- `original-projects/comic-chat/` — Microsoft Comic Chat (v1.0, v2.1b, v2.5-beta-1, v2.5-beta-1-modern)

Milestone 1 in progress: `importer/` (TypeScript) contains the deterministic ZIL S-expression parser (stage 1.1 done). No IR schema defined. No engine or browser runtime started.

---

## Last Session

- **Stage 1.1 complete — ZIL parser POC** (`importer/`, TypeScript + vitest, v0.3.0):
  - `src/lexer.ts` + `src/parser.ts` + `src/ast.ts`: deterministic S-expression lexer and recursive-descent parser producing a fully typed AST; every node carries line/column/offset spans for source traceability
  - Handles the MDL reader syntax the corpus uses: forms `<>`, lists, vectors, strings with `\` escapes, atoms with `\` escapes (`FCD\#3`), decimal + octal (`*777*`) numbers, prefixes `;` (comment — preserved as AST nodes) `'` `,` `.` `%` `%%` `!` `#type`, char literals `!\c`, `!>` closers
  - 26 tests pass (`npm test` in `importer/`): unit tests per syntax feature + full-file integration on `1dungeon.zil` asserting exact counts — 110 ROOM, 122 OBJECT, 17 GLOBAL, 4 ROUTINE, 1 DIRECTIONS, 254 top-level forms, 2 top-level comments, 15 page-break atoms (`\`+form-feed, a historical convention that legally reads as an atom)
  - **Bonus finding: all 10 `.zil` files in the corpus already parse without error** — stage 1.2 is mostly about validating AST correctness on the other files (esp. `gmacros.zil` `%` macros, `gsyntax.zil`), adding edge-case tests, and cataloguing anything odd, not fixing crashes
- Implementation-language data point for Gate B: TypeScript was frictionless for this workload (parser + tests in one session)

---

## Next Actions

Follow `docs/DEVELOPMENT_PLAN.md` (Session Protocol section). Immediate queue:

1. Stage 1.2 — full-corpus parse validation: AST spot-checks on the remaining 9 files, edge-case tests (reader macros in `gmacros.zil`, `%` forms, gsyntax patterns), catalogue oddities
2. Stage 1.3 — AST → JSON serialization + corpus statistics report

**Milestone 0 is complete** (stages 0.1–0.3 all ☑):

- **0.1 toolchain**: ZILF/ZAPF 0.11.1 at `~/.local/opt/zilf-0.11.1-osx-arm64` (symlinked into `~/.local/bin`), frotz 2.55 via Homebrew. `verification/build.sh` compiles the untouched historical source out-of-tree to `verification/build/zork1.z3` (86,696 bytes, only tab-printing warnings)
- **0.2 harness**: `verification/run-transcripts.sh` (check/capture modes, `STORY=` override) runs `verification/walkthroughs/*.cmd` under `dfrotz -m -p -s 1234` against the shipped `COMPILED/zork1.z3` and diffs against `verification/golden/*.txt`. Three goldens captured (west-of-house, house-entry, cellar-descent), deterministic across runs. **ZILF build vs. shipped build: identical except banner (Release 0/current date vs. 119/880429) and Kitchen object-listing order (sack/bottle swapped)** — historical source is behaviorally faithful; the `STORY=` override is the future engine-parity entry point (stage 4.4)
- **0.3 hygiene**: comic-chat binaries kept (faithful import), Gemini doc truncation annotated, pipeline description consolidated into `docs/AI_KNOWLEDGE_INFRASTRUCTURE_DECISION.md` (AGENTS.md and PORTING_STRATEGY.md now point there), Open Issues pruned

---

## Open Issues

- Engine implementation language undecided — docs still reference WebAssembly as assumed; update PORTING_STRATEGY/AGENTS.md once the ADR lands
- Neutral (non-IF-lore) branding for the commercial assets (engine, IR, importer) still open — "Grues in Comic" names the game/project
- Kitchen object-listing order differs between the ZILF build and the shipped Release 119 build (sack/bottle swapped) — harmless for now, but decide which ordering the engine must reproduce when stage 4.4 parity work starts

Resolved 2026-07-18 (stage 0.3): comic-chat compiled binaries stay tracked — they are part of the faithful upstream historical import (4.1 MB, `.gitignore` is irrelevant for already-tracked files); Gemini doc dangling `4.` annotated as unrecoverable truncation; pipeline description consolidated — `docs/AI_KNOWLEDGE_INFRASTRUCTURE_DECISION.md` is canonical, AGENTS.md and PORTING_STRATEGY.md now reference it. Graphify/OpenWiki validation and empty `wiki`/`graph` dirs are tracked by plan stage 2.4, IR schema by Milestone 2 — no longer open issues here.

---

## Key Paths

| Path | Purpose |
|---|---|
| `importer/` | ZIL Semantic Importer — TypeScript S-expression parser (stage 1.1) |
| `original-projects/zork1/` | ZIL source reference |
| `original-projects/comic-chat/` | Comic Chat source reference |
| `docs/` | Project documentation |
| `wiki/` | Semantic architecture notes |
| `graph/` | Graphify structural outputs (not yet created) |
| `WORKLOG.md` | Persistent project history |
| `AGENTS.md` | Agent workflow rules (single source for all agents) |
| `CLAUDE.md` | Claude Code entry point — references `AGENTS.md` |
| `project-init-skill-installation.md` | Instructions for installing the `project-init` skill on other devices |
