/**
 * Grues in Comic IR — behavior representation (stage 2.2).
 *
 * Chosen representation (see docs/adr/0001-behavior-representation.md):
 * imperative game logic is stored as a **structured behavior AST** — plain
 * JSON data with a small vocabulary of IF-domain operations — executed by an
 * engine interpreter. Engines may compile the AST to native closures at load
 * time as an optimization; the AST remains the canonical form.
 *
 * The vocabulary is deliberately minimal: it covers the constructs the Zork I
 * action-routine corpus actually uses (COND / predicates / TELL / flag and
 * global mutation / returns / helper calls). ZIL utility routines shared by
 * every game (OPEN-CLOSE, DO-WALK, THIS-IS-IT, PICK-ONE, …) are **engine
 * builtins** invoked via `call`, not transcribed per-game.
 *
 * Wiring these types into `WorldDocument` (a `routines` section, `irVersion`
 * 0.2.0) happens when Milestone 3 extraction starts populating them at scale.
 */

/** Scalar runtime values. Entity references evaluate to their id string. */
export type BehaviorValue = boolean | number | string;

export type Expr =
  /** Literal boolean/number/string. ZIL `T` / `<>` / numbers / strings. */
  | { op: "const"; value: BehaviorValue }
  /** Read a global variable (ZIL `,NAME`). */
  | { op: "global"; id: string }
  /** Read a routine parameter or local (ZIL `.NAME`). */
  | { op: "local"; id: string }
  /** Reference a room/object by id (ZIL atom constant like `,CELLAR`). */
  | { op: "entity"; id: string }
  /** True when the current action's verb is one of these (ZIL `VERB?`). */
  | { op: "verb?"; verbs: string[] }
  /** True when the first argument equals any later one (ZIL `EQUAL?`). */
  | { op: "equal?"; args: Expr[] }
  /** True when the entity has the flag set (ZIL `FSET?`). */
  | { op: "flag?"; entity: Expr; flag: string }
  | { op: "and"; args: Expr[] }
  | { op: "or"; args: Expr[] }
  | { op: "not"; arg: Expr }
  /** Numeric comparison (ZIL `G?` / `L?`). */
  | { op: "gt?"; a: Expr; b: Expr }
  | { op: "lt?"; a: Expr; b: Expr };

/** One piece of TELL output: literal text, a newline (ZIL `CR`), or a value. */
export type TellPart = { text: string } | { newline: true } | { expr: Expr };

export interface CondClause {
  /** Clause predicate. ZIL else-clauses use the literal `T`: `{op:"const",value:true}`. */
  when: Expr;
  do: Stmt[];
}

export type Stmt =
  /** First clause whose predicate is truthy runs (ZIL `COND`). */
  | { op: "cond"; clauses: CondClause[] }
  /** Emit narration (ZIL `TELL` / `CRLF`). */
  | { op: "tell"; parts: TellPart[] }
  /** Assign a global (ZIL `SETG`). */
  | { op: "set-global"; id: string; value: Expr }
  /** Set / clear an entity flag (ZIL `FSET` / `FCLEAR`). */
  | { op: "set-flag"; entity: Expr; flag: string }
  | { op: "clear-flag"; entity: Expr; flag: string }
  /**
   * Return from the routine (ZIL `RTRUE` / `RFALSE` / `<RETURN v>`).
   * For action handlers the value means "handled"; for exit routines a
   * room id means "travel there" and false means "refused".
   */
  | { op: "return"; value: Expr }
  /** Invoke another routine or an engine builtin (discarding no value). */
  | { op: "call"; routine: string; args: Expr[] };

export interface BehaviorRoutine {
  id: string;
  /** Parameter names, bound as locals (e.g. RARG for room actions). */
  params?: string[];
  body: Stmt[];
  /** Provenance in the historical source. */
  source?: { file: string; line: number };
}
