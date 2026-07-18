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
  start?: { line: number };
}

/** ZIL operators deliberately outside the batch-1 vocabulary. */
const DENIED_OPERATORS = new Set([
  "REPEAT", "PROG", "AGAIN", "MAPF", "MAPR",
  "FIRST?", "NEXT?",
  "GETP", "PUTP", "GETPT", "PTSIZE",
  "GET", "PUT", "GETB", "PUTB",
  "+", "-", "*", "/", "MOD", "MIN", "ABS", "RANDOM",
  "BAND", "BOR", "BTST", "BCOM",
  "APPLY", "RFATAL", "ASSIGNED?", "DLESS?", "IGRTR?",
  "PRINT", "PRINTN", "PRINTB", "PRINC", "PRINTD",
]);

const TRUE: Expr = { op: "const", value: true };
const FALSE: Expr = { op: "const", value: false };

/** Form heads that map to expressions (legal in statement position via `value`). */
const EXPR_HEADS = new Set([
  "VERB?", "EQUAL?", "==?", "FSET?", "AND", "OR", "NOT",
  "G?", "L?", "0?", "1?", "IN?", "LOC",
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
        throw new Unsupported("optional parameter with default value");
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
    // Bare `T` ending a COND clause, or a value reference in statement
    // position — an expression statement (the routine may return its value).
    if (node.type === "Atom" && node.name === "T") return { op: "value", expr: TRUE };
    if (node.type === "GVal" || node.type === "LVal") return { op: "value", expr: this.expr(node) };
    if (node.type !== "Form") this.deny(`unexpected ${node.type} in statement position`);
    const parts = meaningful(node.elements ?? []);
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
      case "REMOVE":
        return { op: "remove", entity: this.expr(rest[0]!) };
      case "RTRUE":
        return { op: "return", value: TRUE };
      case "RFALSE":
        return { op: "return", value: FALSE };
      case "RETURN":
        return { op: "return", value: rest.length === 0 ? TRUE : this.expr(rest[0]!) };
      default:
        if (EXPR_HEADS.has(head)) return { op: "value", expr: this.formExpr(node) };
        return this.callForm(head, rest);
    }
  }

  private condClause(node: AstNode): CondClause {
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
    if (this.sources.routineForms.has(head)) this.callTargets.add(head);
    return { op: "call", routine: head, args: rest.map((a) => this.expr(a)) };
  }

  // ---- expressions ----

  expr(node: AstNode): Expr {
    switch (node.type) {
      case "String":
        return { op: "const", value: this.sources.decodeString(node.value as string) };
      case "Number":
        return { op: "const", value: node.value as number };
      case "Atom":
        if (node.name === "T") return TRUE;
        // Routine reference passed by name (e.g. `<QUEUE I-CANDLES -1>`).
        if (this.sources.callableNames.has(node.name!)) {
          return { op: "const", value: node.name! };
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
      default: {
        const call = this.callForm(head, rest);
        return { op: "call", routine: call.routine, args: call.args };
      }
    }
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
      } else if (head === "TABLE" || head === "LTABLE") {
        this.tables.set(id, this.tableEntity(id, head, parts.slice(1)));
      } else {
        this.deny(`global ${id} has an unsupported initializer (<${head} …>)`);
      }
    } else {
      this.deny(`global ${id} has an unsupported initializer (${value.type})`);
    }
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
  return elements.filter((e) => e.type !== "Comment");
}

function atomName(node: AstNode | undefined): string | undefined {
  return node?.type === "Atom" ? node.name : undefined;
}
