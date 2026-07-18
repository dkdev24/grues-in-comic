# HANDOFF.md

Cross-session context memory. Update this file at the end of every session.

---

## Current Version

**0.5.4**

---

## Project Status

Project renamed from **Comic-Zork** to **Grues in Comic** (trademark-safe: "grue" predates Zork and is not an Activision trademark). GitHub repo renamed to `dkdev24/grues-in-comic`. Historical source code imported for both reference projects:

- `original-projects/zork1/` — ZIL source for Zork I
- `original-projects/comic-chat/` — Microsoft Comic Chat (v1.0, v2.1b, v2.5-beta-1, v2.5-beta-1-modern)

**Milestone 1 complete**: `importer/` (TypeScript) contains the deterministic ZIL S-expression parser, validated against the full corpus, with committed AST artifacts and statistics (`importer/artifacts/`). **Milestone 2 in progress**: `ir/` (TypeScript) holds the IR schema + validator; declarative-world subset (stage 2.1) is defined and sample-validated. Behavior representation decided (stage 2.2, ADR 0001): structured behavior AST interpreted by the engine, with a builtin layer for generic ZIL utilities. Engine runtime decided (stage 2.3, ADR 0002, **⚑ Gate B resolved**): TypeScript, WASM dropped; engine↔UI JSON event contract fixed interface-first. **Milestone 2 complete** (stage 2.4 / ⚑ Gate A: Graphify adopted with per-module graphs; OpenWiki **not adopted** — no budget, `wiki/` hand-authored). **Milestone 3 (Semantic Extraction ZIL→IR) in progress**: stages 3.1–3.4 complete — all 110 Zork I rooms/exits, all 137 objects, the full parser vocabulary (267 syntax rules), and batch-1 behavior (213 routines in the ADR 0001 AST, 197/292 referenced handlers = 67%; 113 complex routines catalogued with reasons) in `ir/artifacts/`; IR schema at 0.4.0. No engine or browser runtime started (Milestone 4).

---

## Last Session

- **Stage 3.4 complete (batch 1) — behavior extraction begins** (v0.5.4):
  - **IR schema 0.4.0**: optional `routines` section = ADR 0001 behavior AST. Vocabulary grew (ADR appendix logs it): exprs `in?`/`loc`/`call`, stmts `set-local`/`move`/`remove`/`value`, TELL `{name}` (ZIL D), routine `locals`. **Implicit-return question resolved**: expression-oriented semantics (routine returns last executed statement's value; POC interpreter + hand-transpiled variant updated to match ZIL)
  - **Deterministic transformer** (`ir/src/extract-behavior.ts`): all-or-nothing per routine, worklist closure over call targets from the 292 world refs → **213 routines extracted, 197/292 handlers (67%)**; 113 catalogued in `ir/artifacts/zork1.behavior-catalog.json` with exact reasons (top: optional-param defaults 14, MacroEval 14, non-list COND clauses 11, GETP 8, SET-as-expression 8, FIRST?/REPEAT loops). Deterministic lowerings: `,P?DIR`→direction word, `,V?VERB`→verb word, numeric CONSTANTs→literals, bare routine atoms→name strings, ELSE→T. DEFMAC macros (ENABLE/PROB/FLAMING?/…) and macro-gated PERFORM are call targets for the engine-builtin layer
  - Globals grew to 45 + 10 tables (table-valued globals referenced by behavior become Table entities); flags 31; validator enforces the closed op vocabulary and reports `unresolvedRoutineRefs` (117 = future builtins + catalogued)
  - **Verified**: extracted TRAP-DOOR-EXIT and KITCHEN-WINDOW-F are structurally identical to the stage 2.2 hand-written POC ASTs; differential execution through the reference interpreter matches the POC goldens. 65 tests pass
- **Stage 3.3 complete — parser vocabulary extracted** (v0.5.3):
  - **IR schema 0.3.0** (additive): optional `vocabulary` section — `directions` (word → IR direction), `buzzwords` (incl. punctuation tokens), `synonyms` (word ← aliases), `syntax` rules (`verb`, 0–2 object slots with `preposition?`/`find?`/`options?`, `action`, `preAction?`); search options are a validated enum (HELD/CARRIED/IN-ROOM/ON-GROUND/MANY/HAVE/TAKE), `find` flags validated against the registry
  - Extraction from `gsyntax.zil` AST: **267 syntax rules, 75 synonym sets, 21 buzzwords, 13 directions**; ZIL compile-time `<COND (<==? ,ZORK-NUMBER n> …)>` gates resolved exactly (ZORK-NUMBER=1 from zork1.zil SETG): the `N==? 3` GIVE→HAND synonym is in, Zork II/III clauses (FROTZ/OZMOO buzzwords, short ATTACK/KILL rules) are out; COND expansion feeds all extraction passes
  - Verified: independent jq mirror of all 267 SYNTAX parses and 74 top-level SYNONYMs diffs clean; RMUNGBIT (from FIND) added to registry (29 flags); routine refs now 292 (V-*/PRE-* included — the stage 3.4 worklist)
  - 4 new tests (60 total pass); validator + CLIs report syntax-rule counts
- **OpenWiki decision finalized: not adopted** (v0.5.2): Daniel initialized OpenWiki in-repo; verification showed the free-tier LLM path cannot work (null completions from the `openrouter/free` router; pinned free model killed by the 16 req/min limit mid-run) and paid models are off the table for now (no budget). Repo scaffolding removed (`openwiki/`, `.github/workflows/openwiki-update.yml`, AGENTS.md snippet), CLAUDE.md deduplicated to `@AGENTS.md` only, decision recorded in `AI_KNOWLEDGE_INFRASTRUCTURE_DECISION.md` / AGENTS.md / DEVELOPMENT_PLAN / Open Issues (resolved)
- **Stage 3.2 complete — all objects extracted** (v0.5.1):
  - `extract-world.ts` extended to full object extraction: **137 objects** (140 OBJECT forms minus the 3 ZIL scaffolding objects GLOBAL-OBJECTS/LOCAL-GLOBALS/ROOMS, which the IR represents structurally) — properties, flags, containment, initial locations (73 room / 20 object / 20 local-globals / 14 global / 10 nowhere); 132 routine refs, 28 flags in registry
  - **IR schema 0.1.0 → 0.2.0** (additive, `docs/IR_SCHEMA.md` updated): location kind `"global"` (ZIL GLOBAL-OBJECTS — in scope everywhere, distinct from local-globals), `vehicleType` (VTYPE; boat → NONLANDBIT, validated against flag registry), `descriptionRoutine` (DESCFCN; bat). `(ACTION 0)` (ADVENTURER) maps to absent
  - **ZIL string semantics now applied to every extracted string** (`|` = hard newline, source wraps = space, indentation after hard newlines kept) — verified against golden transcripts (leaflet) and the hand-transcribed sample; this also corrected stage 3.1 room descriptions which had kept raw source line wraps
  - **Verified against source**: independent jq mirror of all 137 object records (including string decoding) diffs clean vs. the generated IR; MAILBOX/ADVERTISEMENT/KITCHEN-WINDOW byte-identical to the stage 2.1 hand transcription; INFLATED-BOAT spot-checked against raw ZIL
  - 5 new tests (56 total pass); validator knows the new fields
- Earlier same day: stage 3.1 (world model: 110 rooms/352 exits, connectivity verified 352/352, v0.5.0); stage 2.4 (⚑ Gate A resolved split, v0.4.3)

---

## Next Actions

Follow `docs/DEVELOPMENT_PLAN.md` (Session Protocol section). **Milestone 3 continues** (Semantic Extraction ZIL→IR, v0.5.x):

1. Stage 3.5 — **Complex behavior**: the 113 catalogued routines (`ir/artifacts/zork1.behavior-catalog.json` lists each with reasons). Natural batches by catalog reason: (a) property/table access (GETP/PUTP/GET/PUT — needs new AST ops), (b) loops + object-tree iteration (REPEAT/FIRST?/NEXT?), (c) optional-param defaults + SET-in-expression, (d) daemons/timers (QUEUE/INT machinery, thief/troll/lamp), (e) compile-time MacroEval bodies (PERFORM, LOUD-ROOM). Each batch: extend vocabulary per ADR governance (schema+validator+interpreter+appendix), behavioral specs cross-checked against golden transcripts
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
| `WORKLOG.md` | Persistent project history |
| `AGENTS.md` | Agent workflow rules (single source for all agents) |
| `CLAUDE.md` | Claude Code entry point — references `AGENTS.md` |
| `project-init-skill-installation.md` | Instructions for installing the `project-init` skill on other devices |
