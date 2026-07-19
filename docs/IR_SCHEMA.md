# IR Schema — Declarative World (stage 2.1)

Normative specification of the Grues in Comic Intermediate Representation, declarative-world subset. The machine-readable source of truth is `ir/src/schema.ts`; this document explains the design and the ZIL mapping. Current schema version: **`irVersion: "0.6.0"`** (0.6.0 added loops — `loop`/`block`/`break`/`continue` — and object-tree iteration `first`/`next` to the behavior AST for stage 3.5 batch b).

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
  "irVersion": "0.6.0",       // must match the schema version exactly
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
| `location` | `IN` | `{kind:"room"\|"object", id}` \| `{kind:"local-globals"}` \| `{kind:"global"}` (ZIL `GLOBAL-OBJECTS` — in scope everywhere) \| `{kind:"nowhere"}` |
| `synonyms`, `adjectives` | `SYNONYM`, `ADJECTIVE` | parser vocabulary |
| `flags` | `FLAGS` | declared in registry |
| `action` | `ACTION` | opaque routine name (ZIL `(ACTION 0)` — explicit no-op — maps to absent) |
| `description` / `initialDescription` / `text` | `LDESC` / `FDESC` / `TEXT` | ZIL `\|` newlines converted to `\n`; source line breaks inside strings collapse to spaces (applies to every extracted string; verified against golden transcripts) |
| `capacity`, `size`, `value`, `treasureValue`, `strength` | `CAPACITY`, `SIZE`, `VALUE`, `TVALUE`, `STRENGTH` | integers |
| `vehicleType` | `VTYPE` | room-flag id the vehicle travels on (boat → `NONLANDBIT`); validated against the flag registry |
| `descriptionRoutine` | `DESCFCN` | opaque routine computing the description (bat) |
| `stub` | — | placeholder marker |

The three ZIL world-tree scaffolding objects — `GLOBAL-OBJECTS`, `LOCAL-GLOBALS`, `ROOMS` — are **not** represented as IR objects. They exist in ZIL to allocate property slots and anchor the object tree; the IR expresses their semantics structurally (the `global`/`local-globals` location kinds and the rooms list).

### Vocabulary (optional section)

Parser vocabulary from `gsyntax.zil` (stage 3.3). Words keep their upper-case ZIL spelling; object nouns/adjectives stay on the objects.

| Field | ZIL origin | Notes |
|---|---|---|
| `directions` | `DIRECTIONS` | `{word, direction}` pairs; `direction` is an IR direction id |
| `buzzwords` | `BUZZ` | noise words the parser drops, including punctuation tokens (`.` `,` `"`) |
| `synonyms` | `SYNONYM` | `{word, synonyms}` — every alias parses as `word` |
| `syntax` | `SYNTAX` | `{verb, objects[0–2], action, preAction?}`; each object slot: `preposition?`, `find?` (flag id, validated against the registry), `options?` (enum: HELD, CARRIED, IN-ROOM, ON-GROUND, MANY, HAVE, TAKE) |

ZIL compile-time `<COND (<==? ,ZORK-NUMBER n> …)>` gates around vocabulary forms are resolved during extraction using `<SETG ZORK-NUMBER 1>` (Zork I): dead clauses (Zork II/III vocabulary) are dropped, live clauses join the stream.

### Routines (optional section)

Behavior extracted into the ADR 0001 behavior AST (`ir/src/behavior.ts` is normative; growth is logged in the ADR's appendix). One `BehaviorRoutine` per ZIL ROUTINE: `id`, `params?`/`defaults?`/`locals?`, `body` (statement list over the closed op vocabulary), `source?` provenance. Behavior property keys are IR field names (`description`, `treasureValue`, …) drawn from the closed `BEHAVIOR_PROPERTY_KEYS` set, never raw ZIL `P?` atoms. The validator enforces the closed vocabulary, resolves entity/global/flag references, checks locals against declarations, and reports `routines` and `unresolvedRoutineRefs` (references with no extracted routine — engine builtins or routines still catalogued as complex in `ir/artifacts/zork1.behavior-catalog.json`) in the summary.

## Validation

`ir/src/validate.ts` (`npm run validate` in `ir/`) runs two passes:

1. **Structural** — required fields present, correct primitive types, valid discriminants, integer-valued numerics, no unknown keys, unique ids (flat entity namespace; flags separately), unique exit direction per room.
2. **Referential** — exit `to` → room; exit `if` → global; exit `door` → object flagged `DOORBIT`; `location` → room/object; `scenery` → objects; table `ref` → any entity; every used flag declared.

A valid document yields a summary (entity counts, exit count, sorted `routineRefs`) — the routine list is the worklist stage 2.2 must give a representation to.

## Versioning

`irVersion` follows semver, versioning the *schema*, independent of project versions. Documents must match the validator's expected version exactly while the schema is pre-1.0; migration tooling is a post-1.0 concern. History: `0.1.0` stage 2.1 declarative world; `0.2.0` stage 3.2 object additions (`global` location kind, `vehicleType`, `descriptionRoutine`); `0.3.0` stage 3.3 `vocabulary` section (directions, buzzwords, synonyms, syntax rules); `0.4.0` stage 3.4 `routines` section (ADR 0001 behavior AST, expression-oriented value semantics); `0.5.0` stage 3.5 batches a+c (behavior `prop`/`set-prop`/`table-get`/`table-set`, `add`/`sub`/`mul`/`div`, expression-position `set-local`/`set-global`, routine `defaults`); `0.6.0` stage 3.5 batch b (`loop`/`block`/`break`/`continue`, object-tree `first`/`next`).

## Known deferrals

- **Behavior** (`action`/`routine`/`pseudo`/`descriptionRoutine` targets) — representation decided in `docs/adr/0001-behavior-representation.md` (structured behavior AST, `ir/src/behavior.ts`); wiring a `routines` section into `WorldDocument` (next `irVersion` bump) happens when Milestone 3 extraction populates it (stages 3.4–3.5).
- ~~**Vocabulary & syntax**~~ — done (stage 3.3, `vocabulary` section above).
- **ITABLE element semantics** (initializer counts) — revisit when the first ITABLE is transcribed; the `kind` is reserved.
- **Player/winner state, LOAD-ALLOWED-style engine parameters** — engine ADR (stage 2.3).
