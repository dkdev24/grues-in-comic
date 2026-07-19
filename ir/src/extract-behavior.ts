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
  "RANDOM",
  "BAND", "BOR", "BTST", "BCOM",
  "ASSIGNED?", "DLESS?", "IGRTR?",
  "PRINT", "PRINTB", "PRINC", "PRINTD",
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
    if (CLOCK_BUILTINS.has(id)) continue;
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
    const body = prelude.concat(elements.slice(3).map((n) => this.stmt(n)));
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
      case "TELL":
        return { op: "tell", parts: this.tellParts(rest) };
      case "CRLF":
        return { op: "tell", parts: [{ newline: true }] };
      case "PRINTN":
        return { op: "tell", parts: [{ expr: this.expr(rest[0]!) }] };
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
    if (!this.sources.callableNames.has(head)) this.deny(`unknown form <${head} …>`);
    if (this.sources.routineForms.has(head) && !CLOCK_BUILTINS.has(head)) {
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
          if (this.sources.routineForms.has(node.name!) && !CLOCK_BUILTINS.has(node.name!)) {
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
        return { op: "tell", parts: [{ expr: this.expr(rest[0]!) }] };
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
    if (this.sources.globalForms.has(name)) {
      this.needGlobal(name);
      return { op: "global", id: name };
    }
    // A routine atom as a value (`,LLD-ROOM` in BELL-F): its name string,
    // matching bare-atom routine references — applied targets stay
    // reachable, and BELL-F's routine-vs-room compare (an original-game
    // quirk) stays always-false, as the Z-machine address compare was.
    if (this.sources.callableNames.has(name)) {
      if (this.sources.routineForms.has(name) && !CLOCK_BUILTINS.has(name)) {
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
