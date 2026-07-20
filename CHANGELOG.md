# Changelog

All notable changes to **Grues in Comic** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

---

## [v0.8.1] - 2026-07-20 — ADR 0003: Derived Adjacency

`I-SWORD` extracts, and walkthrough 10 verifies strictly. It was the last M4 item ADR 0001 deferred without an answer.

### Added
- **`Room.adjacent`** — the ids a room declares a static exit to, derived at extraction time. `deriveAdjacent()` is the single definition: `extract-world` emits the field and `validate` **re-derives and compares** it, so a stale or hand-edited list fails validation instead of silently disagreeing with the exits beside it.
- **The exit-scan rewrite** (`RoutineTransformer.exitScan`) — structurally matches the ZIL `NEXTP`/`GETPT`/`PTSIZE`/`GETB` idiom and emits an index walk over the adjacency list. Fail-closed: any clause that does not match falls back to the ordinary path and catalogs on `NEXTP`, so a near-miss costs extraction rather than producing a plausible loop over the wrong thing.
- **ADR 0003** (`docs/adr/0003-adjacency-derivation.md`), with the rejected alternatives argued: a general `exits-of` reflection op, a quantifier op, an engine builtin, a villain-side threat field.
- Direct verification of the glow at all three levels *and* the transitions between them (`engine/test/engine.test.ts`), plus perturbation tests for the rewrite's fallback (`ir/test/exit-scan.test.ts`).

### Changed
- The engine **materializes** adjacency as a `pure` `ltable` per room, reached through an ordinary property (`adjacentRooms`); it never computes it, so the document keeps owning the world model (ADR 0002).
- **No new IR ops** — the rewrite is `prop`/`table-get`/`gt?`/`add`/`loop`/`break`, so ADR 0001's growth log is unchanged.
- Walkthrough 10's `# parity:` line is gone. Two turns are still quarantined per-turn, now because the glow reports the *randomized fight's outcome* (the reference stuns the troll and it stays next door; our seed kills it) rather than because `I-SWORD` was missing.
- The combat suite's legal-message set includes `I-SWORD`: killing the last villain in the room is what makes the glow change, so its line lands in combat turns.

### Results
- **360 routines extracted** (was 358), **28 catalogued** (was 29).
- Parity **155/161, 143/143 strict** (was 117/117 — walkthrough 10 is no longer file-level informational); engine **110** tests, IR **193**.

---

## [v0.8.0] - 2026-07-20 — `GO` as an Entry Ref

Villain combat is whole, and the game's five daemons run for the first time.

### Fixed
- **`GO` is now an entry ref.** The game's initialization routine was reachable from nothing, so the daemons it queues and the melee tables it patches were never touched. Adding it extracts `I-FIGHT`, `DO-FIGHT`, `VILLAIN-BLOW` and `WINNER-RESULT`: villains strike back, disarm, knock out and kill, and death and resurrection work.
- **`TABLE_CORRECTIONS` deleted** — `GO` patches `DEF*-RES` at runtime, as the source intended, so the extractor no longer hardcodes it.
- **Flags used as values** (`,NONLANDBIT`, `,ONBIT`) resolve by name, matching the world document's `vehicleType`.
- **`PROB`'s two-argument form** expands to `<ZPROB base>` and discards its second operand, as the DEFMAC does — `VILLAIN-BLOW` passes an undeclared local there, which is legal only because the macro drops it.
- **Extracted routines can shadow engine builtins.** `LIT?` did, replacing the engine's lighting with a call into unmodelled parser scope machinery and breaking every dark-room turn. Engine-implemented routines are now excluded outright.

### Changed
- Initialization runs at **engine construction**, not in `start()`, so a host cannot skip it. An explicit `start:` option still overrides `GO`'s placement.
- `MAIN-LOOP` (the turn loop, the engine's under ADR 0002) and `V-VERSION` (the banner, a sanctioned diff) are builtins; statements after a non-returning builtin are dropped rather than denied.
- Combat tests gained a damage assertion, and derive villains and melee tables from the `VILLAINS` table rather than a hand-written list.

### Results
- **358 routines extracted** (was 352), 29 catalogued, 52 invisible (was 57) — 45 of those by design.
- Parity unchanged at **151/163, 117/117 strict**; engine **108** tests, IR **185**.

---

## [v0.7.1] - 2026-07-20 — Correction to v0.7.0

Documentation only. No code change.

### Fixed
- **v0.7.0's "villain combat landed" was an overstatement.** Only the player's blow resolves; `I-FIGHT`, `DO-FIGHT`, `VILLAIN-BLOW` and `WINNER-RESULT` are unextracted, so villains never strike back and **the player cannot be hurt or killed in a fight**. The v0.7.0 tests pass against this, since a one-sided fight still kills the troll and still prints only legal messages.
- **v0.7.0's `DEF*-RES` "reconstruction defect" was a misreading.** `GO` patches those tables at runtime (`1dungeon.zil:2644`); the zeros are placeholders the game overwrites. `TABLE_CORRECTIONS` holds correct values on a wrong premise and is superseded by extracting `GO`.
- Root cause of both: **`GO` is not an entry ref**, so the game's initialization routine — five daemon queues plus the melee-table patches — is never reached.

---

## [v0.7.0] - 2026-07-20 — Villain Combat

Combat outcomes now resolve: the troll fights, dies, and drops its axe, opening the route past the Troll Room.

### Added
- **IR `random` expression op** (schema **0.14.0**) — ZIL `<RANDOM n>`, a uniform draw in 1..n. The op names the draw; which sequence a seed produces stays an engine concern, so the IR is not pinned to any interpreter's PRNG.
- **`PRINT` and `PRINTD` extraction**, as `tell` parts — unblocking `REMARK`, which renders melee messages.
- **`engine/test/combat.test.ts`** — randomized turns verified by *membership*: every line printed during a fight must be a message the game could have produced, across 40 seeds. The legal set is derived from the IR rather than hand-listed, and a negative control asserts the check can actually fail.

### Fixed
- **Villain combat was an extraction gap, not an engine one.** `HERO-BLOW` was catalogued on `operator RANDOM`; because extraction is reachability-driven, everything it called (`VILLAIN-BLOW`, `VILLAIN-STRENGTH`, `VILLAIN-RESULT`, `WINNER-RESULT`, `REMARK`) was never queued and appeared in neither the IR nor the catalog.
- **Melee result tables `DEF1-RES`/`DEF2-RES`/`DEF3-RES`** — the ZILF reconstruction writes literal zeros where table views belong, keeping the real values only in comments; the corrections restore them, with the reference-build evidence recorded at the site.

### Changed
- `RANDOM` in *statement* position is denied with an accurate reason: there it seeds the generator rather than drawing, which is a different operation.
- Removed the now-dead `HERO-BLOW` and `RANDOMIZE-OBJECTS` builtin stubs.
- Walkthrough 10's `# parity:` directive rewritten — its remaining diffs are `I-SWORD`, not combat.

### Results
- Walkthrough 10: stuck-at-turn-13 → **24/28**. Overall parity **138/163 → 151/163 (93%)**; strict **117/117 (100%)**.
- Engine tests **103 → 108**; IR **184/184**. Routines extracted **346 → 352**.

---

## [v0.5.18] - 2026-07-20 — Project Scope, Trademark Notices, and the `.avb` Format

Documentation and tooling only. No engine, IR, or artifact changes; Milestone 4 remains the next work.

### Added
- **ADR 0002 "Scope of Portability: source frontends, not story files"** — the long-term target is an IR-native engine with pluggable *source* frontends (ZIL is the first; the rest of the ZIL family is the cheap expansion, Inform 6 a plausible second). Compiled story files (`.z3`/`.z5`/`.z8`) are explicitly out of scope: executing a memory image re-raises the ADR's existing ZLR/ZVM objection and would be a second engine, not an extension. Binds three rules on Milestone 4, including that the first portability test is importing Zork II *after* M4 works rather than a speculative abstraction built in advance.
- **Trademark notices** in `README.md` and `NOTICE` — ZORK/INFOCOM attributed to Activision, MICROSOFT/COMIC CHAT to Microsoft, with an explicit non-affiliation statement. Records that the MIT grants convey copyright only and no trademark licence is implied by MIT, Apache-2.0, or any file here, and that trademark names appear nominatively (identifying the historical works; reproducing the `ZORK I` status banner that golden-transcript parity requires).
- **`art/` module** with `art/poc/avbdec.py` — a reference decoder for the Comic Chat `.avb` avatar format, writing PNGs named by part, emotion, and intensity. Stdlib only. Verified across the corpus: 191/191 files parse, 4656/4656 images decode.
- **`docs/AVB_FORMAT.md`** — normative `.avb` specification. Records five behaviours a reader written from the historical header alone gets wrong, four of them silently: the 32-bit `AK_OFFSET_ADJUSTMENT` (its comment says "2-bit"), the differing body/face/torso field sets, `MaskedMonoPalette` not being the render palette, intensity being `byte/255` rather than the wire protocol's scaling, and four BI_RLE4-compressed images.

### Changed
- **`README.md` de-staled.** WebAssembly references removed — Gate B dropped WASM in ADR 0002 and the README still described "a browser-native architecture powered by WebAssembly" and a `WebAssembly Runtime` pipeline stage. The architecture diagram now shows the TypeScript engine emitting the versioned JSON event contract. The repository-structure block was rewritten against the real tree; it had listed `importers/`, `zork/`, `wasm/`, `graph/`, `wiki/`, `tests/`, `scripts/`, `assets/`, and `renderer/`, most of which have never existed.

### Notes
- Comic Chat asset inventory established: 31 characters (5 single-pose stubs), 18–43 poses each, every pose tagged with an 8-point emotion wheel plus intensity. Against Zork I's five NPCs, characters are abundant; **backdrops are not** — the format defines `AT_BACKDROP` but no instance exists, leaving three 315×315 `.bmp` files against 110 rooms. Recorded as an open M5 design question.

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