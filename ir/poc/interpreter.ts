/**
 * Reference interpreter for the behavior AST (stage 2.2 POC, extended for
 * stage 3.4). Deliberately small: this evaluator plus the builtin layer
 * executes real Zork I routines faithfully. The production engine (stage 4.3)
 * reimplements this against the full world runtime; it may also compile ASTs
 * to closures at load time.
 *
 * Value semantics (ZIL is expression-oriented — see `BehaviorRoutine` docs):
 * every statement yields a value, a routine returns the value of the last
 * statement it executed, and `cond` yields the taken clause's last value
 * (the predicate's value when the clause has an empty body, false when no
 * clause fires).
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
      const entity = entityId(evalExpr(expr.entity, world, locals), "flag?");
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
    case "in?": {
      const entity = entityId(evalExpr(expr.entity, world, locals), "in?");
      const container = entityId(evalExpr(expr.container, world, locals), "in?");
      return world.locations[entity] === container;
    }
    case "loc": {
      const entity = entityId(evalExpr(expr.entity, world, locals), "loc");
      return world.locations[entity] ?? false;
    }
    case "call":
      return callRoutine(expr.routine, expr.args, world, locals);
  }
}

function num(v: BehaviorValue): number {
  if (typeof v !== "number") throw new Error(`expected number, got ${typeof v}`);
  return v;
}

function entityId(v: BehaviorValue, op: string): string {
  if (typeof v !== "string") throw new Error(`${op} target must be an entity`);
  return v;
}

function callRoutine(routine: string, args: Expr[], world: WorldState, locals: Locals): BehaviorValue {
  const builtin = builtins[routine];
  if (builtin === undefined) throw new Error(`unknown routine/builtin ${routine}`);
  return builtin(world, args.map((a) => evalExpr(a, world, locals)));
}

function execStmt(stmt: Stmt, world: WorldState, locals: Locals): BehaviorValue {
  switch (stmt.op) {
    case "cond":
      for (const clause of stmt.clauses) {
        const predicate = evalExpr(clause.when, world, locals);
        if (truthy(predicate)) {
          return clause.do.length === 0 ? predicate : execBody(clause.do, world, locals);
        }
      }
      return false;
    case "tell":
      for (const part of stmt.parts) execTellPart(part, world, locals);
      return true;
    case "set-global":
      return (world.globals[stmt.id] = evalExpr(stmt.value, world, locals));
    case "set-local":
      return (locals[stmt.id] = evalExpr(stmt.value, world, locals));
    case "set-flag":
    case "clear-flag": {
      const entity = entityId(evalExpr(stmt.entity, world, locals), stmt.op);
      (stmt.op === "set-flag" ? setFlag : clearFlag)(world, entity, stmt.flag);
      return true;
    }
    case "move": {
      const entity = entityId(evalExpr(stmt.entity, world, locals), "move");
      world.locations[entity] = entityId(evalExpr(stmt.to, world, locals), "move");
      return true;
    }
    case "remove": {
      const entity = entityId(evalExpr(stmt.entity, world, locals), "remove");
      delete world.locations[entity];
      return true;
    }
    case "return":
      throw new ReturnSignal(evalExpr(stmt.value, world, locals));
    case "call":
      return callRoutine(stmt.routine, stmt.args, world, locals);
    case "value":
      return evalExpr(stmt.expr, world, locals);
  }
}

function execTellPart(part: TellPart, world: WorldState, locals: Locals): void {
  if ("text" in part) tell(world, part.text);
  else if ("newline" in part) tell(world, "", true);
  else if ("name" in part) {
    const entity = entityId(evalExpr(part.name, world, locals), "tell D");
    tell(world, world.names[entity] ?? entity);
  } else tell(world, String(evalExpr(part.expr, world, locals)));
}

function execBody(body: Stmt[], world: WorldState, locals: Locals): BehaviorValue {
  let last: BehaviorValue = false;
  for (const stmt of body) last = execStmt(stmt, world, locals);
  return last;
}

/** Run a routine; returns the last executed statement's value (ZIL semantics). */
export function runRoutine(
  routine: BehaviorRoutine,
  world: WorldState,
  args: BehaviorValue[] = [],
): BehaviorValue {
  const locals: Locals = {};
  for (const name of routine.locals ?? []) locals[name] = false;
  (routine.params ?? []).forEach((name, i) => {
    locals[name] = args[i] ?? false;
  });
  try {
    return execBody(routine.body, world, locals);
  } catch (signal) {
    if (signal instanceof ReturnSignal) return signal.value;
    throw signal;
  }
}
