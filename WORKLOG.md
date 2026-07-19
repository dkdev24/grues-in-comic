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

---

## v0.5.2 — OpenWiki Not Adopted (⚑ Gate A semantic half finalized)

**Date:** 2026-07-18

### Changes

- **OpenWiki decision finalized: not adopted** (closes the deferred semantic half of Gate A). In-repo validation (`openwiki` v0.2.0 via OpenRouter): the `openrouter/free` model router produced an empty wiki with a silent "success" — each request routes to a random free community model, and on repository-scale prompts most return null content with `finish_reason: "length"` (reasoning tokens exhaust the budget), which the agent loop reads as completion. A retry with a pinned 1M-context free model (`nvidia/nemotron-3-ultra-550b-a55b:free`) ran a genuine 45-message tool-calling session, then aborted on OpenRouter's free-tier rate limit (16 req/min across all `:free` models; OpenWiki has no backoff/retry). Reliable operation requires a paid model (OpenWiki's own CI pins `z-ai/glm-5.2`) — **no budget for this side project at present**
- Repo cleanup: removed `openwiki/` (empty scaffold), `.github/workflows/openwiki-update.yml` (+ empty `.github/`), and the generated OpenWiki snippet in AGENTS.md; CLAUDE.md deduplicated to `@AGENTS.md` only (graphify rules live in AGENTS.md)
- Docs: `AI_KNOWLEDGE_INFRASTRUCTURE_DECISION.md` OpenWiki section rewritten (DEFERRED → NOT ADOPTED, with findings) and Final Decision table amended (semantic knowledge = hand-authored `wiki/`); AGENTS.md Knowledge Separation rules finalized; DEVELOPMENT_PLAN Gate A note updated; HANDOFF Open Issue moved to Resolved
- Out of scope, untouched: Daniel's global `~/.openwiki/` (whatifclassics ingestion source, 02:00 launchd job, 01:58 pmset wake, API keys)

### Status

Gate A fully closed: Graphify for structural knowledge, hand-authored `wiki/` for semantic knowledge. Revisit OpenWiki only if budget appears or upstream adds rate-limit backoff. Next: stage 3.3 vocabulary & syntax.

---

## v0.5.3 — Vocabulary & Syntax Extraction (stage 3.3)

**Date:** 2026-07-18

### Changes

- **IR schema 0.3.0** (additive): optional `vocabulary` section — `directions` (ZIL DIRECTIONS words mapped to IR direction ids), `buzzwords` (ZIL BUZZ, incl. punctuation tokens), `synonyms` (ZIL SYNONYM word/alias sets), and `syntax` (ZIL SYNTAX rules: verb, 0–2 object slots with optional preposition / `(FIND flag)` / search-option list, action, optional pre-action). Search options are a closed enum (HELD/CARRIED/IN-ROOM/ON-GROUND/MANY/HAVE/TAKE); `find` flags validate against the flag registry; action/preAction join `routineRefs`
- **Extraction** (`extract-world.ts`): full Zork I parser vocabulary from `gsyntax.zil` — **267 syntax rules, 75 synonym sets, 21 buzzwords, 13 direction words**. ZIL compile-time `<COND (<==? ,ZORK-NUMBER n> …)>` gates are resolved exactly (`ZORK-NUMBER=1` read from zork1.zil): the live `N==? 3` clause contributes GIVE→HAND, dead Zork II/III clauses (FROTZ/OZMOO buzzwords, short ATTACK/KILL syntaxes) are dropped. COND expansion now feeds every extraction pass; RMUNGBIT (a `(FIND …)` flag) joins the registry (29 flags); routine refs grow to 292 (V-*/PRE-* verbs — the stage 3.4 worklist)
- **Verified against source**: independent jq mirror of all 267 SYNTAX parses diffs clean against the generated IR; top-level SYNONYMs likewise (COND-derived GIVE→HAND asserted separately); ATTACK/KILL two-slot rules spot-checked against raw ZIL
- 4 new tests (60 total pass); validator/CLI summaries report syntax-rule counts; `docs/IR_SCHEMA.md` documents the section and version history

### Status

Stage 3.3 complete — rooms, objects, and parser vocabulary are all in IR and source-verified. The declarative world is done; next is behavior: stage 3.4 (simple action routines into the ADR 0001 AST).

---

## v0.5.4 — Behavior Extraction Batch 1 (stage 3.4)

**Date:** 2026-07-18

### Changes

- **IR schema 0.4.0**: optional `routines` section — the ADR 0001 behavior AST ships inside world documents. Governed vocabulary growth (logged in the ADR appendix): exprs `in?`, `loc`, expression-position `call`; stmts `set-local`, `move`, `remove`, `value` (expression statement); TELL part `{name}` (ZIL `D`); routine `locals` with AUX-initializer preludes. **ADR 0001's deferred implicit-return question resolved**: expression-oriented value semantics (a routine returns its last executed statement's value; `cond` yields the taken clause's last value; documented per-op). Reference interpreter implements the semantics and new ops; the hand-transpiled POC variant was corrected to match real ZIL returns
- **Deterministic ROUTINE→AST transformer** (`ir/src/extract-behavior.ts`): all-or-nothing per routine — full mapping or catalogued with exact reasons, never guessed. Worklist closure from the world's 292 routine refs through `call` targets: **213 routines extracted (197/292 referenced handlers = 67%)**, 113 catalogued (`ir/artifacts/zork1.behavior-catalog.json`). Deterministic lowerings: `,P?DIR` → direction word, `,V?VERB` → verb word, numeric CONSTANTs → literals, bare routine-name atoms → strings, `(ELSE …)` → T clauses, `(ACTION 0)`-style dead code preserved as-is. DEFMAC macro names (ENABLE, PROB, FLAMING?, …) and the compile-time-macro-gated PERFORM are legal call targets destined for the engine-builtin layer
- World doc grew accordingly: 45 globals (+ behavior-referenced), 10 tables (table-valued globals as Table entities), 31 flags; validator enforces the closed op vocabulary, validates locals/entities/flags/globals referentially, and reports 117 `unresolvedRoutineRefs` (builtins + catalogued)
- **Verified**: extracted TRAP-DOOR-EXIT and KITCHEN-WINDOW-F byte-match the stage 2.2 hand-written POC ASTs (the strongest possible check of the transformer against human transcription); differential interpreter runs match POC goldens; 65 tests pass (5 new); both CLIs report routine/unresolved counts

### Status

Stage 3.4 complete — majority of handlers represented, complex ones catalogued with actionable reasons. Next: stage 3.5 works through the catalog in batches (properties/tables, loops, daemons, macro-gated parser machinery).

---

## v0.5.5 — Complex Behavior Batches a+c (stage 3.5 begins)

**Date:** 2026-07-19

### Changes

- **IR schema 0.5.0** — governed vocabulary growth (ADR 0001 appendix): exprs `prop` (ZIL GETP), `table-get` (GET), `add`/`sub`/`mul`/`div` (16-bit signed, truncating `/`; n-ary → left folds, unary `-` → `0 − x`), expression-position `set-local`/`set-global` (ZIL SET/SETG inside predicates); stmts `set-prop` (PUTP, yields its entity) and `table-set` (PUT, yields its table); routine `defaults` (ZIL `"OPT" (NAME <init>)`, applied by arity as in Z-code — passed false does not trigger the default; `<>` defaults lowered away)
- **Property keys are IR field names**, never raw ZIL atoms: closed `BEHAVIOR_PROPERTY_KEYS` map (`P?LDESC` → `description`, `P?TVALUE` → `treasureValue`, all 11 corpus-used properties); unmapped atoms denied. Absent properties read as false. LTABLE index 0 answers the element count (element n at index n−1)
- **Extraction: 213 → 228 routines, catalog 113 → 104, unresolved refs 117 → 110.** Batch a unlocked BAD-EGG, CHALICE-FCN, LARGE-BAG-F, PAINTING-FCN, TREASURE-ROOM-FCN, V-EXAMINE, V-READ; batch c unlocked BASKET-F, CAVE2-ROOM, SCORE-OBJ, V-CLOSE, V-STAB; arithmetic unlocked LIVING-ROOM-FCN, MATCH-FUNCTION, V-PUT. New worklist targets catalogued: THIEF-IN-TREASURE, FIND-WEAPON, SCORE-UPD, OTVAL-FROB, TOUCH-ALL, WEIGHT (all loop-blocked)
- Catalog reasons are **first-blocker only** (all-or-nothing deny throws on first hit), so batch sizes are discovered iteratively: re-extraction after each vocabulary growth surfaces the next blocker (e.g. V-OPEN: GETP → FIRST?). Remaining clusters: FIRST?/REPEAT/PROG loops + object-tree iteration (batch b, the dominant blocker incl. all 15 former opt-default routines), MacroEval bodies (batch e), COND-clause forms, GETPT/PTSIZE and bit ops (deliberately excluded: PRE-FILL's Z-machine property-table scan and V-SCRIPT's Z-header transcript-bit poke are engine-builtin territory; RANDOM stays a builtin for transcript-replay determinism)
- **Verified against golden transcripts**: extracted V-READ executed by the reference interpreter on the leaflet reproduces the frotz golden output (01-west-of-house.txt) with wrapping normalized; refusal path and V-EXAMINE default path asserted; unit semantics for every new op (wraparound at ±32768, ltable length slot, arity-based defaults). 77 tests pass (12 new)

### Status

Stage 3.5 in progress — batches a (property/table access) and c (optional-param defaults + SET-as-expression) complete, plus arithmetic. Next: batch b (loops/object-tree iteration — unlocks the most routines), then d (daemons/timers), e (MacroEval bodies).

---

## v0.5.6 — Complex Behavior Batch b: Loops + Object-Tree Iteration (stage 3.5)

**Date:** 2026-07-19

### Changes

- **IR schema 0.6.0** (ADR 0001 appendix): stmts `loop` (ZIL `REPEAT ()`), `block` (`PROG ()` — runs once, yields last value), `break` (exits nearest loop/block with value), `continue` (`AGAIN`); exprs `first`/`next` (object-tree iteration). Exact ZIL activation semantics: `RETURN` inside REPEAT/PROG lowers to `break`, outside to routine `return`; `RTRUE`/`RFALSE` always exit the routine. Validator statically rejects `break`/`continue` outside a container. All corpus REPEAT/PROG binding lists are empty; non-empty ones denied
- **POC world gains ordered child lists** (`children`, kept consistent with `locations`): `move` inserts at the FRONT (Z-machine `insert_obj`), `remove` unlinks; `first`/`next` walk sibling order. Initial order = world-document order; the Kitchen sack/bottle ordering question (Open Issues) becomes relevant when stage 4.4 parity starts
- **Extraction: 228 → 247 routines, catalog 104 → 88, unresolved refs 110 → 94.** Unlocked: V-OPEN, V-INVENTORY, V-WAIT, ROB, OTVAL-FROB, TOUCH-ALL, WEIGHT, FIND-WEAPON, THIEF-IN-TREASURE, DESCRIBE-OBJECTS, WATER-F, MACHINE-F, MIRROR-MIRROR, HELD?, and more. `defaults` gets its first corpus users (OTVAL-FROB → TROPHY-CASE, V-WAIT → 3). New call targets catalogued: CLOCKER (daemon dispatcher, batch d), PRINT-CONT
- **Historical quirks preserved, not fixed**: OTVAL-FROB discards its recursive call's value in the original ZIL, so nested treasure never scores — asserted by test (mini trophy-case world: egg 5 + coffin 15 = 20; sceptre-in-coffin uncounted)
- Diagnosis of the "COND clause is not a list" cluster (15 routines: V-PRAY, V-LOOK-INSIDE, PRE-PUT, …): compile-time `%<COND (ZORK-NUMBER gates)>` producing quoted clauses — batch (e) will reuse the stage 3.3 gate-resolution machinery (ZORK-NUMBER=1)
- Corpus routines executed by the reference interpreter in tests: FIND-WEAPON over a mini troll/thief tree, OTVAL-FROB recursion via a test builtin shim, TOUCH-ALL subtree flagging. 89 tests pass (12 new)

### Status

Stage 3.5 batch (b) complete. Remaining catalog clusters: MacroEval bodies + quoted COND clauses (batch e, 31 first-blockers), daemons/timers (batch d: CLOCKER/QUEUE machinery), parser/scope machinery destined for engine builtins (,ROOMS / ,GLOBAL-OBJECTS iteration, GETPT/PTSIZE, DIROUT/DIRIN, RFATAL, SAVE/RESTORE/QUIT). End state is a deliberate builtin list, not an empty catalog.

---

## v0.5.7 — Complex Behavior Batch e: Compile-Time Macro Resolution (stage 3.5)

**Date:** 2026-07-19

### Changes

- **No schema change** — extractor-only deterministic lowerings (ADR 0001 appendix): `%<COND …>` MacroEval resolved in statement/expression/COND-clause position via the stage 3.3 ZORK-NUMBER gate machinery (`==?`/`N==?`, `OR` of gates, `T`/`ELSE`); the selected clause's quoted form is unquoted and substituted; no-live-clause macros yield ZIL `<>` (false). `#DECL` Chtype nodes filtered like comments; empty `<>` forms in statement position lower to false-valued expression statements
- **Extraction: 247 → 288 routines, catalog 88 → 59, unresolved refs 94 → 65.** Cleared clusters: MacroEval-in-statement (16), quoted COND clauses (15), Chtype/DECL (8), empty-form heads (7). Unlocked: V-PRAY, V-ATTACK, V-SCORE, V-LOOK-INSIDE, V-TREASURE, ROBBER-FUNCTION, QUEUE, PRINT-CONT, SCORE-UPD, AXE-F, CRETIN-FCN, RBOAT-FUNCTION, and 23 more
- Verified the gate selection end-to-end: extracted V-PRAY contains the Zork I clause (SOUTH-TEMPLE → GOTO FOREST-1) and not the Zork II/III `NULL-F` variant; AXE-F's `<>` clause body executes to false in the interpreter. 92 tests pass (3 new; 1 batch-b assertion updated — PRINT-CONT now extracts)
- Remaining 59 catalogued routines are dominated by the deliberate engine-builtin frontier: `,ROOMS`/`,GLOBAL-OBJECTS` scope iteration (11), RFATAL/parser dispatch (5), GETPT/PTSIZE (4), SAVE/RESTORE/RESTART/QUIT/VERIFY meta verbs, DIROUT/DIRIN, RANDOM/MOD/MIN, plus a few stragglers (`<REST …>`, expression-position `<COND …>`, TELL `CR` as argument — TROLL-FCN)

### Status

Stage 3.5 batch (e) complete. Handler coverage 227/292 (78%). Next: batch (d) daemons/timers (CLOCKER protocol, QUEUE name-string targets into the worklist: I-THIEF, I-LANTERN, I-CANDLES, …), then triage the long tail into "extract" vs "engine builtin" and write the deliberate builtin list.

## v0.5.8 — Complex Behavior Batch d: Daemons/Timers (stage 3.5)

**Date:** 2026-07-19

### Changes

- **Daemon protocol decided (ADR 0001 appendix): the gclock.zil clock is an engine builtin, not extracted IR.** `QUEUE`/`INT`/`CLOCKER` join the DEFMAC builtins (`ENABLE`, `DISABLE`) — calls lower to `call`, bodies are never extracted (their C-TABLE `REST`/`APPLY` vector arithmetic is Z-machine plumbing). Protocol: an interrupt record is a 3-slot table `[C-ENABLED?, C-TICK, C-RTN]` addressed by the gclock constants 0/1/2; `QUEUE`/`INT` return the record, so extracted `<GET <INT I-THIEF> ,C-ENABLED?>` code works unchanged via `table-get`/`table-set`. `CLOCKER` iterates newest-first, skips tick 0, decrements, fires when the pre-decrement tick was ≤ 1 (−1 = demon, every turn), honors `CLOCK-WAIT`, increments `MOVES`. `P-WON` demon-region gating deferred to engine stage 4.5. Reference implementation in `ir/poc/world.ts`
- **QUEUE name-string targets wired into the worklist**: routine names passed by atom (`<QUEUE I-MATCH 2>`) now join the extraction closure — CLOCKER applies them at run time, so they are as reachable as direct call targets. Also added `<VALUE X>` expr → global read (identical to `,X`)
- **Extraction: 288 → 295 routines, catalog 59 → 64, unresolved refs 65 → 42 (86% handler coverage).** Unlocked daemons: I-MATCH, I-XC, I-REMPTY, I-MAINT-ROOM, I-RIVER, I-FOREST-ROOM (+ helpers FOREST-ROOM?, MUNG-ROOM); QUEUE left the extracted set (now builtin, its old extraction leaned on catalogued INT)
- **Countdown golden**: the extracted I-MATCH daemon runs end-to-end through reference CLOCKER ticks — silent at tick 2→1, "The match has gone out." + FLAMEBIT/ONBIT cleared at 1→0, dormant after; demon (−1) fires every turn; `CLOCK-WAIT` skips exactly one tick. 101 tests pass (9 new; 2 stale batch-b/e assertions updated to the builtin decision)
- Remaining daemons catalog on the true builtin frontier: I-LANTERN/I-CANDLES (`<REST …>` countdown-table pointer advance over LAMP-TABLE/CANDLE-TABLE), I-CYCLOPS (ABS), I-SWORD (NEXTP), I-THIEF (expression-position `<COND …>`), I-XB (TELL `CR` as argument), I-RFILL (FSET form shape)

### Status

Stage 3.5 batch (d) complete. Handler coverage 250/292 (86%). Next: extract-vs-builtin triage of the long tail (`,ROOMS`/`,GLOBAL-OBJECTS` iteration, RFATAL, GETPT/PTSIZE, SAVE/RESTORE/QUIT/VERIFY, DIROUT/DIRIN, RANDOM/MOD/MIN, `<REST …>`, expression-position `<COND …>`) and write the deliberate builtin list.

## v0.5.9 — Stage 3.5 Builtin Triage: Deliberate Engine-Builtin List

**Date:** 2026-07-19

### Changes

- **Complete triage of the 61 catalogued routines into ADR 0001's new "Deliberate engine-builtin list" section.** Group A stays catalogued by design — Z-machine I/O and persistence meta verbs (SAVE/RESTORE/RESTART/QUIT/VERIFY/SCRIPT/UNSCRIPT/RECORD/UNRECORD/COMMAND-FILE/ECHO/VERSION), randomness (V-RANDOM, PICK-ONE), and parser/scope/movement machinery (LIT?, GOTO, V-WALK, V-LEAP, GLOBAL-IN?, PRE-FILL, OTHER-SIDE, NOT-HERE-OBJECT-F, V-SAY). Group B is missing IR vocabulary with named future batches: (f) expression-position tell/set-flag/clear-flag + PRINTN, (g) expression-position cond + abs/mod/min, (h) table-rest views (unlocks I-LANTERN/I-CANDLES countdowns), (i) apply over routine-name values, (j) RFATAL fatal return, plus world-document gaps (ROOMS/GLOBAL-OBJECTS/LOCAL-GLOBALS meta entities, nested VILLAINS tables) and two M4-protocol deferrals (LOUD-ROOM-FCN's inline READ, I-SWORD's exit reflection)
- **Three extractor-only lowerings that fell out of the triage** (no schema change): Number in statement position → value statement (GO-NEXT's per-turn codes); bare room/object atom in expression position → entity (TRAP-DOOR-FCN's `LIVING-ROOM`, an original missing-comma quirk ZIL compiles identically); `,NAME` GVal naming a routine → routine-name string joining the extraction closure (BELL-F's `,LLD-ROOM`, whose routine-vs-room compare stays always-false as on the Z-machine)
- **Extraction: 295 → 298 routines, catalog 64 → 61, unresolved refs 42 → 40 (86% handler coverage).** Unlocked BELL-F, GO-NEXT, TRAP-DOOR-FCN. 105 tests pass (4 new in `test/behavior-35-triage.test.ts`: Group A stays catalogued; each lowering verified in the artifact)

### Status

Stage 3.5 triage complete: every catalogued routine now has a written disposition (engine builtin vs named future batch). Next: batch (f) expression-position statement ops, or Stage 5.1 (Comic Chat) as filler; M4 engine core can start against the Group A builtin contract.

## v0.5.10 — Complex Behavior Batch f: Expression-Position Statement Ops (stage 3.5)

**Date:** 2026-07-19

### Changes

- **IR schema 0.7.0** (ADR 0001 appendix): exprs `tell`, `set-flag`, `clear-flag` — output and flag mutation in expression position (ZIL TELL/CRLF/PRINTN/FSET/FCLEAR inside AND/OR predicates), same shapes as the statement ops, yielding true (batch (c) precedent). PRINTN off the deny list in both positions → TELL number part; PRINT/PRINTB/PRINC/PRINTD stay denied (builtin I/O). Validator shares one tell-parts checker across statement and expression position; reference interpreter implements the three ops
- **Extraction: 298 → 305 routines, catalog 61 → 56, unresolved refs 40 → 37 (87% handler coverage).** Unlocked the whole batch (f) target list: I-XB, RUSTY-KNIFE-FCN, I-RFILL, SAND-FUNCTION, V-DIAGNOSE, plus FIGHT-STRENGTH and the I-CURE healing daemon via V-DIAGNOSE's closure. TROLL-FCN advanced from the TELL-CR symptom to its real blocker, `APPLY` (batch (i))
- 113 tests pass (8 new in `test/behavior-35f.test.ts`): artifact shapes (tell inside `and` in RUSTY-KNIFE-FCN, set-flag inside `and` in I-RFILL, PRINTN part in V-DIAGNOSE), op semantics, and an extracted-corpus golden — I-XB warns the wraiths at the Entrance to Hades and clears XB

### Status

Stage 3.5 batch (f) complete. Handler coverage 255/292 (87%). Next per ADR 0001 Group B: batch (g) expression-position cond + abs/mod/min, then (h) table-rest, (i) apply, (j) RFATAL.
