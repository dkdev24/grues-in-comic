# Intermediate Representation (IR)

The IR is the central abstraction of Grues in Comic: the engine executes IR, never ZIL. This package defines the IR schema, a strict validator, and hand-written sample IR that pins the schema against the historical source.

Stage 2.1 scope is the **declarative world** — rooms, exits, objects, flags/properties, globals, tables. Imperative behavior (ROUTINE/ACTION bodies) is represented only as opaque routine-name strings until stage 2.2 decides its representation.

The normative schema specification lives in `docs/IR_SCHEMA.md` (repo root). This README covers the tooling.

## Layout

| Path | Purpose |
|---|---|
| `src/schema.ts` | TypeScript types for the IR world document — the schema's source of truth |
| `src/behavior.ts` | Behavior AST types (stage 2.2; canonical per ADR 0001) — not yet wired into `WorldDocument` |
| `src/validate.ts` | `validateWorld(json)` — structural pass (strict, unknown keys rejected) + referential pass (all ids resolve) |
| `src/cli.ts` | Validator CLI (run via `npm run validate`) |
| `src/extract-world.ts` | Stages 3.1–3.2 deterministic extraction — importer AST artifacts → world-model IR (all rooms/exits/connections + all objects with properties/containment) |
| `src/extract-cli.ts` | Extraction CLI (run via `npm run extract`); validates before writing |
| `src/index.ts` | Public API |
| `samples/` | Hand-written IR transcribed from `original-projects/zork1/` — West of House, Kitchen, Living Room + reference stubs |
| `artifacts/` | Generated IR (`zork1.world.json`, stages 3.1–3.2: full rooms + objects) — never edit by hand, regenerate with `npm run extract` |
| `poc/` | Stage 2.2 POC — reference interpreter, hand-written behavior ASTs (TRAP-DOOR-EXIT, KITCHEN-WINDOW-F), the competing hand-transpiled variant, shared world/builtin substrate |
| `test/` | Sample-world integration tests + validator unit tests + behavior differential/golden tests |

## Usage

```bash
npm install
npm test           # validator unit tests + sample-world + extraction checks
npm run typecheck
npm run validate   # validate samples/ and artifacts/; exit 1 on any error
npm run extract    # importer AST artifacts → artifacts/zork1.world.json
```

```ts
import { validateWorld } from "./src/index.js";
const result = validateWorld(JSON.parse(text));
result.valid;             // boolean
result.errors;            // [{ path: "rooms[0].exits[1].to", message: 'unknown room "X"' }]
result.summary?.routineRefs; // opaque behavior refs awaiting stage 2.2
```

## Sample coverage

`samples/west-of-house.world.json` transcribes three rooms chosen to exercise every exit variant in Zork I:

- **WEST-OF-HOUSE** — plain exits, blocked-message exit, conditional exits (`IF WON-FLAG`), scenery globals
- **KITCHEN** — door exits (`IF KITCHEN-WINDOW IS OPEN`), conditional with else-message, room score (VALUE 10)
- **LIVING-ROOM** — conditional with else-message, routine exit (`PER TRAP-DOOR-EXIT`), PSEUDO nouns

plus objects MAILBOX (container), ADVERTISEMENT (readable, text with `|`→newline applied), KITCHEN-WINDOW (door in local-globals), the IN-HOUSE-AROUND table, and four boolean globals. Entities marked `"stub": true` are placeholders so all references resolve; Milestone 3 replaces them with full definitions.
