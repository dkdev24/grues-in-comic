/**
 * Stage 3.4 — deterministic ZIL ROUTINE → behavior AST extraction (batch 1).
 *
 * Converts routines into the ADR 0001 behavior AST all-or-nothing: a routine
 * either maps completely onto the closed op vocabulary, or it is catalogued
 * as complex with the exact reasons (unsupported operators, unknown names),
 * never partially guessed. Extraction runs a worklist closure: it starts from
 * the world document's routine references and follows `call` targets into
 * helper routines.
 *
 * Supported ZIL surface (batch 1): COND / TELL / CRLF / SETG / SET / FSET /
 * FCLEAR / MOVE / REMOVE / RTRUE / RFALSE / RETURN, predicates VERB? EQUAL?
 * ==? FSET? AND OR NOT G? L? 0? 1? IN? LOC, and calls to any ROUTINE defined
 * in the corpus. Everything else (loops, object-tree iteration, property and
 * table access, arithmetic, RFATAL, …) is denied and catalogued for the next
 * batch.
 */

import type {
  BehaviorRoutine,
  CondClause,
  Expr,
  Stmt,
  TellPart,
} from "./behavior.js";
import type { Direction, GlobalVariable, Table, TableElement } from "./schema.js";

interface AstNode {
  type: string;
  name?: string;
  value?: unknown;
  elements?: AstNode[];
  radix?: number;
  /** Chtype target type (`#DECL`, `#BYTE`, …). */
  typeName?: string;
  start?: { line: number };
}

/** ZIL operators deliberately outside the vocabulary (batches 3.4/3.5a–b). */
const DENIED_OPERATORS = new Set([
  "MAPF", "MAPR",
  "GETPT", "PTSIZE", "GETB", "PUTB",
  "BAND", "BOR", "BTST", "BCOM",
  "ASSIGNED?", "DLESS?", "IGRTR?",
  // PRINTB (print at a byte address) and PRINC (print one character) stay
  // denied: both are Z-machine address plumbing, not game semantics.
  "PRINTB", "PRINC",
]);

/**
 * ZIL property atoms → IR field names ({@link BEHAVIOR_PROPERTY_KEYS}).
 * Every `,P?NAME` the corpus passes to GETP/PUTP; unmapped atoms (e.g.
 * `P?GLOBAL`, reachable only via the denied GETPT) are denied.
 */
const PROPERTY_MAP = new Map<string, string>([
  ["ACTION", "action"],
  ["CAPACITY", "capacity"],
  ["LDESC", "description"],
  ["DESCFCN", "descriptionRoutine"],
  ["FDESC", "initialDescription"],
  ["SIZE", "size"],
  ["STRENGTH", "strength"],
  ["TEXT", "text"],
  ["TVALUE", "treasureValue"],
  ["VALUE", "value"],
  ["VTYPE", "vehicleType"],
]);

/**
 * gclock.zil machinery the engine implements as builtins (stage 3.5 batch d).
 * The interrupt table (C-TABLE and its 6-word records) is engine state, not
 * IR: QUEUE/INT return a record handle whose slots extracted code addresses
 * via GET/PUT with the C-ENABLED?/C-TICK/C-RTN constants (0/1/2), and
 * CLOCKER ticks enabled records each turn (honoring CLOCK-WAIT). Calls
 * lower to `call` like the DEFMAC builtins (ENABLE, DISABLE); the gclock
 * ROUTINE bodies are never extracted — their REST/APPLY vector arithmetic
 * is Z-machine plumbing, not game semantics.
 */
const CLOCK_BUILTINS = new Set(["QUEUE", "INT", "CLOCKER"]);

/**
 * Engine-owned routines that never return, and the boundary they mark.
 *
 * `MAIN-LOOP` is gmain.zil's turn loop: it calls `PARSER` and dispatches, for
 * ever. ADR 0002 gives the turn loop to the engine — the host decides when a
 * turn happens — so it is a builtin, never extracted, and `MAIN-LOOP-1` with
 * it.
 *
 * That makes it the cut between *game initialization* and *the turn loop*, and
 * `GO` is the routine the cut runs through: it queues the five daemons, patches
 * the melee tables and places the player, then ends `<V-LOOK> <MAIN-LOOP>
 * <AGAIN>`. Since `MAIN-LOOP` never returns, the trailing `<AGAIN>` is dead
 * code — unreachable on the Z-machine too, not merely unmodelled — so
 * statements after the call are dropped rather than denied. Without this, `GO`
 * catalogues on "AGAIN outside a REPEAT/PROG" and takes the whole daemon chain
 * down with it.
 *
 * Narrow by construction: only names listed here truncate a body, and each is
 * a routine the engine implements in full.
 */
const NON_RETURNING_BUILTINS = new Set(["MAIN-LOOP", "MAIN-LOOP-1"]);

/**
 * Routines whose *implementation* is the engine's, not the IR's.
 *
 * `LIT?` walks the parser's scope list (`DO-SL` in gparser.zil) to decide
 * whether the player can see. ADR 0002 gives scope and the parser to the
 * engine, which computes lighting from its own scope walk — so extracting
 * `LIT?` does not add behavior, it *shadows* the engine's version with one
 * that calls into parser internals the IR deliberately does not model.
 *
 * That shadowing is silent and total: routines take precedence over builtins,
 * so an extracted `LIT?` simply replaces the working implementation. It cost
 * every dark-room turn in the corpus the moment `LIT?` became extractable.
 */
const ENGINE_IMPLEMENTED = new Set(["LIT?"]);

/**
 * Routines the engine implements rather than the IR carrying. They lower to a
 * `call` like any other name, but are never queued for extraction.
 */
function engineOwned(id: string): boolean {
  return (
    CLOCK_BUILTINS.has(id) || NON_RETURNING_BUILTINS.has(id) || ENGINE_IMPLEMENTED.has(id)
  );
}

const TRUE: Expr = { op: "const", value: true };
const FALSE: Expr = { op: "const", value: false };

/**
 * gmain.zil's action-handler protocol: M-NOT-HANDLED = `<>`, M-HANDLED = 1,
 * M-FATAL = 2 (what RFATAL returns — the turn is aborted).
 */
const M_FATAL = 2;

/** Form heads that map to expressions (legal in statement position via `value`). */
const EXPR_HEADS = new Set([
  "VERB?", "EQUAL?", "==?", "FSET?", "AND", "OR", "NOT",
  "G?", "L?", "0?", "1?", "IN?", "LOC", "GETP", "GET",
  "+", "-", "*", "/", "MOD", "MIN", "ABS", "FIRST?", "NEXT?", "REST", "APPLY",
]);

export interface CatalogEntry {
  id: string;
  source: { file: string; line: number };
  /** Why batch 1 could not represent this routine. */
  reasons: string[];
}

export interface BehaviorExtraction {
  routines: BehaviorRoutine[];
  catalog: CatalogEntry[];
  /** Globals referenced by extracted behavior, with resolved initial values. */
  globals: GlobalVariable[];
  /** Table-valued globals referenced by extracted behavior. */
  tables: Table[];
  /** Flags referenced by extracted behavior (FSET/FCLEAR/FSET?). */
  flags: Set<string>;
}

export interface BehaviorSources {
  /** Every top-level ROUTINE form in the corpus, with its source file. */
  routineForms: Map<string, { form: AstNode; file: string }>;
  /**
   * Every ROUTINE name that exists anywhere — including definitions nested
   * under compile-time macros (e.g. PERFORM's `%<COND …>` variants) — plus
   * DEFMAC macro names, which the engine implements as builtins. Legal as
   * `call` targets even when not extractable.
   */
  callableNames: Set<string>;
  /** Every GLOBAL form in the (COND-expanded) corpus. */
  globalForms: Map<string, AstNode>;
  roomAndObjectIds: Set<string>;
  /**
   * Every flag name declared by a room or object `(FLAGS …)` list.
   *
   * Needed because ZIL also uses a flag as a plain *value*: `GO` stores one in
   * a property (`<PUTP ,INFLATED-BOAT ,P?VTYPE ,NONLANDBIT>`), and the parser
   * passes them around (`,ONBIT` in LIT?, `,ACTORBIT` in V-SAY). The flag is a
   * bit constant on the Z-machine; the IR carries the *name*, which is how the
   * world document already stores this exact property (`vehicleType:
   * "NONLANDBIT"`).
   */
  flagNames: Set<string>;
  /** Numeric CONSTANT bindings. */
  constants: Map<string, number>;
  directionWords: Map<string, Direction>;
  decodeString: (raw: string) => string;
  /** `<SETG ZORK-NUMBER n>` (1 for Zork I) — resolves `%<COND …>` gates. */
  zorkNumber?: number | undefined;
}

class Unsupported extends Error {
  constructor(public reason: string) {
    super(reason);
  }
}

export function extractBehavior(entryRefs: string[], sources: BehaviorSources): BehaviorExtraction {
  const routines: BehaviorRoutine[] = [];
  const catalog: CatalogEntry[] = [];
  const globals = new Map<string, GlobalVariable>();
  const tables = new Map<string, Table>();
  const flags = new Set<string>();
  const queued = new Set<string>(entryRefs);
  const queue = [...entryRefs];

  while (queue.length > 0) {
    const id = queue.shift()!;
    if (engineOwned(id)) continue;
    const def = sources.routineForms.get(id);
    if (def === undefined) {
      catalog.push({
        id,
        source: { file: "?", line: 0 },
        reasons: [
          sources.callableNames.has(id)
            ? "ROUTINE defined under a compile-time macro (or DEFMAC builtin)"
            : "no ROUTINE form in corpus",
        ],
      });
      continue;
    }
    const source = { file: def.file, line: def.form.start?.line ?? 0 };
    const tx = new RoutineTransformer(sources, globals, tables, flags);
    try {
      const routine = tx.transform(id, def.form);
      routine.source = source;
      routines.push(routine);
      for (const target of tx.callTargets) {
        if (!queued.has(target)) {
          queued.add(target);
          queue.push(target);
        }
      }
    } catch (err) {
      if (!(err instanceof Unsupported)) throw err;
      catalog.push({ id, source, reasons: [...new Set(tx.reasons.concat(err.reason))] });
    }
  }

  routines.sort((a, b) => a.id.localeCompare(b.id));
  catalog.sort((a, b) => a.id.localeCompare(b.id));
  return {
    routines,
    catalog,
    globals: [...globals.values()].sort((a, b) => a.id.localeCompare(b.id)),
    tables: [...tables.values()].sort((a, b) => a.id.localeCompare(b.id)),
    flags,
  };
}

class RoutineTransformer {
  callTargets = new Set<string>();
  reasons: string[] = [];
  private params: string[] = [];
  private locals: string[] = [];
  private defaults = new Map<string, Expr>();
  /** Nesting depth of REPEAT/PROG containers (RETURN/AGAIN target scope). */
  private loopDepth = 0;
  /**
   * Set only while transforming the body of a matched exit scan
   * ({@link exitScan}): the ZIL local holding the property pointer, and the
   * expression that replaces reading a destination room out of it.
   */
  private exitScanPointer: { local: string; destination: Expr } | undefined;

  constructor(
    private sources: BehaviorSources,
    private globals: Map<string, GlobalVariable>,
    private tables: Map<string, Table>,
    private flags: Set<string>,
  ) {}

  transform(id: string, form: AstNode): BehaviorRoutine {
    const elements = meaningful(form.elements ?? []);
    const paramList = elements[2];
    if (paramList?.type !== "List") throw new Unsupported("malformed parameter list");
    const prelude = this.parseParams(paramList);
    const body = prelude.concat(this.stmtsUntilNonReturning(elements.slice(3)));
    const routine: BehaviorRoutine = { id, body };
    if (this.params.length > 0) routine.params = this.params;
    if (this.defaults.size > 0) {
      routine.defaults = Object.fromEntries(
        this.params.filter((p) => this.defaults.has(p)).map((p) => [p, this.defaults.get(p)!]),
      );
    }
    if (this.locals.length > 0) routine.locals = this.locals;
    return routine;
  }

  /**
   * Transform a routine's top-level statements, stopping after a call to a
   * non-returning engine builtin ({@link NON_RETURNING_BUILTINS}).
   *
   * The call itself is kept — the engine still has to enter its turn loop —
   * and only what follows is dropped, because control never reaches it.
   */
  private stmtsUntilNonReturning(nodes: AstNode[]): Stmt[] {
    const out: Stmt[] = [];
    for (const node of nodes) {
      out.push(this.stmt(node));
      const head = node.type === "Form" ? atomName(meaningful(node.elements ?? [])[0]) : undefined;
      if (head !== undefined && NON_RETURNING_BUILTINS.has(head)) break;
    }
    return out;
  }

  /** Parse `(P1 P2 "OPT" O1 "AUX" L1 (L2 <init>))`; returns AUX-init prelude. */
  private parseParams(list: AstNode): Stmt[] {
    const prelude: Stmt[] = [];
    let mode: "params" | "optional" | "aux" = "params";
    for (const entry of meaningful(list.elements ?? [])) {
      if (entry.type === "String") {
        const marker = entry.value as string;
        if (marker === "AUX" || marker === "EXTRA") mode = "aux";
        else if (marker === "OPT" || marker === "OPTIONAL") mode = "optional";
        else throw new Unsupported(`unknown parameter marker "${marker}"`);
      } else if (entry.type === "Atom") {
        (mode === "aux" ? this.locals : this.params).push(entry.name!);
      } else if (entry.type === "List" && mode === "aux") {
        const [nameNode, init] = meaningful(entry.elements ?? []);
        const name = atomName(nameNode) ?? this.deny("malformed AUX local");
        this.locals.push(name);
        prelude.push({ op: "set-local", id: name, value: this.expr(init!) });
      } else if (entry.type === "List" && mode === "optional") {
        const [nameNode, init] = meaningful(entry.elements ?? []);
        const name = atomName(nameNode) ?? this.deny("malformed optional parameter");
        this.params.push(name);
        // A `<>` default equals the no-default behavior (unsupplied → false).
        const value = this.expr(init!);
        if (value.op !== "const" || value.value !== false) this.defaults.set(name, value);
      } else {
        throw new Unsupported(`unexpected parameter entry (${entry.type})`);
      }
    }
    return prelude;
  }

  private deny(reason: string): never {
    this.reasons.push(reason);
    throw new Unsupported(reason);
  }

  // ---- statements ----

  stmt(node: AstNode): Stmt {
    // Compile-time `%<COND …>`: substitute the selected form; a macro that
    // yields false is ZIL `<>` — a false-valued expression statement.
    const resolved = this.resolveMacro(node);
    if (resolved === undefined) return { op: "value", expr: FALSE };
    node = resolved;
    // Bare `T` ending a COND clause, or a value reference in statement
    // position — an expression statement (the routine may return its value).
    if (node.type === "Atom" && node.name === "T") return { op: "value", expr: TRUE };
    // Number ending a COND clause (GO-NEXT's per-turn codes) — a value.
    if (node.type === "Number") return { op: "value", expr: this.expr(node) };
    if (node.type === "GVal" || node.type === "LVal") return { op: "value", expr: this.expr(node) };
    if (node.type !== "Form") this.deny(`unexpected ${node.type} in statement position`);
    const parts = meaningful(node.elements ?? []);
    if (parts.length === 0) return { op: "value", expr: FALSE }; // ZIL `<>` statement
    const head = atomName(parts[0]);
    if (head === undefined) this.deny("form without an atom head");
    const rest = parts.slice(1);

    switch (head) {
      case "COND":
        return { op: "cond", clauses: rest.map((c) => this.condClause(c)) };
      /*
       * `<RANDOM n>` in *expression* position is a draw and extracts fine.
       * In statement position its value is discarded, which on the Z-machine
       * means the call was made for its side effect: a non-positive operand
       * seeds the generator rather than drawing from it (Standard 1.1 §random,
       * and V-RANDOM's `<RANDOM <- 0 ,P-NUMBER>>` — the `#RND` debug verb).
       * Seeding is a different operation from drawing, so it deliberately does
       * not lower to the `random` op; denying it keeps the two from being
       * conflated.
       */
      case "RANDOM":
        this.deny("RANDOM in statement position (seeds the generator)");
        break;
      case "TELL":
        return { op: "tell", parts: this.tellParts(rest) };
      case "CRLF":
        return { op: "tell", parts: [{ newline: true }] };
      case "PRINTN":
      // PRINT prints a string-valued operand; the tell part stringifies
      // whatever the expression yields, so it needs no separate shape.
      case "PRINT":
        return { op: "tell", parts: [{ expr: this.expr(rest[0]!) }] };
      // PRINTD prints an entity's DESC — exactly TELL's `D`.
      case "PRINTD":
        return { op: "tell", parts: [{ name: this.expr(rest[0]!) }] };
      case "SETG": {
        const id = atomName(rest[0]) ?? this.deny("SETG target is not an atom");
        this.needGlobal(id);
        return { op: "set-global", id, value: this.expr(rest[1]!) };
      }
      case "SET": {
        const id = atomName(rest[0]) ?? this.deny("SET target is not an atom");
        if (!this.params.includes(id) && !this.locals.includes(id)) {
          this.deny(`SET of undeclared local "${id}"`);
        }
        return { op: "set-local", id, value: this.expr(rest[1]!) };
      }
      case "FSET":
      case "FCLEAR": {
        const { entity, flag } = this.flagArgs(head, rest);
        return { op: head === "FSET" ? "set-flag" : "clear-flag", entity, flag };
      }
      case "MOVE":
        return { op: "move", entity: this.expr(rest[0]!), to: this.expr(rest[1]!) };
      case "PUTP":
        return {
          op: "set-prop",
          entity: this.expr(rest[0]!),
          prop: this.propKey("PUTP", rest[1]),
          value: this.expr(rest[2]!),
        };
      case "PUT":
        return {
          op: "table-set",
          table: this.expr(rest[0]!),
          index: this.expr(rest[1]!),
          value: this.expr(rest[2]!),
        };
      case "REMOVE":
        return { op: "remove", entity: this.expr(rest[0]!) };
      case "RTRUE":
        return { op: "return", value: TRUE };
      case "RFALSE":
        return { op: "return", value: FALSE };
      case "RFATAL":
        // Batch (j). The RFATAL macro is <PROG () <PUSH 2> <RSTACK>> — it
        // returns the ZIL-named constant M-FATAL (2) from the *routine*, so
        // like RTRUE/RFALSE it exits a loop activation rather than breaking
        // it. No new vocabulary: the handler protocol is already ordinary
        // values (M-NOT-HANDLED = false, M-HANDLED = 1, M-FATAL = 2), and
        // only the M4 parser loop — a Group A builtin — compares against it.
        return { op: "return", value: { op: "const", value: M_FATAL } };
      case "RETURN": {
        // ZIL RETURN exits the nearest PROG/REPEAT activation, or the
        // routine when there is none. RTRUE/RFALSE always exit the routine.
        const value = rest.length === 0 ? TRUE : this.expr(rest[0]!);
        return this.loopDepth > 0 ? { op: "break", value } : { op: "return", value };
      }
      case "AGAIN":
        if (this.loopDepth === 0) this.deny("AGAIN outside a REPEAT/PROG");
        return { op: "continue" };
      case "REPEAT":
        return this.exitScan(rest) ?? this.container(head, rest);
      case "PROG":
        return this.container(head, rest);
      default:
        if (EXPR_HEADS.has(head)) return { op: "value", expr: this.formExpr(node) };
        return this.callForm(head, rest);
    }
  }

  private condClause(node: AstNode): CondClause {
    // A clause may be produced wholesale by `%<COND …>` (quoted per game).
    node = this.resolveMacro(node) ?? this.deny("MacroEval COND clause selected no form");
    if (node.type !== "List" || !node.elements?.length) this.deny("COND clause is not a list");
    const [pred, ...body] = meaningful(node.elements);
    // ZIL else-clauses: `(T …)` or `(ELSE …)`.
    const when = atomName(pred) === "ELSE" ? TRUE : this.expr(pred!);
    return { when, do: body.map((n) => this.stmt(n)) };
  }

  private tellParts(tokens: AstNode[]): TellPart[] {
    const parts: TellPart[] = [];
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i]!;
      if (token.type === "String") {
        parts.push({ text: this.sources.decodeString(token.value as string) });
      } else if (token.type === "Atom" && token.name === "CR") {
        parts.push({ newline: true });
      } else if (token.type === "Atom" && (token.name === "D" || token.name === "N")) {
        const arg = tokens[++i] ?? this.deny(`TELL ${token.name} without an argument`);
        parts.push(token.name === "D" ? { name: this.expr(arg) } : { expr: this.expr(arg) });
      } else if (token.type === "GVal" || token.type === "LVal" || token.type === "Form") {
        parts.push({ expr: this.expr(token) });
      } else {
        this.deny(`unsupported TELL token (${token.type === "Atom" ? token.name : token.type})`);
      }
    }
    return parts;
  }

  private callForm(head: string, rest: AstNode[]): Stmt & { op: "call" } {
    if (DENIED_OPERATORS.has(head)) this.deny(`operator ${head}`);
    /*
     * PROB is a DEFMAC, and its two forms are not the same call:
     *
     *   <DEFMAC PROB ('BASE? "OPTIONAL" 'LOSER?)
     *       <COND (<ASSIGNED? LOSER?> <FORM ZPROB .BASE?>)
     *             (ELSE <FORM G? .BASE? '<RANDOM 100>>)>>
     *
     * With a second argument it expands to `<ZPROB base>` — which consults
     * `,LUCKY` and rolls against 100 or 300 — and **discards that argument
     * unevaluated**. Expanding it here rather than passing both operands to a
     * builtin is what the compiler does, and it is load-bearing: VILLAIN-BLOW
     * writes `<PROB 25 <COND (.HERO? 10)(T 50)>>` where `.HERO?` is never
     * declared. That is legal precisely because the macro drops it; extracting
     * it catalogued VILLAIN-BLOW on an undeclared local and took the villain's
     * counterattack with it.
     */
    if (head === "PROB" && rest.length >= 2) {
      return this.callForm("ZPROB", rest.slice(0, 1));
    }
    if (!this.sources.callableNames.has(head)) this.deny(`unknown form <${head} …>`);
    if (this.sources.routineForms.has(head) && !engineOwned(head)) {
      this.callTargets.add(head);
    }
    return { op: "call", routine: head, args: rest.map((a) => this.expr(a)) };
  }

  // ---- expressions ----

  expr(node: AstNode): Expr {
    if (node.type === "MacroEval") {
      const resolved = this.resolveMacro(node);
      return resolved === undefined ? FALSE : this.expr(resolved);
    }
    switch (node.type) {
      case "String":
        return { op: "const", value: this.sources.decodeString(node.value as string) };
      case "Number":
        return { op: "const", value: node.value as number };
      case "Atom":
        if (node.name === "T") return TRUE;
        // Routine reference passed by name (e.g. `<QUEUE I-CANDLES -1>`).
        // The named routine is reachable at run time (CLOCKER applies it),
        // so it joins the extraction closure like a direct call target.
        if (this.sources.callableNames.has(node.name!)) {
          if (this.sources.routineForms.has(node.name!) && !engineOwned(node.name!)) {
            this.callTargets.add(node.name!);
          }
          return { op: "const", value: node.name! };
        }
        // A bare room/object atom — `<EQUAL? ,HERE LIVING-ROOM>` in
        // TRAP-DOOR-FCN (original-game missing comma; ZIL compiles the
        // bare atom to the same object constant as `,LIVING-ROOM`).
        if (this.sources.roomAndObjectIds.has(node.name!)) {
          return { op: "entity", id: node.name! };
        }
        this.deny(`bare atom ${node.name} in expression position`);
        break;
      case "GVal":
        return this.resolveName(atomName(node.value as AstNode) ?? this.deny("malformed global reference"));
      case "LVal": {
        const id = atomName(node.value as AstNode) ?? this.deny("malformed local reference");
        if (!this.params.includes(id) && !this.locals.includes(id)) {
          this.deny(`reference to undeclared local "${id}"`);
        }
        return { op: "local", id };
      }
      case "Form":
        return this.formExpr(node);
      default:
        this.deny(`unsupported ${node.type} in expression position`);
    }
    throw new Error("unreachable");
  }

  private formExpr(node: AstNode): Expr {
    const parts = meaningful(node.elements ?? []);
    if (parts.length === 0) return FALSE; // ZIL <>
    const head = atomName(parts[0]) ?? this.deny("form without an atom head");
    const rest = parts.slice(1);
    switch (head) {
      case "VERB?":
        return { op: "verb?", verbs: rest.map((v) => atomName(v) ?? this.deny("VERB? arg is not an atom")) };
      case "EQUAL?":
      case "==?":
        return { op: "equal?", args: rest.map((a) => this.expr(a)) };
      case "FSET?": {
        const { entity, flag } = this.flagArgs(head, rest);
        return { op: "flag?", entity, flag };
      }
      case "AND":
        return { op: "and", args: rest.map((a) => this.expr(a)) };
      case "OR":
        return { op: "or", args: rest.map((a) => this.expr(a)) };
      case "NOT":
        return { op: "not", arg: this.expr(rest[0]!) };
      case "G?":
        return { op: "gt?", a: this.expr(rest[0]!), b: this.expr(rest[1]!) };
      case "L?":
        return { op: "lt?", a: this.expr(rest[0]!), b: this.expr(rest[1]!) };
      case "0?":
        return { op: "equal?", args: [this.expr(rest[0]!), { op: "const", value: 0 }] };
      case "1?":
        return { op: "equal?", args: [this.expr(rest[0]!), { op: "const", value: 1 }] };
      case "IN?":
        return { op: "in?", entity: this.expr(rest[0]!), container: this.expr(rest[1]!) };
      case "LOC":
        return { op: "loc", entity: this.expr(rest[0]!) };
      case "RANDOM":
        return { op: "random", bound: this.expr(rest[0]!) };
      case "FIRST?":
        return { op: "first", entity: this.expr(rest[0]!) };
      case "NEXT?":
        return { op: "next", entity: this.expr(rest[0]!) };
      case "SETG": {
        const id = atomName(rest[0]) ?? this.deny("SETG target is not an atom");
        this.needGlobal(id);
        return { op: "set-global", id, value: this.expr(rest[1]!) };
      }
      case "SET": {
        const id = atomName(rest[0]) ?? this.deny("SET target is not an atom");
        if (!this.params.includes(id) && !this.locals.includes(id)) {
          this.deny(`SET of undeclared local "${id}"`);
        }
        return { op: "set-local", id, value: this.expr(rest[1]!) };
      }
      case "+":
      case "-":
      case "*":
      case "/":
        return this.arith(head, rest);
      case "MOD":
        return { op: "mod", a: this.expr(rest[0]!), b: this.expr(rest[1]!) };
      case "MIN": {
        const args = rest.map((a) => this.expr(a));
        if (args.length === 0) this.deny("MIN with no operands");
        return args.slice(1).reduce((a, b) => ({ op: "min", a, b }), args[0]!);
      }
      case "ABS":
        return { op: "abs", arg: this.expr(rest[0]!) };
      // Conditional inside AND/OR or as an argument (batch g) — the same
      // lowering as the statement case, yielding the taken clause's value.
      case "COND":
        return { op: "cond", clauses: rest.map((c) => this.condClause(c)) };
      case "VALUE": {
        // `<VALUE X>` reads global X — identical to `,X` (GVal).
        const id = atomName(rest[0]) ?? this.deny("VALUE target is not an atom");
        return this.resolveName(id);
      }
      // Output and flag mutation inside AND/OR predicates (batch f) — the
      // same lowerings as the statement cases, yielding true.
      case "TELL":
        return { op: "tell", parts: this.tellParts(rest) };
      case "CRLF":
        return { op: "tell", parts: [{ newline: true }] };
      case "PRINTN":
      // PRINT prints a string-valued operand; the tell part stringifies
      // whatever the expression yields, so it needs no separate shape.
      case "PRINT":
        return { op: "tell", parts: [{ expr: this.expr(rest[0]!) }] };
      // PRINTD prints an entity's DESC — exactly TELL's `D`.
      case "PRINTD":
        return { op: "tell", parts: [{ name: this.expr(rest[0]!) }] };
      case "FSET":
      case "FCLEAR": {
        const { entity, flag } = this.flagArgs(head, rest);
        return { op: head === "FSET" ? "set-flag" : "clear-flag", entity, flag };
      }
      case "GETP":
        return { op: "prop", entity: this.expr(rest[0]!), prop: this.propKey("GETP", rest[1]) };
      case "GET":
        return { op: "table-get", table: this.expr(rest[0]!), index: this.expr(rest[1]!) };
      case "APPLY":
        // Batch (i): the target is a routine name computed at run time —
        // almost always <GETP obj ,P?ACTION>, the object's action handler.
        return {
          op: "apply",
          routine: this.expr(rest[0]!),
          args: rest.slice(1).map((a) => this.expr(a)),
        };
      case "REST": {
        // ZIL REST advances a table pointer by a byte count; the IR counts
        // elements, so a word table's byte count halves. Only compile-time
        // even literals are lowerable — a computed or odd (byte-table) offset
        // would need the byte addressing the IR deliberately does not model.
        const bytes = rest[1];
        if (bytes?.type !== "Number") this.deny("REST offset is not a literal byte count");
        const n = bytes!.value as number;
        if (n % 2 !== 0) this.deny(`REST offset ${n} is not a whole number of words`);
        return {
          op: "table-rest",
          table: this.expr(rest[0]!),
          offset: { op: "const", value: n / 2 },
        };
      }
      /*
       * `<GETB .T 0>` reads the destination room out of an exit's property
       * bytes. It is meaningful only inside a matched exit scan, where the
       * rewrite supplies the destination directly (ADR 0003); anywhere else
       * GETB stays denied byte addressing, via DENIED_OPERATORS below.
       */
      case "GETB": {
        const scan = this.exitScanPointer;
        const offset = rest[1];
        if (
          scan !== undefined &&
          localName(rest[0]) === scan.local &&
          offset?.type === "Number" &&
          offset.value === 0
        ) {
          return scan.destination;
        }
        this.deny("operator GETB outside an exit scan");
        break;
      }
      case "PUTP":
      case "PUT":
        this.deny(`operator ${head} in expression position`);
        break;
      default: {
        const call = this.callForm(head, rest);
        return { op: "call", routine: call.routine, args: call.args };
      }
    }
  }

  /**
   * Resolve compile-time `%<COND …>` macro evaluation (ZIL reader macros).
   * Predicates are `,ZORK-NUMBER` gates (`==?`/`N==?`, `OR` of gates,
   * `T`/`ELSE`) — the same machinery stage 3.3 uses for top-level forms.
   * Returns the selected clause's (unquoted) form, or undefined when no
   * clause fires (the macro yields false at compile time).
   */
  private resolveMacro(node: AstNode): AstNode | undefined {
    if (node.type !== "MacroEval") return node;
    const form = node.value as AstNode;
    const parts = meaningful(form?.elements ?? []);
    if (atomName(parts[0]) !== "COND") {
      this.deny(`unsupported MacroEval <${atomName(parts[0]) ?? form?.type} …>`);
    }
    for (const clause of parts.slice(1)) {
      if (clause.type !== "List" || !clause.elements?.length) {
        this.deny("MacroEval COND clause is not a list");
      }
      const [predicate, ...body] = meaningful(clause.elements);
      if (!this.evalGate(predicate!)) continue;
      if (body.length !== 1) this.deny("MacroEval COND clause must select exactly one form");
      const selected = body[0]!;
      return selected.type === "Quote" ? (selected.value as AstNode) : selected;
    }
    return undefined;
  }

  /** Evaluate a compile-time `,ZORK-NUMBER` gate predicate. */
  private evalGate(predicate: AstNode): boolean {
    const name = atomName(predicate);
    if (name === "T" || name === "ELSE") return true;
    const parts = meaningful(predicate.elements ?? []);
    const op = atomName(parts[0]);
    if (op === "OR") return parts.slice(1).some((p) => this.evalGate(p));
    if (op === "==?" || op === "N==?") {
      const lhs = parts[1];
      const rhs = parts[2];
      if (
        lhs?.type !== "GVal" ||
        atomName(lhs.value as AstNode) !== "ZORK-NUMBER" ||
        rhs?.type !== "Number"
      ) {
        this.deny("MacroEval predicate is not ,ZORK-NUMBER vs a number literal");
      }
      const zorkNumber =
        this.sources.zorkNumber ?? this.deny("ZORK-NUMBER is not set by any provided AST");
      const equal = zorkNumber === (rhs.value as number);
      return op === "==?" ? equal : !equal;
    }
    this.deny(`unsupported compile-time predicate ${op ?? predicate.type}`);
  }

  /** Lower `<REPEAT () …>` → `loop`, `<PROG () …>` → `block`. */
  private container(head: "REPEAT" | "PROG", rest: AstNode[]): Stmt {
    const bindings = rest[0];
    if (bindings?.type !== "List" || meaningful(bindings.elements ?? []).length > 0) {
      this.deny(`${head} with a non-empty binding list`);
    }
    this.loopDepth++;
    try {
      const body = rest.slice(1).map((n) => this.stmt(n));
      return { op: head === "REPEAT" ? "loop" : "block", body };
    } finally {
      this.loopDepth--;
    }
  }

  /**
   * The ZIL **exit-scan idiom**, rewritten onto the room's derived adjacency
   * list (ADR 0003).
   *
   * ZIL walks a room's exits as numbered Z-machine properties and inspects
   * their byte layout to find the ones that carry a destination:
   *
   * ```
   * <SET P 0>
   * <REPEAT ()
   *   <COND (<0? <SET P <NEXTP ,HERE .P>>> <RETURN>)
   *         (<NOT <L? .P ,LOW-DIRECTION>>
   *          <SET T <GETPT ,HERE .P>>
   *          <SET L <PTSIZE .T>>
   *          <COND (<EQUAL? .L ,UEXIT ,CEXIT ,DEXIT>
   *                 …body using <GETB .T 0> as the destination room…)>)>>
   * ```
   *
   * None of that survives into the IR, which models exits structurally: there
   * is no property number to iterate and no byte 0 to read. So this is a
   * **rewrite, not a translation** — the one place in this extractor where
   * output is not a mechanical image of its input, and it is deliberately
   * scoped to a single idiom.
   *
   * The safety property is the same all-or-nothing rule the rest of the file
   * obeys: every clause below must match, or the method returns `undefined`
   * and the REPEAT takes the ordinary path — which denies on `NEXTP`/`GETPT`
   * and catalogues the routine, exactly as before. A near-miss can therefore
   * only ever cost extraction, never produce a plausible-looking wrong loop.
   *
   * The lowering iterates the adjacency ltable by index, reusing the scan's
   * own loop variable so `<SET P 0>` before the REPEAT still initializes it:
   *
   * ```
   * loop [ P = P + 1
   *        cond [ (P > count(adjacent)) → break
   *               (else) → …body, destination = adjacent[P]… ] ]
   * ```
   *
   * The `LOW-DIRECTION` guard and the UEXIT/CEXIT/DEXIT size test have no
   * lowered form because {@link deriveAdjacent} already applied both when it
   * built the list: it keeps exactly the direction properties whose exits
   * carry a static destination. Dropping them here is what makes the two
   * halves of ADR 0003 one decision rather than two.
   */
  private exitScan(rest: AstNode[]): Stmt | undefined {
    const bindings = rest[0];
    if (bindings?.type !== "List" || meaningful(bindings.elements ?? []).length > 0) return undefined;
    const body = rest.slice(1);
    if (body.length !== 1) return undefined;
    const outer = formParts(body[0], "COND");
    if (outer?.length !== 2) return undefined;

    // Clause 1: `(<0? <SET P <NEXTP ROOM .P>>> <RETURN>)` — exhaustion.
    const [term, scan] = [clauseParts(outer[0]), clauseParts(outer[1])];
    if (term === undefined || scan === undefined) return undefined;
    if (term.body.length !== 1 || formParts(term.body[0], "RETURN")?.length !== 0) return undefined;
    const zero = formParts(term.when, "0?");
    const setP = zero?.length === 1 ? formParts(zero[0], "SET") : undefined;
    if (setP?.length !== 2) return undefined;
    const index = atomName(setP[0]);
    const nextp = formParts(setP[1], "NEXTP");
    if (index === undefined || nextp?.length !== 2) return undefined;
    if (localName(nextp[1]) !== index) return undefined;
    const roomNode = nextp[0]!;

    // Clause 2: the `LOW-DIRECTION` guard, then the property-layout probe.
    const guard = formParts(scan.when, "NOT");
    const less = guard?.length === 1 ? formParts(guard[0], "L?") : undefined;
    if (less?.length !== 2) return undefined;
    if (localName(less[0]) !== index || globalName(less[1]) !== "LOW-DIRECTION") return undefined;

    if (scan.body.length !== 3) return undefined;
    const setT = formParts(scan.body[0], "SET");
    const getpt = setT?.length === 2 ? formParts(setT[1], "GETPT") : undefined;
    const pointer = atomName(setT?.[0]);
    if (pointer === undefined || getpt?.length !== 2) return undefined;
    if (!sameNode(getpt[0]!, roomNode) || localName(getpt[1]) !== index) return undefined;

    const setL = formParts(scan.body[1], "SET");
    const ptsize = setL?.length === 2 ? formParts(setL[1], "PTSIZE") : undefined;
    const size = atomName(setL?.[0]);
    if (size === undefined || ptsize?.length !== 1 || localName(ptsize[0]) !== pointer) return undefined;

    // The size test, whose body is the part that survives.
    const sizeCond = formParts(scan.body[2], "COND");
    const kept = sizeCond?.length === 1 ? clauseParts(sizeCond[0]) : undefined;
    if (kept === undefined) return undefined;
    const equal = formParts(kept.when, "EQUAL?");
    if (equal?.length !== 4 || localName(equal[0]) !== size) return undefined;
    const kinds = equal.slice(1).map((k) => globalName(k));
    if (kinds.join(",") !== "UEXIT,CEXIT,DEXIT") return undefined;

    // Matched. Everything below produces the rewrite.
    const room = this.expr(roomNode);
    const table: Expr = { op: "prop", entity: room, prop: "adjacentRooms" };
    const destination: Expr = { op: "table-get", table, index: { op: "local", id: index } };

    this.loopDepth++;
    this.exitScanPointer = { local: pointer, destination };
    try {
      return {
        op: "loop",
        body: [
          {
            op: "set-local",
            id: index,
            value: { op: "add", a: { op: "local", id: index }, b: { op: "const", value: 1 } },
          },
          {
            op: "cond",
            clauses: [
              {
                when: {
                  op: "gt?",
                  a: { op: "local", id: index },
                  b: { op: "table-get", table, index: { op: "const", value: 0 } },
                },
                do: [{ op: "break", value: FALSE }],
              },
              { when: TRUE, do: kept.body.map((n) => this.stmt(n)) },
            ],
          },
        ],
      };
    } finally {
      this.exitScanPointer = undefined;
      this.loopDepth--;
    }
  }

  /** Lower ZIL arithmetic: n-ary → left fold, unary `-` → 0 − x. */
  private arith(head: "+" | "-" | "*" | "/", rest: AstNode[]): Expr {
    const op = ({ "+": "add", "-": "sub", "*": "mul", "/": "div" } as const)[head];
    const args = rest.map((a) => this.expr(a));
    if (args.length === 0) this.deny(`operator ${head} with no operands`);
    if (args.length === 1) {
      if (head !== "-") this.deny(`operator ${head} with one operand`);
      return { op: "sub", a: { op: "const", value: 0 }, b: args[0]! };
    }
    return args.slice(1).reduce((a, b) => ({ op, a, b }), args[0]!);
  }

  /** Lower a `,P?NAME` property argument to its IR field name. */
  private propKey(op: string, node: AstNode | undefined): string {
    const atom = node?.type === "GVal" ? atomName(node.value as AstNode) : atomName(node);
    if (atom === undefined || !atom.startsWith("P?")) {
      this.deny(`${op} property is not a ,P?NAME reference`);
    }
    return PROPERTY_MAP.get(atom.slice(2)) ?? this.deny(`unsupported property ,${atom}`);
  }

  private flagArgs(op: string, rest: AstNode[]): { entity: Expr; flag: string } {
    const flagNode = rest[1];
    const flag =
      flagNode?.type === "GVal" ? atomName(flagNode.value as AstNode) : atomName(flagNode);
    if (flag === undefined) this.deny(`${op} flag is not an atom`);
    this.flags.add(flag);
    return { entity: this.expr(rest[0]!), flag };
  }

  /** A `,NAME` reference: entity, direction word, verb id, constant, or global. */
  private resolveName(name: string): Expr {
    if (this.sources.roomAndObjectIds.has(name)) return { op: "entity", id: name };
    if (name.startsWith("P?")) {
      const direction = this.sources.directionWords.get(name.slice(2));
      if (direction !== undefined) return { op: "const", value: direction };
    }
    // ZILF-generated verb-id constants: `,V?ATTACK` compares against the
    // current verb; the IR uses verb words (matching the `verb?` op).
    if (name.startsWith("V?")) return { op: "const", value: name.slice(2) };
    const constant = this.sources.constants.get(name);
    if (constant !== undefined) return { op: "const", value: constant };
    // A flag used as a value rather than in an FSET/FCLEAR/FSET? position.
    // Carried by name, matching how the world document stores `vehicleType`.
    if (this.sources.flagNames.has(name)) {
      this.flags.add(name);
      return { op: "const", value: name };
    }
    if (this.sources.globalForms.has(name)) {
      this.needGlobal(name);
      return { op: "global", id: name };
    }
    // A routine atom as a value (`,LLD-ROOM` in BELL-F): its name string,
    // matching bare-atom routine references — applied targets stay
    // reachable, and BELL-F's routine-vs-room compare (an original-game
    // quirk) stays always-false, as the Z-machine address compare was.
    if (this.sources.callableNames.has(name)) {
      if (this.sources.routineForms.has(name) && !engineOwned(name)) {
        this.callTargets.add(name);
      }
      return { op: "const", value: name };
    }
    this.deny(`unknown name ,${name}`);
  }

  /** Declare a referenced global, resolving its initializer (scalar or table). */
  private needGlobal(id: string): void {
    if (this.globals.has(id) || this.tables.has(id)) return;
    const form = this.sources.globalForms.get(id);
    if (form === undefined) this.deny(`SETG of undeclared global "${id}"`);
    const value = meaningful(form.elements ?? [])[2];
    if (value === undefined) this.deny(`global ${id} has no initializer`);

    if (value.type === "Number") {
      this.globals.set(id, { id, value: value.value as number });
    } else if (value.type === "String") {
      this.globals.set(id, { id, value: this.sources.decodeString(value.value as string) });
    } else if (value.type === "Atom" && value.name === "T") {
      this.globals.set(id, { id, value: true });
    } else if (value.type === "Form") {
      const parts = meaningful(value.elements ?? []);
      const head = atomName(parts[0]);
      if (parts.length === 0) {
        this.globals.set(id, { id, value: false });
      } else if (head === "ITABLE") {
        // `<ITABLE NONE n>` is n zero-filled words — the parser's scratch
        // buffers (P-PRSO/P-PRSI) are declared this way. The length is baked
        // into `elements`, so it addresses exactly like a plain TABLE.
        this.tables.set(id, this.itableEntity(id, parts.slice(1)));
        this.globals.set(id, { id, value: { table: id, offset: 0 } });
      } else if (head === "TABLE" || head === "LTABLE") {
        // `<GLOBAL X <TABLE …>>` declares storage *and* a variable pointing at
        // it. Emitting only the table left `,X` reading an unbound global; the
        // variable also has to exist because ZIL reassigns it — the lamp and
        // candle countdowns advance by `<SETG LAMP-TABLE <REST .TBL 4>>`.
        this.tables.set(id, this.tableEntity(id, head, parts.slice(1)));
        this.globals.set(id, { id, value: { table: id, offset: 0 } });
      } else {
        this.deny(`global ${id} has an unsupported initializer (<${head} …>)`);
      }
    } else {
      this.deny(`global ${id} has an unsupported initializer (${value.type})`);
    }
  }

  /**
   * `<ITABLE NONE n>` — n zero-filled words, no length word. Only the NONE
   * spec is accepted: the `(LEXV)`/`(BYTE LENGTH)` forms in gparser.zil are
   * byte-addressed parser buffers owned by the M4 READ builtin (ADR 0001),
   * not world state, and their layout is not element-addressable here.
   */
  private itableEntity(id: string, args: AstNode[]): Table {
    const spec = atomName(args[0]);
    if (spec !== "NONE") this.deny(`table ${id} has an unsupported ITABLE spec (${spec ?? args[0]?.type})`);
    const count = args[1];
    if (count?.type !== "Number") this.deny(`table ${id} has a non-literal ITABLE length`);
    const n = count.value as number;
    if (!Number.isInteger(n) || n < 0) this.deny(`table ${id} has an invalid ITABLE length (${n})`);
    if (args.length > 2) this.deny(`table ${id} has an ITABLE initializer this stage does not model`);
    return { id, kind: "itable", elements: Array.from({ length: n }, () => 0) };
  }

  private tableEntity(id: string, head: string, elements: AstNode[]): Table {
    const out: TableElement[] = [];
    let pure = false;
    for (const el of elements) {
      if (el.type === "List" && atomName(meaningful(el.elements ?? [])[0]) === "PURE") {
        pure = true;
      } else if (el.type === "String") {
        out.push(this.sources.decodeString(el.value as string));
      } else if (el.type === "Number") {
        out.push(el.value as number);
      } else if (el.type === "Atom" && this.sources.roomAndObjectIds.has(el.name!)) {
        out.push({ ref: el.name! });
      } else if (el.type === "Atom" && this.sources.constants.has(el.name!)) {
        // A numeric CONSTANT inline in the table. The melee message tables
        // interleave string chunks with F-WEP/F-DEF markers, which the
        // renderer compares numerically as it walks the row.
        out.push(this.sources.constants.get(el.name!)!);
      } else if (el.type === "Atom" && this.sources.globalForms.has(el.name!)) {
        // An atom naming a table-valued global (VILLAINS' per-villain rows end
        // in TROLL-MELEE and friends). Declaring it pulls that table into the
        // closure; the element itself is the address, as in ZIL.
        this.needGlobal(el.name!);
        if (!this.tables.has(el.name!)) {
          this.deny(`table ${id} references non-table global ${el.name!}`);
        }
        out.push({ table: el.name!, offset: 0 });
      } else if (el.type === "Form") {
        const parts = meaningful(el.elements ?? []);
        const nested = atomName(parts[0]);
        if (parts.length === 0) {
          // Bare `<>` — a false slot, e.g. the cyclops' absent weapon.
          out.push(false);
        } else if (nested === "TABLE" || nested === "LTABLE") {
          // A nested anonymous table (VILLAINS). Give it a derived id and
          // store a pointer, which is what `<GET ,VILLAINS .CNT>` returns in
          // ZIL anyway — the element is an address, not inline storage.
          const childId = `${id}#${out.length}`;
          this.tables.set(childId, this.tableEntity(childId, nested, parts.slice(1)));
          out.push({ table: childId, offset: 0 });
        } else {
          this.deny(`table ${id} has an unsupported element (<${nested} …>)`);
        }
      } else {
        this.deny(`table ${id} has an unsupported element (${el.type === "Atom" ? el.name : el.type})`);
      }
    }
    const table: Table = { id, kind: head === "TABLE" ? "table" : "ltable", elements: out };
    if (pure) table.pure = true;
    return table;
  }
}

function meaningful(elements: AstNode[]): AstNode[] {
  // `#DECL` type declarations (Chtype/DECL) are compile-time metadata, as
  // ignorable as comments. Other Chtypes (e.g. #BYTE) stay visible.
  return elements.filter(
    (e) => e.type !== "Comment" && !(e.type === "Chtype" && e.typeName === "DECL"),
  );
}

function atomName(node: AstNode | undefined): string | undefined {
  return node?.type === "Atom" ? node.name : undefined;
}

// ---- shape matchers for the exit-scan rewrite (ADR 0003) ----
//
// Deliberately total and undefined-returning rather than denying: a failed
// match must fall back to ordinary transformation, not abort the routine.

/** A `<HEAD …>` form's arguments, or undefined if the node is not one. */
function formParts(node: AstNode | undefined, head: string): AstNode[] | undefined {
  if (node?.type !== "Form") return undefined;
  const parts = meaningful(node.elements ?? []);
  if (atomName(parts[0]) !== head) return undefined;
  return parts.slice(1);
}

/** A COND clause `(predicate body…)` split into its two halves. */
function clauseParts(node: AstNode | undefined): { when: AstNode; body: AstNode[] } | undefined {
  if (node?.type !== "List") return undefined;
  const parts = meaningful(node.elements ?? []);
  if (parts.length === 0) return undefined;
  return { when: parts[0]!, body: parts.slice(1) };
}

/** The name in a `.LOCAL` reference. */
function localName(node: AstNode | undefined): string | undefined {
  return node?.type === "LVal" ? atomName(node.value as AstNode) : undefined;
}

/** The name in a `,GLOBAL` reference. */
function globalName(node: AstNode | undefined): string | undefined {
  return node?.type === "GVal" ? atomName(node.value as AstNode) : undefined;
}

/**
 * Whether two nodes name the same thing — enough to confirm the NEXTP and
 * GETPT calls in a scan walk the *same* room, which is the one identity the
 * rewrite depends on. Compares only the reference forms a room operand can
 * take (`,HERE`, `.RM`, a bare atom); anything else fails closed.
 */
function sameNode(a: AstNode, b: AstNode): boolean {
  const key = (n: AstNode): string | undefined => {
    const g = globalName(n);
    if (g !== undefined) return `,${g}`;
    const l = localName(n);
    if (l !== undefined) return `.${l}`;
    const atom = atomName(n);
    return atom === undefined ? undefined : atom;
  };
  const ka = key(a);
  return ka !== undefined && ka === key(b);
}
