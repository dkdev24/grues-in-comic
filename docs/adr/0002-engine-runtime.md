# ADR 0002 — Engine Runtime and Engine↔UI Contract

- **Status:** Accepted
- **Date:** 2026-07-18
- **Stage:** 2.3 (⚑ **Gate B resolution**; see `docs/DEVELOPMENT_PLAN.md`)
- **Related:** ADR 0001 (behavior representation), `docs/gemini-analysis-on-plan-and-strategy.md` (interface-first recommendation)

## Context

The strategy documents assumed the engine would be compiled to WebAssembly ("The final result is a modern WebAssembly application"), while the development plan kept the question open as Gate B: **TypeScript vs. C++/WASM**, to be decided on evidence from stages 1.1–2.2. The same stage must define the engine↔UI boundary interface-first (Gemini recommendation: the engine owns only state and event sequencing; rendering is fully owned by a web-native UI layer).

Evidence gathered:

- **TypeScript has been frictionless across three subsystems** — the ZIL parser (11,899-line corpus, deterministic artifacts), the IR schema/validator, and the behavior-AST reference interpreter. Strict typing (`exactOptionalPropertyTypes`, discriminated unions) has repeatedly caught real defects at compile time.
- **ADR 0001 made behavior plain data.** The engine is therefore a modest interpreter over JSON — world state, an AST evaluator, a parser, a scheduler. There is no computational load that would motivate native code: Zork I is turn-based, single-player, with hundreds (not millions) of routine invocations per turn.
- **The verification path is Node-based.** Golden-transcript replay (stage 4.4) diffs engine output against dfrotz captures in a shell harness; a TS engine runs there natively with zero build/bridge overhead.
- A C++/WASM engine would add an Emscripten toolchain, a serialization bridge, a second language for one contributor (human or AI) to maintain, and debugging through a WASM boundary — while its main benefit (raw performance) is irrelevant at this scale.

## Decision

### 1. The engine is TypeScript. WebAssembly is dropped as a target.

The Grues in Comic Engine will be implemented as a platform-independent **TypeScript package (`engine/`)** with zero runtime dependencies, executable in any modern JS runtime (browser main thread, Web Worker, Node). "Browser-native" is achieved by being JavaScript, not by compiling to WASM.

Portability is preserved where it architecturally matters — in the artifacts, not the implementation: the IR is runtime-independent JSON (ADR 0001), and the engine↔UI contract below is JSON-serializable. A future native/WASM reimplementation would consume the same IR and emit the same events; nothing decided here forecloses it, and nothing planned requires it.

### 2. Engine↔UI contract (interface-first)

The engine is a **pure, deterministic, synchronous state machine**. No DOM, no timers, no I/O, no rendering vocabulary. The contract is versioned (`contractVersion`), and every value crossing it is JSON-serializable — which makes Worker/postMessage hosting, save files, and transcript harnesses the same problem.

```ts
interface Engine {
  /** Execute one player command; returns the ordered events of that turn. */
  command(input: string): TurnResult;
  /** JSON-serializable full game state (save/load, time travel, testing). */
  snapshot(): SaveState;
  restore(save: SaveState): void;
}

/** createEngine(world: WorldDocument, options?: { seed?: number }): Engine
 *  Same world + same seed + same command sequence ⇒ identical events
 *  (golden-transcript parity, stage 4.4, depends on this). All randomness
 *  (PICK-ONE, thief movement, combat) flows through the seeded RNG. */

interface TurnResult {
  events: EngineEvent[];
  /** Turn counter after execution (daemons/timers advance per turn). */
  turn: number;
}

type EngineEvent =
  /** Prose for the player. `channel` lets UIs style without parsing text. */
  | { type: "narration"; channel: "room-title" | "prose" | "system"; text: string }
  /** Dialogue attributed to a character — the hook the comic layer builds on. */
  | { type: "speech"; speaker: string; text: string }
  /** Player location changed (room transition, incl. forced moves). */
  | { type: "player-moved"; from: string; to: string }
  /** An object's containment changed (take/drop/put; thief steals). */
  | { type: "object-moved"; object: string; from: string; to: string }
  | { type: "score-changed"; score: number; delta: number }
  | { type: "game-over"; outcome: "victory" | "death" | "quit"; text: string }
  /** Parser needs clarification; next command answers it. */
  | { type: "question"; text: string };
```

Contract rules:

- **Events are semantic, never presentational.** `speech` carries a speaker id, not a bubble position; `player-moved` carries room ids, not panel layouts. The text UI (stage 5.2) renders `narration`/`speech`/`question` and ignores the rest; the comic renderer (stage 5.3) maps the same events to panels. Gate D may *add* event metadata (e.g. emotion hints) — additively, under `contractVersion`.
- **The event vocabulary above is the architectural shape, not a frozen list.** Milestone 4 will grow payloads/variants additively as systems land (inventory listing, light/darkness, daemon messages); breaking changes bump `contractVersion`.
- **Narration fidelity comes first**: golden-transcript parity is measured on the concatenated `narration`/`speech`/`question` text of each turn, which must reproduce dfrotz output (modulo the sanctioned banner/ordering diffs noted in HANDOFF).

## Consequences

- **⚑ Gate B resolves.** `docs/PORTING_STRATEGY.md` and `AGENTS.md` are updated in this change: "support WebAssembly" objectives and the WASM pipeline stage are replaced by the TypeScript engine + browser-native UI; the IR's independence list keeps WASM (independence from a technology survives not using it). The development plan's Milestones 3–5 stand structurally; Milestone 4 now names the `engine/` TypeScript package and this contract, and the old "Phase 4 — WebAssembly" of PORTING_STRATEGY becomes browser integration of the TS engine.
- The repo becomes a TypeScript monorepo-of-convention (`importer/`, `ir/`, then `engine/`, later the UI package) with the same toolchain (tsc strict, vitest, tsx) — one language across every subsystem for AI-assisted work.
- The stage-2.2 builtin registry (OPEN-CLOSE, DO-WALK, …) becomes part of the engine package, implemented against the engine's world runtime; the POC substrate in `ir/poc/` remains as documentation of the semantics.
- Comic Chat's C++ (layout/expression concepts) is **analyzed, never compiled**: stage 5.1 extracts algorithms into documentation, and the UI layer reimplements them in TypeScript — consistent with the Gemini boundary recommendation.
- Risk accepted: if an unforeseen performance wall appears (it should not, at IF scale), the mitigation is compiling the *hot path* (e.g. behavior evaluation) — possible precisely because behavior is data and the contract is serialized.
