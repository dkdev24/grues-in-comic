/**
 * The engine (stage 4.3) — `createEngine`, the turn loop, and ZIL's action
 * dispatch chain.
 *
 * This is the object ADR 0002 specifies: `command()` in, `TurnResult` out, pure
 * and synchronous, with every value crossing the boundary JSON-serializable.
 *
 * The dispatch chain is the part worth reading closely. ZIL gives four
 * consecutive chances to handle an action, and the *first* one to return true
 * ends the turn:
 *
 * 1. the syntax rule's **pre-action** (PRE-*) — vetoes and implicit takes,
 * 2. the **indirect object's** action routine,
 * 3. the **direct object's** action routine,
 * 4. the **room's** action routine (with the M-BEG context),
 *
 * and only if all four decline does the **verb default** (V-*) run. Getting the
 * order or the "returned true" convention wrong is the single most likely cause
 * of a transcript diff, because it silently produces a *plausible* wrong answer
 * — the generic response where the object's special-case one belonged.
 */

import type { BehaviorRoutine, BehaviorValue, Direction, WorldDocument } from "@grues-in-comic/ir";
import { createBuiltins, describeRoom, isLit, M_BEG } from "./builtins.js";
import { CONTRACT_VERSION, type EngineEvent, type TurnResult } from "./events.js";
import { callRoutine, FatalSignal } from "./interpreter.js";
import { loadWorld, type LoadOptions } from "./load.js";
import { resolveExit } from "./movement.js";
import { describeCandidates, parse, type ParseResult } from "./parser.js";
import { Rng } from "./rng.js";
import { emit, emitOn, flush, tell, type RuntimeContext } from "./runtime.js";
import { here, truthy, type GameState, type WorldIndex } from "./state.js";
import { buildLexicon, type Lexicon } from "./vocabulary.js";

export interface EngineOptions extends LoadOptions {
  /** Fixes the random sequence. Same seed + same commands ⇒ same events. */
  seed?: number;
}

/**
 * A complete, JSON-serializable game state. `Set`s become arrays so the whole
 * thing survives `JSON.stringify` — which is what makes save files, the
 * transcript harness, and Worker hosting the same problem.
 */
export interface SaveState {
  contractVersion: string;
  turn: number;
  rngState: number;
  globals: Record<string, unknown>;
  flags: Record<string, string[]>;
  locations: Record<string, string>;
  children: Record<string, string[]>;
  properties: Record<string, Record<string, unknown>>;
  tables: Record<string, { kind: string; elements: unknown[]; pure: boolean }>;
  visited: string[];
  clock: string[];
}

export interface Engine {
  /** Execute one player command; returns the ordered events of that turn. */
  command(input: string): TurnResult;
  /** The opening room description, before any command. */
  start(): TurnResult;
  snapshot(): SaveState;
  restore(save: SaveState): void;
}

export function createEngine(doc: WorldDocument, options: EngineOptions = {}): Engine {
  const { seed, ...loadOptions } = options;
  const { world, state } = loadWorld(doc, loadOptions);
  const lexicon = buildLexicon(doc);
  const routines = new Map<string, BehaviorRoutine>(
    (doc.routines ?? []).map((r) => [r.id, r]),
  );
  const builtins = createBuiltins();
  const rng = new Rng(seed ?? 0);

  /**
   * ZIL V-WALK — travel. The story file never defines it because travel is the
   * *engine's* job: it consults the room's exit table, which is world data
   * rather than behavior. The direction arrives as PRSO (or, when DO-WALK
   * re-dispatched the turn, in P-WALK-DIR).
   */
  builtins.set("V-WALK", (ctx) => {
    const dir = ctx.directObject ?? ctx.state.globals["P-WALK-DIR"];
    if (typeof dir !== "string") {
      tell(ctx, "You must supply a direction.\n");
      return true;
    }
    travel(ctx, dir as Direction);
    return true;
  });

  /**
   * ZIL PERFORM (gverbs.zil) — run the dispatch chain for a *different* action
   * than the one parsed. This is how one verb delegates to another ("ENTER" to
   * V-THROUGH, a container's action to V-LOOK-INSIDE) without duplicating the
   * four-step chain, so it must live here rather than in `builtins.ts`: it is
   * dispatch re-entered, not a utility.
   *
   * PRSA/PRSO/PRSI are saved and restored around the call. ZIL relies on that —
   * the caller's own action continues afterwards and must still see its own
   * objects.
   */
  builtins.set("PERFORM", (ctx, [verb, prso, prsi]) => {
    const saved = {
      action: ctx.action,
      directObject: ctx.directObject,
      indirectObject: ctx.indirectObject,
      verb: ctx.verb,
    };
    try {
      /*
       * The first argument is a **verb name**, not an action routine: ZIL
       * writes `<PERFORM ,V?WALK .DIR>` and extraction reduces `,V?WALK` to
       * the bare "WALK". The action is that name with the `V-` prefix, the same
       * mapping `verb?` uses on the way in.
       */
      ctx.action = typeof verb === "string" ? `V-${verb}` : "";
      ctx.verb = typeof verb === "string" ? verb : "";
      ctx.directObject = typeof prso === "string" ? prso : undefined;
      ctx.indirectObject = typeof prsi === "string" ? prsi : undefined;
      dispatch(ctx, undefined);
      return true;
    } finally {
      ctx.action = saved.action;
      ctx.directObject = saved.directObject;
      ctx.indirectObject = saved.indirectObject;
      ctx.verb = saved.verb;
    }
  });

  /**
   * A fresh context per turn. PRSA/PRSO/PRSI are accessors over the globals of
   * the same name — see {@link RuntimeContext} — so a routine reading `,PRSO`
   * and the engine reading `ctx.directObject` are reading one value, not two.
   * ZIL clears them at the start of every turn; so do we.
   */
  const context = (): RuntimeContext => {
    state.globals["PRSA"] = false;
    state.globals["PRSO"] = false;
    state.globals["PRSI"] = false;

    return {
      world,
      state,
      rng,
      routines,
      builtins,
      get action(): string {
        const v = state.globals["PRSA"];
        return typeof v === "string" ? v : "";
      },
      set action(value: string) {
        state.globals["PRSA"] = value;
      },
      get directObject(): string | undefined {
        const v = state.globals["PRSO"];
        return typeof v === "string" ? v : undefined;
      },
      set directObject(value: string | undefined) {
        state.globals["PRSO"] = value ?? false;
      },
      get indirectObject(): string | undefined {
        const v = state.globals["PRSI"];
        return typeof v === "string" ? v : undefined;
      },
      set indirectObject(value: string | undefined) {
        state.globals["PRSI"] = value ?? false;
      },
      verb: "",
      events: [],
      buffer: "",
      channel: "prose",
      pendingWalks: [],
      depth: 0,
    };
  };

  state.globals["LIT"] = true; // recomputed on the first describe, below

  return {
    start(): TurnResult {
      const ctx = context();
      state.globals["LIT"] = isLit(ctx, here(state));
      describeRoom(ctx, here(state), true);
      flush(ctx);
      return { events: ctx.events, turn: state.turn };
    },

    command(input: string): TurnResult {
      const ctx = context();
      runTurn(ctx, world, state, lexicon, input);
      flush(ctx);
      return { events: ctx.events, turn: state.turn };
    },

    snapshot: () => snapshot(state, rng),
    restore: (save) => restore(state, rng, save),
  };
}

/* ---------------- the turn ---------------- */

function runTurn(
  ctx: RuntimeContext,
  world: WorldIndex,
  state: GameState,
  lexicon: Lexicon,
  input: string,
): void {
  const parsed = parse(world, state, lexicon, input);

  // A turn the parser rejected still costs the player nothing — ZIL does not
  // advance the clock on a parse failure, which is why "XYZZY" never lets the
  // lamp burn down.
  if (!handleParse(ctx, parsed)) return;
  if (ctx.finished !== undefined) {
    emit(ctx, { type: "game-over", ...ctx.finished });
    return;
  }

  // DO-WALK re-dispatches the turn as travel; drain it before the clock runs.
  let guard = 0;
  while (ctx.pendingWalks.length > 0) {
    if (++guard > 16) throw new Error("DO-WALK did not settle");
    const dir = ctx.pendingWalks.shift()!;
    travel(ctx, dir as Direction);
  }

  runClock(ctx);
  state.turn = Number(state.globals["MOVES"] ?? state.turn);
}

/** Returns true when the turn should proceed to daemons; false on a parse failure. */
function handleParse(ctx: RuntimeContext, parsed: ParseResult): boolean {
  switch (parsed.kind) {
    case "travel":
      travel(ctx, parsed.direction);
      return true;

    case "command":
      ctx.action = parsed.action;
      ctx.verb = parsed.verb;
      if (parsed.directObject !== undefined) ctx.directObject = parsed.directObject;
      if (parsed.indirectObject !== undefined) ctx.indirectObject = parsed.indirectObject;
      dispatch(ctx, parsed.preAction);
      return true;

    case "empty":
      emitOn(ctx, "system", "I beg your pardon?\n");
      return false;
    case "unknown-word":
      emitOn(ctx, "system", `I don't know the word "${parsed.word.toLowerCase()}".\n`);
      return false;
    case "no-verb":
      emitOn(ctx, "system", "That sentence isn't one I recognize.\n");
      return false;
    case "no-syntax":
      emitOn(ctx, "system", "That sentence isn't one I recognize.\n");
      return false;
    case "not-here":
      emitOn(ctx, "system", "You can't see any such thing.\n");
      return false;
    case "ambiguous": {
      const names = describeCandidates(ctx.world, parsed.candidates);
      emit(ctx, {
        type: "question",
        text: `Which do you mean, the ${names.join(" or the ")}?\n`,
      });
      return false;
    }
  }
}

/**
 * ZIL's action dispatch chain. See the module comment — the order and the
 * "first true wins" convention are both load-bearing.
 */
function dispatch(ctx: RuntimeContext, preAction: string | undefined): void {
  try {
    if (preAction !== undefined && handled(ctx, preAction)) return;

    if (ctx.indirectObject !== undefined) {
      const action = entityAction(ctx, ctx.indirectObject);
      if (action !== undefined && handled(ctx, action)) return;
    }
    if (ctx.directObject !== undefined) {
      const action = entityAction(ctx, ctx.directObject);
      if (action !== undefined && handled(ctx, action)) return;
    }

    const room = ctx.world.rooms.get(here(ctx.state));
    if (room?.action !== undefined && handled(ctx, room.action, [M_BEG])) return;

    // Nobody claimed it: the verb's own default runs.
    if (!handled(ctx, ctx.action)) {
      tell(ctx, "You can't do that.\n");
    }
  } catch (signal) {
    // RFATAL aborts the turn without aborting the game.
    if (!(signal instanceof FatalSignal)) throw signal;
  }
}

/** Run a routine and report whether it claimed the action (ZIL's true = handled). */
function handled(ctx: RuntimeContext, routine: string, args: BehaviorValue[] = []): boolean {
  if (!ctx.routines.has(routine) && !ctx.builtins.has(routine)) {
    // An action the corpus never defined — SAVE, RESTORE, and the other
    // meta-verbs that are the *host's* business, not the game's.
    return metaVerb(ctx, routine);
  }
  return truthy(callRoutine(routine, args, ctx));
}

/**
 * Verbs the story file never implements because they are the interpreter's job.
 * ADR 0002 puts save/restore on the host (the engine offers `snapshot`), so the
 * engine answers rather than pretending the verb does not exist.
 */
function metaVerb(ctx: RuntimeContext, action: string): boolean {
  switch (action) {
    case "V-QUIT":
      ctx.finished = { outcome: "quit", text: "" };
      emit(ctx, { type: "game-over", outcome: "quit", text: "" });
      return true;
    case "V-VERSION":
      emitOn(ctx, "system", `Engine contract ${CONTRACT_VERSION}\n`);
      return true;
    case "V-SAVE":
    case "V-RESTORE":
    case "V-RESTART":
      emitOn(ctx, "system", "That is handled outside the game.\n");
      return true;
    case "V-SCRIPT":
    case "V-UNSCRIPT":
    case "V-VERIFY":
    case "V-RECORD":
    case "V-UNRECORD":
    case "V-COMMAND-FILE":
    case "V-ECHO":
      emitOn(ctx, "system", "That has no effect here.\n");
      return true;
    default:
      return false;
  }
}

/** An entity's ACTION routine, read from live state so `set-prop` is honoured. */
function entityAction(ctx: RuntimeContext, id: string): string | undefined {
  const value = ctx.state.properties[id]?.["action"];
  return typeof value === "string" ? value : undefined;
}

/* ---------------- travel ---------------- */

function travel(ctx: RuntimeContext, direction: Direction): void {
  const from = here(ctx.state);
  let outcome = resolveExit(ctx.world, ctx.state, from, direction);

  // A PER exit is a routine returning either a destination or false. This is
  // the deferral stage 4.1 left behind, now that there is an interpreter.
  if (outcome.kind === "routine") {
    const result = callRoutine(outcome.routine, [], ctx);
    outcome =
      typeof result === "string" && ctx.world.rooms.has(result)
        ? { kind: "go", to: result }
        : { kind: "refused" };
  }

  switch (outcome.kind) {
    case "go":
      ctx.builtins.get("GOTO")!(ctx, [outcome.to]);
      return;
    case "blocked":
      tell(ctx, `${outcome.message}\n`);
      return;
    case "refused":
      tell(ctx, "You can't go that way.\n");
      return;
    case "none":
      tell(ctx, "You can't go that way.\n");
      return;
  }
}

/* ---------------- clock ---------------- */

function runClock(ctx: RuntimeContext): void {
  const clocker = ctx.builtins.get("CLOCKER");
  if (clocker === undefined) return;
  try {
    clocker(ctx, []);
  } catch (signal) {
    if (!(signal instanceof FatalSignal)) throw signal;
  }
  if (ctx.finished !== undefined) {
    emit(ctx, { type: "game-over", ...ctx.finished });
  }
}

/* ---------------- save / restore ---------------- */

function snapshot(state: GameState, rng: Rng): SaveState {
  return {
    contractVersion: CONTRACT_VERSION,
    turn: state.turn,
    rngState: rng.state,
    globals: { ...state.globals },
    flags: Object.fromEntries(Object.entries(state.flags).map(([id, s]) => [id, [...s]])),
    locations: { ...state.locations },
    children: Object.fromEntries(
      Object.entries(state.children).map(([id, c]) => [id, [...c]]),
    ),
    properties: Object.fromEntries(
      Object.entries(state.properties).map(([id, p]) => [id, { ...p }]),
    ),
    tables: Object.fromEntries(
      Object.entries(state.tables).map(([id, t]) => [
        id,
        { kind: t.kind, elements: [...t.elements], pure: t.pure },
      ]),
    ),
    visited: [...state.visited],
    clock: [...state.clock],
  };
}

function restore(state: GameState, rng: Rng, save: SaveState): void {
  if (save.contractVersion.split(".")[0] !== CONTRACT_VERSION.split(".")[0]) {
    throw new Error(
      `save is contract ${save.contractVersion}, engine speaks ${CONTRACT_VERSION}`,
    );
  }
  state.turn = save.turn;
  rng.state = save.rngState;
  state.globals = { ...save.globals } as GameState["globals"];
  state.flags = Object.fromEntries(
    Object.entries(save.flags).map(([id, list]) => [id, new Set(list)]),
  );
  state.locations = { ...save.locations };
  state.children = Object.fromEntries(
    Object.entries(save.children).map(([id, c]) => [id, [...c]]),
  );
  state.properties = { ...save.properties } as GameState["properties"];
  state.tables = Object.fromEntries(
    Object.entries(save.tables).map(([id, t]) => [
      id,
      { kind: t.kind as "table" | "ltable" | "itable", elements: [...t.elements], pure: t.pure },
    ]),
  ) as GameState["tables"];
  state.visited = new Set(save.visited);
  state.clock = [...save.clock];
}
