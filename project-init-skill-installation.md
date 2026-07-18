# project-init Skill Installation

This document lets an AI agent install the `project-init` skill on any device running Claude Code and/or OpenCode.

---

## What This Skill Does

The `project-init` skill automates new project setup:

- Initializes a git repository
- Creates a private GitHub repo under `dkdev24`
- Validates `.gitignore` naming
- Creates `HANDOFF.md` (cross-session context memory)
- Creates `WORKLOG.md` (persistent project history)
- Creates or updates `AGENTS.md` with system document workflow rules
- Creates `CLAUDE.md` pointing to `AGENTS.md` so Claude Code, OpenCode, and other agents all read from a single source

---

## Target Location

Both Claude Code and OpenCode load skills from the same directory:

| Platform | Path |
|---|---|
| macOS / Linux | `~/.claude/skills/project-init/SKILL.md` |
| Windows | `%USERPROFILE%\.claude\skills\project-init\SKILL.md` |

OpenCode auto-loads from this location. No additional OpenCode configuration is needed.

---

## Installation Instructions

### macOS / Linux

```bash
mkdir -p ~/.claude/skills/project-init
```

Then write the skill file content (below) to `~/.claude/skills/project-init/SKILL.md`.

### Windows (PowerShell)

```powershell
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.claude\skills\project-init"
```

Then write the skill file content (below) to `%USERPROFILE%\.claude\skills\project-init\SKILL.md`.

---

## Skill File Content

Create `SKILL.md` with the following content exactly:

```
---
name: project-init
description: Initialize a new project repository. Use when starting a new project from scratch that needs a git repo, a private GitHub repo under dkdev24, HANDOFF.md, WORKLOG.md, and AGENTS.md with cross-session agent workflow rules. Triggers on "init project", "new project", "initialize repo", "set up project", or any request to wire up git + GitHub + project management documents together.
---

# Project Init Skill

Establishes a new project with git, GitHub, and cross-session AI agent infrastructure.

## Checklist

Complete the following in order:

1. **Git init** — run `git init` in the project root
2. **Stage and commit** — `git add .` and `git commit -m "Initial commit"`
3. **Create GitHub repo** — `gh repo create <repo-name> --private --source=. --remote=origin --push` under account `dkdev24`
4. **Fix .gitignore** — verify the ignore file is named `.gitignore` (not `.gitignore.md` or any other variant); if misnamed, rename it with `git mv`, run `git rm --cached -r .` to re-apply rules, then `git add .`
5. **Create HANDOFF.md** — see template below
6. **Create WORKLOG.md** — see template below
7. **Create or update AGENTS.md** — see requirements below
8. **Create CLAUDE.md** — see requirements below
9. **Commit and push** all four files

---

## HANDOFF.md Template

`HANDOFF.md` is the cross-session context memory. Place it at the repo root.

Fill in all sections based on what was done during this init session.

  # HANDOFF.md

  Cross-session context memory. Update this file at the end of every session.

  ---

  ## Current Version

  **0.1.0**

  ---

  ## Project Status

  (Brief description of what the project is and where it stands.)

  ---

  ## Last Session

  (Summary of what was done in the most recent session.)

  ---

  ## Next Actions

  1. (First priority task)
  2. (Second priority task)

  ---

  ## Open Issues

  - (Any known problems, blockers, or decisions deferred)

  ---

  ## Key Paths

  | Path | Purpose |
  |---|---|
  | (path) | (what it contains) |

---

## WORKLOG.md Template

`WORKLOG.md` is the persistent project history. Place it at the repo root.

Start at version `0.1.0`. Append a new entry at each milestone. Never edit past entries.

Version bump rules:
- Patch (0.1.x): small changes, fixes, documentation
- Minor (0.x.0): new subsystems or major features added
- Major (x.0.0): engine-complete or production-ready milestones

  # WORKLOG.md

  Persistent project history. Append entries; do not edit past entries.

  ---

  ## v0.1.0 — Repository Initialization

  **Date:** YYYY-MM-DD

  ### Changes

  - (List everything done to initialize the project)

  ### Status

  (One sentence on overall state)

---

## AGENTS.md Requirements

If `AGENTS.md` does not exist, create it. If it exists, ensure the following section is present, preferably before the AI workflow steps. If the AI Development Workflow section exists, add HANDOFF.md as step 1 and the HANDOFF/WORKLOG update as the final step.

Required section to insert:

  ## System Documents

  Two documents maintain cross-session state. Read them at the start of every session. Update them at the end.

  ### HANDOFF.md

  - Location: `HANDOFF.md`
  - Purpose: Cross-session context memory.
  - Contains: current version, project status, last session summary, next actions, open issues, key paths.
  - **Read at the start of every session.**
  - **Update at the end of every session.** Replace the Last Session and Next Actions sections. Append to Open Issues as needed.

  ### WORKLOG.md

  - Location: `WORKLOG.md`
  - Purpose: Persistent project history.
  - Contains: one entry per version milestone, with date, changes, and status.
  - **Do not load at session start.** Read only when version history is directly relevant to the current task.
  - **Append a new entry when a version milestone is reached.** Never edit past entries.
  - Version format: `x.x.x` — increment the patch for small changes, minor for new subsystems, major for engine-complete milestones.

---

## CLAUDE.md Requirements

Create `CLAUDE.md` at the repo root with exactly this content:

  # Agent Instructions
  @AGENTS.md

This makes Claude Code load `AGENTS.md` automatically, so a single file governs all agents (Claude Code, OpenCode, and others). If `CLAUDE.md` already exists and does not reference `AGENTS.md`, add `@AGENTS.md` to it.

---

## Final Commit

After all files are created:

  git add HANDOFF.md WORKLOG.md AGENTS.md CLAUDE.md
  git commit -m "Add HANDOFF.md, WORKLOG.md; update AGENTS.md and CLAUDE.md with system document workflow"
  git push
```

---

## Verification

After writing the file, confirm it exists:

**macOS / Linux**
```bash
ls ~/.claude/skills/project-init/SKILL.md
```

**Windows (PowerShell)**
```powershell
Test-Path "$env:USERPROFILE\.claude\skills\project-init\SKILL.md"
```

---

## Notes

- Restart OpenCode after installation for the skill to load.
- Claude Code picks up the skill automatically on next session start.
- The skill assumes `git` and `gh` (GitHub CLI) are authenticated before use.
