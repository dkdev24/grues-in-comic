# HANDOFF.md

Cross-session context memory. Update this file at the end of every session.

---

## Current Version

**0.4.1**

---

## Project Status

Project renamed from **Comic-Zork** to **Grues in Comic** (trademark-safe: "grue" predates Zork and is not an Activision trademark). GitHub repo renamed to `dkdev24/grues-in-comic`. Historical source code imported for both reference projects:

- `original-projects/zork1/` — ZIL source for Zork I
- `original-projects/comic-chat/` — Microsoft Comic Chat (v1.0, v2.1b, v2.5-beta-1, v2.5-beta-1-modern)

**Milestone 1 complete**: `importer/` (TypeScript) contains the deterministic ZIL S-expression parser, validated against the full corpus, with committed AST artifacts and statistics (`importer/artifacts/`). **Milestone 2 in progress**: `ir/` (TypeScript) holds the IR schema + validator; declarative-world subset (stage 2.1) is defined and sample-validated. Behavior representation decided (stage 2.2, ADR 0001): structured behavior AST interpreted by the engine, with a builtin layer for generic ZIL utilities. Engine runtime language undecided (stage 2.3, ⚑ Gate B). No engine or browser runtime started.

---

## Last Session

- **Stage 2.2 complete — behavior representation decided** (v0.4.1, ⚑ Gate B input):
  - **ADR 0001** (`docs/adr/0001-behavior-representation.md`, Accepted): behavior is a **structured behavior AST** — plain JSON, closed vocabulary of IF-domain ops (`ir/src/behavior.ts`: 12 expression + 6 statement ops) — interpreted by the engine; generic ZIL utilities (OPEN-CLOSE, DO-WALK, THIS-IS-IT, PICK-ONE…) are **engine builtins**, not per-game IR; engines may compile AST→closures as an invisible optimization; transpiled-TS-as-canonical rejected (breaks IR independence, makes LLM extraction unvalidatable)
  - POC ran the comparison **both ways** on TRAP-DOOR-EXIT (exit routine returning a room) and KITCHEN-WINDOW-F (multi-verb object action): hand-written ASTs (`ir/poc/routines.ts`) executed by a ~130-line reference interpreter (`ir/poc/interpreter.ts`) vs. hand-transpiled TS (`ir/poc/transpiled.ts`), both over one shared world/builtin substrate (`ir/poc/world.ts`)
  - 12 differential scenarios (identical transcript/return/mutations/pronoun binding) + 10 golden tests pinned to ZIL source text; suite now 43, typecheck clean
  - Deferred consciously (listed in ADR): fall-off-end return semantics, RARG room-action protocol as first-class dispatch, PRSO/PRSI binding; behavior `routines` section enters `WorldDocument` as `irVersion` 0.2.0 during Milestone 3
- Gate B evidence so far: TypeScript frictionless across importer, IR schema/validator, and interpreter; behavior-as-data means 2.3's language choice is unconstrained by the IR

---

## Next Actions

Follow `docs/DEVELOPMENT_PLAN.md` (Session Protocol section). Milestone 2 continues:

1. Stage 2.3 — **ADR: engine runtime** (TypeScript vs. C++/WASM) + engine↔UI event/serialization contract, interface-first (⚑ **Gate B resolves here** — revise the plan's Milestones 3–5 afterward); inputs: ADR 0001, frictionless-TS experience, builtin-registry contract need
2. Stage 2.4 — Graphify/OpenWiki validation POC against the real IR (⚑ Gate A)
3. Stage 5.1 (Comic Chat analysis) is the sanctioned filler stage if a session can't tackle IR work

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
| `importer/` | ZIL Semantic Importer — parser, tests, committed AST artifacts (`artifacts/`) |
| `ir/` | IR schema (`src/schema.ts`), validator, hand-written samples; spec in `docs/IR_SCHEMA.md` |
| `original-projects/zork1/` | ZIL source reference |
| `original-projects/comic-chat/` | Comic Chat source reference |
| `docs/` | Project documentation |
| `wiki/` | Semantic architecture notes |
| `graph/` | Graphify structural outputs (not yet created) |
| `WORKLOG.md` | Persistent project history |
| `AGENTS.md` | Agent workflow rules (single source for all agents) |
| `CLAUDE.md` | Claude Code entry point — references `AGENTS.md` |
| `project-init-skill-installation.md` | Instructions for installing the `project-init` skill on other devices |
