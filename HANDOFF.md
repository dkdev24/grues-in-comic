# HANDOFF.md

Cross-session context memory. Update this file at the end of every session.

---

## Current Version

**0.5.6**

---

## Project Status

Project renamed from **Comic-Zork** to **Grues in Comic** (trademark-safe: "grue" predates Zork and is not an Activision trademark). GitHub repo renamed to `dkdev24/grues-in-comic`. Historical source code imported for both reference projects:

- `original-projects/zork1/` — ZIL source for Zork I
- `original-projects/comic-chat/` — Microsoft Comic Chat (v1.0, v2.1b, v2.5-beta-1, v2.5-beta-1-modern)

**Milestone 1 complete**: `importer/` (TypeScript) contains the deterministic ZIL S-expression parser, validated against the full corpus, with committed AST artifacts and statistics (`importer/artifacts/`). **Milestone 2 in progress**: `ir/` (TypeScript) holds the IR schema + validator; declarative-world subset (stage 2.1) is defined and sample-validated. Behavior representation decided (stage 2.2, ADR 0001): structured behavior AST interpreted by the engine, with a builtin layer for generic ZIL utilities. Engine runtime decided (stage 2.3, ADR 0002, **⚑ Gate B resolved**): TypeScript, WASM dropped; engine↔UI JSON event contract fixed interface-first. **Milestone 2 complete** (stage 2.4 / ⚑ Gate A: Graphify adopted with per-module graphs; OpenWiki **not adopted** — no budget, `wiki/` hand-authored). **Milestone 3 (Semantic Extraction ZIL→IR) in progress**: stages 3.1–3.4 complete — all 110 Zork I rooms/exits, all 137 objects, the full parser vocabulary (267 syntax rules) in `ir/artifacts/`. Stage 3.5 (complex behavior) in progress: batches a (property/table access), c (opt-param defaults, SET-as-expression), arithmetic, and b (loops + object-tree iteration) done — **247 routines extracted, 88 catalogued, 94/292 refs unresolved**; IR schema at 0.6.0. Next: batch e (compile-time MacroEval + quoted COND clauses) or d (daemons/timers). No engine or browser runtime started (Milestone 4).

---

## Last Session

- **Stage 3.5 batch (b) complete — loops + object-tree iteration** (v0.5.6):
  - **IR schema 0.6.0**: stmts `loop` (REPEAT), `block` (PROG — runs once, yields last value), `break`, `continue` (AGAIN); exprs `first`/`next`. Exact ZIL activation semantics: RETURN inside REPEAT/PROG → `break`, outside → routine `return`; RTRUE/RFALSE always routine returns; validator statically rejects break/continue outside a container. POC world grew ordered child lists (`move` inserts FIRST, Z-machine `insert_obj`)
  - **228 → 247 routines, catalog 104 → 88, unresolved 110 → 94.** Unlocked: V-OPEN, V-INVENTORY, V-WAIT, ROB, OTVAL-FROB (first `defaults` user), TOUCH-ALL, WEIGHT, FIND-WEAPON, DESCRIBE-OBJECTS, MACHINE-F, and more. Newly catalogued call targets: CLOCKER (batch d), PRINT-CONT
  - **Historical quirk preserved**: OTVAL-FROB discards its recursive call's value (nested treasure never scores) — extraction is faithful, test asserts the quirk
  - **Diagnosed the "COND clause is not a list" cluster** (15 routines: V-PRAY, V-LOOK-INSIDE, PRE-PUT, …): compile-time `%<COND (ZORK-NUMBER gate)>` yielding quoted clauses — batch (e) reuses the stage 3.3 gate-resolution machinery (ZORK-NUMBER=1)
  - I-THIEF is neither extracted nor catalogued: QUEUE passes routines by name (lowered to name strings), so daemons enter the worklist only when batch (d) wires QUEUE targets in
  - 89 tests pass (12 new: loop semantics, sibling-order tree ops, corpus routines FIND-WEAPON/OTVAL-FROB/TOUCH-ALL run by the interpreter over mini worlds); typecheck + validate clean; graphify regenerated

---

## Next Actions

Follow `docs/DEVELOPMENT_PLAN.md` (Session Protocol section). **Milestone 3 continues** (Semantic Extraction ZIL→IR, v0.5.x):

1. Stage 3.5 continues — 88 routines still catalogued. **Batch (e) next: compile-time macro evaluation** — the dominant cluster (16 MacroEval + 15 quoted-COND-clause + 8 Chtype first-blockers ≈ 31 routines: V-PRAY, V-LOOK-INSIDE, PRE-PUT, CRETIN-FCN, …). Reuse the stage 3.3 `<COND (<==? ,ZORK-NUMBER n> …)>` gate resolution (ZORK-NUMBER=1) to expand `%<COND …>` in clause/statement position and unquote the selected form; deny non-ZORK-NUMBER macros. Then (d) daemons/timers: QUEUE/INT machinery — decide engine-daemon protocol, wire QUEUE name-string targets (I-THIEF, I-LANTERN, I-CANDLES, …) into the worklist. Each batch: ADR governance (schema+validator+interpreter+appendix), re-extract to surface next blockers (reasons are first-blocker only), cross-check against goldens. Remaining deliberate non-extractions (engine builtins): PICK-ONE, V-SCRIPT/V-UNSCRIPT, PRE-FILL, SAVE/RESTORE/QUIT, ,ROOMS/,GLOBAL-OBJECTS scope iteration, GETPT/PTSIZE, DIROUT/DIRIN, RFATAL — end state is a deliberate builtin list, not an empty catalog
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
