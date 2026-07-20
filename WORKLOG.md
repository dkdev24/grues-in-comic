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

## v0.5.11 — Complex Behavior Batch g: Expression-Position Cond + Deterministic Arithmetic (stage 3.5)

**Date:** 2026-07-19

### Changes

- **IR schema 0.8.0** (ADR 0001 appendix): expr `cond` — a conditional in expression position (ZIL COND inside AND/OR or as an argument), the same shape as the statement op and yielding the taken clause's last value (predicate value on an empty body, false when no clause fires), so the stage 3.4 expression-oriented semantics now hold in both positions. Plus the deterministic arithmetic ops `mod` (truncating remainder, sign of the dividend as on the Z-machine), `min` (n-ary source forms → left folds, per batch (a)), and `abs` (−32768 wraps to itself under the shared 16-bit signed wrap). `RANDOM` stays denied — randomness remains an engine builtin per the determinism rule — as do the bit ops. Validator threads the enclosing loop/block depth into expression position so a `cond` clause body's `break`/`continue` is still checked
- **Extraction: 305 → 309 routines, catalog 56 → 52, unresolved refs 37 → 34 (88% handler coverage).** Unlocked CANARY-OBJECT, SHAKE-LOOP, SAILOR-FCN (the corpus's only `MOD`), CYCLOPS-FCN (its only `MIN`). The remaining batch (g) candidates advanced past ABS/cond to their real blockers: I-CYCLOPS → `<NTH …>`, I-THIEF → the `,ROOMS` meta entity (a world-document gap, not a behavior op), GRATE-FUNCTION → a String in statement position. `ABS` is lowerable but currently unexercised by the corpus, since its only user I-CYCLOPS still catalogs on `<NTH …>`
- 124 tests pass (11 new in `test/behavior-35g.test.ts`): artifact shapes (`mod` in SAILOR-FCN, `min` in CYCLOPS-FCN), the advanced catalog reasons, and op semantics — mod's dividend sign, min, abs's −32768 wrap, and expr-position cond's taken-clause / empty-body / no-clause-fires / nested-in-`and` cases
- **Session note:** the batch was interrupted mid-flight by a usage limit. Source work was already complete and typechecking; the resume finished the `irVersion` fixture bumps (sample + regenerated artifact), corrected a stale `I-CYCLOPS`-fails-on-`ABS` assertion in `behavior-35d.test.ts` to the new `<NTH` frontier, and added the batch (g) tests. No source logic changed on resume

### Status

Stage 3.5 batch (g) complete. Handler coverage 258/292 (88%). Next per ADR 0001 Group B: (h) table-rest (completes the I-LANTERN/I-CANDLES countdown goldens), (i) apply, (j) RFATAL, and the world-document meta entities that unblock I-THIEF. Newly surfaced and not yet assigned to a batch: `<NTH …>` and String-in-statement-position.

## v0.5.12 — Complex Behavior Batch h: Table Views (stage 3.5)

**Date:** 2026-07-19

### Changes

- **IR schema 0.9.0** (ADR 0001 appendix): expr `table-rest` — ZIL `<REST tbl bytes>`, an interior pointer into a table's storage. Runtime values gain a table pointer: `BehaviorValue` splits into `BehaviorLiteral` (what a document may hold — `const` and table elements stay scalar, so the document's value domain is unchanged) and the runtime union adding `TableRef` = `{table, offset}`. A bare table id is the same pointer at offset 0, so views compose and `table-get`/`table-set` read through them. The offset counts **elements, not bytes**: the extractor halves ZIL's byte count and denies an odd or non-literal one, byte addressing being exactly what the IR's platform-independence rule excludes. LTABLEs are not viewable (the count word sits in the slot a view skips) — extractor and interpreter both say so rather than mis-index. Table pointers compare structurally, matching the Z-machine address compare
- **Extraction: 309 → 312 routines, catalog 52 → 50, unresolved refs 34/292 (88%, unchanged).** Unlocked I-LANTERN, I-CANDLES and their shared helper LIGHT-INT. The ref ratio is flat because all three are reached by direct call and QUEUE name string rather than by a world-document reference — the gain shows in the catalog, not the refs
- **Batch (d) countdown goldens complete**: the extracted lamp daemon walks its PURE table through all three dimming messages ("a bit dimmer" → "definitely dimmer now" → "nearly out") and burns out at the 0 terminator, clearing ONBIT and setting RMUNGBIT — advancing the pointer 2 elements per stage and never writing the table
- 135 tests pass (11 new in `test/behavior-35h.test.ts`): extraction shapes (the `<REST .TBL 4>` → offset-2 halving, nothing left catalogued on `<REST …>`), op semantics (offset reads, view composition, bare-id equivalence, ltable refusal), and the countdown golden

### Status

Stage 3.5 batch (h) complete. Handler coverage 258/292 (88%); catalog down to 50. Next per ADR 0001 Group B: (i) apply (TROLL-FCN, AWAKEN, DESCRIBE-OBJECT, V-BOARD), (j) RFATAL, and the world-document meta entities that unblock I-THIEF.

**Surfaced, not fixed:** ZIL declares the countdown tables as `<GLOBAL LAMP-TABLE <TABLE …>>` — both a global binding and a table — but stage 2.1 world extraction emits only the table. `,LAMP-TABLE` therefore has no initial value in the document and an engine cannot bind the pointer at load time; the batch (h) golden seeds it explicitly. The fix belongs to world extraction, not the behavior vocabulary.

## v0.5.13 — Complex Behavior Batches i + j: Computed Application and RFATAL (stage 3.5)

**Date:** 2026-07-19

### Changes

- **Batch (i) — IR schema 0.10.0**: expr `apply`, calling a routine named at run time. `routine` evaluates to a routine-name string (batch (d)'s QUEUE-target convention); the corpus form is always `<APPLY <GETP .O ,P?ACTION> …>`, an object's action handler. A false/absent name yields false **without calling**, matching the Z-machine's `call` to address 0 — the corpus depends on this to probe objects with no ACTION property, so it is semantics, not defensiveness. Unlike `call`, `apply` contributes no static call target to the validator: reachability comes from the world document's `action` refs. Unlocked TROLL-FCN (the blocker batch (f) predicted), AWAKEN, DESCRIBE-OBJECT, V-BOARD
- **Batch (j) — RFATAL, no new vocabulary**: the macro is `<PROG () <PUSH 2> <RSTACK>>` — return gmain.zil's `M-FATAL` (2) from the routine. The action-handler protocol is already ordinary values (`M-NOT-HANDLED` = false, `M-HANDLED` = 1, `M-FATAL` = 2) and only the M4 parser loop, a Group A builtin, compares against it — so RFATAL lowers to `return` of the constant 2, an extractor-only lowering like the batch (e)/triage ones and with no schema impact of its own. **The RSTACK detail is load-bearing**: JIGS-UP ends `<PROG () … <RFATAL>)>`, so lowering RFATAL like ZIL's `<RETURN>` would have produced a `break` that merely left the PROG and let the routine run on past the player's death. Unlocked CANDLES-FCN, ITAKE, JIGS-UP, PRE-BOARD, V-TELL
- **Extraction: 312 → 324 routines, catalog 50 → 43, unresolved refs 34 → 29/292 (88% → 90%).** The world document grew to 66 globals and 19 tables (from 64/17) as the widened closure reached FUMBLE-NUMBER/FUMBLE-PROB and the ABOVE-GROUND/INDENTS tables — world extraction emits what the closure references
- 150 tests pass (9 new in `test/behavior-35i.test.ts`, 6 in `test/behavior-35j.test.ts`): apply dispatch by name and via a property, the call-to-0 rule with a non-call assertion, a non-routine target rejected, the AWAKEN golden both ways (revives an unconscious villain applying F-CONSCIOUS; leaves a conscious one untouched), RFATAL's lowering shape, that JIGS-UP's fatal return really is nested inside a PROG, and that a fatal return inside a loop exits the routine rather than the loop

### Status

**Stage 3.5 Group B is complete** — every named future batch (f)–(j) has landed. Handler coverage 263/292 (90%); catalog down to 43, which is now Group A engine builtins by design (GETPT/GETB, BAND/BOR, RANDOM, READ, DIROUT/DIRIN, SAVE/RESTORE/RESTART/VERIFY/QUIT), the world-document gaps, and a short tail of one-offs: `<NEXTP …>` (I-SWORD, OTHER-SIDE), `<NTH …>` (I-CYCLOPS), a String in statement position (GRATE-FUNCTION), `,ONBIT`/`,ACTORBIT` as bare names (LIT?, V-SAY), a non-atom FSET? flag (GOTO), P-PRSO's `<ITABLE …>` initializer.

Next: the world-document gaps as one unit before M4 — the meta entities ROOMS/GLOBAL-OBJECTS/LOCAL-GLOBALS (13 catalogued routines, the largest single remaining group, and what blocks I-THIEF), nested VILLAINS table elements, and the table-valued globals from batch (h). M4 (engine core) is the first consumer that loads the document and boots a world, which is exactly what those gaps break.

---

## v0.5.14 — World-Document Gap 1: Meta Entities (stage 3.5)

**Date:** 2026-07-19

### Changes

- **IR schema 0.11.0 — `metaEntities` section, no new behavior ops.** The 13 routines catalogued on `unknown name ,ROOMS` / `,GLOBAL-OBJECTS` were never blocked by the behavior vocabulary: `resolveName` had nothing to resolve those names *to*, because stage 3.2 dropped ZIL's three world-tree scaffolding objects entirely. They are now emitted as `{id, role, location?}` anchors with the roles `rooms` / `global-objects` / `local-globals`, which puts them in the flat entity namespace — so `,ROOMS` lowers to an ordinary `{op:"entity"}` and the existing `in?` / `first` / `next` / `equal?` ops work against them with no change
- **Deliberately not entities-with-properties.** GLOBAL-OBJECTS' 13-flag FLAGS list and LOCAL-GLOBALS' DESCFCN/FDESC/SYNONYM are ZIL compile-time property-slot allocation, not game state; carrying them would import noise the game never reads. A meta entity holds a role and a tree position, nothing else
- **Membership stays derived, never duplicated.** An engine parents rooms under the `rooms` anchor (document order) and objects under the anchor matching their `location.kind`; the rooms list and the `global`/`local-globals` location kinds remain the single place membership is written down. Only the anchors' own nesting is stored, because gglobals.zil puts LOCAL-GLOBALS *inside* GLOBAL-OBJECTS and gparser.zil's scope walk climbs that edge. Validation enforces one anchor per role, meta-only parents, and no cycles — a cycle would leave the object tree rootless
- **Extraction: 324 → 345 routines, catalog 43 → 32.** Unlocked DESCRIBE-ROOM, FIRSTER, HACK-HACK, I-THIEF (the batch (h)/(i) prediction), PRE-TURN, ROPE-FUNCTION, TREE-ROOM, V-DISEMBARK, V-EAT, V-EXIT, V-FIND; RANDOMIZE-OBJECTS and V-CLIMB-UP advanced to their real blockers (RANDOM, GETPT). Unresolved refs 29 → 39/292 (90% → 87%) — the widened closure reached more Group A builtin references, so the ratio moved while nothing regressed
- 165 tests pass (15 new in `test/meta-entities.test.ts`): the emitted anchors and their nesting, that they appear in neither `rooms` nor `objects`, that all 13 blocked routines cleared, that `,ROOMS` lowers to `entity` and not `global`, six validator rejections (unknown role, duplicate role, id collision, non-meta parent, cycle), and a FIRSTER golden — no header for a room because the room is in ROOMS, a header for a sack because it is not
- `docs/IR_SCHEMA.md` gained a Meta entities section and had its version header and history backfilled through 0.7.0–0.11.0 (it had drifted at 0.6.0 since batch b)

### Status

Stage 3.5 world-document gap 1 complete. Handler coverage 253/292 (87%); catalog down to 32 — Group A engine builtins by design, plus the two remaining world-document gaps and the one-off tail.

Next, finishing the world-document unit before M4: **table-valued globals** (`<GLOBAL LAMP-TABLE <TABLE …>>` declares both a binding and a table; `resolveName` still lowers it to `{op:"global"}` while extraction files it under `tables`, so the read has no target) and **nested table elements** (`VILLAINS` holds `<TABLE …>` forms — HERO-BLOW; plus P-PRSO's `<ITABLE …>` initializer).

---

## v0.5.15 — World-Document Gap 2: Table-Valued Globals (stage 3.5)

**Date:** 2026-07-19

### Changes

- **IR schema 0.12.0 — a global may hold a `{table, offset}` pointer; no new behavior ops.** ZIL's `<GLOBAL X <TABLE …>>` declares *two* things, table storage and a variable pointing at it, but extraction emitted only the table. `resolveName` still returned `{op:"global", id}` — the name is in `globalForms` — against a binding the document never contained. `needGlobal` now emits both
- **The gap was 6× wider than batch (h) reported.** It surfaced as a LAMP-TABLE observation; an audit of the artifact found **29 unbound reads across all 19 table-valued globals** (YUKS, INDENTS, DUMMY, RIVER-SPEEDS, HELLOS, …). Globals 66 → 86
- **The pointer has to be a variable, not a constant.** The tempting fix — a `{op:"table", id}` constant expr parallel to `entity` — is wrong: I-LANTERN ends `<SETG LAMP-TABLE <REST .TBL 4>>` and I-CANDLES the same, so the countdowns advance precisely by *retargeting the binding*. A constant reference would have been unwritable. Keeping it a global also meant zero changes to the behavior vocabulary — `,LAMP-TABLE` and `<SETG LAMP-TABLE …>` already lowered correctly, they just had nothing to resolve against
- **Table and pointer share the one ZIL name** — the single exception to the flat-id rule, enforced narrowly in `claimId` (a `tables` id may reuse a `globals` id only when that global's value points at that table). The runtime already keeps variables and table storage in separate namespaces (`poc/world.ts` has distinct `globals` and `tables` records), so the collision is only in the validator's bookkeeping, and synthesizing a second id would cost the traceability the IR's ids exist for
- **Validator tightened**: the `global` reference kind was `global-or-table`, which accepted `{op:"global"}` naming a table — that looseness is what let 29 unbound reads validate cleanly for five batches. Now that every read is bound, it resolves strictly against `globals`, and the artifact still validates. New checks: a global's pointer target must be a declared table, offsets must be non-negative integers
- 175 tests pass (10 new in `test/table-globals.test.ts`): both entities emitted, every table carrying its pointer, an artifact-wide sweep asserting no behavior read names a missing global, the retargeting `set-global` shape, five validator cases, and a golden that **boots the lamp daemon from document state alone** — a loader binding `globals` and `tables` straight out of `zork1.world.json`, no hand-seeding, burning through all three dimming messages to the terminator with the PURE table never written. This is the batch (h) golden with its hand-seeded pointer removed, which is the point

### Status

Stage 3.5 world-document gap 2 complete. Routine counts unchanged (345 extracted, 32 catalogued, 39/292 unresolved — this gap blocked no routines, it corrupted the ones already extracted).

Next, last of the world-document unit before M4: **nested table elements** — `VILLAINS` holds `<TABLE …>` forms (HERO-BLOW), and P-PRSO's `<ITABLE …>` initializer (NOT-HERE-OBJECT-F).

---

## v0.5.16 — World-Document Gap 3: Nested Table Elements + ITABLE (stage 3.5)

**Date:** 2026-07-19

### Changes

- **IR schema 0.13.0 — a table element may be a `{table, offset}` pointer; no new behavior ops.** ZIL nests tables inside tables (`VILLAINS` is an LTABLE of three anonymous `<TABLE …>` rows, one per villain). The slot holds an *address* in ZIL, which is exactly what `TableRef` already models from batch (h) — so the faithful lowering reuses the runtime's existing pointer value rather than inventing inline storage. `<GET ,VILLAINS .CNT>` hands HERO-BLOW a pointer it indexes straight through with `<GET .OO ,V-VILLAIN>`, unchanged.
- **Nested tables get a derived `parent#index` id** and are emitted as ordinary top-level entries. They carry **no pointer variable** — unlike v0.5.15's named tables, ZIL never gave them a name, so the flat-id exception does not widen. `test/nested-tables.test.ts` asserts both halves of that (derived ids have a table parent; no global claims one).
- **Two element forms the extractor also had to learn**, both found only after the nesting worked: a bare `<>` slot (the cyclops has no weapon — was denied as an unsupported `Form`), and an atom naming a table-valued global or a numeric `CONSTANT`. The latter two matter for the melee message tables: each villain row's `V-MSGS` slot names `TROLL-MELEE`/`THIEF-MELEE`/`CYCLOPS-MELEE`, and those are deeply nested `(PURE)` LTABLEs whose leaf rows interleave string chunks with the `F-WEP`/`F-DEF` marker constants the renderer compares numerically. Declaring the atom pulls the whole tree into the closure — **tables 19 → 132**, globals 86 → 103.
- **`<ITABLE NONE n>` extracts as zero-filled `itable` storage** (P-PRSO/P-PRSI, 50 words each). The `itable` kind already existed in the schema but nothing produced it. It addresses exactly like `table` — the length is baked into `elements`, so only the initializer ever differed; `RuntimeTable` gains the kind and needs no other change. The byte-addressed `(LEXV)`/`(BYTE LENGTH)` ITABLEs in `gparser.zil` stay **denied by design**: they are READ's parser buffers (ADR 0001 Group A), not world state, and are not element-addressable.
- **Validator** accepts a `{table, offset}` element and resolves it through the existing `tableRefs` pass, so a pointer at a missing table fails with `unknown table "…"` like any other.
- **Unlocked NOT-HERE-OBJECT-F** (345 → 346 routines). **HERO-BLOW advanced past the document gap to `operator RANDOM`** — a Group A engine builtin by design, so it is no longer a world-doc blocker; the catalog holds at 32 because NOT-HERE-PRINT (`PRINTB`) entered as the closure widened. Unresolved refs steady at 39/292.
- 184 tests pass (9 new in `test/nested-tables.test.ts`): the VILLAINS row layout by V-* constant, the cyclops' false slot, the melee tree walked to its leaves, derived-id invariants, P-PRSO's shape, an end-to-end runtime read of a villain row through the stored pointer, and the validator's accept/reject pair. The v0.5.15 "every table has a pointer" sweep is now scoped to named tables.

### Status

Stage 3.5 world-document unit **complete** — all three gaps (meta entities, table-valued globals, nested tables) closed. The document now loads and boots a world without hand-seeding, which was the precondition for M4.

Remaining catalog is Group A engine builtins by design plus the one-off tail (`NEXTP`, `NTH`, String-in-statement-position, bare `,ONBIT`/`,ACTORBIT`, non-atom `FSET?` flag). Next: **M4 engine core** against the Group A builtin contract.

---

## v0.5.17 — Licensing, Provenance, Public-Repo Prep

**Date:** 2026-07-19

*Backfilled in v0.6.8: this entry lived only in HANDOFF.md and was never written to the WORKLOG.*

### Changes

Documentation and repo hygiene only. No engine, IR, or artifact changes. Triggered by a question about whether ZILF/ZLR make this project redundant — they do not, and the reasoning is now written down instead of being tribal knowledge.

- **ADR 0002 gained an "Alternatives Considered" section.** The ADR argued TypeScript vs. C++/WASM but never recorded why an engine is written at all rather than reusing an interpreter. A compiled story file is an opaque memory image; `speech.speaker` and `player-moved` room ids are recoverable from the IR and not from `zork1.z3`. **The Z-Machine Standards Document 1.1 is now the normative source for M4 Group A builtin semantics** — read `reference/z-machine-standards-1.1.md`, not an interpreter's source.
- **ZLR ships no license** (verified: no LICENSE/COPYING, no headers in `ZLR.VM/*.cs`; the Gargoyle licenses in the tree cover a vendored dependency). Default copyright applies — stricter than GPL. Last-resort reference only; if consulted, describe observed *behavior*, not implementation, and record it in ADR 0002.
- **Build tools attributed**: ZILF/ZAPF 0.11.1 (GPL-3.0), Frotz 2.55 (GPL-2.0-or-later) in `NOTICE` + `THIRD_PARTY.md`. Invoked as external executables — not vendored, so no copyleft reach into Apache-2.0 source. Both upstream imports verified to carry genuine Microsoft MIT grants.
- **`reference/`** created and gitignored: Z-Machine Standard, Comic Chat paper (moved from `docs/`), ZILF/ZLR sources. See `reference/README.md` — it warns that `reference/zilf/AGENTS.md` is ZILF's own agent guide and has **no authority here**.
- **299 Comic Chat build outputs untracked** (~33 MB: `.exe`/`.dll`/`.ocx`/`.lib`/`.class`/`.map`/`.sym`, plus a vendored Sun JDK). Source, docs, and 661 comic art files kept — the `.avb` art is an M5 input. `original-projects/zork1/` untouched.
- **`original-projects/` stays version-controlled** — MIT permits redistribution, `AGENTS.md` requires it, and `importer/`/`ir/`/`verification/` read from it. Gitignoring it was considered and rejected.
- Commit authorship moved to `11153426+dkdev24@users.noreply.github.com`; history rewritten.

### Status

Repo prepared for public release but not made public. Nothing further blocks it.

---

## v0.5.18 — Project Scope, Trademark Notices, `.avb` Format (Milestone 5, stage 5.1 partial)

**Date:** 2026-07-20

### Changes

- **ADR 0002 amended — "Scope of Portability: source frontends, not story files".** Prompted by asking whether the project should eventually run any Z-machine-compatible interactive fiction. The ambition widens to an **IR-native engine with pluggable source frontends** (ZIL is frontend #1; the rest of the ZIL family — Zork II/III, Enchanter, Planetfall — is the cheap expansion, reachable through the existing importer; Inform 6 is a plausible frontend #2). **Compiled story files stay explicitly out of scope**: executing a memory image re-raises the ADR's existing ZLR/ZVM objection verbatim, since `speech.speaker` and `player-moved` room ids are unrecoverable from `zork1.z3`, and it would be a second engine sharing nothing with the IR evaluator but the event contract. Three consequences bind M4: builtins implement the Z-Machine Standard rather than Zork I's call sites; no `zork1` identifier appears in `engine/`; and the first portability test is **importing Zork II after M4 works**, not a speculative abstraction layer built in advance.
- **Trademark notices added** to `README.md` and `NOTICE`. Copyright and trademark are separate regimes and the project had already solved both without recording it: the MIT grants cover the ZIL source *including the prose in its string literals*, so plot, puzzles, and room text are all licensed for reuse — the storyline was never the exposure. Trademark risk is branding, handled by the v0.1.1 rename. The notices attribute ZORK/INFOCOM to Activision and MICROSOFT/COMIC CHAT to Microsoft, disclaim affiliation, state that no trademark licence is implied by MIT, Apache-2.0, or any file in the repo, and record that trademark names appear nominatively — identifying the historical works and reproducing the `ZORK I` status banner that golden-transcript parity requires.
- **README de-staled.** WebAssembly references removed: Gate B dropped WASM in ADR 0002 (v0.4.x) and the README had never caught up, still describing "a modern browser-native architecture powered by WebAssembly" and a `WebAssembly Runtime` pipeline stage. The architecture diagram now shows the TypeScript engine emitting the versioned JSON event contract. The repository-structure block was rewritten against the real tree — it had listed `importers/`, `zork/`, `wasm/`, `graph/`, `wiki/`, `tests/`, `scripts/`, `assets/`, and `renderer/`, most of which have never existed, and showed `engine/`/`web/` as present rather than planned.
- **`.avb` avatar format decoded — new `art/` module.** `art/poc/avbdec.py` (stdlib only) parses Comic Chat avatar files and writes PNGs named by part, emotion, and intensity. Verified against the whole corpus: **191/191 files parse, 4656/4656 images decode.** Image storage splits three ways — 2906 embedded BMP, 1364 zlib + masked-mono, 386 zlib + local palette — so a browser port needs BMP parsing (including BI_RLE4), native `DecompressionStream`, and 2bpp unpacking, with no exotic dependencies.
- **`docs/AVB_FORMAT.md`** is the normative spec. It exists chiefly to record five behaviours that a reader written from the historical header alone gets wrong, **four of them silently**: (1) `AK_OFFSET_ADJUSTMENT` is a 32-bit read — the "signed 2-bit integer" comment is a typo — and accumulates across records, applying only to non-zero offsets; (2) body, face, and torso carry *different field sets*, torso having no `x`/`y`, so a shared layout misaligns every torso record into plausible-looking garbage rather than an exception; (3) `MaskedMonoPalette` is the DIB colour table for the Win32 three-DIB split, **not** the render palette — the real semantics are `00=blank 01=aura 10=black 11=white`, and using the array yields a correctly-shaped but dark-red/navy figure; (4) intensity is `byte/255` per `avatario.cpp:158`, while the `/10` + `IndexToByte` path in that same file is the network protocol; (5) four images are BI_RLE4-compressed BMPs, duplicated across four version directories.
- **Asset inventory established.** 31 distinct characters (5 are single-pose stubs), 18–43 poses each, every pose tagged with an 8-point emotion wheel plus intensity, and `AT_COMPLEX` avatars compositing face and torso separately — so effective variety far exceeds raw pose counts. Against Zork I's five NPCs (`GHOSTS`, `BAT`, `CYCLOPS`, `THIEF`, `TROLL`) characters are abundant. **Backdrops are not**: the format defines `AT_BACKDROP` but no instance exists in the corpus, leaving three 315×315 `.bmp` files against 110 rooms.

### Status

Documentation and tooling only — **no engine, IR, or artifact changes; M4 remains the next actual work.**

Stage 5.1 is partly started ahead of schedule: `.avb` decoding is solved and specified, which de-risks the M5 art pipeline. Remaining 5.1 work is face/torso compositing (`GetHeadAndBodyFromEmotion`), mask and aura planes for DIB-format poses, and the TypeScript port of the decoder.

Two M5 questions are now open and recorded in HANDOFF rather than settled here: the backdrop gap (3 available, 110 needed), and panel grammar — Comic Chat assumes dialogue between peers, while Zork is second-person narration whose turns mostly emit `narration` with no speaker, so caption boxes must be first-class and "who is on screen when nobody speaks" needs an answer.

---

## v0.6.0 — Engine Core: State & World Runtime (Milestone 4, stage 4.1)

**Date:** 2026-07-20

### Changes

- **New `engine/` module** — `@grues-in-comic/engine`, the first code written against ADR 0002's Gate B decision. Zero runtime dependencies: `@grues-in-comic/ir` is consumed through `import type` only (resolved by a tsconfig path to `../ir/src`), so the IR contributes types at compile time and nothing at all to emitted JS. No DOM, no timers, no I/O.
- **`src/events.ts` — the ADR 0002 contract as code.** The `EngineEvent` union, `TurnResult`, and `CONTRACT_VERSION` ("1.0.0"). Also `transcriptText()`, which defines *once* what "the text the player saw this turn" means (the `narration`/`speech`/`question`/`game-over` text, concatenated) so the stage 4.4 harness and the stage 5.2 text UI cannot drift apart on the question parity is measured by.
- **`src/state.ts` — `GameState` and the object tree.** The split that matters: the IR document is immutable input (it *is* the compiled game) and `GameState` is everything that changes, which is what makes the state a complete save file on its own. Primitives mirror ZIL's semantics rather than convenience: `isIn` is a *direct* containment test (one level, ZIL `IN?`) with `isWithin` offered separately for the transitive question, and `move` inserts at the FRONT of the child list per the Z-machine `insert_obj` opcode, because room-listing order depends on it. `isWithin` bounds its walk at 64 hops — the tree is data, and data lies.
- **`src/load.ts` — booting a document into state.** Every relationship the schema calls "derived" is materialised here exactly once, so no later stage has to special-case an implicit container: rooms parent under the `rooms` meta entity in document order, `global`/`local-globals` objects under theirs, and LOCAL-GLOBALS nests inside GLOBAL-OBJECTS as the parser's scope walk requires. Flags, mutable properties, and table storage are **copied** out of the document, so a world shared between two engines cannot be corrupted by play (tested directly). Load-time linking appends rather than prepending — ZIL declaration order is the listing order — which is deliberately the opposite of runtime `move`.
- **`src/movement.ts` — exit resolution split from performing the move.** `resolveExit` answers "where does this direction lead, and may I go?" without touching state, returning a discriminated `ExitResolution` (`go` / `blocked` with the authored message / `refused` / `routine` / `none`). The split exists because the parser, a vehicle, a daemon's forced move, and the thief all need to ask without committing, and because stage 4.3 needs the *reason* for a refusal to pick the right narration event. `PER` exits resolve to `{kind: "routine"}` — deferred until the behavior interpreter lands in 4.3.
- **`src/rng.ts` — the only source of randomness.** mulberry32, seeded, with the whole generator state round-tripping through one number so it saves and restores with the game. Determinism is a contract term (ADR 0002), not an implementation detail: golden-transcript replay in 4.4 is meaningless without it. `random(n)` returns 1..n inclusive, matching the Z-machine `random` opcode rather than 0-based indexing.

### Tests

22 tests, all against the **real** extracted Zork I world (110 rooms, 137 objects) rather than fixtures, so a regression shows up at full scale. Two are load-bearing beyond their own assertions:

- **No exit points at a nonexistent room** — a whole-document sweep. A dangling exit is exactly the extraction defect that would otherwise surface in stage 4.4 as an unexplainable crash.
- **Unconditional-exit reachability from the start is exactly 16 rooms** — the entire surface world and no more. Everything underground sits behind the kitchen window (a door exit) or the trap door (a `PER` routine), so the number is a real statement about Zork I's topology: if it grows, an exit that should be gated has stopped being gated.

One genuine bug was caught by the tests rather than by review: the start room was not marked visited at load, so walking out and back read as a first visit — which would have mis-scored first-entry room values in 4.3.

Three other initial failures were **wrong test assumptions, not wrong code**, and are worth recording because each is a trap for the next reader: the leaflet's id is `ADVERTISEMENT`, not `LEAFLET`; "Behind House" is the *display name* of the room whose id is `EAST-OF-HOUSE` (the engine must never conflate id and `name`); and the 16-room reachability figure that looked too low is correct.

### Status

Stage 4.1 ✅ — the exit criteria ("can walk the map; state transitions correct") are met against the full Zork I document. `npm test` 22/22, `npm run typecheck` clean.

Next: stage 4.2, the command parser (tokenization, vocabulary lookup, syntax matching, disambiguation) against the `vocabulary` section — 267 extracted parser rules.

---

## v0.6.1 — Engine Core: Command Parser (Milestone 4, stage 4.2)

**Date:** 2026-07-20

### Changes

- **`engine/src/vocabulary.ts` — the lexicon.** The IR splits vocabulary the way ZIL does: the `vocabulary` section holds words belonging to the *language* (135 verbs, prepositions, 13 directions, 21 noise words, 75 synonym groups), while nouns and adjectives live on the objects that answer to them. Both halves fold into one lookup structure at load time, so the parser never has to know which half a word came from. Two details are parity requirements rather than conveniences: words are truncated to **six characters**, because the Z-machine dictionary does and a golden transcript may well contain "MAILBO"; and direction abbreviations (N, NE) arrive as ordinary synonyms, so they are resolved into the direction table eagerly rather than looked up twice.
- **Syntax rules are pre-sorted most-specific-first** (slot count, then preposition count) so the first structural match is the right one and no scoring pass is needed. This is what makes `PUT DOWN LAMP` reach V-DROP instead of matching plain `PUT`.
- **`engine/src/scope.ts` — what the player can refer to.** All four ZIL sources: carried (recursively), the room (recursively), the room's scenery pool in LOCAL-GLOBALS, and GLOBAL-OBJECTS. Containers are permeable when OPEN, TRANS, or SURFACE — the rule that makes the glass bottle behave. `INVISIBLE` is honoured as what it actually is, the parser's "cannot see this yet" bit, which is how the thief stays unmentionable until he appears. Scope order is deliberate and doubles as the disambiguation preference: held things before floor things.
- The parser and action dispatch share **one** definition of scope. A parser that finds an object the action layer then refuses is how IF engines end up with two different ideas of "here".
- **`engine/src/parser.ts`** produces ZIL's three parser globals — PRSA, PRSO, PRSI — and nothing else. Whether taking the object is sensible, permitted, or fatal is the action's business. Failures are a **discriminated union**, not one error, because ZIL prints a different refusal for each and transcripts show the difference: `unknown-word` (never heard of it) is not `no-verb`, and neither is `not-here` or `ambiguous`. When several rules fit structurally, the parser reports why the *best-fitting* one failed — a "not-here" from a rule that nearly worked tells the player far more than a generic refusal from a worse rule.

### Tests

24 new tests (46 total, all passing). The standing check is **"parses every command the golden transcripts use"** — 39 commands drawn from `verification/transcripts`, so stage 4.4 cannot arrive to discover the parser never handled its input. That test counts only *grammar* failures: `not-here` is a successful parse of a command whose object is simply elsewhere.

**One real bug, found by the tests and worth recording because the shape of it recurs.** ZIL's search-option list mixes two unrelated ideas: `HELD`/`CARRIED`/`ON-GROUND`/`IN-ROOM` say *where to look*, while `MANY`, `HAVE`, and `TAKE` constrain what the **action** may do. Treating the list uniformly as a location filter was silently wrong in one direction only — `EXAMINE`'s sole option is `MANY`, so its search narrowed to nothing and `EXAMINE MAILBOX` failed while `TAKE MAILBOX` kept working. `originAllowed` now partitions the list and treats a slot with no location option as accepting anything in scope, which is ZIL's default.

Two further initial failures were **wrong test assumptions**: `PUT X IN Y` dispatches to `V-PUT` (ZIL distinguishes IN from ON at the rule level, where ON is `V-PUT-ON`, but both IN-forms share one action), and `TAKE` searching `ON-GROUND`/`IN-ROOM` only — an object already in hand is deliberately out of its reach, which is how ZIL produces "You already have that". Both are now tests in their own right.

- `ir/src/index.ts` gained the vocabulary type exports (`Vocabulary`, `SyntaxRule`, `SyntaxObjectSlot`, `SyntaxSearchOption`, `DirectionWord`, `WordSynonym`). They existed in `schema.ts` but had never been re-exported, so no consumer could name them. IR tests unchanged: 184/184.

### Status

Stage 4.2 ✅ — exit criteria met. Engine 46/46, IR 184/184, both typecheck clean.

Next: stage 4.3, action dispatch — port the ADR 0001 behavior-AST evaluator from `ir/poc/interpreter.ts` into `engine/` and drive it from the parser, emitting the ADR 0002 events.

---

## v0.6.2 — Engine Core: Action Dispatch & Events (Milestone 4, stage 4.3)

**Date:** 2026-07-20

### Changes

The engine now plays Zork I. `createEngine(doc).command("open mailbox")` returns the right events, and a walkthrough from West of House into the Living Room reproduces the original's prose.

- **`src/runtime.ts`** — the per-turn context. The POC threaded a bare world and appended prose to a string array; the engine adds PRSA/PRSO/PRSI, the seeded RNG, and an **event sink** in place of a transcript buffer. Text is buffered rather than emitted per `TELL`, since one ZIL routine prints a sentence across many calls and one event per fragment would be unusable. Structural events flush the buffer first, so prose printed *before* a move stays before it in the stream.
- **`src/interpreter.ts`** — the ADR 0001 evaluator, ported from `ir/poc/interpreter.ts` (already proven over 346 routines). Substance unchanged; what changed is the surroundings — output goes to events, `move`/`remove` emit `object-moved`, and routine resolution tries the document's own routines *before* engine builtins so a game can legitimately override a utility.
- **`src/builtins.ts`** — ZIL's Group A utility layer: the clock (QUEUE/INT/ENABLE/DISABLE/CLOCKER), the light rule, GOTO, PICK-ONE, PROB, GLOBAL-IN?, FLAMING?, OPENABLE?, OTHER-SIDE. Per ADR 0002's portability rule these implement the **ZIL library**, not Zork I's call sites: no `zork1` identifier appears in `engine/`.
- **`src/engine.ts`** — `createEngine`, the turn loop, and ZIL's four-step dispatch chain (pre-action → PRSI action → PRSO action → room action → verb default), plus `snapshot`/`restore` over a fully JSON-serializable save.

**The engine delegates room description to the game's own `DESCRIBE-ROOM`/`DESCRIBE-OBJECTS`** when the document carries them. Those routines already implement verbose/brief modes, the light rule, and the first-visit distinction; reimplementing that in the engine would be a second, competing answer to questions the IR has already answered — exactly what ADR 0001's Group A/B split exists to prevent. A fallback describer remains for partial documents.

### Six bugs, every one of which produced a plausible wrong answer rather than a crash

This is the stage where "it runs" and "it is correct" diverge, and each of these is now a named regression test.

1. **`verb?` resolves against PRSA, not the typed verb word.** ZIL's `<VERB? WALK BOARD THROUGH>` compares against the *action*, with the `V-` prefix dropped. The difference is invisible wherever a verb and its action agree — "TAKE" → V-TAKE — which is what makes it dangerous. It surfaced on "ENTER WINDOW": verb ENTER, action V-THROUGH, and the window's routine tests THROUGH. The window simply could not be entered while every ordinary verb worked.
2. **Room action contexts are numbers, not names.** `M-LOOK` is 3 (gmain.zil); the extracted AST compares `RARG` against `{op:"const", value:3}`. Passing the string `"M-LOOK"` is a type error nowhere — the comparison just never matches, and rooms whose description is computed lose it while rooms with a static LDESC read correctly.
3. **`PERFORM`'s first argument is a verb name.** `DO-WALK` calls `<PERFORM ,V?WALK .DIR>`, which extraction reduces to `"WALK"`. Using it verbatim as the action dispatched to nothing.
4. **ZIL property defaults (`PROPDEF`) were missing.** The player object declares no SIZE, so `V-TAKE`'s weight check read `false` and the arithmetic threw — *every* take failed. SIZE defaults to 5, CAPACITY/VALUE/TVALUE to 0.
5. **Rooms had no properties in state.** `load.ts` populated objects only, so `<GETP ,HERE ,P?ACTION>` always returned the default and `DESCRIBE-ROOM` printed nothing for computed rooms.
6. **`GOTO` set TOUCHBIT to mark a visit.** TOUCHBIT belongs to `DESCRIBE-ROOM`, which sets it itself and reads it as "already described" — so marking the visit made the room's description vanish. First-visit scoring now uses the engine's own `visited` set.

**`PICK-ONE` was also rewritten** against the real algorithm. It is a *rotating* choice, not a plain random one: the table carries a cursor and each pick swaps the winner to the front of the unused region, so every message is seen once before any repeats. The layout in IR element terms is `[cursor, ...messages]` — an LTABLE's length word is synthesized rather than stored — and ZIL's `<REST .FROB 2>` skips two *bytes*, i.e. one element. Reading it as two shifts the window and returns the cursor as a message. A plain random pick would also have drifted from the transcripts within a few turns even under an identical seed.

### Known tension, recorded rather than papered over

Delegating to the game's `DESCRIBE-ROOM` costs the **`room-title` channel**: Zork prints the room name with its own `<TELL D ,HERE>`, so the engine cannot separate it without parsing prose, which the contract forbids. A UI wanting the title should read `player-moved`.to and look the name up in the world document. Revisit in 4.4/5.2 — see Open Issues.

### Tests

68 engine tests (22 new), IR 184/184, both typecheck clean. Two are deliberately broad: determinism (same seed + same commands ⇒ identical events, and a JSON save round-trip), and a crude fuzz applying **every one of the 135 verbs** to a visible object, asserting that no command throws whatever it does — behavior is data, and an unhandled AST shape must surface as a refusal, never as an exception escaping into the host.

### Status

Stage 4.3 ✅ — exit criteria met: LOOK/TAKE/DROP/inventory all produce correct events.

Next: stage 4.4, the transcript replay harness — diff engine output against the dfrotz goldens in `verification/`.

---

## v0.6.3 — Engine Core: Transcript Replay Harness (Milestone 4, stage 4.4)

**Date:** 2026-07-20

### Result

**All three golden transcripts replay with zero diff — 30/30 turns, 100%.** The goldens are dfrotz captures of the shipped Release 119 story file, so this is a diff against real Zork I, not against our own earlier output.

### The harness

- **`engine/harness/golden.ts`** — parses a dfrotz capture into per-turn blocks and normalizes them. Turn boundaries are the status lines, which dfrotz redraws after each prompt. Normalization removes what is *presentation* on both sides: the interpreter banner, the status line, the `>` prompt, the end-of-session dialogue, and hard word wrapping — dfrotz wraps at the terminal width and the engine emits unwrapped text, so a literal comparison would fail on every sentence over 76 characters while saying nothing about behavior. Paragraph breaks are **kept**, because Zork uses blank lines deliberately and a missing one is a real diff.
- **`engine/harness/replay.ts`** — `npm run replay`, exit code = number of failing walkthroughs, so it drops into CI unchanged. A crashed turn is reported as a diff rather than aborting the run, so one bad command does not hide the state of the rest.
- **`engine/test/transcript.test.ts`** — the same comparison wired into the suite so parity cannot regress silently between sessions.

**The normalizer has tests of its own**, and they matter more than they look: it decides what "the same output" means, so one that discarded too much would make every transcript pass and the harness worthless. There is also a guard asserting a minimum number of compared turns, because a normalizer bug that emptied both sides would otherwise read as perfect parity.

This deliberately does not go through `verification/run-transcripts.sh`: that script drives a Z-machine story file and the engine is not one. Both sides compare against the same goldens, which is the only thing that has to be shared.

### Four defects the harness caught immediately

The first run reported 70%, with diffs legible enough to diagnose on sight.

1. **Object-tree insertion order was backwards — and this closes a long-standing open issue.** HANDOFF has carried "Kitchen object order (sack/bottle swapped) — decide for engine parity" since stage 0.2, framed as a question about which behavior to prefer. It was not a judgement call: the Z-machine builds its object tree with `insert_obj`, which **prepends**, so a container's children end up in reverse declaration order. The Kitchen lists the bottle before the sack and the Living Room the sword before the lantern, both the reverse of `1dungeon.zil`. Loading in document order produced plausible output — every object present, stable order, simply not the original's. `load.ts` now prepends, the same rule the runtime `move` already used; there is one insertion order in the object tree, not one for loading and another for play.
2. **Room action routines were never called with `M-ENTER`.** This is where Zork puts the consequences of arriving. Without it the Cellar is entered in silence — the trap door never slams shut, and the game becomes winnable in a way it should not be. It also runs **before** the description, not after: running it later still prints every word, in an order that reads as though the door closed on the way out.
3. **A spurious engine fallback message.** Dispatch printed "You can't do that." whenever the verb default returned false, but a `V-*` routine that returns false has usually already printed its own refusal — so the engine appended a second, contradictory sentence. It surfaced as a stray line after a perfectly good LOOK.
4. **A harness bug, not an engine bug.** `quit` produces no status line, so its output lands inside the previous turn's block, making the last real turn of every walkthrough appear to print the score summary. Worth recording because the fix belonged in the normalizer: had it been "fixed" in the engine, the engine would have grown code to emit interpreter dialogue it has no business emitting.

### Status

Stage 4.4 ✅ — exit criteria exceeded. The criterion was "first golden transcript replays with acceptable diff"; all three replay with **no** diff.

79 engine tests (11 new), IR 184/184, typecheck clean.

Next: stage 4.5 — daemons, scoring, save/load, death, and ⚑ **Gate C**. Note that Gate C's own criterion ("all golden transcripts pass") is already met on the current three; the remaining 4.5 work is the systems those three walkthroughs do not exercise, and the honest next step is **more walkthroughs** covering the thief, combat, the lamp countdown, and death — parity on three short transcripts is a real result but a narrow one.

---

## v0.6.4 — Engine Core: Wider Parity Coverage (Milestone 4, stage 4.5 in progress)

**Date:** 2026-07-20

### Why

v0.6.3 met Gate C's stated criterion — all golden transcripts passing — on three short walkthroughs that never touch the lamp, darkness, scoring, the trap door, or combat. Claiming the gate on that basis would have been true and misleading. This session tripled the corpus first.

### Three new walkthroughs, captured from the reference build

`04-lamp-and-darkness`, `05-troll-combat`, `06-scoring-and-treasure`, captured with `run-transcripts.sh capture` against the shipped Release 119 story file. The three existing goldens re-captured **byte-identical**, which is worth stating: the oracle is stable, so new diffs are the engine's, not the capture's.

Parity went 30/30 (3 walkthroughs) → **64/64 on strict walkthroughs, 82 turns total across 6**.

### Defects found

1. **The harness split turns on the wrong thing.** Turn boundaries were taken to be dfrotz's status line; they are the **`>` prompt**. dfrotz redraws the status line only when the move counter advances, and ZIL's meta-verbs (SCORE, DIAGNOSE, VERBOSE) deliberately do not consume a move. Every such command was therefore merged into its neighbour, shifting all later turns by one — which presents as a cascade of unrelated content diffs rather than as an off-by-one. Walkthroughs 01–03 parsed correctly only because none of them uses SCORE mid-sequence.
2. **`stripSessionEnd` was deleting real output.** It cut at the score summary, and `SCORE` prints a byte-identical summary to the one `quit` prints — so a mid-walkthrough SCORE had its entire output removed and then "matched" an engine that printed nothing. This is exactly the failure the normalizer's own module comment warns about: a comparison passing by construction. It now keys on the quit confirmation prompt, which is the thing that actually distinguishes them.
3. **A missing daemon routine destroyed every subsequent turn.** `I-SWORD` is catalogued rather than extracted, and CLOCKER threw on it every turn from the moment the sword was picked up — turning one cause into twelve reported failures and burying the turn where real divergence began. CLOCKER now disables such an interrupt after recording it, and the engine exposes `missingRoutines()` so the omission is reported once and loudly. Recovering from this alone took walkthrough 05 from 6/18 to 11/18.
4. **Door exits gave the generic refusal.** ZIL names the door — "The trap door is closed." — where the engine said "You can't go that way." The generic answer remains correct for a conditional exit, which has no object to name.
5. **"Not here" did not echo the player's words.** ZIL's NOT-HERE-PRINT answers "You can't see any trophy case here!"; the engine answered generically. The generic form is what ZIL prints only when it has no noun to quote.
6. **Entering an unlit room was not announced.** GOTO prints "You have moved into a dark place." before the M-ENTER call, so the player learns they have stepped into the dark before the room's arrival effects speak.

### A limit of the method, made explicit

Walkthrough 05 cannot reach turn-for-turn parity, for two reasons that are worth keeping distinct:

- **`I-SWORD` is catalogued, not extracted** (`unknown form <NEXTP …>`). It walks the room's exits as *numbered Z-machine properties* to decide whether a villain is near — precisely the memory layout the IR abstracts away. The extractor cannot translate that mechanically, and expressing its semantics over the IR's structured exits is an **IR** decision, not an engine one. Implementing it in `engine/` would violate ADR 0002's rule that no game-specific identifier appears there.
- **Combat output is chosen by random draw**, and the engine's seeded generator is not the Z-machine's. Identical seeds produce different sequences, so these turns can never match text-for-text unless the engine reproduces frotz's generator exactly. That is an open architectural question, not a defect.

Rather than delete the walkthrough (hiding the limitation) or leave it failing (training everyone to ignore a red harness), walkthroughs may now declare `# parity: informational` with a reason. Such a walkthrough is still run and still reported — as `INFO`, with its reason printed — but does not fail the suite. The summary reports strict and overall figures separately, and a test asserts the strict set stays the large majority, so parity cannot be "achieved" by marking everything informational.

**"Cannot verify" and "fails to verify" are different states, and the harness now says which is which.**

### Status

83 engine tests (4 new), IR 184/184, typecheck clean. **64/64 strict turns (100%), 75/82 overall (91%).**

Stage 4.5 remains open: daemons beyond the clock, death and resurrection, save/load verbs, and the P-WON demon-region gating. Gate C should not be declared until the RNG question is answered, since combat is a substantial part of Zork I's behavior and is currently unverifiable by this method.

---

## v0.6.5 — Engine Core: Multiple Objects, Wider Corpus (Milestone 4, stage 4.5 continued)

**Date:** 2026-07-20

### Result

**104/104 strict turns across 8 walkthroughs — 100%.** 115/122 overall including the informational one. 89 engine tests, IR 184/184.

Three more walkthroughs: `07-forest-and-tree` (climbing, the egg, nested scoring), `08-containers` (bottle/sack manipulation), `09-take-all-surface` (multiple objects, surfaces, refusals).

### `TAKE ALL` — ZIL's MANY search option

Deferred in 4.3 as "constrains the action, not where to look". Implemented here, and almost every detail was settled by **asking the reference build rather than reasoning about it**:

- **`ALL` is a BUZZ word**, so it must be recognised *before* buzzword filtering — otherwise "TAKE ALL" reduces to a bare "TAKE" with no object and is rejected as ungrammatical.
- **"All" ranges over the room's loose objects, things on a *surface* in the room, and what the player holds.** The surface case is not obvious: "TAKE ALL" in the Kitchen takes the bottle and sack, both sitting *on the table*, so "direct children of the room" is too narrow. But it does **not** take the water inside the bottle, though the bottle is transparent and the water plainly in scope — so "everything visible" is too broad. A surface is furniture; its contents read as being in the room. An ordinary container's contents come along inside it.
- **`TRYTAKEBIT` widens the slot's find flag.** "TAKE ALL" in the Living Room answers for the rug and the trophy case as well — "The rug is extremely heavy and cannot be carried." — because ZIL includes objects flagged "try to take me and I will explain why not" and lets their action routines refuse. The wooden door, carrying neither TAKEBIT nor TRYTAKEBIT, is silently absent. Filtering these out would have replaced six answers with four, and each missing one is gameplay.
- Each result is prefixed with the object's name (`brown sack: Taken.`) so several answers stay attributable. A single object gets no prefix.

### Two defects in existing code

1. **`flush` was trimming trailing spaces**, which is wrong for any flush that happens *mid-sentence*. "TAKE ALL" prints "brown sack: ", then dispatches; dispatch emits an `object-moved` event, which flushes; the trailing space vanished and the transcript read `brown sack:Taken.`
2. **`run-transcripts.sh` fed `#` directive lines to dfrotz as commands.** Introduced by the `# parity:` directive added in v0.6.4 — the capture script had no reason to expect comments in a `.cmd` file, and silently corrupted walkthrough 05's golden (0/18 until noticed). The script now strips comments and blank lines before piping to dfrotz.

### A source/transcript conflict, resolved in favour of the transcript

HANDOFF has listed **P-WON demon-region gating** as 4.5 work since stage 3.5. The source reads unambiguously: `<COND (,P-WON <COND (<VERB? TELL BRIEF … SCORE …> T) (T <SET V <CLOCKER>>)>)>` — meta-verbs cost no time, so SCORE should not advance the move counter.

Implementing it broke walkthrough 06. The golden has SCORE advancing MOVES from 11 to 12.

The trap is that **dfrotz redraws the status line only when it changes**, so a SCORE turn shows no status line at all — which reads as "no move was consumed" and actually means "the counter had not changed *yet* at that prompt". The second SCORE printing "in 13 moves" is what settles it: the clock ran.

Per HANDOFF (stage 0.2), the shipped Release 119 story file is the ground truth, not the ZILF-reconstructed source in `original-projects/`. So the transcript wins and the gating is *not* implemented. The reasoning is recorded in a comment at the call site, because the source reads the other way and the next person to notice will otherwise "fix" it back.

### Status

Stage 4.5 substantially advanced. Remaining: death and resurrection, the thief's robbery pass, and combat — all three gated on the RNG decision, which remains the one thing standing between the project and an honest Gate C.

---

## v0.6.6 — Engine Core: Orphan Questions, Pronouns, Compound Sentences (Milestone 4, stage 4.6)

**Date:** 2026-07-20

### Result

Walkthrough `11-parser-edges` replays with zero diff. 99 engine tests, IR 184/184.

The session began by auditing an interrupted one. The working tree held no modified files — only two uncaptured walkthrough/golden pairs. Walkthrough 10 was a **bad capture** (it never reached the dam, dying to the troll at turn 19, so every diff in it was combat noise); walkthrough 11 was a clean spec for four real parser gaps.

### The four gaps

- **Compound sentences.** One line may hold several commands, each its own turn: "TAKE THE LEAFLET AND READ IT" costs two moves, "TAKE LEAFLET AND MAILBOX" costs one. The only discriminator is whether a **verb follows the AND**.
- **Orphan questions.** ZIL asks for a missing object instead of refusing the verb, and the next input answers it. This makes the parser stateful across turns — a new `ParserMemory` on `GameState`, which nothing else in the engine needed. An orphan is abandoned when the next input starts its own sentence.
- **Implicit objects.** A slot with a `find` flag and exactly one in-scope candidate is filled and echoed: `(leaflet)`.
- **HAVE slots** report their own requirement ("You don't have that!") rather than the surroundings ("You can't see any sword here!").

### Every detail came from the reference build

The ZIL reads plausibly several ways on all four. Two first attempts were wrong and dfrotz caught both:

- **Auto-supply must ignore the slot's *location* options.** TAKE searches ON-GROUND/IN-ROOM, yet bare TAKE answers for a leaflet *in your hand*. The first version re-parsed the completed sentence and had it rejected by the very rule that produced it. The command is now built directly: the find flag decides what was meant, and where it sits is the action's problem.
- **The orphan must not pick the most-specific rule**, though the main parse loop must. Bare PUT would land on `PUT DOWN …` and ask "What do you want to put down?" when the reference asks "What do you want to put?". A slot introduced by a preposition cannot be what the player left out.
- A third correction: the no-antecedent message, which had been invented rather than checked, is **"I don't see what you are referring to."**

Detail the golden pins down: the orphan question echoes the player's own **six-character-truncated** words — "What do you want to put the mailbo in?", not "the small mailbox".

### Two process failures worth remembering

1. **A new test passed for the wrong reason.** `setFlag(state, "LEAFLET", …)` silently invents a phantom entity — the leaflet's id is `ADVERTISEMENT`. The assertion then "passed" against an object that does not exist in the world. Only a sibling test failing exposed it; the file was then swept and every other id verified real.
2. **The first property-default fix was wrong.** Bare WAKE supplies the player and V-ALARM reads its STRENGTH, which `ME` does not declare, so arithmetic threw — a pre-existing defect this change merely made reachable. Defaulting *every* absent property to 0, as `GETP` does, **breaks ten of eleven walkthroughs**: `truthy()` counts 0 as true here, so the `false` sentinel is load-bearing and distinguishes absent from zero. `strength` was added to the existing stopgap table instead.

### Status

Left unimplemented deliberately: in West of House, where the mailbox is the room's only object, the reference resolves "READ IT" *to the mailbox* rather than refusing. Whether that is a one-candidate fallback is unverified, so we refuse in both rooms and the divergence is recorded at the call site. Multi-object lists beyond `ALL` remain unimplemented.

---

## v0.6.7 — Engine Core: Per-Turn Parity Directives, Walkthrough 10 Re-Captured (Milestone 4, stage 4.6)

**Date:** 2026-07-20

### Result

**117/117 strict turns — 100%.** 138/163 overall. 103 engine tests, IR 184/184.

### Walkthrough 10, re-captured

The old capture never reached the dam. The new one is the real sequence — bubble, yellow button, bolt, sluice gates open and water pours through. The yellow button was not guessed: the reference refused the bolt with "The bolt won't turn with your best effort." until the button was pressed.

**It is informational, for a reason that expires.** The dam sits behind the Troll Room, which the IR's exit graph shows is a **cut vertex** — no route to the dam avoids it, and no non-combat way past exists (giving the sword, throwing it, and talking were all tried against the reference; he throws it back and keeps blocking). The engine cannot resolve combat *outcomes*, so the troll never dies and all 18 remaining strict turns cascade from that one cause.

Unlike walkthrough 05 this is **"fails to verify", not "cannot verify"** — a missing subsystem, not a limit of the method. The capture is correct and complete: **deleting one `# parity:` line when villain combat lands makes it verify the dam strictly.**

### Per-turn parity directives

`# informational: <reason>` scopes to the commands after it until `# strict:`. Whole-file informational was too blunt for a walkthrough that must *pass through* something unverifiable to reach what it tests — even once combat exists, the four fight turns are a random draw and can never match text-for-text, while everything around them can.

Quarantined turns leave the strict count in **both** numerator and denominator, so a quarantine cannot inflate the ratio.

### The strict-majority guard was rewritten, not relaxed

It allowed one informational file out of however many, and a second tripped it. Bumping the number would have been the exact drift the guard exists to catch. It now counts **turns** (≥ 2/3 strict — no bumping needed when a walkthrough is added, and a long quarantine costs more than a short one) and additionally requires every opt-out to **carry a written reason**.

Also fixed: `# reason:` was swallowing the per-turn directives below it, turning the whole-file reason into an unreadable run-on.

### Status

Villain combat is now the top blocker for Gate C, and it has a waiting test in walkthrough 10.

---

## v0.6.8 — Documentation: HANDOFF Trimmed to Its Purpose

**Date:** 2026-07-20

### Changes

`HANDOFF.md` had grown to 482 lines, most of it a stack of nine "Prior Session" sections
reproducing material already in this file. Since it is read at the start of every session, that
cost was paid every time and bought nothing the WORKLOG did not already hold.

- **Removed all Prior/Earlier Session sections.** Each was verified present here first.
- **v0.5.17 was backfilled into this file before deleting it** — it had been recorded in HANDOFF
  and never in the WORKLOG, so HANDOFF was its only copy. It now sits between v0.5.16 and
  v0.5.18.
- **Added a scope rule at the top of HANDOFF**: only what the next session needs; completed
  narrative goes to the WORKLOG; do not accumulate a Prior Session stack. The absence of that
  rule is why the file drifted.
- **Added a Standing Notes section** collecting the hard-won rules that outlive any one session
  and were previously buried in session narrative — Release 119 as ground truth, asking the
  reference build rather than reasoning about the ZIL, the "cannot verify" / "fails to verify"
  distinction, cascades having one cause, and `setFlag` on an unknown id inventing a phantom
  entity.
- **Stale content corrected**, not just moved: Next Actions still claimed "Gate C's criterion is
  already met on the current three transcripts" (there are now eleven walkthroughs), still
  described stage 4.5 as in progress, and still listed the three completed M3 gaps as pending
  items.
- Open Issues split into Engine/IR and Project/M5; `engine/harness/` and `verification/` added
  to Key Paths.

482 → 187 lines. No engine, IR, or artifact changes.

### Status

M4 stages 4.1–4.6 complete. Villain combat is the top blocker for Gate C and has a waiting test
in walkthrough 10.

---

## v0.7.0 — Villain Combat: `RANDOM` in the IR, and Membership Verification

**Date:** 2026-07-20

### Changes

**The blocker was extraction, not the engine.** Villain combat had been recorded as an engine
gap, but `HERO-BLOW` was in the behavior catalog with a single reason: `operator RANDOM`. Because
extraction is reachability-driven from entry refs, its failure meant nothing it called was ever
queued — so `VILLAIN-BLOW`, `VILLAIN-STRENGTH`, `VILLAIN-RESULT`, `WINNER-RESULT` and `REMARK`
were absent from the IR *and* from the catalog, invisible as either successes or failures.

- **IR schema 0.14.0 — the `random` expression op** (`<RANDOM n>`, a uniform draw in 1..n). The
  op names the *draw*; which sequence a seed produces stays an engine concern, so the IR is not
  pinned to any interpreter's PRNG. `RANDOM` left `DENIED_OPERATORS`; the engine evaluates it
  through `ctx.rng`, which already round-trips through the save contract.
- **`RANDOM` in statement position is denied deliberately**, with an accurate reason. There its
  value is discarded, which on the Z-machine means a non-positive operand *seeds* the generator
  rather than drawing (`V-RANDOM`, the `#RND` debug verb). Seeding is a different operation and
  does not lower to `random`.
- **`PRINT` and `PRINTD` extract as `tell` parts**, unblocking `REMARK` — which became reachable,
  and therefore catalogued, only once `RANDOM` landed. Both map onto existing shapes: `PRINT`
  stringifies a value like a bare TELL token, `PRINTD` is exactly TELL's `D`. `PRINTB` and
  `PRINC` stay denied as Z-machine address plumbing.
- **Melee result-table corrections (`DEF1-RES`, `DEF2-RES`, `DEF3-RES`).** The ZILF reconstruction
  declares these with literal zeros in every slot that should hold a table view, parking the real
  value in a comment (`0 ;<REST ,DEF1 2>`). `HERO-BLOW` indexes them by attack strength and then
  draws from the row it gets, so the views are what make a stronger blow skip the leading MISSED
  entries; taken literally the zeros make that second GET read address 0. The shipped Release 119
  build plainly does not read garbage — fought under dfrotz it lands a knockout and then a kill —
  so the corrections restore the views the comments describe. Encoded as data with the evidence
  at the site, not by parsing comments out of the source.
- **Engine**: `HERO-BLOW` and `RANDOMIZE-OBJECTS` stubs removed. Routines take precedence over
  builtins, so the stubs were dead code shadowed at every call site. `V-CLIMB-UP` remains (GETPT).

**Verification of randomized turns: membership, not text parity** (the RNG question in HANDOFF,
resolved to option (b)). Combat draws randomly and the engine's generator is not frotz's, so
fight text cannot be diffed against a golden. `engine/test/combat.test.ts` instead asserts that
every line printed during a fight is a message the game *could* have produced, over 40 seeds.
The legal set is derived from the IR — melee message rows plus the literal TELL text of the
combat routines — never hand-listed, since a hand-kept list would drift and start passing by
construction. A negative control asserts the check rejects a corrupted message, a leaked table
id, and a marker printed as its raw number; it caught a real weakness in the name wildcard while
being written, which is why entity names must now begin with a letter.

### Results

- **Walkthrough 10 went from stuck-at-turn-13 to 24/28.** The troll dies, the carcass message
  fires, the axe drops, and the dam sequence is reached and matches.
- Overall parity **138/163 → 151/163 (93%)**; strict walkthroughs **117/117 (100%)**.
- Engine tests **103 → 108**; IR **184/184**. Routines extracted **346 → 352**, catalogued
  complex **32 → 30**.
- **Walkthrough 10's remaining four diffs are all `I-SWORD`**, not combat. Its `# parity:`
  directive was rewritten to name the real cause rather than left asserting a fixed problem.

### Status

M4 stages 4.1–4.6 complete, combat outcomes landed. `I-SWORD` is now the single blocker on
walkthrough 10 and needs an IR answer (`<NEXTP …>`), not an engine one.
