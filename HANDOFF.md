# HANDOFF.md

Cross-session context memory. Update this file at the end of every session.

---

## Current Version

**0.5.5**

---

## Project Status

Project renamed from **Comic-Zork** to **Grues in Comic** (trademark-safe: "grue" predates Zork and is not an Activision trademark). GitHub repo renamed to `dkdev24/grues-in-comic`. Historical source code imported for both reference projects:

- `original-projects/zork1/` — ZIL source for Zork I
- `original-projects/comic-chat/` — Microsoft Comic Chat (v1.0, v2.1b, v2.5-beta-1, v2.5-beta-1-modern)

**Milestone 1 complete**: `importer/` (TypeScript) contains the deterministic ZIL S-expression parser, validated against the full corpus, with committed AST artifacts and statistics (`importer/artifacts/`). **Milestone 2 in progress**: `ir/` (TypeScript) holds the IR schema + validator; declarative-world subset (stage 2.1) is defined and sample-validated. Behavior representation decided (stage 2.2, ADR 0001): structured behavior AST interpreted by the engine, with a builtin layer for generic ZIL utilities. Engine runtime decided (stage 2.3, ADR 0002, **⚑ Gate B resolved**): TypeScript, WASM dropped; engine↔UI JSON event contract fixed interface-first. **Milestone 2 complete** (stage 2.4 / ⚑ Gate A: Graphify adopted with per-module graphs; OpenWiki **not adopted** — no budget, `wiki/` hand-authored). **Milestone 3 (Semantic Extraction ZIL→IR) in progress**: stages 3.1–3.4 complete — all 110 Zork I rooms/exits, all 137 objects, the full parser vocabulary (267 syntax rules) in `ir/artifacts/`. Stage 3.5 (complex behavior) in progress: batches a (property/table access) + c (opt-param defaults, SET-as-expression) + arithmetic done — **228 routines extracted, 104 catalogued, 110/292 refs unresolved**; IR schema at 0.5.0. Next: batch b (loops/iteration — the dominant blocker). No engine or browser runtime started (Milestone 4).

---

## Last Session

- **Stage 3.5 batches a+c complete — complex behavior extraction begins** (v0.5.5):
  - **IR schema 0.5.0** (ADR 0001 appendix logs the growth): exprs `prop` (GETP), `table-get` (GET), `add`/`sub`/`mul`/`div` (16-bit signed; n-ary → left folds, unary `-` → `0 − x`), expression-position `set-local`/`set-global`; stmts `set-prop` (PUTP, yields entity), `table-set` (PUT, yields table); routine `defaults` (OPT defaults, arity-based like Z-code; `<>` lowered away). Property keys are IR field names via closed `BEHAVIOR_PROPERTY_KEYS` (`P?LDESC` → `description`, …, 11 corpus properties); absent props read false; LTABLE index 0 = element count
  - **213 → 228 routines, catalog 113 → 104, unresolved refs 117 → 110**. Unlocked: BAD-EGG, CHALICE-FCN, LARGE-BAG-F, PAINTING-FCN, TREASURE-ROOM-FCN, V-EXAMINE, V-READ (a); BASKET-F, CAVE2-ROOM, SCORE-OBJ, V-CLOSE, V-STAB (c); LIVING-ROOM-FCN, MATCH-FUNCTION, V-PUT (arith). New loop-blocked worklist targets catalogued: THIEF-IN-TREASURE, FIND-WEAPON, SCORE-UPD, OTVAL-FROB, TOUCH-ALL, WEIGHT
  - **Key learning: catalog reasons are first-blocker only** (all-or-nothing deny throws at first unsupported construct) — batch sizes are discovered by re-extracting after each vocabulary growth (V-OPEN: GETP → FIRST?). Deliberately still denied: GETPT/PTSIZE (PRE-FILL's Z-machine property-table scan), bit ops (V-SCRIPT's Z-header poke), RANDOM (builtin, replay determinism), MacroEval, loops
  - **Verified**: interpreter-executed extracted V-READ reproduces the leaflet passage of `verification/golden/01-west-of-house.txt` (wrapping normalized); op unit semantics (±32768 wraparound, ltable length slot, arity-based defaults vs explicit false); 77 tests pass (12 new); typecheck + validate clean; ir graphify regenerated

---

## Next Actions

Follow `docs/DEVELOPMENT_PLAN.md` (Session Protocol section). **Milestone 3 continues** (Semantic Extraction ZIL→IR, v0.5.x):

1. Stage 3.5 continues — 104 routines still catalogued. **Batch (b) next: loops + object-tree iteration (REPEAT/PROG/FIRST?/NEXT?)** — the dominant blocker (15 FIRST?, 5 REPEAT first-blockers, incl. all 15 former opt-default routines like OTVAL-FROB/ROB/ROBBER-FUNCTION and the batch-a leftovers V-OPEN/THIEF-IN-TREASURE). Then (d) daemons/timers (QUEUE/INT machinery), (e) MacroEval bodies (PERFORM, LOUD-ROOM) + COND-clause forms (13). Each batch: extend vocabulary per ADR governance (schema+validator+interpreter+appendix), re-extract to surface next blockers (reasons are first-blocker only), cross-check against golden transcripts. Note some catalogued routines should NEVER extract (engine builtins: PICK-ONE, V-SCRIPT/V-UNSCRIPT, PRE-FILL, SAVE/RESTORE/QUIT meta verbs) — end state is a deliberate builtin list, not an empty catalog
2. Stage 5.1 (Comic Chat analysis) remains the sanctioned filler stage
3. After 3.5: Milestone 4 (engine core) can start walking the map from the IR

**Milestone 0 is complete** (stages 0.1–0.3 all ☑):

- **0.1 toolchain**: ZILF/ZAPF 0.11.1 at `~/.local/opt/zilf-0.11.1-osx-arm64` (symlinked into `~/.local/bin`), frotz 2.55 via Homebrew. `verification/build.sh` compiles the untouched historical source out-of-tree to `verification/build/zork1.z3` (86,696 bytes, only tab-printing warnings)
- **0.2 harness**: `verification/run-transcripts.sh` (check/capture modes, `STORY=` override) runs `verification/walkthroughs/*.cmd` under `dfrotz -m -p -s 1234` against the shipped `COMPILED/zork1.z3` and diffs against `verification/golden/*.txt`. Three goldens captured (west-of-house, house-entry, cellar-descent), deterministic across runs. **ZILF build vs. shipped build: identical except banner (Release 0/current date vs. 119/880429) and Kitchen object-listing order (sack/bottle swapped)** — historical source is behaviorally faithful; the `STORY=` override is the future engine-parity entry point (stage 4.4)
- **0.3 hygiene**: comic-chat binaries kept (faithful import), Gemini doc truncation annotated, pipeline description consolidated into `docs/AI_KNOWLEDGE_INFRASTRUCTURE_DECISION.md` (AGENTS.md and PORTING_STRATEGY.md now point there), Open Issues pruned

---

## Open Issues

- Neutral (non-IF-lore) branding for the commercial assets (engine, IR, importer) still open — "Grues in Comic" names the game/project
- Kitchen object-listing order differs between the ZILF build and the shipped Release 119 build (sack/bottle swapped) — harmless for now, but decide which ordering the engine must reproduce when stage 4.4 parity work starts

Resolved 2026-07-18 (v0.5.2): **OpenWiki not adopted** — in-repo validation showed the free `openrouter/free` router returns null completions on repo-scale prompts (empty wiki, silent "success"), and a pinned free model (`nvidia/nemotron-3-ultra-550b-a55b:free`) aborts on OpenRouter's 16 req/min free-tier limit (OpenWiki v0.2.0 has no backoff); reliable runs need a paid model and this side project has no budget at present. `wiki/` stays hand-authored; all OpenWiki scaffolding removed from the repo; decision doc, AGENTS.md, and DEVELOPMENT_PLAN Gate A note updated. Revisit only if budget appears or OpenWiki gains rate-limit backoff. Note: Daniel's *global* `~/.openwiki/` config (whatifclassics ingestion source, 02:00 launchd job, 01:58 pmset wake schedule, API keys) is outside this repo and was left untouched.

Resolved 2026-07-18 (stage 2.3): engine implementation language — TypeScript per ADR 0002 (⚑ Gate B); PORTING_STRATEGY.md and AGENTS.md updated, WASM assumption removed (IR independence lists still name WASM deliberately — independence survives non-use).

Resolved 2026-07-18 (stage 0.3): comic-chat compiled binaries stay tracked — they are part of the faithful upstream historical import (4.1 MB, `.gitignore` is irrelevant for already-tracked files); Gemini doc dangling `4.` annotated as unrecoverable truncation; pipeline description consolidated — `docs/AI_KNOWLEDGE_INFRASTRUCTURE_DECISION.md` is canonical, AGENTS.md and PORTING_STRATEGY.md now reference it. Graphify/OpenWiki validation and empty `wiki`/`graph` dirs are tracked by plan stage 2.4, IR schema by Milestone 2 — no longer open issues here.

---

## Key Paths

| Path | Purpose |
|---|---|
| `importer/` | ZIL Semantic Importer — parser, tests, committed AST artifacts (`artifacts/`) |
| `ir/` | IR schema (`src/schema.ts`), validator, hand-written samples, ZIL→IR extraction (`src/extract-world.ts` → `artifacts/zork1.world.json`); spec in `docs/IR_SCHEMA.md` |
| `original-projects/zork1/` | ZIL source reference |
| `original-projects/comic-chat/` | Comic Chat source reference |
| `docs/` | Project documentation |
| `wiki/` | Semantic architecture notes (hand-authored; OpenWiki not adopted) |
| `<module>/graphify-out/` | Graphify structural graphs per module (`importer/`, `ir/`); config in `.graphifyignore` |
| `CHANGELOG.md` | Public-facing changelog (milestone-level, Keep a Changelog format) |
| `WORKLOG.md` | Persistent project history |
| `AGENTS.md` | Agent workflow rules (single source for all agents) |
| `CLAUDE.md` | Claude Code entry point — references `AGENTS.md` |
| `project-init-skill-installation.md` | Instructions for installing the `project-init` skill on other devices |
