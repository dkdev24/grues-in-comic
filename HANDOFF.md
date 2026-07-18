# HANDOFF.md

Cross-session context memory. Update this file at the end of every session.

---

## Current Version

**0.1.0**

---

## Project Status

Repository initialized. Historical source code imported for both reference projects:

- `original-projects/zork1/` — ZIL source for Zork I
- `original-projects/comic-chat/` — Microsoft Comic Chat (v1.0, v2.1b, v2.5-beta-1, v2.5-beta-1-modern)

No engine code exists yet. No IR schema defined. No browser runtime started.

---

## Last Session

- Created `HANDOFF.md` and `WORKLOG.md`; updated `AGENTS.md` with system document workflow and HANDOFF/WORKLOG loading rules
- Created `CLAUDE.md` pointing to `AGENTS.md` so all agents read from a single source
- Created `project-init` skill at `~/.claude/skills/project-init/SKILL.md` (auto-loaded by both Claude Code and OpenCode)
- Created `project-init-skill-installation.md` in repo root for installing the skill on other devices (macOS and Windows)

---

## Next Actions

1. Define the IR schema (data structures for ROOM, OBJECT, ROUTINE, ACTION, GLOBAL, TABLE)
2. Perform semantic analysis of `original-projects/zork1/` ZIL source
3. Begin extracting Zork I world model into IR
4. Set up project scaffold for the Comic-Zork engine

---

## Open Issues

- No IR schema exists yet — this is the critical first deliverable
- `original-projects/comic-chat/v2.5-beta-1/base/objd/` contains compiled binaries (`.exe`, `.dbg`, `.sym`) — verify whether these should be excluded via `.gitignore`
- `docs/` and `wiki/` directories are empty — need to be populated before agent workflows can reference them
- `graph/` directory does not exist yet — Graphify has not been run

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
