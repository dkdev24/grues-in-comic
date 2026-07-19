/**
 * The behavior-AST interpreter (stage 4.3) — ADR 0001's execution half.
 *
 * Ported from `ir/poc/interpreter.ts`, which proved the evaluator over 346
 * extracted routines. The evaluator itself is unchanged in substance; what
 * changes is everything around it — output goes to the event sink rather than a
 * string buffer, entity moves emit `object-moved`, and routine calls resolve
 * against the document's routines before falling back to engine builtins.
 *
 * Value semantics are ZIL's, and they are load-bearing rather than incidental:
 * every statement yields a value, a routine returns the value of the last
 * statement it executed, and `cond` yields the taken clause's last value (the
 * predicate's own value when the clause body is empty). Action routines signal
 * "I handled this" by returning true, so getting this wrong makes actions fall
 * through to defaults that should never have run.
 */

import type { BehaviorRoutine, BehaviorValue, Expr, Stmt, TableRef, TellPart } from "@grues-in-comic/ir";
import {
  clearFlag,
  hasFlag,
  move,
  remove,
  setFlag,
  truthy,
  type RuntimeTable,
} from "./state.js";
import { emit, tell, type Builtin, type RuntimeContext } from "./runtime.js";

/** ZIL RETURN/RTRUE/RFALSE — unwind out of the current routine with a value. */
class ReturnSignal {
  constructor(readonly value: BehaviorValue) {}
}

/** `break` unwinds to the nearest enclosing loop/block with a value. */
class BreakSignal {
  constructor(readonly value: BehaviorValue) {}
}

/** `continue` restarts the nearest enclosing loop/block (ZIL AGAIN). */
class ContinueSignal {}

/**
 * ZIL RFATAL — abort the whole turn, not merely the routine. The turn loop
 * catches it; nothing else may.
 */
export class FatalSignal {}

type Locals = Record<string, BehaviorValue>;

/**
 * Recursion limit. Behavior is data loaded from a document, so a cycle is a
 * data defect rather than a code defect, and it must surface as a clear error
 * instead of a stack overflow halfway through an unrelated routine.
 */
const MAX_DEPTH = 200;

export function evalExpr(expr: Expr, ctx: RuntimeContext, locals: Locals): BehaviorValue {
  switch (expr.op) {
    case "const":
      return expr.value;
    case "global": {
      const v = ctx.state.globals[expr.id];
      if (v === undefined) throw new Error(`unbound global ${expr.id}`);
      return v;
    }
    case "local": {
      const v = locals[expr.id];
      if (v === undefined) throw new Error(`unbound local ${expr.id}`);
      return v;
    }
    case "entity":
      return expr.id;
    case "verb?":
      /*
       * ZIL's `<VERB? WALK BOARD THROUGH>` expands to a comparison against
       * **PRSA** — the syntax rule's *action* — not against the word the player
       * typed. The names are the action routines with the `V-` prefix dropped.
       *
       * The difference is invisible for the common case, where "TAKE" parses to
       * V-TAKE, and that is exactly what makes it dangerous. It shows up only
       * where a verb word and its action diverge: "ENTER WINDOW" parses with
       * the verb ENTER but the action V-THROUGH, and the window's routine tests
       * THROUGH. Comparing the verb word leaves the window unable to be entered
       * while every ordinary verb keeps working.
       */
      return expr.verbs.some((name) => ctx.action === `V-${name}`);
    case "equal?": {
      const [first, ...rest] = expr.args.map((a) => evalExpr(a, ctx, locals));
      return rest.some((v) => sameValue(v, first!));
    }
    case "flag?": {
      const entity = entityId(evalExpr(expr.entity, ctx, locals), "flag?");
      return hasFlag(ctx.state, entity, expr.flag);
    }
    case "and": {
      let last: BehaviorValue = true;
      for (const arg of expr.args) {
        last = evalExpr(arg, ctx, locals);
        if (!truthy(last)) return false;
      }
      return last;
    }
    case "or": {
      for (const arg of expr.args) {
        const v = evalExpr(arg, ctx, locals);
        if (truthy(v)) return v;
      }
      return false;
    }
    case "not":
      return !truthy(evalExpr(expr.arg, ctx, locals));
    case "gt?":
      return num(evalExpr(expr.a, ctx, locals)) > num(evalExpr(expr.b, ctx, locals));
    case "lt?":
      return num(evalExpr(expr.a, ctx, locals)) < num(evalExpr(expr.b, ctx, locals));
    case "add":
    case "sub":
    case "mul":
    case "div":
    case "mod":
    case "min": {
      const a = num(evalExpr(expr.a, ctx, locals));
      const b = num(evalExpr(expr.b, ctx, locals));
      const raw =
        expr.op === "add" ? a + b
        : expr.op === "sub" ? a - b
        : expr.op === "mul" ? a * b
        : expr.op === "div" ? Math.trunc(a / b) // ZIL `/` truncates toward zero.
        : expr.op === "mod" ? a % b // sign of the dividend, as on the Z-machine
        : Math.min(a, b);
      return wrap16(raw);
    }
    case "abs":
      // 16-bit wrap keeps ABS −32768 = −32768, as on the Z-machine.
      return wrap16(Math.abs(num(evalExpr(expr.arg, ctx, locals))));
    case "cond":
      for (const clause of expr.clauses) {
        const predicate = evalExpr(clause.when, ctx, locals);
        if (truthy(predicate)) {
          return clause.do.length === 0 ? predicate : execBody(clause.do, ctx, locals);
        }
      }
      return false;
    case "in?": {
      const entity = entityId(evalExpr(expr.entity, ctx, locals), "in?");
      const container = entityId(evalExpr(expr.container, ctx, locals), "in?");
      return ctx.state.locations[entity] === container;
    }
    case "loc": {
      const entity = entityId(evalExpr(expr.entity, ctx, locals), "loc");
      return ctx.state.locations[entity] ?? false;
    }
    case "first": {
      const entity = entityId(evalExpr(expr.entity, ctx, locals), "first");
      return ctx.state.children[entity]?.[0] ?? false;
    }
    case "next": {
      const entity = entityId(evalExpr(expr.entity, ctx, locals), "next");
      const parent = ctx.state.locations[entity];
      if (parent === undefined) return false;
      const siblings = ctx.state.children[parent] ?? [];
      return siblings[siblings.indexOf(entity) + 1] ?? false;
    }
    case "prop": {
      const entity = entityId(evalExpr(expr.entity, ctx, locals), "prop");
      const value = ctx.state.properties[entity]?.[expr.prop];
      return value ?? propertyDefault(expr.prop);
    }
    case "table-get": {
      const { table, element } = tableSlot(expr.table, expr.index, ctx, locals, "table-get");
      if (element === "length") return table.elements.length;
      return table.elements[element] ?? false;
    }
    case "apply":
      return applyRoutine(
        evalExpr(expr.routine, ctx, locals),
        expr.args.map((a) => evalExpr(a, ctx, locals)),
        ctx,
      );
    case "table-rest": {
      const base = tableRef(evalExpr(expr.table, ctx, locals), "table-rest");
      const table = ctx.state.tables[base.table];
      if (table === undefined) throw new Error(`unknown table ${base.table}`);
      if (table.kind === "ltable") throw new Error("table-rest cannot view an ltable");
      return { table: base.table, offset: base.offset + num(evalExpr(expr.offset, ctx, locals)) };
    }
    case "set-global":
      return (ctx.state.globals[expr.id] = evalExpr(expr.value, ctx, locals));
    case "set-local":
      return (locals[expr.id] = evalExpr(expr.value, ctx, locals));
    case "tell":
      for (const part of expr.parts) execTellPart(part, ctx, locals);
      return true;
    case "set-flag":
    case "clear-flag": {
      const entity = entityId(evalExpr(expr.entity, ctx, locals), expr.op);
      (expr.op === "set-flag" ? setFlag : clearFlag)(ctx.state, entity, expr.flag);
      return true;
    }
    case "call":
      return callRoutine(expr.routine, expr.args.map((a) => evalExpr(a, ctx, locals)), ctx);
  }
}

export function execStmt(stmt: Stmt, ctx: RuntimeContext, locals: Locals): BehaviorValue {
  switch (stmt.op) {
    case "cond":
      for (const clause of stmt.clauses) {
        const predicate = evalExpr(clause.when, ctx, locals);
        if (truthy(predicate)) {
          return clause.do.length === 0 ? predicate : execBody(clause.do, ctx, locals);
        }
      }
      return false;
    case "tell":
      for (const part of stmt.parts) execTellPart(part, ctx, locals);
      return true;
    case "set-global":
      return (ctx.state.globals[stmt.id] = evalExpr(stmt.value, ctx, locals));
    case "set-local":
      return (locals[stmt.id] = evalExpr(stmt.value, ctx, locals));
    case "set-flag":
    case "clear-flag": {
      const entity = entityId(evalExpr(stmt.entity, ctx, locals), stmt.op);
      (stmt.op === "set-flag" ? setFlag : clearFlag)(ctx.state, entity, stmt.flag);
      return true;
    }
    case "move": {
      const entity = entityId(evalExpr(stmt.entity, ctx, locals), "move");
      const to = entityId(evalExpr(stmt.to, ctx, locals), "move");
      const from = ctx.state.locations[entity];
      move(ctx.state, entity, to);
      // Containment changes are contract events — this is the hook the comic
      // layer needs to animate the thief stealing, not just prose about it.
      emit(ctx, { type: "object-moved", object: entity, from: from ?? "", to });
      return true;
    }
    case "remove": {
      const entity = entityId(evalExpr(stmt.entity, ctx, locals), "remove");
      const from = ctx.state.locations[entity];
      remove(ctx.state, entity);
      if (from !== undefined) {
        emit(ctx, { type: "object-moved", object: entity, from, to: "" });
      }
      return true;
    }
    case "loop":
    case "block": {
      // A `loop` whose body never breaks is a data defect; bound it rather than
      // hang the host. ZIL's own loops always terminate via RETURN or a signal.
      let iterations = 0;
      while (true) {
        if (++iterations > 100000) throw new Error("behavior loop did not terminate");
        try {
          const value = execBody(stmt.body, ctx, locals);
          if (stmt.op === "block") return value; // PROG falls off its end
        } catch (signal) {
          if (signal instanceof BreakSignal) return signal.value;
          if (!(signal instanceof ContinueSignal)) throw signal;
        }
      }
    }
    case "break":
      throw new BreakSignal(evalExpr(stmt.value, ctx, locals));
    case "continue":
      throw new ContinueSignal();
    case "set-prop": {
      const entity = entityId(evalExpr(stmt.entity, ctx, locals), "set-prop");
      (ctx.state.properties[entity] ??= {})[stmt.prop] = evalExpr(stmt.value, ctx, locals);
      return entity; // ZIL PUTP returns its first argument.
    }
    case "table-set": {
      const { table, element } = tableSlot(stmt.table, stmt.index, ctx, locals, "table-set");
      if (element === "length") throw new Error("table-set cannot write an ltable's length slot");
      table.elements[element] = evalExpr(stmt.value, ctx, locals);
      return evalExpr(stmt.table, ctx, locals); // ZIL PUT returns its first argument.
    }
    case "return":
      throw new ReturnSignal(evalExpr(stmt.value, ctx, locals));
    case "call":
      return callRoutine(stmt.routine, stmt.args.map((a) => evalExpr(a, ctx, locals)), ctx);
    case "value":
      return evalExpr(stmt.expr, ctx, locals);
  }
}

function execTellPart(part: TellPart, ctx: RuntimeContext, locals: Locals): void {
  if ("text" in part) tell(ctx, part.text);
  else if ("newline" in part) tell(ctx, "\n");
  else if ("name" in part) {
    const entity = entityId(evalExpr(part.name, ctx, locals), "tell D");
    tell(ctx, displayName(ctx, entity));
  } else tell(ctx, String(evalExpr(part.expr, ctx, locals)));
}

/** ZIL `D` prints an entity's DESC — its display name, never its id. */
function displayName(ctx: RuntimeContext, entity: string): string {
  return (
    ctx.world.objects.get(entity)?.name ?? ctx.world.rooms.get(entity)?.name ?? entity
  );
}

function execBody(body: Stmt[], ctx: RuntimeContext, locals: Locals): BehaviorValue {
  let last: BehaviorValue = false;
  for (const stmt of body) last = execStmt(stmt, ctx, locals);
  return last;
}

/**
 * Call a routine by name: the document's own routines first, engine builtins
 * second. That order matters — a game may legitimately define a routine sharing
 * a name with a utility, and the game's version must win.
 */
export function callRoutine(
  name: string,
  args: BehaviorValue[],
  ctx: RuntimeContext,
): BehaviorValue {
  const routine = ctx.routines.get(name);
  if (routine !== undefined) return runRoutine(routine, ctx, args);

  const builtin = ctx.builtins.get(name);
  if (builtin !== undefined) return builtin(ctx, args);

  throw new Error(`unknown routine or builtin ${name}`);
}

/**
 * Call a routine whose name was computed at run time (ZIL APPLY).
 *
 * A false or zero name yields false without calling: the Z-machine returns 0
 * for a call to address 0, which is exactly how the corpus probes an object for
 * an ACTION property it may not have.
 */
function applyRoutine(
  name: BehaviorValue,
  args: BehaviorValue[],
  ctx: RuntimeContext,
): BehaviorValue {
  if (name === false || name === 0) return false;
  if (typeof name !== "string") {
    throw new Error(`apply target must be a routine name, got ${typeof name}`);
  }
  return callRoutine(name, args, ctx);
}

/** Run a routine; returns the last executed statement's value (ZIL semantics). */
export function runRoutine(
  routine: BehaviorRoutine,
  ctx: RuntimeContext,
  args: BehaviorValue[] = [],
): BehaviorValue {
  if (++ctx.depth > MAX_DEPTH) {
    ctx.depth--;
    throw new Error(`behavior recursion exceeded ${MAX_DEPTH} frames at ${routine.id}`);
  }
  try {
    const locals: Locals = {};
    for (const name of routine.locals ?? []) locals[name] = false;
    // Defaults apply by arity, as in Z-code: an explicitly passed false does
    // NOT trigger the default. Earlier params bind before later defaults.
    (routine.params ?? []).forEach((name, i) => {
      if (i < args.length) {
        locals[name] = args[i]!;
      } else {
        const dflt = routine.defaults?.[name];
        locals[name] = dflt === undefined ? false : evalExpr(dflt, ctx, locals);
      }
    });
    try {
      return execBody(routine.body, ctx, locals);
    } catch (signal) {
      if (signal instanceof ReturnSignal) return signal.value;
      throw signal;
    }
  } finally {
    ctx.depth--;
  }
}

/**
 * ZIL property defaults (`PROPDEF`). An object that never declares a property
 * still answers when asked for it: `GETP` returns the property-default table
 * entry, not zero.
 *
 * This matters more than it looks. The player object declares no SIZE, so
 * `V-TAKE`'s weight check reads the default 5 — with a bare `false` the
 * arithmetic throws and *every* take fails, which is exactly how this surfaced.
 *
 * These four are the ZIL library's own defaults, shared across games (ADR 0002
 * forbids keying engine behavior off one game's call sites). They are encoded
 * here because the IR has no `propdefs` section yet; carrying them in the
 * document is the correct home and is recorded as an open issue.
 */
const PROPERTY_DEFAULTS: Record<string, number> = {
  size: 5,
  capacity: 0,
  value: 0,
  treasureValue: 0,
};

function propertyDefault(prop: string): BehaviorValue {
  return PROPERTY_DEFAULTS[prop] ?? false;
}

/* ---------------- value helpers ---------------- */

/** Z-machine arithmetic is 16-bit signed with wraparound. */
function wrap16(n: number): number {
  return ((n + 0x8000) & 0xffff) - 0x8000;
}

/** Value equality; table pointers compare by table + offset (Z-machine address). */
function sameValue(a: BehaviorValue, b: BehaviorValue): boolean {
  if (typeof a === "object" && a !== null && typeof b === "object" && b !== null) {
    return a.table === b.table && a.offset === b.offset;
  }
  return a === b;
}

/** A bare table id is the pointer at offset 0; a `table-rest` view carries its own. */
function tableRef(v: BehaviorValue, op: string): TableRef {
  if (typeof v === "string") return { table: v, offset: 0 };
  if (typeof v === "object" && v !== null) return v;
  throw new Error(`${op} target must be a table`);
}

/**
 * Resolve a table expression + index to a concrete slot. LTABLEs answer their
 * element count at index 0 and store element n at index n+1.
 */
function tableSlot(
  tableExpr: Expr,
  indexExpr: Expr,
  ctx: RuntimeContext,
  locals: Locals,
  op: string,
): { table: RuntimeTable; element: number | "length" } {
  const ref = tableRef(evalExpr(tableExpr, ctx, locals), op);
  const table = ctx.state.tables[ref.table];
  if (table === undefined) throw new Error(`unknown table ${ref.table}`);
  const index = num(evalExpr(indexExpr, ctx, locals));
  if (table.kind === "ltable") {
    // An ltable's count occupies the slot a view would have skipped past, so
    // the two addressing schemes cannot be combined (no such use in the corpus).
    if (ref.offset !== 0) throw new Error(`${op} cannot index an ltable through a REST view`);
    return { table, element: index === 0 ? "length" : index - 1 };
  }
  return { table, element: ref.offset + index };
}

export function num(v: BehaviorValue): number {
  if (typeof v !== "number") throw new Error(`expected number, got ${typeof v}`);
  return v;
}

export function entityId(v: BehaviorValue, op: string): string {
  if (typeof v !== "string") throw new Error(`${op} target must be an entity`);
  return v;
}

export type { Builtin };
