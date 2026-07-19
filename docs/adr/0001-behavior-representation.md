# ADR 0001 — Behavior Representation in the IR

- **Status:** Accepted
- **Date:** 2026-07-18
- **Stage:** 2.2 (⚑ Gate B input; see `docs/DEVELOPMENT_PLAN.md`)

## Context

The declarative-world IR (stage 2.1, `docs/IR_SCHEMA.md`) stores every behavior reference — room/object `action`, exit `routine`, pseudo `routine` — as an opaque name. Something must give those names meaning. Zork I has 439 top-level ROUTINEs; the sample world alone references 7. The candidate representations named in the plan:

1. **Interpreted mini-language** — behavior as structured data (an AST of IF-domain operations) executed by an engine interpreter.
2. **Transpiled functions** — behavior as TypeScript source, compiled into the engine.
3. **Hybrid** of the two.

Constraints from AGENTS.md: the IR must stay independent of ZIL, browser APIs, WebAssembly, and rendering technology; the engine executes the IR, not the original source language.

## POC (both ways)

Two nontrivial routines were hand-written in both representations and executed against an identical world-state/builtin substrate (`ir/poc/`):

- `TRAP-DOOR-EXIT` (1actions.zil:567) — exit routine: nested COND, flag test, returns a room id or refuses with narration + pronoun binding (`THIS-IS-IT`).
- `KITCHEN-WINDOW-F` (1actions.zil:241) — object action: multi-verb dispatch, global mutation, shared-helper call (`OPEN-CLOSE`), location-dependent branching, explicit RTRUE.

12 differential scenarios assert outcome equality (transcript, return value, flag/global mutations, walk re-dispatch, pronoun referent); 10 golden tests pin both to the source's expected text (`ir/test/behavior-poc.test.ts`). The reference interpreter is ~130 lines (`ir/poc/interpreter.ts`); the AST vocabulary needed for both routines is 12 expression ops and 6 statement ops (`ir/src/behavior.ts`).

Findings:

- Hand-transcription effort was comparable in both forms; the AST is ~4× more verbose per routine but mechanical to produce and review clause-by-clause against ZIL.
- The corpus's action-routine style (COND + predicates + TELL + small mutations) maps onto a *small closed vocabulary*; nothing in either POC routine needed general-purpose computation.
- The shared ZIL utility layer (`OPEN-CLOSE`, `DO-WALK`, `THIS-IS-IT`, `PICK-ONE`, …) belongs to neither representation: it is engine functionality invoked by name.

## Decision

**Interpreted mini-language, with an engine-builtin layer — i.e. the hybrid leans interpreted.** Concretely:

1. The canonical behavior representation is the **structured behavior AST** of `ir/src/behavior.ts`: plain JSON data, one `BehaviorRoutine` per ZIL ROUTINE, using a closed vocabulary of IF-domain expressions and statements. It ships inside IR documents (a `routines` section; `irVersion` 0.2.0 when wired in).
2. **Generic ZIL utility routines become engine builtins** invoked via `call`. Game-specific logic is transcribed; genre plumbing is not. The builtin registry is part of the engine↔IR contract defined at stage 2.3.
3. Engines **may compile the AST to native closures at load time** as an optimization — the AST remains the single source of truth, so this is invisible to the IR.
4. Transpiled TypeScript is **rejected as the canonical form**: embedding a specific language's source in the IR would tie it to a JS runtime (violating IR independence), make the stage-2.3 TS-vs-WASM decision irreversible in the wrong layer, and force Milestone 3's LLM-assisted extraction to be validated as arbitrary code rather than schema-checked data.

Why interpreted wins on the axes that matter here:

- **IR independence & portability** — JSON data runs unchanged whatever stage 2.3 picks; a future C++/WASM engine reimplements a small interpreter rather than a TS compiler.
- **Safe LLM extraction** (Milestone 3) — extracted behavior is validated by the existing strict-validator approach (schema + referential checks + closed op vocabulary), diffed structurally against source, and can never smuggle in arbitrary code.
- **Analyzability** — Graphify/OpenWiki (stage 2.4) and coverage tooling can walk behavior ASTs like any other IR data; routine references become a checkable graph.
- **Determinism** — randomness (`PICK-ONE`) is confined to builtins, where a seeded RNG keeps golden-transcript replay (stage 4.4) deterministic.
- **Performance is a non-issue** at IF scale (single-player, turn-based, hundreds of routines).

## Consequences

- Stage 2.3 (engine runtime ADR) receives its Gate B input: with behavior as data, the engine language choice is genuinely free; TypeScript has been frictionless across importer, IR, and POC interpreter — that experience plus the interface-first contract requirement should drive 2.3.
- Milestone 3.4–3.5 extraction targets the behavior AST; the validator gains a `routines` section, `equal-to-declared-refs` resolution of `routineRefs`, and an op-coverage report.
- The AST vocabulary will grow as extraction meets the full corpus (object motion `MOVE`/`REMOVE`, `QUEUE`/daemons, `JIGS-UP`, property access, arithmetic). Growth is governed: a new op requires updating schema + validator + interpreter + this ADR's appendix, never ad-hoc escape hatches.
- Open questions deferred deliberately:
  - ZIL's implicit last-expression return value (POC: fall-off-end returns false) — resolve when a corpus routine relies on it.
  - The room-action protocol (`RARG` = M-LOOK/M-ENTER/…) — representable today as a param + `equal?`; may deserve first-class dispatch later.
  - `PRSO`/`PRSI` binding and the parser interface — Milestone 3.3/4.2 territory.

## Deliberate engine-builtin list (stage 3.5 triage, 2026-07-19)

The complete classification of the 61 routines still catalogued after batch (d). Group A stays catalogued **by design** — these are the engine's responsibility, and extraction will never represent them; their catalog entries are the authoritative "builtin frontier". Group B is missing IR vocabulary with a named future batch. Coverage math: of 292 referenced handlers, 252 are extracted (86%); of the 40 unresolved references, most resolve to Group A builtins the engine provides.

### Group A — engine builtins (stay catalogued by design)

- **Z-machine I/O and persistence meta verbs** — V-SAVE, V-RESTORE, V-RESTART, V-QUIT, V-VERIFY, V-SCRIPT/V-UNSCRIPT (Z-header transcript-bit BOR/BAND), V-RECORD/V-UNRECORD (DIROUT), V-COMMAND-FILE (DIRIN), V-ECHO (GETB input loop), V-VERSION (Z-header reads). The ADR 0002 event contract owns save/load/quit; transcripts and echo are UI concerns.
- **Randomness** — V-RANDOM, PICK-ONE (REST + RANDOM over response tables; already the POC's canonical builtin). Seeded RNG per the determinism rule.
- **Parser/scope/movement machinery** — LIT? (gparser.zil light computation via DO-SL/MAP-SCOPE), GOTO (the room-change primitive: lighting recompute, scoring, room description — engine core at stage 4.1), V-WALK and V-LEAP (exit-table reflection via GETPT on direction properties), GLOBAL-IN? and PRE-FILL (GETPT `P?GLOBAL` in-scope tests), OTHER-SIDE (NEXTP door-to-direction reflection), NOT-HERE-OBJECT-F and V-SAY (parser-buffer/re-parse plumbing: ITABLE P-PRSO, ACTORBIT). Already-established builtins from earlier batches remain: DEFMAC names (ENABLE, DISABLE, PROB, FLAMING?, …), PERFORM, and the batch (d) clock (QUEUE, INT, CLOCKER).

### Group B — future extraction batches (missing vocabulary, not builtins)

- **(f) expression-position statement ops** (precedent: batch (c)'s expr-position `set-local`/`set-global`): `tell` in expression position (I-XB, RUSTY-KNIFE-FCN, TROLL-FCN — the "TELL CR as argument" cluster), `set-flag`/`clear-flag` in expression position (I-RFILL, SAND-FUNCTION), and `PRINTN` → a TELL number part (V-DIAGNOSE; V-VERSION stays Group A for its GETB).
- **(g) expression-position `cond` + deterministic arithmetic** `abs`/`mod`/`min` ops: CANARY-OBJECT, GRATE-FUNCTION, I-THIEF, SHAKE-LOOP; I-CYCLOPS, SAILOR-FCN, CYCLOPS-FCN.
- **(h) table views** — `table-rest` (ZIL `<REST tbl bytes>` → element-offset view over word tables): unlocks the I-LANTERN/I-CANDLES countdown tables (LAMP-TABLE/CANDLE-TABLE), completing the batch (d) goldens.
- **(i) computed application** — `apply` over routine-name-string values (the convention batch (d) established for QUEUE targets): AWAKEN, DESCRIBE-OBJECT, V-BOARD.
- **(j) fatal return** — RFATAL as a `return` variant aborting the turn (CANDLES-FCN, ITAKE, JIGS-UP, PRE-BOARD, V-TELL); pin exact semantics with the stage 4.2/4.3 parser-loop contract.
- **World-document gaps, not behavior ops**: the gglobals.zil meta objects ROOMS, GLOBAL-OBJECTS, LOCAL-GLOBALS as first-class entities (DESCRIBE-ROOM, FIRSTER, PRE-TURN, ROPE-FUNCTION, TREE-ROOM, V-CLIMB-UP, V-DISEMBARK, V-EXIT; HACK-HACK, V-EAT, V-FIND), and nested-table elements (`VILLAINS` holds `<TABLE …>` forms — HERO-BLOW).
- **Deferred to M4 protocols**: LOUD-ROOM-FCN (inline `READ` of player input — needs the stage 4.2 input contract), I-SWORD (NEXTP adjacent-room scan — needs exit reflection; decide builtin vs op at stage 4.1), GOTO's own body (Group A regardless).

## Appendix — vocabulary growth log

Per the governance rule above (schema + validator + interpreter + this appendix):

- **Stage 3.4 batch 1** (2026-07-18, v0.5.4): added exprs `in?` (ZIL `IN?`), `loc` (`LOC`), and expression-position `call`; stmts `set-local` (`SET`), `move` (`MOVE`), `remove` (`REMOVE`), and `value` (expression statement — ZIL's bare `T` clause endings and predicates in statement position); TELL part `{name}` (ZIL `D`); routine `locals` ("AUX" bindings, initializers becoming a `set-local` prelude). Deterministic lowerings: `,P?DIR` → direction string, `,V?VERB` → verb word, numeric `CONSTANT`s → literals, bare atoms naming routines → name strings, `(ELSE …)` → `T` clause. **The implicit-return open question is resolved**: the language is expression-oriented — every statement yields a value, a routine returns the last executed statement's value, `cond` yields the taken clause's last value (predicate value on empty body, false when no clause fires), `tell`/flag/motion stmts yield true, assignments yield the assigned value, `call` yields the callee's value; falling off an empty body yields false. The reference interpreter implements these semantics; the hand-transpiled POC variant was corrected to match ZIL (its old fall-off-end-false returns were an artifact of the deferred question).
- Batch-1 deny list (catalogued, not represented): loops (`REPEAT`/`PROG`/`AGAIN`/`MAPF`), object-tree iteration (`FIRST?`/`NEXT?`), property and table access (`GETP`/`PUTP`/`GET`/`PUT`/`GETB`), arithmetic and bit ops, `APPLY`, `RFATAL`, compile-time `%<…>` macro evaluation inside bodies, and optional-parameter defaults. DEFMAC macro names (`ENABLE`, `PROB`, `FLAMING?`, …) and macro-gated routines (`PERFORM`) are legal `call` targets implemented as engine builtins.
- **Stage 3.5 batches (a)+(c)** (2026-07-19, v0.5.5, `irVersion` 0.5.0): added exprs `prop` (ZIL `GETP`), `table-get` (`GET`), `add`/`sub`/`mul`/`div` (16-bit signed, ZIL truncating `/`), and expression-position `set-local`/`set-global` (same shapes as the statement ops, like `call`); stmts `set-prop` (`PUTP`, yields its entity) and `table-set` (`PUT`, yields its table — ZIL `PUTP`/`PUT` return their first argument); routine `defaults` (ZIL `"OPT" (NAME <init>)`, applied by arity as in Z-code — an explicitly passed false does not trigger the default). Deterministic lowerings: `,P?NAME` property atoms → IR field names via the closed `BEHAVIOR_PROPERTY_KEYS` map (`P?LDESC` → `description`, `P?TVALUE` → `treasureValue`, …; unmapped atoms denied), n-ary arithmetic → left folds, unary `-` → `0 − x`, `<>` optional defaults → omitted (identical to the no-default arity behavior). Absent properties read as false (ZIL default 0 is false in ZIL). LTABLE indexing: index 0 answers the element count, index n reads element n−1. Still denied: `GETPT`/`PTSIZE`/`GETB`/`PUTB` (Z-machine property/byte pointers — engine-builtin territory, e.g. `PRE-FILL`'s in-scope test), `MOD`/`MIN`/`ABS`/`RANDOM` (randomness stays in builtins per the determinism rule), bit ops (`V-SCRIPT`'s Z-header transcript-bit poke must not enter the IR), loops/iteration (batch b), and MacroEval bodies (batch e).
- **Stage 3.5 batch (b)** (2026-07-19, v0.5.6, `irVersion` 0.6.0): added stmts `loop` (ZIL `REPEAT ()` — restarts its body when it completes), `block` (ZIL `PROG ()` — runs once, yields its last statement's value), `break` (exits the nearest enclosing loop/block with a value), `continue` (ZIL `AGAIN` — restarts the nearest enclosing loop/block); exprs `first`/`next` (ZIL `FIRST?`/`NEXT?` — object-tree iteration; `move` inserts an entity as its new container's FIRST child, matching Z-machine `insert_obj`; initial sibling order comes from the world document). Deterministic lowerings, exactly ZIL's activation semantics: `<RETURN v>` inside a REPEAT/PROG → `break` (value defaults to true), outside → routine `return`; `RTRUE`/`RFALSE` always routine returns; `AGAIN` outside a container is denied, as are non-empty REPEAT/PROG binding lists (none exist in the action-routine corpus). The validator statically rejects `break`/`continue` outside a loop/block. Historical quirks are preserved, not fixed (e.g. `OTVAL-FROB` discards its recursive call's value, so nested treasure never scores — verified by test).
- **Stage 3.5 batch (e)** (2026-07-19, v0.5.7, no schema change — extractor-only deterministic lowerings): compile-time `%<COND …>` MacroEval is resolved in statement, expression, and COND-clause position using the stage 3.3 `,ZORK-NUMBER` gate machinery (`==?`/`N==?`, `OR` of gates, `T`/`ELSE`; the selected clause's single quoted form is unquoted and substituted; a macro with no live clause yields ZIL `<>` — a false expression statement / false expr — and is denied in clause position). `#DECL` Chtype nodes are compile-time type metadata, filtered like comments (`#BYTE` stays visible and denied). Empty forms `<>` in statement position lower to false-valued expression statements. Non-`ZORK-NUMBER` compile-time predicates (`GASSIGNED?`, in parser machinery only) are denied.
- **Stage 3.5 batch (d)** (2026-07-19, v0.5.8, no schema change — daemons/timers): **the gclock.zil clock is an engine builtin, not extracted IR.** `QUEUE`, `INT`, and `CLOCKER` join the DEFMAC builtins (`ENABLE`, `DISABLE`): calls lower to `call`, but their ROUTINE bodies are never extracted — the C-TABLE `REST`/`APPLY` vector arithmetic is Z-machine plumbing, not game semantics. Protocol (reference implementation in `ir/poc/world.ts`): an interrupt record is a 3-slot table `[C-ENABLED?, C-TICK, C-RTN]` addressed by the gclock constants 0/1/2, and `QUEUE`/`INT` return the record — so extracted code like `<GET <INT I-THIEF> ,C-ENABLED?>` works unchanged via `table-get`/`table-set`. `CLOCKER` iterates records newest-allocation-first (the ZIL walk from `C-INTS` to the table end), skips tick 0, decrements, and applies the routine when the pre-decrement tick was ≤ 1 (−1 = demon, fires every turn); it honors `CLOCK-WAIT` (one skipped tick) and increments `MOVES`. The `P-WON` demon-region gating (parser-failure turns run demons only) is engine stage 4.5 work. Routine names passed by atom (`<QUEUE I-MATCH 2>`) now join the extraction closure — CLOCKER applies them at run time, so they are as reachable as direct call targets. Also added: `<VALUE X>` expr → global read, identical to `,X`. Unlocked I-MATCH, I-XC, I-REMPTY, I-MAINT-ROOM, I-RIVER, I-FOREST-ROOM (+ their helpers); the remaining daemons catalog on the true builtin frontier (`<REST …>` table-pointer advance for the I-LANTERN/I-CANDLES countdown tables, `ABS`, `NEXTP`, expression-position `<COND …>`).
- **Stage 3.5 triage** (2026-07-19, v0.5.9, no schema change — see the deliberate engine-builtin list above): three extractor-only deterministic lowerings — a Number in statement position is a value statement (GO-NEXT's per-turn codes); a bare room/object atom in expression position is the entity (TRAP-DOOR-FCN's `LIVING-ROOM`, an original-game missing comma ZIL compiles identically); a `,NAME` GVal naming a routine is the routine-name string, joining the extraction closure like bare-atom references (BELL-F's `,LLD-ROOM` — its routine-vs-room compare is an original-game quirk that stays always-false, matching the Z-machine address compare). Unlocked BELL-F, GO-NEXT, TRAP-DOOR-FCN: 298 routines, 61 catalogued, 40/292 unresolved (86%).
- **Stage 3.5 batch (f)** (2026-07-19, v0.5.10, `irVersion` 0.7.0): added exprs `tell`, `set-flag`, `clear-flag` — output and flag mutation in expression position (ZIL TELL / CRLF / PRINTN / FSET / FCLEAR inside AND/OR predicates), the same shapes as the statement ops and yielding true, per the batch (c) expression-position precedent. `PRINTN` leaves the deny list in both positions, lowering to a TELL number part (a bare value TELL already prints); `PRINT`/`PRINTB`/`PRINC`/`PRINTD` stay denied (string/byte printing is builtin I/O territory). Unlocked I-XB, RUSTY-KNIFE-FCN, I-RFILL, SAND-FUNCTION, V-DIAGNOSE (+ closure: FIGHT-STRENGTH, I-CURE); TROLL-FCN advanced to its real blocker, `APPLY` (batch (i)). 305 routines, 56 catalogued, 37/292 unresolved (87%).
