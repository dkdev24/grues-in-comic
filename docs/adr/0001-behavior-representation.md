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

## Appendix — vocabulary growth log

Per the governance rule above (schema + validator + interpreter + this appendix):

- **Stage 3.4 batch 1** (2026-07-18, v0.5.4): added exprs `in?` (ZIL `IN?`), `loc` (`LOC`), and expression-position `call`; stmts `set-local` (`SET`), `move` (`MOVE`), `remove` (`REMOVE`), and `value` (expression statement — ZIL's bare `T` clause endings and predicates in statement position); TELL part `{name}` (ZIL `D`); routine `locals` ("AUX" bindings, initializers becoming a `set-local` prelude). Deterministic lowerings: `,P?DIR` → direction string, `,V?VERB` → verb word, numeric `CONSTANT`s → literals, bare atoms naming routines → name strings, `(ELSE …)` → `T` clause. **The implicit-return open question is resolved**: the language is expression-oriented — every statement yields a value, a routine returns the last executed statement's value, `cond` yields the taken clause's last value (predicate value on empty body, false when no clause fires), `tell`/flag/motion stmts yield true, assignments yield the assigned value, `call` yields the callee's value; falling off an empty body yields false. The reference interpreter implements these semantics; the hand-transpiled POC variant was corrected to match ZIL (its old fall-off-end-false returns were an artifact of the deferred question).
- Batch-1 deny list (catalogued, not represented): loops (`REPEAT`/`PROG`/`AGAIN`/`MAPF`), object-tree iteration (`FIRST?`/`NEXT?`), property and table access (`GETP`/`PUTP`/`GET`/`PUT`/`GETB`), arithmetic and bit ops, `APPLY`, `RFATAL`, compile-time `%<…>` macro evaluation inside bodies, and optional-parameter defaults. DEFMAC macro names (`ENABLE`, `PROB`, `FLAMING?`, …) and macro-gated routines (`PERFORM`) are legal `call` targets implemented as engine builtins.
