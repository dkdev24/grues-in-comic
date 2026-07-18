# HANDOFF.md

Cross-session context memory. Update this file at the end of every session.

---

## Current Version

**0.4.0**

---

## Project Status

Project renamed from **Comic-Zork** to **Grues in Comic** (trademark-safe: "grue" predates Zork and is not an Activision trademark). GitHub repo renamed to `dkdev24/grues-in-comic`. Historical source code imported for both reference projects:

- `original-projects/zork1/` — ZIL source for Zork I
- `original-projects/comic-chat/` — Microsoft Comic Chat (v1.0, v2.1b, v2.5-beta-1, v2.5-beta-1-modern)

**Milestone 1 complete**: `importer/` (TypeScript) contains the deterministic ZIL S-expression parser, validated against the full corpus, with committed AST artifacts and statistics (`importer/artifacts/`). **Milestone 2 in progress**: `ir/` (TypeScript) holds the IR schema + validator; declarative-world subset (stage 2.1) is defined and sample-validated. Behavior representation undecided (stage 2.2). No engine or browser runtime started.

---

## Last Session

- **Stage 2.1 complete — IR schema: declarative world** (v0.4.0, opens Milestone 2):
  - New `ir/` package (TypeScript, same toolchain as `importer/`): `src/schema.ts` (types = schema source of truth), `src/validate.ts` (strict structural pass — unknown keys rejected — plus referential pass — every id resolves, flags must be declared in the registry, door exits require DOORBIT), `src/cli.ts` (`npm run validate`)
  - Normative spec: `docs/IR_SCHEMA.md` (design principles, ZIL→IR mapping tables, validation rules, deferrals); `irVersion` 0.1.0
  - Exit model mirrors ZIL variants 1:1: `to` / `blocked` / `conditional` (IF [ELSE]) / `door` (IF x IS OPEN) / `routine` (PER); behavior everywhere is an **opaque routine-name string** — resolution is stage 2.2's decision; the validator surfaces `summary.routineRefs` as 2.2's worklist
  - Hand-written sample `ir/samples/west-of-house.world.json`: WEST-OF-HOUSE, KITCHEN, LIVING-ROOM fully transcribed (all 5 exit kinds exercised) + MAILBOX/ADVERTISEMENT/KITCHEN-WINDOW, IN-HOUSE-AROUND table, 4 globals; partial worlds stay valid via `"stub": true` placeholder entities (8 stub rooms, 5 stub scenery objects)
  - 21 tests (validator rule units + sample integration); typecheck clean; CLI green

---

## Next Actions

Follow `docs/DEVELOPMENT_PLAN.md` (Session Protocol section). Milestone 2 continues:

1. Stage 2.2 — IR schema: behavior representation (interpreted mini-language vs. transpiled functions vs. hybrid); POC one nontrivial routine; the sample's 7 `routineRefs` (e.g. TRAP-DOOR-EXIT, KITCHEN-WINDOW-F) are concrete candidates (⚑ Gate B input)
2. Stage 2.3 — ADR: engine runtime (⚑ Gate B)
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
