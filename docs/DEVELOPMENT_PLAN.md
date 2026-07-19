# Development Plan

Living document. Milestones are ordered; stages within a milestone are sized so one stage fits comfortably in a single AI-assisted session. Revisit this plan at every ⚑ decision gate — later milestones are intentionally provisional until the gates before them resolve.

- **Status legend**: ☐ not started · ◐ in progress · ☑ done
- **Update rule**: when a stage finishes, mark it in this file and record details in `HANDOFF.md` (and `WORKLOG.md` at version milestones). When a decision gate resolves, revise the affected downstream stages rather than working around the plan.

Related documents: `docs/PORTING_STRATEGY.md` (phases and architecture), `docs/AI_KNOWLEDGE_INFRASTRUCTURE_DECISION.md` (Graphify/OpenWiki), `docs/gemini-analysis-on-plan-and-strategy.md` (adopted recommendations: deterministic pre-parser, interface-first engine/UI boundary, brand separation).

---

## Milestone 0 — Foundations & Verification Ground Truth (v0.2.x)

Goal: establish behavioral ground truth and validate assumptions before building anything on them.

| Stage | Task | Exit criteria | Status |
|---|---|---|---|
| 0.1 | **Toolchain setup** — install ZILF and frotz (dfrotz); compile `original-projects/zork1/` to `.z3`. Note: `original-projects/zork1/COMPILED/zork1.z3` is a shipped reference build — transcripts (0.2) can start from it even if the ZILF compile needs source patches (see github.com/The-ZIL-Files for ZILF-compatible tweaks) | `zork1.z3` builds reproducibly; build steps scripted and documented; diff vs. shipped `.z3` noted | ☑ |
| 0.2 | **Golden transcript harness** — script dfrotz to run command lists and capture transcripts; create first walkthrough scripts (opening area, mailbox/leaflet, house entry) | `verification/` contains runner script + ≥3 golden transcripts, re-runnable with one command | ☑ |
| 0.3 | **Repo hygiene** — resolve small open issues: `.gitignore` for compiled binaries in comic-chat, dangling item 4 in Gemini doc, consolidate duplicated pipeline diagrams to one canonical location, remove stale HANDOFF entries | Open Issues list in `HANDOFF.md` pruned | ☑ |

---

## Milestone 1 — Deterministic ZIL Parser (v0.3.x)

Goal: a deterministic S-expression parser producing a complete AST of the Zork I source — the foundation of the ZIL Semantic Importer, and the input that grounds all later LLM-based extraction.

| Stage | Task | Exit criteria | Status |
|---|---|---|---|
| 1.1 | **Parser POC** — S-expression lexer/parser handling one representative file (e.g. rooms/objects file); pick implementation language pragmatically (TypeScript is the candidate — feeds Gate B) | Parses one full source file into a typed AST with tests | ☑ |
| 1.2 | **Full-corpus parse** — extend to all `zork1` files; handle ZIL syntax edge cases (reader macros, strings, comments) | 100% of files parse or every failure is catalogued with cause | ☑ |
| 1.3 | **AST artifacts** — serialize ASTs to JSON; emit corpus statistics (counts of ROOM/OBJECT/ROUTINE/GLOBAL/TABLE, etc.) | Committed AST output + stats report; parser re-runnable with one command | ☑ |

---

## Milestone 2 — IR Schema & Runtime ADR (v0.4.x)

Goal: define the central abstraction (IR) and settle the engine runtime question.

| Stage | Task | Exit criteria | Status |
|---|---|---|---|
| 2.1 | **IR schema: declarative world** — schema for ROOM, OBJECT, exits, GLOBAL, TABLE, flags/properties; validate by hand-writing IR for 2–3 rooms | Schema documented + validator tool; sample IR passes | ☑ |
| 2.2 | **IR schema: behavior** — decide how ROUTINE/ACTION imperative logic is represented (interpreted mini-language vs. transpiled functions vs. hybrid); POC one nontrivial routine both ways if needed ⚑ **Gate B input** | ADR-style writeup of the chosen representation with a working POC | ☑ |
| 2.3 | **ADR: engine runtime** — TypeScript vs. C++/WASM, informed by 1.1 and 2.2 experience; define the engine↔UI event/serialization contract at the same time (interface-first, per Gemini rec) ⚑ **Gate B** | ADR committed; PORTING_STRATEGY.md and AGENTS.md updated to remove the WASM assumption or confirm it | ☑ |
| 2.4 | **Knowledge tooling validation POC** — hands-on test of Graphify and OpenWiki against the real IR from 2.1–2.2; verify the repos and capabilities match `AI_KNOWLEDGE_INFRASTRUCTURE_DECISION.md`; if they hold up, produce first `graph/` artifacts and start `wiki/` architecture pages | Findings recorded in that doc; adopt/replace decision made; first generated structural + semantic docs exist (or fallback chosen) ⚑ **Gate A** | ☑ |

**⚑ Gate B (after 2.3): RESOLVED 2026-07-18.** Behavior = interpreted behavior AST with engine builtins (ADR 0001); engine runtime = TypeScript, WASM dropped (ADR 0002, which also fixes the engine↔UI JSON event contract). Milestones 3–5 reviewed against the decisions: structure stands; Milestone 4 now targets a TypeScript `engine/` package implementing the ADR 0002 contract, and Milestone 5's UI consumes that contract (already web-native by design).

**⚑ Gate A (after 2.4): RESOLVED (split) 2026-07-18.** **Graphify adopted** — validated in-field and in-repo; per-module graphs (`importer/`, `ir/`) committed under `<module>/graphify-out/` (supersedes `graph/`); corpus governed by `.graphifyignore`; IR world data is out of its AST scope (upstream #1666), so an IR world graph, if needed later, is a small deterministic IR→graph exporter (the sanctioned fallback). **OpenWiki not adopted** (deferred 2026-07-18, finalized same day after in-repo validation): free-tier LLM access cannot complete agentic wiki generation (null completions from the free router; 16 req/min rate limit aborts pinned-model runs) and reliable operation requires a paid model — no budget for this side project. `wiki/` is hand-authored (the fallback, now the standing rule). Findings recorded in `AI_KNOWLEDGE_INFRASTRUCTURE_DECISION.md`.

---

## Milestone 3 — Semantic Extraction: ZIL → IR (v0.5.x)

Goal: populate the IR from the parsed AST, subsystem by subsystem. Deterministic transforms where possible; LLM-assisted extraction (with AST context) where logic requires judgment; everything reviewed against the source.

| Stage | Task | Exit criteria | Status |
|---|---|---|---|
| 3.1 | **World model** — rooms, exits, connections | All Zork I rooms in IR; connectivity graph matches source | ☑ |
| 3.2 | **Objects** — objects, properties, flags, containment, initial locations | All objects in IR with validator passing | ☑ |
| 3.3 | **Vocabulary & syntax** — verbs, synonyms, adjectives, parser syntax rules | Vocabulary tables extracted to IR | ☑ |
| 3.4 | **Action routines (simple)** — object/room action handlers with straightforward logic | Majority of handlers represented; complex ones catalogued | ☑ |
| 3.5 | **Complex behavior** — puzzles, daemons/timers (thief, troll, lamp, matches), scoring, death/resurrection | Each system extracted with a written behavioral spec cross-checked against golden transcripts | ☐ |

Stages 3.4–3.5 may split into multiple sessions per batch of routines — track batches in `HANDOFF.md`.

---

## Milestone 4 — Engine Core (v0.6.x)

Goal: a platform-independent engine that executes the IR and emits structured gameplay events. Per Gate B: a zero-dependency TypeScript package (`engine/`) implementing the ADR 0002 contract — pure synchronous state machine, seeded RNG, JSON events; behavior AST interpreter + builtin registry per ADR 0001. No browser code. Verified continuously against golden transcripts.

| Stage | Task | Exit criteria | Status |
|---|---|---|---|
| 4.1 | **State & world runtime** — load IR, world state, object tree, movement | Can walk the map; state transitions correct | ✅ |
| 4.2 | **Command parser** — tokenization, vocabulary lookup, syntax matching, disambiguation | Parses the command set used by golden transcripts | ✅ |
| 4.3 | **Action dispatch & events** — execute IR behavior, emit narration/state events per the Gate B contract | LOOK/TAKE/DROP/inventory flows produce correct events | ☐ |
| 4.4 | **Transcript replay harness** — feed golden-transcript commands to the engine, diff output | First golden transcript replays with acceptable diff; harness in CI-style script | ☐ |
| 4.5 | **Systems completion** — daemons, scoring, save/load, death; iterate until transcripts pass | All golden transcripts pass ⚑ **Gate C** | ☐ |

**⚑ Gate C:** behavioral parity on captured transcripts = engine-complete milestone (major version bump).

---

## Milestone 5 — Browser Runtime & Comic Presentation (v0.7.x+)

Goal: browser shell consuming engine events; Comic Chat–inspired presentation. Rendering stays outside the engine (web-native UI layer per Gemini rec, regardless of Gate B outcome).

| Stage | Task | Exit criteria | Status |
|---|---|---|---|
| 5.1 | **Comic Chat analysis** — study `original-projects/comic-chat/` presentation concepts: panel layout, bubble placement, character/emotion selection; document in `wiki/` (read the paper below alongside the source) | Written analysis of the algorithms worth preserving | ☐ |
| 5.2 | **Minimal browser shell** — text-mode UI over the event stream (prove the contract end-to-end) | Playable text version in browser | ☐ |
| 5.3 | **Comic renderer POC** — one scene as panels + speech bubbles | POC demonstrates event→panel mapping ⚑ **Gate D** | ☐ |
| 5.4 | **Presentation buildout** — panel sequencing, character portraits, narration styling, persistence | Opening area playable in comic form | ☐ |
| 5.5 | **Full-game pass** — art/layout coverage for the complete game | Game completable in the browser | ☐ |

**⚑ Gate D:** comic-presentation POC decides art pipeline and asset strategy — plan 5.4–5.5 in detail only after it.

**Reference paper for 5.1/5.3:** Kurlander, Skelly & Salesin, *Comic Chat* (SIGGRAPH '96) — the authors' own account of the algorithms this milestone borrows: balloon construction and layout, character placement and orientation, default gesture/expression selection, semantic panel elements, and virtual-camera zoom. It describes the *intent* behind the code in `original-projects/comic-chat/`, so it is the faster way in for anyone starting 5.1 or designing the event→panel mapping at 5.3.

The text sits at `reference/comic-chat-paper.md` but is **gitignored** — it is a third-party copyrighted ACM publication, kept locally rather than redistributed. If it is not in your checkout, retrieve it from the ACM Digital Library or the authors' pages; nothing in the build depends on it. (It lived at `docs/comic-chat-paper.md` until 2026-07-19, when all third-party reference material was consolidated under `reference/`.)

---

## Milestone 6 — Modernization & Asset Separation (v1.x)

Post-parity, per PORTING_STRATEGY Phase 6 and the solopreneur strategy: refactoring, performance, documentation quality, and separating reusable assets (engine, IR spec, ZIL importer) under neutral branding for potential standalone use. Stages to be defined after Gate C/D.

---

## Session Protocol

Each session: pick the next ☐ stage (or continue a ◐ one) → execute → update stage status here → update `HANDOFF.md`. Never start a later milestone's stage while an earlier ⚑ gate is unresolved, except 5.1 (Comic Chat analysis), which is independent and can fill any session.
