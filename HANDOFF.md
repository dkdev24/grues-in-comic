# HANDOFF.md

Cross-session context memory. Update this file at the end of every session.

---

## Current Version

**0.5.1**

---

## Project Status

Project renamed from **Comic-Zork** to **Grues in Comic** (trademark-safe: "grue" predates Zork and is not an Activision trademark). GitHub repo renamed to `dkdev24/grues-in-comic`. Historical source code imported for both reference projects:

- `original-projects/zork1/` — ZIL source for Zork I
- `original-projects/comic-chat/` — Microsoft Comic Chat (v1.0, v2.1b, v2.5-beta-1, v2.5-beta-1-modern)

**Milestone 1 complete**: `importer/` (TypeScript) contains the deterministic ZIL S-expression parser, validated against the full corpus, with committed AST artifacts and statistics (`importer/artifacts/`). **Milestone 2 in progress**: `ir/` (TypeScript) holds the IR schema + validator; declarative-world subset (stage 2.1) is defined and sample-validated. Behavior representation decided (stage 2.2, ADR 0001): structured behavior AST interpreted by the engine, with a builtin layer for generic ZIL utilities. Engine runtime decided (stage 2.3, ADR 0002, **⚑ Gate B resolved**): TypeScript, WASM dropped; engine↔UI JSON event contract fixed interface-first. **Milestone 2 complete** (stage 2.4 / ⚑ Gate A resolved split: Graphify adopted with per-module graphs; OpenWiki deferred — see Open Issues). **Milestone 3 (Semantic Extraction ZIL→IR) in progress**: stages 3.1–3.2 complete — all 110 Zork I rooms/exits and all 137 objects (properties, flags, containment, initial locations) in `ir/artifacts/zork1.world.json`, verified against source; IR schema at 0.2.0. No engine or browser runtime started (Milestone 4).

---

## Last Session

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

1. Stage 3.3 — **Vocabulary & syntax**: verbs, synonyms, buzzwords, parser SYNTAX rules from `gsyntax.zil.json`/`gverbs.zil.json` AST. The stage 2.1 schema has no vocabulary section yet — expect another additive `irVersion` bump; decide representation before extracting
2. Stage 3.4 — action routines (simple) — first behavior extraction into the ADR 0001 AST
3. Stage 5.1 (Comic Chat analysis) remains the sanctioned filler stage

**Milestone 0 is complete** (stages 0.1–0.3 all ☑):

- **0.1 toolchain**: ZILF/ZAPF 0.11.1 at `~/.local/opt/zilf-0.11.1-osx-arm64` (symlinked into `~/.local/bin`), frotz 2.55 via Homebrew. `verification/build.sh` compiles the untouched historical source out-of-tree to `verification/build/zork1.z3` (86,696 bytes, only tab-printing warnings)
- **0.2 harness**: `verification/run-transcripts.sh` (check/capture modes, `STORY=` override) runs `verification/walkthroughs/*.cmd` under `dfrotz -m -p -s 1234` against the shipped `COMPILED/zork1.z3` and diffs against `verification/golden/*.txt`. Three goldens captured (west-of-house, house-entry, cellar-descent), deterministic across runs. **ZILF build vs. shipped build: identical except banner (Release 0/current date vs. 119/880429) and Kitchen object-listing order (sack/bottle swapped)** — historical source is behaviorally faithful; the `STORY=` override is the future engine-parity entry point (stage 4.4)
- **0.3 hygiene**: comic-chat binaries kept (faithful import), Gemini doc truncation annotated, pipeline description consolidated into `docs/AI_KNOWLEDGE_INFRASTRUCTURE_DECISION.md` (AGENTS.md and PORTING_STRATEGY.md now point there), Open Issues pruned

---

## Open Issues

- **OpenWiki decision deferred** (2026-07-18): Daniel hit an LLM-provider integration issue while testing OpenWiki on another project. `wiki/` stays hand-authored until revisited — likely much later; not blocking Milestones 3–4. When resolved, update `docs/AI_KNOWLEDGE_INFRASTRUCTURE_DECISION.md` ("Stage 2.4 Validation" section) and AGENTS.md Knowledge Separation rules
- Neutral (non-IF-lore) branding for the commercial assets (engine, IR, importer) still open — "Grues in Comic" names the game/project
- Kitchen object-listing order differs between the ZILF build and the shipped Release 119 build (sack/bottle swapped) — harmless for now, but decide which ordering the engine must reproduce when stage 4.4 parity work starts

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
| `wiki/` | Semantic architecture notes (hand-authored; OpenWiki deferred) |
| `<module>/graphify-out/` | Graphify structural graphs per module (`importer/`, `ir/`); config in `.graphifyignore` |
| `WORKLOG.md` | Persistent project history |
| `AGENTS.md` | Agent workflow rules (single source for all agents) |
| `CLAUDE.md` | Claude Code entry point — references `AGENTS.md` |
| `project-init-skill-installation.md` | Instructions for installing the `project-init` skill on other devices |
