# HANDOFF.md

Cross-session context memory. Update this file at the end of every session.

---

## Current Version

**0.4.2**

---

## Project Status

Project renamed from **Comic-Zork** to **Grues in Comic** (trademark-safe: "grue" predates Zork and is not an Activision trademark). GitHub repo renamed to `dkdev24/grues-in-comic`. Historical source code imported for both reference projects:

- `original-projects/zork1/` — ZIL source for Zork I
- `original-projects/comic-chat/` — Microsoft Comic Chat (v1.0, v2.1b, v2.5-beta-1, v2.5-beta-1-modern)

**Milestone 1 complete**: `importer/` (TypeScript) contains the deterministic ZIL S-expression parser, validated against the full corpus, with committed AST artifacts and statistics (`importer/artifacts/`). **Milestone 2 in progress**: `ir/` (TypeScript) holds the IR schema + validator; declarative-world subset (stage 2.1) is defined and sample-validated. Behavior representation decided (stage 2.2, ADR 0001): structured behavior AST interpreted by the engine, with a builtin layer for generic ZIL utilities. Engine runtime decided (stage 2.3, ADR 0002, **⚑ Gate B resolved**): TypeScript, WASM dropped; engine↔UI JSON event contract fixed interface-first. No engine or browser runtime started (Milestone 4).

---

## Last Session

- **Stage 2.3 complete — engine runtime decided, ⚑ Gate B resolved** (v0.4.2):
  - **ADR 0002** (`docs/adr/0002-engine-runtime.md`, Accepted): the engine is a **zero-dependency TypeScript package (`engine/`, Milestone 4)**; WebAssembly dropped as a target. Evidence: TS frictionless across importer/IR/interpreter; ADR 0001 made behavior data, so the engine is a modest interpreter with no perf case for native code; transcript verification runs in Node. Portability lives in the artifacts (IR + serialized contract), not the implementation — a future WASM/native engine stays possible, unplanned
  - **Engine↔UI contract fixed interface-first** (in ADR 0002): engine = pure, deterministic, synchronous state machine; `command(input) → TurnResult{events}`, `snapshot()/restore()`; seeded RNG (same world+seed+commands ⇒ identical events — the stage 4.4 parity lever); versioned JSON event union (`narration` with channels / `speech` with speaker — the comic layer's hook / `player-moved` / `object-moved` / `score-changed` / `game-over` / `question`); events are semantic, never presentational; vocabulary grows additively under `contractVersion` in Milestone 4
  - **WASM assumption removed from docs** (exit criteria): PORTING_STRATEGY.md (overview, architecture diagram, Phase 4 → "Browser Integration", vision) and AGENTS.md objectives now say TypeScript engine + web-native UI; IR independence lists intentionally still include WASM
  - **Plan revised per Gate B**: gate note marked resolved; Milestone 4 goal now names `engine/`, ADR 0001+0002; Milestones 3/5 structurally unchanged
  - No code this stage (ADR + doc updates only); suite stays 43 green

---

## Next Actions

Follow `docs/DEVELOPMENT_PLAN.md` (Session Protocol section). Milestone 2 has one stage left:

1. Stage 2.4 — **Knowledge tooling validation POC** (⚑ Gate A): hands-on test of Graphify and OpenWiki against the real IR from 2.1–2.2; verify repos/capabilities match `docs/AI_KNOWLEDGE_INFRASTRUCTURE_DECISION.md`; adopt or fall back to plain generated Markdown/JSON graphs; first `graph/` artifacts + `wiki/` pages (or fallback chosen)
2. After 2.4: Milestone 3 begins (ZIL→IR extraction, v0.5.x) — 3.1 world model (all rooms + connectivity)
3. Stage 5.1 (Comic Chat analysis) is the sanctioned filler stage if a session can't tackle IR work

**Milestone 0 is complete** (stages 0.1–0.3 all ☑):

- **0.1 toolchain**: ZILF/ZAPF 0.11.1 at `~/.local/opt/zilf-0.11.1-osx-arm64` (symlinked into `~/.local/bin`), frotz 2.55 via Homebrew. `verification/build.sh` compiles the untouched historical source out-of-tree to `verification/build/zork1.z3` (86,696 bytes, only tab-printing warnings)
- **0.2 harness**: `verification/run-transcripts.sh` (check/capture modes, `STORY=` override) runs `verification/walkthroughs/*.cmd` under `dfrotz -m -p -s 1234` against the shipped `COMPILED/zork1.z3` and diffs against `verification/golden/*.txt`. Three goldens captured (west-of-house, house-entry, cellar-descent), deterministic across runs. **ZILF build vs. shipped build: identical except banner (Release 0/current date vs. 119/880429) and Kitchen object-listing order (sack/bottle swapped)** — historical source is behaviorally faithful; the `STORY=` override is the future engine-parity entry point (stage 4.4)
- **0.3 hygiene**: comic-chat binaries kept (faithful import), Gemini doc truncation annotated, pipeline description consolidated into `docs/AI_KNOWLEDGE_INFRASTRUCTURE_DECISION.md` (AGENTS.md and PORTING_STRATEGY.md now point there), Open Issues pruned

---

## Open Issues

- Neutral (non-IF-lore) branding for the commercial assets (engine, IR, importer) still open — "Grues in Comic" names the game/project
- Kitchen object-listing order differs between the ZILF build and the shipped Release 119 build (sack/bottle swapped) — harmless for now, but decide which ordering the engine must reproduce when stage 4.4 parity work starts

Resolved 2026-07-18 (stage 2.3): engine implementation language — TypeScript per ADR 0002 (⚑ Gate B); PORTING_STRATEGY.md and AGENTS.md updated, WASM assumption removed (IR independence lists still name WASM deliberately — independence survives non-use).

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
