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
