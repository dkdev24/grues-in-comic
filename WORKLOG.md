# WORKLOG.md

Persistent project history. Append entries; do not edit past entries.

---

## v0.1.0 — Repository Initialization

**Date:** 2026-07-18

### Changes

- Initialized Git repository at `/Users/daniel/Sites/comic-zork`
- Created private GitHub repository `dkdev24/comic-zork`
- Imported historical reference source:
  - `original-projects/zork1/` — Zork I ZIL source (Infocom, 1977–1981)
  - `original-projects/comic-chat/v1.0/` — Microsoft Comic Chat 1.0
  - `original-projects/comic-chat/v2.1b/` — Microsoft Comic Chat 2.1b
  - `original-projects/comic-chat/v2.5-beta-1/` — Microsoft Comic Chat 2.5 beta 1 (original)
  - `original-projects/comic-chat/v2.5-beta-1-modern/` — Microsoft Comic Chat 2.5 beta 1 (modernized)
- Added `AGENTS.md`, `CLAUDE.md`, `README.md`, `THIRD_PARTY.md`, `.gitignore`
- Fixed `.gitignore.md` → `.gitignore`; re-applied ignore rules, removed incorrectly tracked build artifacts
- Added `HANDOFF.md` and `WORKLOG.md`

### Status

Foundation only. No engine code, no IR schema, no browser runtime.

---

## v0.1.1 — Project Renamed to Grues in Comic

**Date:** 2026-07-18

### Changes

- Renamed project from Comic-Zork to **Grues in Comic** to avoid the "Zork" trademark (Activision); "grue" predates Zork (Jack Vance) and is copyright/trademark-safe
- Renamed GitHub repository to `dkdev24/grues-in-comic` (old URL redirects; local remote updated)
- Applied rename across `README.md`, `AGENTS.md`, `HANDOFF.md`, `docs/PORTING_STRATEGY.md`, `docs/SOLOPRENEUR_STRATEGY.md`, `docs/AI_KNOWLEDGE_INFRASTRUCTURE_DECISION.md`
- Left past WORKLOG entries and `docs/gemini-analysis-on-plan-and-strategy.md` untouched as historical records
- Verified upstream licenses via GitHub API: `historicalsource/zork1` and `microsoft/comic-chat` are both MIT
- Strategy decisions recorded in HANDOFF: WASM no longer mandatory (engine runtime ADR pending), golden-transcript verification via ZILF + dfrotz, deterministic ZIL S-expression parser before LLM extraction

### Status

Docs and repo renamed. Local directory rename pending. No engine code yet.

---

## v0.1.2 — Licensing Files and Development Plan

**Date:** 2026-07-18

### Changes

- Added root `LICENSE` (canonical Apache 2.0 text) and `NOTICE` (Apache statement, Zork I / Comic Chat MIT attribution, full MIT text); README license section updated to reference both
- Confirmed license compatibility: MIT-licensed imports may live inside an Apache-2.0 project with original license files preserved
- Created `docs/DEVELOPMENT_PLAN.md`: Milestones 0–6 in session-sized stages with status markers and four decision gates (A: knowledge-tooling validation, B: runtime ADR, C: transcript parity, D: comic-presentation POC)
- Decided Graphify/OpenWiki install timing: validate hands-on early (stage 0.3), install for real only once the IR exists
- HANDOFF Next Actions now delegate to the development plan's Session Protocol

### Status

Planning complete. Next up: Milestone 0 (verification harness and ground truth). No engine code yet.

---

## v0.2.0 — Verification Harness (Milestone 0, stages 0.1–0.2)

**Date:** 2026-07-18

### Changes

- Installed toolchain: ZILF/ZAPF 0.11.1 (native macOS arm64), frotz 2.55 (dfrotz)
- `verification/build.sh`: reproducible out-of-tree compile of the unmodified historical ZIL source to `verification/build/zork1.z3` — compiles clean (28 tab-printing warnings, no errors, no source patches needed)
- `verification/run-transcripts.sh`: golden transcript harness — runs `walkthroughs/*.cmd` under `dfrotz -m -p -s 1234` against the shipped reference build (Release 119 / Serial 880429), diffs against `golden/*.txt`; capture and check modes; `STORY=` override for testing other builds (later: the engine itself)
- Captured three deterministic golden transcripts: west-of-house, house-entry, cellar-descent
- Cross-validated: ZILF build matches shipped build behaviorally except version banner and Kitchen object-listing order — preserved source confirmed faithful

### Status

Verification ground truth established. Stage 0.3 (repo hygiene) remains to close Milestone 0.

---

## v0.2.1 — Repo Hygiene (Milestone 0 complete)

**Date:** 2026-07-18

### Changes

- Comic Chat compiled binaries (`v2.5-beta-1/base/objd/`, 4.1 MB) kept tracked: part of the faithful upstream historical import
- Annotated the truncated fourth recommendation in `docs/gemini-analysis-on-plan-and-strategy.md` (unrecoverable; items 1–3 complete and adopted)
- Consolidated the AI knowledge pipeline description: `docs/AI_KNOWLEDGE_INFRASTRUCTURE_DECISION.md` is canonical; AGENTS.md keeps only operational rules, PORTING_STRATEGY.md keeps a summary — both reference the canonical doc
- Pruned HANDOFF Open Issues; added one new issue: Kitchen object-listing order difference between ZILF and shipped builds (decide ground-truth ordering before stage 4.4)

### Status

**Milestone 0 complete.** Verification ground truth and clean repo baseline established. Next: Milestone 1 (deterministic ZIL parser), stage 1.1.

---

## v0.3.0 — ZIL Parser POC (Milestone 1, stage 1.1)

**Date:** 2026-07-18

### Changes

- New `importer/` package (TypeScript, vitest): deterministic ZIL S-expression lexer (`src/lexer.ts`), recursive-descent parser (`src/parser.ts`), and typed AST (`src/ast.ts`) with line/column spans on every node
- Syntax coverage driven by the corpus: `\` escapes in atoms/strings, octal `*777*` literals, prefix operators `;` `'` `,` `.` `%` `%%` `!` `#`, char literals `!\c`, `!>` form closers, `<>`-as-FALSE, top-level header/SUBTITLE strings, `\`+form-feed page-break atoms
- 26 tests: per-feature unit tests plus a full-file integration test on `1dungeon.zil` asserting exact definition counts (110 ROOM / 122 OBJECT / 17 GLOBAL / 4 ROUTINE / 1 DIRECTIONS; 254 top-level forms)
- Smoke test: all 10 `.zil` files in the corpus parse without error — stage 1.2 shifts to AST validation and edge-case cataloguing

### Status

Stage 1.1 complete. TypeScript proved frictionless for the parser workload (Gate B data point). Next: stage 1.2 (full-corpus parse validation).

---

## v0.3.1 — Full-Corpus Parse Validation (Milestone 1, stage 1.2)

**Date:** 2026-07-18

### Changes

- Fixed the one real lexer defect the corpus surfaced: `!-` (MDL oblist trailer) now continues an atom — `RETURN!-` in `gmacros.zil` was previously split into `RETURN` + segment silently
- Added `src/printer.ts` (AST → canonical ZIL text) and a round-trip invariant: `parse(print(ast))` is structurally identical to `ast` for all 10 corpus files
- Added `test/parse-corpus.test.ts`: per-file ground-truth top-level counts, corpus totals (110 ROOM / 140 OBJECT / 442 ROUTINE forms, 439 at top level), and edge-case assertions; suite now 44 tests
- Catalogued corpus edge cases in `importer/README.md`: three page-break spellings (`\`+form-feed, literal `^L`, `/^L`), `%<COND …>` reader macro in `gmain.zil` conditionally defining routines (incl. quoted `'<ROUTINE PERFORM …>`), escaped `\#RANDOM` debug verbs, `#DECL`/`#BYTE` chtypes only, and three column-1 nested forms in `1actions.zil` proving grep counts aren't structural ground truth

### Status

Stage 1.2 complete: 100% of the corpus parses with validated structure. Next: stage 1.3 (AST → JSON + statistics) closes Milestone 1.

---

## v0.3.2 — AST Artifacts (Milestone 1 complete)

**Date:** 2026-07-18

### Changes

- Added `src/stats.ts` (per-file/corpus statistics) and `src/cli.ts` (artifact generator); `npm run artifacts` re-runs the full pipeline in one command with deterministic output
- Committed `importer/artifacts/`: `ast/*.json` — full typed ASTs with source positions for all 10 files (6.3 MB), `stats.json`, and human-readable `STATS.md`
- Corpus statistics (parser truth): 11,899 lines → 52,569 AST nodes; 110 ROOM / 140 OBJECT / 439 ROUTINE / 152 GLOBAL / 101 CONSTANT / 267 SYNTAX / 74 SYNONYM / 15 DEFMAC top-level; 28 TABLE / 147 LTABLE / 16 ITABLE at any depth
- Test suite grown to 47 (stats unit tests caught a markdown-separator rendering bug)

### Status

**Milestone 1 complete.** Deterministic ZIL parser with committed AST artifacts — the grounding input for all later LLM-based extraction. Next: Milestone 2 (IR schema + runtime ADR), stage 2.1.

---

## v0.4.0 — IR Schema: Declarative World (stage 2.1)

**Date:** 2026-07-18

### Changes

- Created the `ir/` package — the IR is now a concrete artifact, not a concept: `src/schema.ts` (TypeScript types as schema source of truth, `irVersion` 0.1.0), `src/validate.ts` (strict validator: structural pass rejecting unknown keys + referential pass resolving every id, with a flag registry and DOORBIT enforcement on door exits), `src/cli.ts` (`npm run validate`)
- Exit representation mirrors the five ZIL variants 1:1 (`to`, `blocked`, `conditional` IF/ELSE, `door` IF-IS-OPEN, `routine` PER); all behavior references are opaque routine-name strings deferred to stage 2.2, surfaced by the validator as `summary.routineRefs`
- Hand-wrote `ir/samples/west-of-house.world.json` from `1dungeon.zil`: WEST-OF-HOUSE, KITCHEN, LIVING-ROOM in full (every exit kind exercised), MAILBOX / ADVERTISEMENT / KITCHEN-WINDOW objects, IN-HOUSE-AROUND ltable, four boolean globals; `"stub": true` placeholders keep partial worlds referentially closed
- Wrote the normative spec `docs/IR_SCHEMA.md` (design principles, ZIL→IR mapping tables, validation rules, versioning, deferrals)
- 21 tests (validator rules + sample integration), typecheck clean, validator CLI green

### Status

Stage 2.1 complete: declarative-world IR schema documented, validated, and pinned against hand-transcribed source. Next: stage 2.2 (behavior representation, ⚑ Gate B input) — the sample's seven routine refs are the candidate POC targets.
