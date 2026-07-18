/**
 * Stage 2.2 POC — reference interpreter for the behavior AST.
 *
 * Deliberately small: the point of the POC is that this ~130-line evaluator
 * plus the builtin layer executes real Zork I routines faithfully. The
 * production engine (stage 4.3) reimplements this against the full world
 * runtime; it may also compile ASTs to closures at load time.
 */

import type { BehaviorRoutine, BehaviorValue, Expr, Stmt, TellPart } from "../src/behavior.js";
import { builtins, tell, truthy, clearFlag, hasFlag, setFlag } from "./world.js";
import type { WorldState } from "./world.js";

class ReturnSignal {
  constructor(readonly value: BehaviorValue) {}
}

type Locals = Record<string, BehaviorValue>;

function evalExpr(expr: Expr, world: WorldState, locals: Locals): BehaviorValue {
  switch (expr.op) {
    case "const":
      return expr.value;
    case "global": {
      const v = world.globals[expr.id];
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
      return expr.verbs.includes(world.verb);
    case "equal?": {
      const [first, ...rest] = expr.args.map((a) => evalExpr(a, world, locals));
      return rest.some((v) => v === first);
    }
    case "flag?": {
      const entity = evalExpr(expr.entity, world, locals);
      if (typeof entity !== "string") throw new Error("flag? target must be an entity");
      return hasFlag(world, entity, expr.flag);
    }
    case "and": {
      let last: BehaviorValue = true;
      for (const arg of expr.args) {
        last = evalExpr(arg, world, locals);
        if (!truthy(last)) return false;
      }
      return last;
    }
    case "or": {
      for (const arg of expr.args) {
        const v = evalExpr(arg, world, locals);
        if (truthy(v)) return v;
      }
      return false;
    }
    case "not":
      return !truthy(evalExpr(expr.arg, world, locals));
    case "gt?":
      return num(evalExpr(expr.a, world, locals)) > num(evalExpr(expr.b, world, locals));
    case "lt?":
      return num(evalExpr(expr.a, world, locals)) < num(evalExpr(expr.b, world, locals));
  }
}

function num(v: BehaviorValue): number {
  if (typeof v !== "number") throw new Error(`expected number, got ${typeof v}`);
  return v;
}

function execStmt(stmt: Stmt, world: WorldState, locals: Locals): void {
  switch (stmt.op) {
    case "cond":
      for (const clause of stmt.clauses) {
        if (truthy(evalExpr(clause.when, world, locals))) {
          execBody(clause.do, world, locals);
          return;
        }
      }
      return;
    case "tell":
      for (const part of stmt.parts) execTellPart(part, world, locals);
      return;
    case "set-global":
      world.globals[stmt.id] = evalExpr(stmt.value, world, locals);
      return;
    case "set-flag":
    case "clear-flag": {
      const entity = evalExpr(stmt.entity, world, locals);
      if (typeof entity !== "string") throw new Error(`${stmt.op} target must be an entity`);
      (stmt.op === "set-flag" ? setFlag : clearFlag)(world, entity, stmt.flag);
      return;
    }
    case "return":
      throw new ReturnSignal(evalExpr(stmt.value, world, locals));
    case "call": {
      const builtin = builtins[stmt.routine];
      if (builtin === undefined) throw new Error(`unknown routine/builtin ${stmt.routine}`);
      builtin(world, stmt.args.map((a) => evalExpr(a, world, locals)));
      return;
    }
  }
}

function execTellPart(part: TellPart, world: WorldState, locals: Locals): void {
  if ("text" in part) tell(world, part.text);
  else if ("newline" in part) tell(world, "", true);
  else tell(world, String(evalExpr(part.expr, world, locals)));
}

function execBody(body: Stmt[], world: WorldState, locals: Locals): void {
  for (const stmt of body) execStmt(stmt, world, locals);
}

/**
 * Run a routine. Falling off the end returns false (sufficient for the POC
 * corpus; ZIL's full last-value semantics are an ADR open question).
 */
export function runRoutine(
  routine: BehaviorRoutine,
  world: WorldState,
  args: BehaviorValue[] = [],
): BehaviorValue {
  const locals: Locals = {};
  (routine.params ?? []).forEach((name, i) => {
    const v = args[i];
    if (v !== undefined) locals[name] = v;
  });
  try {
    execBody(routine.body, world, locals);
  } catch (signal) {
    if (signal instanceof ReturnSignal) return signal.value;
    throw signal;
  }
  return false;
}
