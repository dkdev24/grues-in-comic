# HANDOFF.md

Cross-session context memory. Update this file at the end of every session.

---

## Current Version

**0.2.1**

---

## Project Status

Project renamed from **Comic-Zork** to **Grues in Comic** (trademark-safe: "grue" predates Zork and is not an Activision trademark). GitHub repo renamed to `dkdev24/grues-in-comic`. Historical source code imported for both reference projects:

- `original-projects/zork1/` — ZIL source for Zork I
- `original-projects/comic-chat/` — Microsoft Comic Chat (v1.0, v2.1b, v2.5-beta-1, v2.5-beta-1-modern)

No engine code exists yet. No IR schema defined. No browser runtime started.

---

## Last Session

- **Licensing finalized**: confirmed Apache 2.0 project license is compatible with the MIT-licensed imports (MIT → Apache is fine; original license files preserved). Added root `LICENSE` (canonical Apache 2.0 text) and `NOTICE` (project statement + Zork I / Comic Chat attribution + MIT text); README license section now references both
- **Development plan created**: `docs/DEVELOPMENT_PLAN.md` — Milestones 0–6 broken into session-sized stages with status tracking and decision gates (Gate B: runtime ADR + behavior-IR representation; Gate A: Graphify/OpenWiki validation, after Gate B; Gate C: transcript parity; Gate D: comic-presentation POC). Plan is a living document — revise downstream milestones at each gate
- **Graphify/OpenWiki timing decided**: defer install/validation until after the IR schema and runtime ADR are done — the validation POC runs against the real IR (plan stage 2.4, Gate A)
- **Feasibility verification passed**: all four external repos confirmed real (historicalsource/zork1, microsoft/comic-chat, Graphify-Labs/graphify — active, commit Jul 17 2026 — and langchain-ai/openwiki); local ZIL corpus complete (110 rooms / 140 objects / 441 routines, ~11.9k lines); **`original-projects/zork1/COMPILED/zork1.z3` is a shipped reference build** — golden transcripts don't block on ZILF; dfrotz scriptability confirmed; community confirms ZILF compiles Infocom source (patched variants at github.com/The-ZIL-Files). Caveat: historical source may not match any released version exactly — treat the shipped `.z3` as ground truth

---

## Next Actions

Follow `docs/DEVELOPMENT_PLAN.md` (Session Protocol section). Immediate queue:

1. Stage 1.1 — ZIL S-expression parser POC (one representative file → typed AST with tests)
2. Stage 1.2 — full-corpus parse

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
| `original-projects/zork1/` | ZIL source reference |
| `original-projects/comic-chat/` | Comic Chat source reference |
| `docs/` | Project documentation |
| `wiki/` | Semantic architecture notes |
| `graph/` | Graphify structural outputs (not yet created) |
| `WORKLOG.md` | Persistent project history |
| `AGENTS.md` | Agent workflow rules (single source for all agents) |
| `CLAUDE.md` | Claude Code entry point — references `AGENTS.md` |
| `project-init-skill-installation.md` | Instructions for installing the `project-init` skill on other devices |
