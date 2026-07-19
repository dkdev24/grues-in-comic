# Changelog

All notable changes to **Grues in Comic** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

---

## [v0.5.17] - 2026-07-20 — Licensing, Provenance, and Public-Repo Preparation

Documentation and repository hygiene only. No engine, IR, or artifact changes.

### Added
- **ADR 0002 "Alternatives Considered"** — records why the project does not reuse an existing Z-machine interpreter (ZLR, ZVM/ifvms.js). A compiled story file is an opaque memory image; the engine↔UI contract needs semantics (`speech.speaker`, `player-moved` room ids) that only the IR preserves. Establishes the **Z-Machine Standards Document 1.1** as the normative source for Milestone 4 Group A builtin semantics.
- **Attribution for build tools** in `NOTICE` and `THIRD_PARTY.md` — ZILF/ZAPF 0.11.1 (GPL-3.0) and Frotz/dfrotz 2.55 (GPL-2.0-or-later), invoked as external executables and neither vendored nor redistributed, so their copyleft terms do not reach this project's Apache-2.0 source.
- **`README.md` "Provenance and Licensing"** — what is imported and under what grant, what is deliberately absent, and how the project relates to existing Z-machine tooling.
- **`reference/`** (gitignored) for third-party reading material, with a local `README.md` recording provenance and warnings.

### Changed
- Comic Chat paper moved `docs/` → `reference/`; references updated in `HANDOFF.md` and `docs/DEVELOPMENT_PLAN.md`.
- Commit authorship switched to a GitHub `users.noreply` address; existing history rewritten to match, ahead of making the repository public.

### Removed
- **Comic Chat build outputs untracked** (299 files, ~33 MB): `.exe`, `.dll`, `.ocx`, `.lib`, `.class`, `.map`, `.sym`, plus a vendored Sun JDK 1.1.4 (`classes.zip`) not covered by Microsoft's MIT grant. All are build products of source that remains tracked. **Source, documentation, and comic art (`.avb`/`.bmp`/`.gif`/`.jpg`/`.ico`, 661 files) are untouched** — the art is a Milestone 5 input. `original-projects/zork1/` is entirely unaffected.

### Notes
- ZLR ships **no license for its own code** (verified 2026-07-19: no LICENSE/COPYING, no copyright headers in `ZLR.VM/*.cs`; the license files under `Demona/Gargoyle/` cover a vendored Gargoyle and its dependencies). Default copyright therefore applies — more restrictive than GPL. It is a last-resort reference only; the Standards Document is the primary source.
- `original-projects/` remains version-controlled by design (`AGENTS.md`). Both imports carry genuine Microsoft MIT grants, and the pipeline reads from them.

---

## [v0.5.4] - 2026-07-18 — Behavior Extraction Complete

### Added
- **213 Zork I action routines** extracted as structured behavior ASTs (ADR 0001) — covers 67% of referenced handlers; complex routines catalogued for deferred extraction.
- IR schema 0.4.0 with `routines` section, new expression/statement operations, implicit-return semantics resolved.

---

## [v0.5.0] - 2026-07-18 — World Model Complete (Rooms + Objects + Vocabulary)

### Added
- **Full declarative world of Zork I in IR**: 110 rooms, 352 exits, 137 objects, 267 syntax rules, 75 synonym sets, 21 buzzwords, 13 direction words — all source-verified.
- ZIL string semantics (hard newlines `|`, line-wrap handling) matching golden transcripts.

### Changed
- IR schema evolved through 0.1.0 → 0.3.0 (additive: world, objects, vocabulary sections).

---

## [v0.4.3] - 2026-07-18 — Knowledge Tooling Decided (Gate A)

### Added
- **Graphify adopted** for structural knowledge graphs (per-module: `importer/`, `ir/`).
- Semantic knowledge remains hand-authored in `wiki/` (OpenWiki not adopted — no budget for paid LLM).

---

## [v0.4.2] - 2026-07-18 — Engine Runtime Decided (Gate B)

### Added
- **ADR 0002**: Engine will be aengine Runtime** — zero-dependency TypeScript package (`engine/`); WebAssembly dropped.
- **Engine↔UI Contract**: pure deterministic synchronous state machine (`command() → TurnResult{events}`), seeded RNG, versioned JSON event union (narration, speech, player-moved, object-moved, score-changed, game-over, question).

### Changed
- Gate B resolved: both behavior representation (ADR 0001) and runtime decisions finalized.

---

## [v0.4.0] - 2026-07-18 — IR Schema: Declarative World

### Added
- **IR Schema 0.1.0** — TypeScript types as source of truth, strict validator with referential integrity, exit representation mirroring ZIL 1:1, hand-authored sample world.

---

## [v0.3.0] - 2026-07-18 — Deterministic ZIL Parser (Milestone 1)

### Added
- **ZIL Parser**: S-expression lexer, recursive-descent parser, typed AST with source positions. All 10 corpus files parse cleanly (254 top-level forms in `1dungeon.zil`).
- Round-trip invariant: `parse(print(ast))` identical to original AST.
- Committed AST artifacts for all 10 files (6.3 MB).

---

## [v0.2.0] - 2026-07-18 — Verification Harness (Milestone 0)

### Added
- **Reproducible ZILF compilation** to `zork1.z3` (28 warnings, no errors, no source patches).
- **Golden transcript harness** with `dfrotz` — 3 deterministic transcripts captured and cross-validated against shipped Infocom Release 119.

---

## [v0.1.2] - 2026-07-18 — Licensing & Development Plan

### Added
- Root `LICENSE` (Apache 2.0) + `NOTICE` with MIT attributions for Zork I and Comic Chat.
- Development Plan: Milestones 0–6 with four decision gates.

---

## [v0.1.1] - 2026-07-18 — Project Renamed

### Changed
- **Renamed** from "Comic-Zork" to **"Grues in Comic"** (avoids Zork trademark; "grue" predates Zork, copyright-safe).
- GitHub repository: `dkdev24/grues-in-comic`.

---

## [v0.1.0] - 2026-07-18 — Repository Initialization

### Added
- Git repo + private GitHub repo `dkdev24/grues-in-comic`.
- Historical reference source imported:
  - Zork I ZIL source (Infocom, 1977–1981)
  - Microsoft Comic Chat v1.0, v2.1b, v2.5-beta-1 (original + modernized)
- Core docs: `AGENTS.md`, `CLAUDE.md`, `README.md`, `THIRD_PARTY.md`, `HANDOFF.md`, `WORKLOG.md`.

---

## Legend

- **Added** — new user-visible capabilities
- **Changed** — changes in existing functionality
- **Fixed** — critical bug fixes only
- **Removed** — removed features