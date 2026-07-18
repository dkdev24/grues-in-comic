# IR Schema — Declarative World (stage 2.1)

Normative specification of the Grues in Comic Intermediate Representation, declarative-world subset. The machine-readable source of truth is `ir/src/schema.ts`; this document explains the design and the ZIL mapping. Current schema version: **`irVersion: "0.1.0"`**.

## Scope and non-goals

In scope (stage 2.1): rooms, exits, objects, flags/properties, global variables, tables — everything about the world that is *data*.

Out of scope (stage 2.2 decides): imperative behavior — ROUTINE bodies, ACTION handlers, daemons/timers, parser syntax. Wherever the world references behavior, the IR stores an **opaque routine name** (plain string): room/object `action`, exit `routine`, pseudo `routine`. The validator collects these into `summary.routineRefs` but does not resolve them.

## Design principles

- **Engine-agnostic data.** An IR document is plain JSON — no ZIL constructs, browser APIs, WASM, or rendering concerns. Anything executable is referenced by name, never embedded.
- **Traceability.** Entity ids keep the original upper-case ZIL names (`WEST-OF-HOUSE`, `MAILBOX`) so every IR entity diffs directly against `original-projects/zork1/`. Ids share one flat namespace (as in ZIL); flags are a separate namespace.
- **Strict validation.** Unknown keys are errors. Every reference must resolve — exit targets, door objects, condition globals, object locations, scenery lists, table refs — and every flag used must be declared in the document's flag registry. Schema drift fails fast instead of accumulating.
- **Incremental composition.** Partial documents (samples, per-subsystem extraction batches in Milestone 3) stay valid by including referenced entities as minimal placeholders marked `"stub": true`. A stub satisfies references; its full definition lives in a later document revision.

## Document structure

```jsonc
{
  "irVersion": "0.1.0",       // must match the schema version exactly
  "meta": { "title", "source", "coverage", "notes" },   // optional provenance
  "flags":   [ { "id": "ONBIT", "description": "…" } ], // registry of every usable flag
  "globals": [ { "id": "WON-FLAG", "value": false } ],  // scalar globals only
  "tables":  [ { "id", "kind": "table|ltable|itable", "pure"?, "elements": [...] } ],
  "rooms":   [ ... ],
  "objects": [ ... ]
}
```

- **Globals** hold scalars: `false`/`true` (ZIL `<>`/`T`), integers, strings. A ZIL global whose value *is* a table (`<GLOBAL ABOVE-GROUND <LTABLE …>>`) is represented as a table entity only — the table id doubles as the global binding.
- **Table elements** are scalars or entity references `{ "ref": "LIVING-ROOM" }` (resolvable to any room/object/global/table id).

### Rooms

| Field | ZIL origin | Notes |
|---|---|---|
| `id`, `name` | atom, `DESC` | required |
| `description` | `LDESC` | omitted when the M-LOOK text comes from the action routine (behavior) |
| `exits` | direction properties | see below; one exit per direction |
| `flags` | `FLAGS` | each must be declared in the registry |
| `action` | `ACTION` | opaque routine name |
| `scenery` | room `GLOBAL` list | ids of objects located in `local-globals` |
| `pseudo` | `PSEUDO` | `[{ "noun", "routine" }]` |
| `score` | `VALUE` | points for first entry |
| `stub` | — | placeholder marker |

### Exits

Discriminated union on `kind`; `direction` is one of `north, south, east, west, northeast, northwest, southeast, southwest, up, down, in, out, land` (ZIL `NE`→`northeast`, etc.).

| `kind` | ZIL form | Fields |
|---|---|---|
| `to` | `(EAST TO KITCHEN)` | `to` |
| `blocked` | `(EAST "The door is boarded…")` | `message` |
| `conditional` | `(SW TO X IF FLAG [ELSE "msg"])` | `to`, `if` (global id), `else?` |
| `door` | `(EAST TO X IF OBJ IS OPEN)` | `to`, `door` (object id, must be flagged `DOORBIT`; travel tests its runtime `OPENBIT`), `else?` |
| `routine` | `(DOWN PER TRAP-DOOR-EXIT)` | `routine` (opaque) |

### Objects

| Field | ZIL origin | Notes |
|---|---|---|
| `id`, `name` | atom, `DESC` | required |
| `location` | `IN` | `{kind:"room"\|"object", id}` \| `{kind:"local-globals"}` \| `{kind:"nowhere"}` |
| `synonyms`, `adjectives` | `SYNONYM`, `ADJECTIVE` | parser vocabulary |
| `flags` | `FLAGS` | declared in registry |
| `action` | `ACTION` | opaque routine name |
| `description` / `initialDescription` / `text` | `LDESC` / `FDESC` / `TEXT` | ZIL `\|` newlines converted to `\n`; source line breaks inside strings collapse to spaces |
| `capacity`, `size`, `value`, `treasureValue`, `strength` | `CAPACITY`, `SIZE`, `VALUE`, `TVALUE`, `STRENGTH` | integers |
| `stub` | — | placeholder marker |

## Validation

`ir/src/validate.ts` (`npm run validate` in `ir/`) runs two passes:

1. **Structural** — required fields present, correct primitive types, valid discriminants, integer-valued numerics, no unknown keys, unique ids (flat entity namespace; flags separately), unique exit direction per room.
2. **Referential** — exit `to` → room; exit `if` → global; exit `door` → object flagged `DOORBIT`; `location` → room/object; `scenery` → objects; table `ref` → any entity; every used flag declared.

A valid document yields a summary (entity counts, exit count, sorted `routineRefs`) — the routine list is the worklist stage 2.2 must give a representation to.

## Versioning

`irVersion` follows semver, versioning the *schema*, independent of project versions. Documents must match the validator's expected version exactly while the schema is pre-1.0; migration tooling is a post-1.0 concern. Stage 2.2 (behavior) is expected to bump to `0.2.0` by adding a `routines` section and tightening `routineRefs` resolution.

## Known deferrals

- **Behavior** (`action`/`routine`/`pseudo` targets) — stage 2.2 / Gate B.
- **Vocabulary & syntax** (verbs, SYNTAX lines, buzzwords) — Milestone 3.3; object `synonyms`/`adjectives` are kept now since they are object-local data.
- **ITABLE element semantics** (initializer counts) — revisit when the first ITABLE is transcribed; the `kind` is reserved.
- **Player/winner state, LOAD-ALLOWED-style engine parameters** — engine ADR (stage 2.3).
