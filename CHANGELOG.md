# Changelog

All notable changes to **Grues in Comic** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

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