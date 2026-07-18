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

---

## v0.4.1 — Behavior Representation ADR + POC (stage 2.2)

**Date:** 2026-07-18

### Changes

- **ADR 0001** (`docs/adr/0001-behavior-representation.md`, Accepted): imperative game logic is represented as a structured behavior AST — plain JSON with a closed vocabulary of IF-domain operations — interpreted by the engine; generic ZIL utility routines become engine builtins invoked by name; engines may compile the AST to closures at load time; transpiling to TypeScript as the canonical form was rejected (IR independence, extraction validatability, runtime-choice reversibility)
- Added `ir/src/behavior.ts`: behavior AST types (12 expression ops, 6 statement ops) covering the constructs the POC corpus needs — COND/predicates/TELL/global+flag mutation/return/call
- POC compared both candidate representations on two nontrivial routines (TRAP-DOOR-EXIT, KITCHEN-WINDOW-F): hand-written ASTs + ~130-line reference interpreter vs. hand-transpiled TypeScript, executing over a shared world/builtin substrate (`ir/poc/`)
- 12 differential scenarios assert outcome equality; 10 golden tests pin both variants to the ZIL source's expected transcripts; suite now 43 tests, typecheck clean

### Status

Stage 2.2 complete: behavior representation decided with working evidence — ⚑ Gate B input delivered. Next: stage 2.3 (engine runtime ADR + engine↔UI contract), where Gate B resolves and Milestones 3–5 get revised.

---

## v0.4.2 — Engine Runtime ADR, ⚑ Gate B Resolved (stage 2.3)

**Date:** 2026-07-18

### Changes

- **ADR 0002** (`docs/adr/0002-engine-runtime.md`, Accepted): the Grues in Comic Engine will be a zero-dependency **TypeScript** package (`engine/`); WebAssembly dropped as a target. Rationale: TypeScript frictionless across all three existing subsystems, behavior-as-data (ADR 0001) removes any performance case for native code, Node-based transcript verification, and one language for one (human or AI) contributor. Portability is preserved in the artifacts — IR and serialized contract — not the implementation
- **Engine↔UI contract defined interface-first** in the same ADR: pure deterministic synchronous state machine; `command() → TurnResult{events}`, `snapshot()/restore()`; seeded RNG for golden-transcript parity; versioned JSON event union (narration/speech/player-moved/object-moved/score-changed/game-over/question); events semantic, never presentational; additive growth under `contractVersion`
- WASM assumption removed per exit criteria: PORTING_STRATEGY.md (overview, pipeline diagram, Phase 4 → Browser Integration, long-term vision) and AGENTS.md objectives updated; IR independence lists intentionally retain WebAssembly
- DEVELOPMENT_PLAN revised per Gate B: gate marked resolved, Milestone 4 goal names `engine/` + ADRs 0001/0002; Milestones 3 and 5 stand structurally
- HANDOFF Open Issue "engine implementation language undecided" resolved

### Status

Stage 2.3 complete — **⚑ Gate B resolved** (both decisions: behavior representation + runtime). Milestone 2 has one stage left: 2.4 knowledge-tooling validation (⚑ Gate A). After that, Milestone 3 extraction begins.

---

## v0.4.3 — Knowledge Tooling Validation, ⚑ Gate A Resolved (stage 2.4, Milestone 2 complete)

**Date:** 2026-07-18

### Changes

- **Graphify adopted** (Gate A, structural half): validated in the field (Daniel, separate project) and in-repo — per-module knowledge graphs committed for `importer/` (83 nodes / 202 edges / 6 labeled communities) and `ir/` (94 / 210 / 13), each with `GRAPH_REPORT.md`, `graph.html`, `graph.json`; all edges EXTRACTED via the deterministic AST pass, health checks clean, communities/god nodes verified against the real architecture
- Adopted configuration: `.graphifyignore` code-only corpus (excludes `original-projects/`, docs/images, generated artifacts, verification, and package/tsconfig metadata — measured at ~30% node noise); per-module `<module>/graphify-out/` supersedes the planned `graph/` directory; agent integration installed (hook guards, CLAUDE.md/AGENTS.md rules, `graphify update .` post-change)
- Validation finding: IR world JSON yields zero AST nodes (upstream graphify #1666) — Graphify covers modernized source; a deterministic IR→graph exporter is the sanctioned path if an IR world graph is wanted later
- **OpenWiki deferred** (LLM-provider integration issue in off-project testing): `wiki/` stays hand-authored; revisit tracked in HANDOFF Open Issues; not blocking
- Docs updated: `AI_KNOWLEDGE_INFRASTRUCTURE_DECISION.md` gains "Stage 2.4 Validation" section; AGENTS.md Knowledge Separation rewritten; DEVELOPMENT_PLAN Gate A marked resolved (split)

### Status

**Milestone 2 complete** (stages 2.1–2.4; Gates A and B resolved). IR schema + behavior representation + engine runtime + knowledge tooling all decided with working evidence. Next: Milestone 3 — Semantic Extraction ZIL→IR (v0.5.x), starting with 3.1 world model.

---

## v0.5.0 — World Model Extraction (stage 3.1, Milestone 3 begins)

**Date:** 2026-07-18

### Changes

- **Deterministic ZIL→IR world extraction** (`ir/src/extract-world.ts` + `extract-cli.ts`, `npm run extract`): consumes the committed importer AST artifacts (`importer/artifacts/ast/`), emits `ir/artifacts/zork1.world.json` — **all 110 Zork I rooms, 352 exits** (277 plain / 37 blocked / 25 conditional / 6 door / 7 routine), room flags, scenery/pseudo references, 47 opaque routine refs, and the 12 exit-condition globals (all `<>` → `false`). Objects referenced by rooms (scenery + doors) are emitted as 20 `stub: true` identity entries so references resolve; full objects are stage 3.2. Any AST shape outside the known ZIL grammar is a hard error — no guessing; ZIL comment nodes (e.g. TREASURE-ROOM's `;"CANT-HAVE-ONBIT"`) are skipped
- **Connectivity verified against source** (exit criterion): independent jq-derived (room, direction, kind:target) edge list from the AST diffs clean against the generated IR — 352/352 identical; the three hand-transcribed stage 2.1 sample rooms (WEST-OF-HOUSE, KITCHEN, LIVING-ROOM) match the generated versions field-for-field; raw-ZIL spot checks (RESERVOIR, MAZE-2) match
- Extraction test suite (`ir/test/extract.test.ts`, 8 tests): validity, room/exit counts, exit-kind histogram, sample agreement, comment skipping, condition-global registry, DOORBIT door stubs, determinism. 51 tests total pass; validator CLI now also covers `ir/artifacts/`
- `.graphifyignore`: `ir/artifacts/` excluded (generated); `ir/` graph regenerated (123 nodes / 288 edges / 8 communities); `ir/README.md` layout/usage updated; `extractWorld` exported from the package API

### Status

Stage 3.1 complete — all Zork I rooms in IR with connectivity matching source. Next: stage 3.2 objects/properties/flags/containment (140 OBJECT forms).

---

## v0.5.1 — Object Extraction (stage 3.2)

**Date:** 2026-07-18

### Changes

- **Full object extraction** in `ir/src/extract-world.ts`: all **137 objects** (140 OBJECT forms across `1dungeon.zil`/`gglobals.zil`, minus the 3 ZIL world-tree scaffolding objects GLOBAL-OBJECTS/LOCAL-GLOBALS/ROOMS, which the IR represents structurally) with properties, flags, containment, and initial locations (73 in rooms, 20 in objects, 20 local-globals, 14 global, 10 nowhere). Replaces the stage 3.1 stub entries; `ir/artifacts/zork1.world.json` now carries 110 rooms + 137 objects, 132 routine refs, 28 registered flags
- **IR schema 0.2.0** (additive; `ir/src/schema.ts`, validator, `docs/IR_SCHEMA.md`, sample updated): new location kind `"global"` (ZIL GLOBAL-OBJECTS — object in scope in every room, semantically distinct from local-globals), `vehicleType` (ZIL VTYPE — room-flag id the vehicle travels on; boat → NONLANDBIT, validated against the flag registry), `descriptionRoutine` (ZIL DESCFCN — opaque routine ref, collected into routineRefs). ADVENTURER's `(ACTION 0)` maps to absent action
- **ZIL string semantics implemented** (`decodeZilString`, applied to every extracted string): `|` is a hard newline, source line wraps become spaces, indentation after hard newlines is preserved — matches golden-transcript rendering (leaflet, boat label, dam guidebook). Also corrects stage 3.1 room descriptions, which had kept raw source line wraps
- **Verified against source**: an independent jq mirror of the complete object mapping (including string decoding) diffs clean against the generated IR (137/137); the three fully-transcribed sample objects (MAILBOX, ADVERTISEMENT, KITCHEN-WINDOW) are byte-identical to the extraction; INFLATED-BOAT checked against raw ZIL
- 5 new extraction tests (56 total pass); typecheck clean; both IR documents validate

### Status

Stage 3.2 complete — the declarative world of Zork I (rooms + objects) is fully in IR and source-verified. Next: stage 3.3 vocabulary & syntax (needs a schema decision for vocabulary representation).
