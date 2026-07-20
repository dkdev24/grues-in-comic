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

/** Literal values representable in an IR document (`const`, table elements). */
export type BehaviorLiteral = boolean | number | string;

/**
 * A table pointer: a table id plus an element offset. ZIL `<REST tbl bytes>`
 * yields an interior pointer into the same storage, which the corpus stores in
 * globals and re-reads with `GET` (the I-LANTERN/I-CANDLES countdown tables).
 * Modelled as an element offset rather than a byte address, per the IR's
 * platform-independence rule — the extractor halves the ZIL byte count.
 * A bare table id is the same pointer at offset 0.
 */
export interface TableRef {
  table: string;
  offset: number;
}

/**
 * Runtime values: literals plus table pointers. Entity references evaluate to
 * their id string. Only literals can appear in the document itself.
 */
export type BehaviorValue = BehaviorLiteral | TableRef;

export type Expr =
  /** Literal boolean/number/string. ZIL `T` / `<>` / numbers / strings. */
  | { op: "const"; value: BehaviorLiteral }
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
  | { op: "lt?"; a: Expr; b: Expr }
  /**
   * Integer arithmetic (ZIL `+` `-` `*` `/`, 16-bit signed truncating).
   * N-ary source forms are lowered to left folds; unary `-` to `0 − x`.
   */
  | { op: "add"; a: Expr; b: Expr }
  | { op: "sub"; a: Expr; b: Expr }
  | { op: "mul"; a: Expr; b: Expr }
  | { op: "div"; a: Expr; b: Expr }
  /** Truncating remainder, sign of the dividend (ZIL `MOD`). */
  | { op: "mod"; a: Expr; b: Expr }
  /** Smaller operand (ZIL `MIN`; n-ary source forms lower to left folds). */
  | { op: "min"; a: Expr; b: Expr }
  /** Absolute value (ZIL `ABS`; −32768 wraps to itself, as on the Z-machine). */
  | { op: "abs"; arg: Expr }
  /**
   * Uniform random integer in 1..`bound` inclusive (ZIL `<RANDOM n>`, the
   * Z-machine `random` opcode's range — 1-based, not 0-based).
   *
   * The IR names the *draw*, not the generator: which sequence a given seed
   * produces is an engine concern (ADR 0002 makes it a determinism contract
   * term), so this op stays independent of any one interpreter's PRNG.
   */
  | { op: "random"; bound: Expr }
  /**
   * Conditional in expression position (ZIL COND inside AND/OR or as an
   * argument) — the same shape as the statement op, yielding the taken
   * clause's last value (predicate value on an empty body, false when no
   * clause fires).
   */
  | { op: "cond"; clauses: CondClause[] }
  /** True when entity is directly inside container (ZIL `IN?`). */
  | { op: "in?"; entity: Expr; container: Expr }
  /** The entity's direct container/room (ZIL `LOC`). */
  | { op: "loc"; entity: Expr }
  /**
   * Object-tree iteration (ZIL `FIRST?` / `NEXT?`): the entity's first child
   * / next sibling, or false when there is none. Sibling order: `move`
   * inserts an entity as its new container's FIRST child (Z-machine
   * `insert_obj`); initial order comes from the world document.
   */
  | { op: "first"; entity: Expr }
  | { op: "next"; entity: Expr }
  /**
   * Read an entity property (ZIL `GETP`). `prop` is the IR field name of the
   * property (`,P?LDESC` → `"description"`, `,P?TVALUE` → `"treasureValue"`,
   * …), keeping the AST independent of ZIL naming. An absent property yields
   * false (ZIL's default 0, which is false in ZIL).
   */
  | { op: "prop"; entity: Expr; prop: string }
  /**
   * Read a table element (ZIL `GET`). `table` evaluates to a table id.
   * Indexing follows the table's kind: for `ltable`, index 0 is the element
   * count and index n is element n-1; for `table`, index n is element n.
   */
  | { op: "table-get"; table: Expr; index: Expr }
  /**
   * Advance a table pointer by `offset` elements, yielding a `TableRef` view
   * over the same storage (ZIL `<REST tbl bytes>`, the byte count halved at
   * extraction). `table` may be a bare table id (offset 0) or another view,
   * so views compose. Only plain `table`s are viewable: an `ltable`'s count
   * lives in the slot a view would skip past.
   */
  | { op: "table-rest"; table: Expr; offset: Expr }
  /**
   * Call a routine named at run time (ZIL `<APPLY <GETP .O ,P?ACTION> …>`) —
   * `routine` evaluates to a routine-name string, the convention batch (d)
   * established for QUEUE targets. A false/absent name yields false **without
   * calling**, matching the Z-machine's `call` to address 0; the corpus relies
   * on this to probe objects that have no ACTION property.
   */
  | { op: "apply"; routine: Expr; args: Expr[] }
  /**
   * Assignment in expression position, yielding the assigned value (ZIL is
   * expression-oriented: `<SET X …>` / `<SETG X …>` inside a predicate).
   * Same shapes as the statement ops, like `call`.
   */
  | { op: "set-global"; id: string; value: Expr }
  | { op: "set-local"; id: string; value: Expr }
  /**
   * Output or flag mutation in expression position, yielding true — the
   * same shapes and semantics as the statement ops (ZIL TELL / PRINTN /
   * FSET / FCLEAR inside AND/OR predicates).
   */
  | { op: "tell"; parts: TellPart[] }
  | { op: "set-flag"; entity: Expr; flag: string }
  | { op: "clear-flag"; entity: Expr; flag: string }
  /** Invoke a routine or engine builtin for its value (ZIL form in expression position). */
  | { op: "call"; routine: string; args: Expr[] };

/**
 * One piece of TELL output: literal text, a newline (ZIL `CR`), a value
 * (ZIL `N` / bare value), or an entity's short name (ZIL `D`).
 */
export type TellPart = { text: string } | { newline: true } | { expr: Expr } | { name: Expr };

export interface CondClause {
  /** Clause predicate. ZIL else-clauses use the literal `T`: `{op:"const",value:true}`. */
  when: Expr;
  do: Stmt[];
}

export type Stmt =
  /** First clause whose predicate is truthy runs (ZIL `COND`). */
  | { op: "cond"; clauses: CondClause[] }
  /**
   * Loop containers. `loop` (ZIL `REPEAT ()`) restarts its body when it
   * completes; only `break` (or a routine return) exits it. `block` (ZIL
   * `PROG ()`) runs its body once and yields the last statement's value;
   * `break` exits it early and `continue` restarts it (ZIL `AGAIN` in a
   * PROG). `break`/`continue` target the nearest enclosing loop/block —
   * exactly ZIL's RETURN/AGAIN-to-activation semantics; `return` always
   * exits the routine (ZIL RTRUE/RFALSE, or RETURN outside any block).
   */
  | { op: "loop"; body: Stmt[] }
  | { op: "block"; body: Stmt[] }
  | { op: "break"; value: Expr }
  | { op: "continue" }
  /** Emit narration (ZIL `TELL` / `CRLF`). */
  | { op: "tell"; parts: TellPart[] }
  /** Assign a global (ZIL `SETG`). */
  | { op: "set-global"; id: string; value: Expr }
  /** Assign a routine local (ZIL `SET`). */
  | { op: "set-local"; id: string; value: Expr }
  /** Set / clear an entity flag (ZIL `FSET` / `FCLEAR`). */
  | { op: "set-flag"; entity: Expr; flag: string }
  | { op: "clear-flag"; entity: Expr; flag: string }
  /** Reparent an entity (ZIL `MOVE`) / take it out of the world (ZIL `REMOVE`). */
  | { op: "move"; entity: Expr; to: Expr }
  | { op: "remove"; entity: Expr }
  /** Write an entity property (ZIL `PUTP`); `prop` as in the `prop` expr. */
  | { op: "set-prop"; entity: Expr; prop: string; value: Expr }
  /** Write a table element (ZIL `PUT`); indexing as in the `table-get` expr. */
  | { op: "table-set"; table: Expr; index: Expr; value: Expr }
  /**
   * Return from the routine (ZIL `RTRUE` / `RFALSE` / `<RETURN v>`).
   * For action handlers the value means "handled"; for exit routines a
   * room id means "travel there" and false means "refused".
   */
  | { op: "return"; value: Expr }
  /** Invoke another routine or an engine builtin (ZIL form in statement position). */
  | { op: "call"; routine: string; args: Expr[] }
  /**
   * Expression statement (ZIL is expression-oriented): evaluate for its
   * value — e.g. the bare `T` ending a COND clause, or a predicate in
   * statement position whose value the routine returns.
   */
  | { op: "value"; expr: Expr };

/**
 * Statement values (ZIL is expression-oriented; action dispatch relies on
 * routine return values): a routine returns the value of the last statement
 * it executed, `cond` yields the taken clause's last value (false when no
 * clause fires), `tell`/`set-flag`/`clear-flag`/`move`/`remove` yield true,
 * `set-global`/`set-local` yield the assigned value, `set-prop`/`table-set`
 * yield their entity/table operand (ZIL `PUTP`/`PUT` return their first
 * argument), `call` yields the callee's value, `loop`/`block` yield the
 * exiting `break`'s value (a `block` that falls off its end yields its last
 * statement's value). An empty body yields false.
 */
export interface BehaviorRoutine {
  id: string;
  /** Parameter names, bound as locals (e.g. RARG for room actions). */
  params?: string[];
  /**
   * Defaults for optional parameters (ZIL `"OPT" (NAME <init>)`). Applied by
   * arity, as in Z-code: when the caller omits the argument, the default is
   * evaluated at entry (left-to-right in `params` order, earlier params
   * already bound). Params without an entry default to false.
   */
  defaults?: Record<string, Expr>;
  /** ZIL "AUX" locals (initialized to false unless the body sets them). */
  locals?: string[];
  body: Stmt[];
  /** Provenance in the historical source. */
  source?: { file: string; line: number };
}
