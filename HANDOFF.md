# HANDOFF.md

Cross-session context memory. Update this file at the end of every session.

---

## Current Version

**0.1.1**

---

## Project Status

Project renamed from **Comic-Zork** to **Grues in Comic** (trademark-safe: "grue" predates Zork and is not an Activision trademark). GitHub repo renamed to `dkdev24/grues-in-comic`. Historical source code imported for both reference projects:

- `original-projects/zork1/` — ZIL source for Zork I
- `original-projects/comic-chat/` — Microsoft Comic Chat (v1.0, v2.1b, v2.5-beta-1, v2.5-beta-1-modern)

No engine code exists yet. No IR schema defined. No browser runtime started.

---

## Last Session

- Reviewed all strategy docs and `docs/gemini-analysis-on-plan-and-strategy.md`; agreed decisions:
  - **Rename**: project is now "Grues in Comic" — applied across README, AGENTS.md, docs/, HANDOFF; GitHub repo renamed (`gh repo rename`); past WORKLOG entries and the Gemini analysis doc left untouched as historical records
  - **WASM is no longer mandatory**: engine implementation language/runtime is an open decision (TypeScript is a candidate) — needs an ADR before engine work starts
  - **Verification strategy**: build golden-transcript harness — compile original ZIL with ZILF → `.z3`, run under `dfrotz` (scriptable) or Bocfel, capture transcripts as behavioral ground truth
  - **Deterministic ZIL parsing**: build a lightweight S-expression parser to produce an AST before any LLM-based semantic extraction (per Gemini recommendation, agreed)
- Verified upstream licenses via GitHub API: both `historicalsource/zork1` and `microsoft/comic-chat` are MIT — README/THIRD_PARTY claims are correct; remaining IP risk is trademark only, addressed by the rename

---

## Next Actions

1. Build the verification harness: install ZILF + frotz, compile `original-projects/zork1/` to `.z3`, script `dfrotz` to capture golden transcripts
2. Build the deterministic ZIL S-expression parser (AST output; becomes the foundation of the ZIL Semantic Importer)
3. Define the IR schema (data structures for ROOM, OBJECT, ROUTINE, ACTION, GLOBAL, TABLE)
4. Write an ADR for the engine runtime choice (TypeScript vs. C++/WASM) — WASM is no longer assumed
5. Begin extracting Zork I world model into IR

---

## Open Issues

- Local directory is still `/Users/daniel/Sites/comic-zork` — rename to `grues-in-comic` when convenient (GitHub remote already updated; old repo URL redirects)
- Engine implementation language undecided — docs still reference WebAssembly as assumed; update PORTING_STRATEGY/AGENTS.md once the ADR lands
- Neutral (non-IF-lore) branding for the commercial assets (engine, IR, importer) still open — "Grues in Comic" names the game/project
- Graphify/OpenWiki not yet installed — validate the claims in `AI_KNOWLEDGE_INFRASTRUCTURE_DECISION.md` hands-on before hardening the workflow around them
- Pipeline diagram and Graphify/OpenWiki responsibilities are duplicated across AGENTS.md, PORTING_STRATEGY.md, and the infrastructure decision doc — consolidate to one canonical location
- `docs/gemini-analysis-on-plan-and-strategy.md` ends with a dangling `4.` — possibly truncated; check for a missing fourth recommendation
- No IR schema exists yet
- `original-projects/comic-chat/v2.5-beta-1/base/objd/` contains compiled binaries (`.exe`, `.dbg`, `.sym`) — verify whether these should be excluded via `.gitignore`
- `wiki/` directory is empty; `graph/` does not exist yet — Graphify has not been run

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
