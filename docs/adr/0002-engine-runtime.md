# ADR 0002 — Engine Runtime and Engine↔UI Contract

- **Status:** Accepted
- **Date:** 2026-07-18
- **Amended:** 2026-07-19 — added "Alternatives Considered: existing Z-machine interpreters" (no change to the decision)
- **Amended:** 2026-07-20 — added "Scope of Portability: source frontends, not story files" (no change to the decision)
- **Amended:** 2026-08-06 — `light-changed` added to the event vocabulary; `contractVersion` 1.0.0 → 1.1.0 (additive, the growth this ADR anticipated)
- **Stage:** 2.3 (⚑ **Gate B resolution**; see `docs/DEVELOPMENT_PLAN.md`)
- **Related:** ADR 0001 (behavior representation), `docs/archive/gemini-analysis-on-plan-and-strategy.md` (interface-first recommendation)

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
  /** Whether the player can see. Baseline on the opening turn, then on flips only. */
  | { type: "light-changed"; lit: boolean }
  | { type: "game-over"; outcome: "victory" | "death" | "quit"; text: string }
  /** Parser needs clarification; next command answers it. */
  | { type: "question"; text: string };
```

Contract rules:

- **Events are semantic, never presentational.** `speech` carries a speaker id, not a bubble position; `player-moved` carries room ids, not panel layouts. The text UI (stage 5.2) renders `narration`/`speech`/`question` and ignores the rest; the comic renderer (stage 5.3) maps the same events to panels. Gate D may *add* event metadata (e.g. emotion hints) — additively, under `contractVersion`.
- **The event vocabulary above is the architectural shape, not a frozen list.** Milestone 4 will grow payloads/variants additively as systems land (inventory listing, light/darkness, daemon messages); breaking changes bump `contractVersion`.
- **A derived fact crosses the contract as an event, not as a global.** `light-changed` (v1.1.0, the
  "light/darkness" growth named above) reports ZIL's `LIT?` — the room's own ONBIT or any lit source
  in scope — recomputed at the turn boundary. It is deliberately *not* the `LIT` global: that global
  belongs to the extracted routines, which set it at the moments the story file chose and branch on
  it, so the engine writing it to serve a UI would be a behavior change wearing a feature's clothes.
  The same fact is stored on `SaveState.lit` (optional; absent in a 1.0.x save), because `restore()`
  emits no events and a host whose state is folded from the stream would otherwise have to
  reimplement `LIT?` on its own side.
- **Narration fidelity comes first**: golden-transcript parity is measured on the concatenated `narration`/`speech`/`question` text of each turn, which must reproduce dfrotz output (modulo the sanctioned banner/ordering diffs noted in HANDOFF).

## Alternatives Considered: existing Z-machine interpreters

*(Added 2026-07-19. The original ADR argued TypeScript vs. C++/WASM and never recorded why the engine is written at all rather than reused. This is the first question a new reader asks, so it is answered here.)*

Zork I is a solved execution problem. Mature Z-machine interpreters exist, and at least one is already a dependency of this repository:

- **ZILF / ZAPF** (Tara McGrew and contributors) — ZIL compiler and assembler. **Adopted, not reinvented.** Pinned at 0.11.1 since stage 0.1; `verification/build.sh` uses it to produce `verification/build/zork1.z3`, which `verification/run-transcripts.sh` replays under dfrotz to generate the golden transcripts that stage 4.4 diffs the engine against. ZILF is this project's ground-truth oracle and nothing here duplicates it.
- **ZLR** (Tara McGrew) — Z-machine interpreter for .NET that JIT-compiles routines. Correct and fast, but a .NET runtime is not a browser target, and speed is irrelevant at IF scale (see Context).
- **ZVM / ifvms.js** (Parchment) — a browser-native Z-machine in JavaScript. This is the strongest form of the objection: it would run Zork I in a browser today, with no `importer/` and no `ir/`.

None of these are Microsoft projects, a common misreading of the open-sourcing announcement. Microsoft/Activision released the **ZIL source**; the toolchain around it is independent community work.

**Why the engine is still written.** A Z-machine executes a *memory image*. Compilation is lossy in exactly the dimension this project needs: rooms, objects, verbs and routines become bytes at fixed offsets, and the names, structure, and intent are gone. An interpreter can therefore tell you what text the game printed, but not *who spoke it, from where, or why*.

The engine↔UI contract above depends on precisely that missing information. `speech` carries a `speaker` id; `player-moved` carries room ids; Gate D may add emotion hints. Those fields are recoverable from the IR — `ir/artifacts/` holds 110 rooms with exits, 137 objects, 267 parser rules, and 346 routines as behavior AST — and are not recoverable from `zork1.z3` without reverse-engineering semantics back out of compiled bytes, which is strictly harder than extracting them from the ZIL that produced it. The comic renderer (stage 5.3) needs semantic events to choose a character, gesture, and balloon; a Z-machine cannot supply them, and bolting heuristic text-scraping onto an interpreter's output would reintroduce the fragility the IR exists to remove.

Restated as the project's core principle (`AGENTS.md`): reusing an interpreter is *recreating the historical runtime*. Extracting semantics into the IR is the stated objective, and the two paths produce different artifacts — a playable binary versus an introspectable world document.

**Consequences of this reading:**

- The ZILF dependency is deliberate and should stay. Removing it would cost the verification oracle; there is no reason to reimplement a ZIL compiler.
- **For Group A builtin semantics, the normative source is the Z-Machine Standards Document 1.1**, not any interpreter's source. Object-tree operations, property/flag behavior, and parser-buffer layout — including the `(LEXV)` / `(BYTE LENGTH)` buffers that stage 3 denies by design — are all specified there. The standard is freely available, licensing-neutral, and is the document ZLR itself implements against; consulting it is strictly better than reverse-engineering an implementation of it.
- **ZLR is a last-resort reference, not a dependency and not the primary source.** Milestone 4 re-expresses semantics that ZLR also implements, so reading it and then implementing against it is where a derivation argument would live. Two facts sharpen this: ZLR **ships no license for its own code** (verified 2026-07-19 — see `THIRD_PARTY.md`; default copyright therefore applies, which is more restrictive than GPL), and the Standards Document answers the same questions normatively. Consult ZLR only where the standard is genuinely ambiguous, prefer describing the observed *behavior* over reading the implementation, and record any such consultation here. No ZLR code is used, adapted, or distributed.
- **Reference material stays out of version control.** ZILF/ZLR sources, the Z-Machine Standard, and the Comic Chat paper live in a gitignored `reference/` directory. They are never placed in `original-projects/`, which is version-controlled by design — ZILF is GPL-3.0, ZLR is unlicensed, and vendoring either would contradict `NOTICE` and this repository's Apache-2.0 licensing.
- If the objective ever narrowed to "play Zork I in a browser," this ADR should be revisited: ZVM would win outright.

## Scope of Portability: source frontends, not story files

*(Added 2026-07-20. The project began as "comic-rendered Zork I." Zork I is one work in the interactive-fiction domain, and the natural follow-up question is whether the engine should eventually run **any Z-machine-compatible** game. This section records the answer and the boundary it draws, so the ambition is widened deliberately rather than drifting.)*

**The long-term target is an IR-native adventure engine with pluggable source frontends. Compiled story files (`.z3`/`.z5`/`.z8`) are explicitly out of scope as an engine input.**

The two readings of "support more interactive fiction" are architecturally opposite:

- **Consume more *source* languages.** ZIL is frontend #1 (`importer/`). Each frontend lowers a source language into the IR; the engine is unchanged. This is the direction this ADR endorses.
- **Consume compiled *story files*.** This means executing a memory image, and it re-raises — identically — the objection answered in "Alternatives Considered" above. A story file cannot supply `speech.speaker` or `player-moved` room ids, so the comic renderer (stage 5.3) would have to recover them by heuristic text-scraping, which is the fragility the IR exists to remove. It is also not an extension of the engine but a second engine: the IR engine evaluates semantic structures (entities, properties, behavior AST), a Z-machine decodes opcodes over a byte array, and they would share nothing but the event contract. Adopting it would trade the project's distinguishing capability for coverage that ZVM already provides better (see the final bullet of the previous section, which stands).

**What the widened scope buys.** The ZIL family is the cheap and high-value expansion: Zork II/III, Enchanter, Planetfall and their siblings are the same language, and reach them through the existing importer, the same builtin set (ADR 0001), and mostly corpus work rather than new architecture. Inform 6 source is a plausible frontend #2 — its object tree and property model map onto the IR with a translation layer, not an engine change. Both remain speculative; neither is scheduled.

**What this requires of Milestone 4 — the only actionable part today.** The engine does not exist yet, so nothing here changes the plan. The standing risk is baking Zork-I-specific assumptions into engine core, and the insurance is three rules already consistent with current practice:

1. **Builtins implement Z-Machine Standard semantics, not "whatever Zork I needs."** The Standards Document 1.1 is already the normative source for Group A (previous section); this generalizes the reason — a builtin written to the standard is portable across the ZIL corpus by construction, one written to a single game's call sites is not.
2. **Game-specific data stays in artifacts, never in engine source.** Vocabulary, parser rules, the routines catalogued as builtins-by-design, and later the comic art bindings are inputs to the engine, not constants inside it. `createEngine(world, options)` already expresses this; the rule is that no `zork1` identifier appears in `engine/`.
3. **The first portability test is an import, not a refactor.** Once M4 plays Zork I against the golden transcripts, attempt Zork II through the existing pipeline. Whatever breaks is the honest inventory of Zork-I-specific assumptions in the IR and the engine, obtained for the cost of a session rather than a rewrite. Do not generalize speculatively before that evidence exists.

**Revisit if:** a source frontend turns out to need engine-visible concepts the IR cannot express (in which case the IR, not the engine, is the thing to amend), or the objective narrows back to a single game (in which case the previous section's ZVM bullet applies).

## Consequences

- **⚑ Gate B resolves.** `docs/archive/PORTING_STRATEGY.md` and `AGENTS.md` are updated in this change: "support WebAssembly" objectives and the WASM pipeline stage are replaced by the TypeScript engine + browser-native UI; the IR's independence list keeps WASM (independence from a technology survives not using it). The development plan's Milestones 3–5 stand structurally; Milestone 4 now names the `engine/` TypeScript package and this contract, and the old "Phase 4 — WebAssembly" of PORTING_STRATEGY becomes browser integration of the TS engine.
- The repo becomes a TypeScript monorepo-of-convention (`importer/`, `ir/`, then `engine/`, later the UI package) with the same toolchain (tsc strict, vitest, tsx) — one language across every subsystem for AI-assisted work.
- The stage-2.2 builtin registry (OPEN-CLOSE, DO-WALK, …) becomes part of the engine package, implemented against the engine's world runtime; the POC substrate in `ir/poc/` remains as documentation of the semantics.
- Comic Chat's C++ (layout/expression concepts) is **analyzed, never compiled**: stage 5.1 extracts algorithms into documentation, and the UI layer reimplements them in TypeScript — consistent with the Gemini boundary recommendation.
- Risk accepted: if an unforeseen performance wall appears (it should not, at IF scale), the mitigation is compiling the *hot path* (e.g. behavior evaluation) — possible precisely because behavior is data and the contract is serialized.
