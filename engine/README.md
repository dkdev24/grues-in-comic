# `@grues-in-comic/engine`

The engine core (milestone 4): a platform-independent state machine that executes
an IR world document and emits structured gameplay events.

## What this package is

Per **ADR 0002** (Gate B), the engine is:

- **TypeScript, zero runtime dependencies.** `@grues-in-comic/ir` is imported for
  *types only* (`import type`), so nothing survives into emitted JS.
- **Pure, deterministic, synchronous.** No DOM, no timers, no I/O, no rendering
  vocabulary. Same world + same seed + same commands ⇒ identical events.
- **JSON at the boundary.** Every value crossing the engine↔UI contract is
  serializable, which makes Worker hosting, save files, and the transcript
  harness the same problem.

Rendering is entirely the UI layer's job (milestone 5). The engine says
*"the player moved from A to B"*; it never says how to draw it.

## Layout

| Module | Role |
|---|---|
| `src/events.ts` | The ADR 0002 event contract, as code (`CONTRACT_VERSION`) |
| `src/state.ts` | `GameState` + object-tree primitives (`move`, `isIn`, flags) |
| `src/load.ts` | Boots an IR `WorldDocument` into live state |
| `src/movement.ts` | Exit resolution and room transitions |
| `src/rng.ts` | Seeded RNG — the *only* source of randomness |
| `src/vocabulary.ts` | The lexicon: verbs, synonyms, nouns, adjectives, directions |
| `src/scope.ts` | What the player can refer to from where they stand |
| `src/parser.ts` | Text in → ZIL's PRSA/PRSO/PRSI out |
| `src/runtime.ts` | Per-turn context and the event sink |
| `src/interpreter.ts` | The ADR 0001 behavior-AST evaluator |
| `src/builtins.ts` | ZIL's utility layer (Group A): clock, light, PICK-ONE |
| `src/engine.ts` | `createEngine`, the turn loop, ZIL's dispatch chain |

## Status

| Stage | Task | Status |
|---|---|---|
| 4.1 | State & world runtime | ✅ |
| 4.2 | Command parser | ✅ |
| 4.3 | Action dispatch & events | ✅ |
| 4.4 | Transcript replay harness | ✅ (all 3 goldens, 30/30 turns) |
| 4.5 | Systems completion (⚑ Gate C) | ☐ |

## Commands

```sh
npm test          # vitest, including golden-transcript parity
npm run typecheck
npm run replay    # parity report; exit code = failing walkthroughs
```

Tests run against the real extracted Zork I world (`ir/artifacts/zork1.world.json`),
not fixtures — a load or movement regression shows up against 110 rooms and 137
objects rather than a toy map.
