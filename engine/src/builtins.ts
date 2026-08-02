/**
 * Engine builtins (stage 4.3) — ZIL's utility layer.
 *
 * ADR 0001 divides imperative code in two. **Group B** is game logic, extracted
 * to the behavior AST and executed by the interpreter. **Group A** is the
 * utility layer every ZIL game shares — the clock, the light rule, the action
 * dispatcher — which is *engine* code and is implemented here rather than
 * transcribed per game.
 *
 * ADR 0002's portability rule binds this file specifically: these implement the
 * **Z-Machine Standard and the ZIL library**, not Zork I's call sites. No
 * `zork1` identifier appears here, and nothing keys off a Zork-specific entity.
 * The originals live in `original-projects/zork1/g*.zil` — the `g` prefix is
 * itself the ZIL convention for "shared across games".
 */

import type { BehaviorValue, Direction } from "@grues-in-comic/ir";
import { callRoutine, entityId, num } from "./interpreter.js";
import { emit, emitOn, tell, type Builtin, type RuntimeContext } from "./runtime.js";
import { exitFor, goTo } from "./movement.js";
import { scope } from "./scope.js";
import {
  hasFlag,
  here,
  move,
  PLAYER_ID,
  setFlag,
  truthy,
  type GameState,
  type RuntimeTable,
} from "./state.js";

/**
 * ZIL's room/object action contexts (gmain.zil `M-*` constants). A room action
 * routine is called with one of these to say *why* it is running, and the
 * routine switches on it.
 *
 * They are **numbers**, not names: the extracted AST compares `RARG` against
 * `{op: "const", value: 3}`. Passing the string "M-LOOK" is not a type error
 * anywhere — the comparison simply never matches, and the room silently loses
 * its description while everything else keeps working.
 */
export const M_BEG = 1;
export const M_ENTER = 2;
export const M_LOOK = 3;
export const M_FLASH = 4;
export const M_OBJDESC = 5;
export const M_END = 6;

/** Interrupt record slots (gclock.zil C-ENABLED?/C-TICK/C-RTN constants). */
const C_ENABLED = 0;
const C_TICK = 1;
const C_RTN = 2;

export function createBuiltins(): Map<string, Builtin> {
  const b = new Map<string, Builtin>();

  /* ---------------- randomness ---------------- */

  /** ZIL RANDOM — 1..n inclusive, drawn from the seeded generator. */
  b.set("RANDOM", (ctx, [n]) => ctx.rng.random(num(n ?? 0)));

  /**
   * ZIL PROB (gmacros.zil): succeed `base` percent of the time. The LUCKY
   * global widens the denominator to 300 when the player is out of favour,
   * which is ZPROB's whole purpose.
   */
  b.set("PROB", (ctx, [base]) => {
    const ceiling = truthy(ctx.state.globals["LUCKY"]) ? 100 : 300;
    return num(base ?? 0) > ctx.rng.random(ceiling);
  });

  /**
   * ZIL PICK-ONE (gmacros.zil): a *rotating* random choice, not a plain one.
   * The table keeps a cursor at slot 1 and each pick swaps the chosen message
   * to the front of the unused region, so every message is seen once before any
   * repeats. Reproducing the rotation matters — a plain random pick would drift
   * from the transcripts within a few turns even with an identical seed.
   */
  b.set("PICK-ONE", (ctx, [tableRef]) => {
    const table = resolveTable(ctx, tableRef);
    /*
     * Layout, in IR element terms: `[cursor, ...messages]`. An LTABLE's length
     * word is synthesized by the IR rather than stored, so the ZIL source's
     * literal leading 0 — the cursor — lands at element 0.
     *
     * ZIL walks this with `<REST .FROB 2>`, which skips two *bytes*, i.e. one
     * word. Reading that as two elements shifts the whole window and makes the
     * routine pick a message that is really the cursor.
     */
    const messageCount = table.elements.length - 1;
    if (messageCount <= 0) return "";

    let cursor = num(table.elements[0] ?? 0);
    if (cursor >= messageCount) cursor = 0;

    // Choose from the not-yet-used tail, then swap the winner to the front of
    // it. That is what makes the sequence a rotation: every message is shown
    // once before any repeats.
    const pick = cursor + ctx.rng.random(messageCount - cursor);
    const chosen = table.elements[pick] ?? table.elements[cursor + 1]!;
    table.elements[pick] = table.elements[cursor + 1]!;
    table.elements[cursor + 1] = chosen;

    cursor += 1;
    if (cursor === messageCount) cursor = 0;
    table.elements[0] = cursor;
    return chosen;
  });

  /* ---------------- predicates ---------------- */

  /**
   * ZIL FLAMING? / OPENABLE? (gmacros.zil DEFMACs). They are macros in the
   * original, so they never appear as routines to extract, but call sites do.
   */
  b.set("FLAMING?", (ctx, [obj]) => {
    const id = entityId(obj ?? false, "FLAMING?");
    return hasFlag(ctx.state, id, "FLAMEBIT") && hasFlag(ctx.state, id, "ONBIT");
  });

  b.set("OPENABLE?", (ctx, [obj]) => {
    const id = entityId(obj ?? false, "OPENABLE?");
    return hasFlag(ctx.state, id, "DOORBIT") || hasFlag(ctx.state, id, "CONTBIT");
  });

  /**
   * ZIL GLOBAL-IN? (gverbs.zil): is this object one of the room's scenery
   * globals? The IR keeps that list on the room as `scenery`, so the ZIL
   * property walk becomes a direct lookup.
   */
  b.set("GLOBAL-IN?", (ctx, [obj, room]) => {
    const id = entityId(obj ?? false, "GLOBAL-IN?");
    const roomId = entityId(room ?? false, "GLOBAL-IN?");
    return globalIn(ctx, id, roomId);
  });

  /**
   * ZIL LIT? (gparser.zil): is the room lit — by its own ONBIT, or by any lit
   * object the player can reach? The original walks the parser's scope tables;
   * we ask the scope module, which is the same question asked once.
   */
  b.set("LIT?", (ctx, [room]) => {
    const roomId = typeof room === "string" ? room : here(ctx.state);
    return isLit(ctx, roomId);
  });

  /* ---------------- movement ---------------- */

  /**
   * ZIL GOTO (gverbs.zil): the real room transition — move the player, update
   * HERE and LIT, then describe the new room. Vehicles move instead of the
   * player when the player is aboard one.
   */
  b.set("GOTO", (ctx, [room, describe]) => {
    const to = entityId(room ?? false, "GOTO");
    if (!ctx.world.rooms.has(to)) throw new Error(`GOTO target ${to} is not a room`);

    const vehicle = vehicleCarrying(ctx.state, PLAYER_ID);
    const { from, firstVisit } = goTo(ctx.state, to);
    if (vehicle !== undefined) move(ctx.state, vehicle, to);

    emit(ctx, { type: "player-moved", from, to });
    ctx.state.globals["LIT"] = isLit(ctx, to);

    /*
     * Score on first entry, tracked by the engine's own `visited` set rather
     * than by TOUCHBIT. TOUCHBIT belongs to DESCRIBE-ROOM, which sets it itself
     * and reads it as "this room has been described before" — setting it here
     * to mark a visit made the room's own description vanish, since by the time
     * DESCRIBE-ROOM looked, the room already claimed to have been seen.
     */
    const entered = ctx.world.rooms.get(to)!;
    if (firstVisit && entered.score !== undefined) addScore(ctx, entered.score);

    /*
     * Entering an unlit room is announced before anything else — GOTO prints
     * this ahead of the M-ENTER call, so the player learns they have stepped
     * into the dark before the room's own arrival effects speak.
     */
    if (!truthy(ctx.state.globals["LIT"]) && truthy(ctx.state.globals["WINNER"] === PLAYER_ID)) {
      tell(ctx, "You have moved into a dark place.\n");
    }

    /*
     * The room's own action routine runs on entry with M-ENTER, and it runs
     * **before** the description. This is where Zork puts the consequences of
     * arriving — the trap door slamming shut behind the player in the Cellar is
     * an M-ENTER effect, and the transcript shows it announced before the room
     * is described, not after. Running it later still prints every word, in an
     * order that reads as though the door closed on the way out.
     */
    const action = ctx.state.properties[to]?.["action"];
    if (typeof action === "string") callRoutine(action, [M_ENTER], ctx);

    if (describe !== false) describeRoom(ctx, to, firstVisit);
    return true;
  });

  /** ZIL DO-WALK (gverbs.zil): re-dispatch this turn as WALK <direction>. */
  b.set("DO-WALK", (ctx, [dir]) => {
    ctx.pendingWalks.push(entityId(dir ?? false, "DO-WALK"));
    return true;
  });

  /** ZIL THIS-IS-IT (gverbs.zil): set the pronoun referent. */
  b.set("THIS-IS-IT", (ctx, [obj]) => {
    const id = entityId(obj ?? false, "THIS-IS-IT");
    ctx.itObject = id;
    // P-IT-OBJECT is a declared global, so behavior can read the referent back.
    ctx.state.globals["P-IT-OBJECT"] = id;
    return true;
  });

  /**
   * ZIL OTHER-SIDE (gverbs.zil): the *direction* of the door-exit that leads
   * through a given door from where the player stands — **not** the room beyond
   * it, despite the routine's "finds room beyond given door" comment. The ZIL
   * walks HERE's direction properties (`NEXTP`) for a `DEXIT` whose `DEXITOBJ`
   * matches the door and `<RETURN .P>` returns the property *number*, i.e. the
   * direction. Its only caller, `V-THROUGH`, feeds that straight to
   * `<DO-WALK .M>`, which expects a direction — returning the room would push a
   * room id onto `pendingWalks` and fail to resolve as a heading. The IR models
   * exits structurally, so the property walk is a lookup over `exits`.
   */
  b.set("OTHER-SIDE", (ctx, [door]) => {
    const id = entityId(door ?? false, "OTHER-SIDE");
    const room = ctx.world.rooms.get(here(ctx.state));
    for (const exit of room?.exits ?? []) {
      if (exit.kind === "door" && exit.door === id) return exit.direction;
    }
    return false;
  });

  /* ---------------- output ---------------- */

  /**
   * ZIL NOT-HERE-PRINT (gglobals.zil): the "you can't see any such thing"
   * refusal. The original reprints the player's own words from the parser
   * buffer; the engine keeps the same noun on {@link RuntimeContext} so the
   * message names what was actually typed.
   */
  b.set("NOT-HERE-PRINT", (ctx) => {
    tell(ctx, "You can't see any such thing.");
    return true;
  });

  /** ZIL FINISH: the game is over. The turn loop stops as soon as it sees this. */
  b.set("FINISH", (ctx) => {
    ctx.finished ??= { outcome: "death", text: "" };
    return true;
  });

  /* ---------------- the clock (gclock.zil) ---------------- */

  /*
   * The interrupt table is engine state. QUEUE/INT return an interrupt record —
   * a 3-slot table addressed by the C-ENABLED?/C-TICK/C-RTN constants — so
   * extracted GET/PUT code operates on it unchanged.
   */
  b.set("INT", (ctx, [rtn]) => {
    const name = entityId(rtn ?? false, "INT");
    const id = `INT-${name}`;
    if (ctx.state.tables[id] === undefined) {
      ctx.state.tables[id] = { kind: "table", elements: [0, 0, name], pure: false };
      ctx.state.clock.unshift(id);
    }
    return id;
  });

  b.set("QUEUE", (ctx, [rtn, tick]) => {
    const id = b.get("INT")!(ctx, [rtn ?? false]);
    interruptRecord(ctx, id).elements[C_TICK] = num(tick ?? 0);
    return id;
  });

  b.set("ENABLE", (ctx, [int]) => {
    interruptRecord(ctx, int).elements[C_ENABLED] = 1;
    return int ?? false;
  });

  b.set("DISABLE", (ctx, [int]) => {
    interruptRecord(ctx, int).elements[C_ENABLED] = 0;
    return int ?? false;
  });

  /**
   * ZIL CLOCKER (gclock.zil): one end-of-turn tick. Every enabled record's tick
   * decrements, and its routine fires when the pre-decrement tick was ≤ 1 — so
   * a tick of −1 is a demon that runs every turn and 0 means dormant.
   *
   * The P-WON demon-region gating (on a turn the parser rejected, demons run but
   * timers do not) is stage 4.5 and is deliberately absent here.
   */
  b.set("CLOCKER", (ctx) => {
    if (truthy(ctx.state.globals["CLOCK-WAIT"])) {
      ctx.state.globals["CLOCK-WAIT"] = false;
      return false;
    }
    let fired: BehaviorValue = false;
    for (const id of [...ctx.state.clock]) {
      const record = interruptRecord(ctx, id);
      if (record.elements[C_ENABLED] !== 1) continue;
      const tick = record.elements[C_TICK];
      if (typeof tick !== "number" || tick === 0) continue;
      record.elements[C_TICK] = tick - 1;
      if (tick <= 1) {
        const rtn = record.elements[C_RTN];
        if (typeof rtn !== "string") throw new Error(`CLOCKER: bad routine ${String(rtn)}`);

        /*
         * A daemon whose routine the document never defined disables itself
         * after being reported once, instead of throwing.
         *
         * Not leniency for its own sake: the alternative is that a single
         * unextracted routine destroys *every subsequent turn*, so a harness
         * run reports dozens of failures that are all one cause, and the turn
         * where the real divergence begins is buried. The routine name is
         * recorded on `ctx.missingRoutines` so it is reported once, loudly,
         * rather than swallowed — silence here would be worse than the crash.
         */
        if (!ctx.routines.has(rtn) && !ctx.builtins.has(rtn)) {
          ctx.missingRoutines.add(rtn);
          record.elements[C_ENABLED] = 0;
          continue;
        }
        if (truthy(callRoutine(rtn, [], ctx))) fired = true;
      }
    }
    ctx.state.globals["MOVES"] = num(ctx.state.globals["MOVES"] ?? 0) + 1;
    return fired;
  });

  /* ---------------- placeholders ---------------- */

  /*
   * Named by the corpus but belonging to a system the extractor cannot yet
   * represent. Stubbed rather than omitted so a call site reaches a defined
   * no-op instead of crashing a turn, returning the "nothing happened" value
   * its callers test for.
   *
   * HERO-BLOW and RANDOMIZE-OBJECTS were stubbed here until RANDOM became an
   * extractable operator; both are real extracted routines now, and routines
   * take precedence over builtins, so leaving the stubs would only have been
   * dead code shadowed at every call. V-CLIMB-UP was the last stub of this kind
   * and is now a full builtin over the structural exit model (see below).
   */
  /*
   * The copyright banner ("ZORK I: The Great Underground Empire / Infocom
   * interactive fiction ... All rights reserved.", plus the release and serial
   * line the interpreter adds).
   *
   * A no-op, not an omission by accident: the banner is a fixed preamble rather
   * than gameplay, `harness/golden.ts` strips it from every golden, and HANDOFF
   * has recorded it as a sanctioned diff since stage 0.2. The engine has never
   * emitted it; this only makes that explicit now that `GO` reaches the call —
   * it fires once at startup, when HERE has no TOUCHBIT.
   *
   * (V-VERSION is also catalogued on `operator BAND`, so there is no extracted
   * body to fall back on.)
   */
  b.set("V-VERSION", () => true);

  /*
   * HINT / HELP (stage 6.6) — not ZIL verbs; the corpus never defines them, so
   * `engine.ts` registers the words HINT and HELP on the lexicon itself and
   * routes them here like any other verb default. Kept deliberately shallow:
   * scope only tells us *what* is here, not which verb usefully applies to it
   * (that is runtime behavior, not a static property of the object), so V-HINT
   * names objects and stops there rather than guessing at "useful" commands.
   */
  b.set("V-HINT", (ctx) => {
    const items = scope(ctx.world, ctx.state)
      .filter((e) => e.origin !== "global")
      .filter((e) => !hasFlag(ctx.state, e.id, "NDESCBIT") && !hasFlag(ctx.state, e.id, "INVISIBLE"))
      .map((e) => ctx.world.objects.get(e.id)?.name)
      .filter((name): name is string => name !== undefined);

    if (items.length === 0) {
      tell(ctx, "Nothing here stands out to try commands on. Type HELP for the kinds of things you can do.\n");
    } else {
      tell(ctx, `Things you can try commands on here: ${items.join(", ")}.\n`);
      tell(ctx, "HINT only lists what's around, not what to do with it — that part is up to you.\n");
    }
    return true;
  });

  b.set("V-HELP", (ctx) => {
    tell(
      ctx,
      "This is a text adventure: type short commands, usually a verb and an object.\n" +
        "Examples: NORTH (or N), LOOK, EXAMINE LAMP, TAKE SWORD, OPEN DOOR, PUT COIN IN SLOT,\n" +
        "READ BOOK, ATTACK TROLL WITH SWORD, INVENTORY (or I), SAVE, RESTORE, QUIT.\n" +
        "Type HINT any time to see what you can currently interact with.\n",
    );
    return true;
  });

  /*
   * gmain.zil's turn loop, which `GO` tail-calls and which never returns.
   *
   * ADR 0002 gives the loop to the engine: the *host* decides when a turn
   * happens (a browser event, a harness replaying a walkthrough), so there is
   * nothing to enter here. `start()` returning is precisely the handover —
   * initialization is done, and `command()` drives each turn from now on.
   *
   * The extractor keeps the call and drops everything after it (GO's trailing
   * `<AGAIN>` is unreachable on the Z-machine too, since MAIN-LOOP never
   * returns), so the IR still says what the game does and the engine decides
   * what that means here.
   */
  b.set("MAIN-LOOP", () => true);

  /**
   * ZIL V-CLIMB-UP (gverbs.zil): "climb up/down <object>" and "walk up/down
   * <object>". The original reads HERE's exit property in the climb direction
   * with `<GETPT ,HERE .DIR>` and classifies it by `PTSIZE`; the IR models exits
   * structurally, so {@link exitFor} answers the same question without a property
   * walk (the same replacement ADR 0003 made for the sword's exit scan).
   *
   * Two entry points share this routine, and their argument shape is the whole
   * behavior:
   *  - As an *action* (`CLIMB UP OBJECT`, `WALK UP OBJECT`) it is called with no
   *    args, so `DIR` defaults to `up` and `OBJ` stays false — the object is
   *    PRSO but the object-lead check below never runs. This is why "climb up
   *    <anything>" in a room with an up exit simply walks up.
   *  - `V-CLIMB-DOWN` calls it `<V-CLIMB-UP ,P?DOWN ,PRSO>`, so the down cases
   *    carry the object through and the lead/wall branches become reachable.
   */
  b.set("V-CLIMB-UP", (ctx, [dirArg, objArg]) => {
    const dir = (dirArg === undefined || dirArg === false ? "up" : String(dirArg)) as Direction;
    const prso = ctx.directObject;
    // <COND (<AND .OBJ <NOT <EQUAL? ,PRSO ,ROOMS>>> <SET OBJ ,PRSO>)> — the
    // object, present only on the down path; the action path leaves it false.
    const obj = objArg ? (prso === "ROOMS" ? "ROOMS" : prso) : undefined;
    const climbWord = dir === "up" ? "up" : "down";

    const exit = exitFor(ctx.world, here(ctx.state), dir);
    if (exit !== undefined) {
      // <COND (.OBJ ...)>: does *this object* lead that way? A blocked exit
      // (NEXIT) leads nowhere; a real exit whose destination doesn't hold the
      // object as scenery isn't reached by climbing it either.
      if (obj !== undefined) {
        const dest =
          exit.kind === "to" || exit.kind === "conditional" || exit.kind === "door"
            ? exit.to
            : undefined;
        if (exit.kind === "blocked" || (dest !== undefined && !globalIn(ctx, obj, dest))) {
          // <TELL "The " D .OBJ " do" ["es"] "n't lead " <up|down> "ward.">;
          // ZIL prints STAIRS without the singular "es" because its DESC is plural.
          tell(
            ctx,
            `The ${displayName(ctx, obj)} do${obj === "STAIRS" ? "" : "es"}n't lead ${climbWord}ward.\n`,
          );
          return true;
        }
      }
      // <DO-WALK .DIR>
      ctx.pendingWalks.push(dir);
      return true;
    }

    // No exit that way. The object decides the refusal.
    if (obj !== undefined && (ctx.world.objects.get(obj)?.synonyms ?? []).includes("WALL")) {
      tell(ctx, "Climbing the walls is to no avail.\n");
      return true;
    }
    // Tree branch: OBJ is false or the tree itself, a tree is scenery here, and
    // HERE is not PATH (whose up exit is the real climbable tree).
    if (
      (obj === undefined || obj === "TREE") &&
      here(ctx.state) !== "PATH" &&
      globalIn(ctx, "TREE", here(ctx.state))
    ) {
      tell(ctx, "There are no climbable trees here.\n");
      return true;
    }
    tell(ctx, obj === undefined || obj === "ROOMS" ? "You can't go that way.\n" : "You can't do that!\n");
    return true;
  });

  return b;
}

/* ---------------- shared helpers ---------------- */

/** ZIL `D`: an entity's display name (its DESC), never its id. */
function displayName(ctx: RuntimeContext, id: string): string {
  return ctx.world.objects.get(id)?.name ?? ctx.world.rooms.get(id)?.name ?? id;
}

/**
 * ZIL GLOBAL-IN?: is an object one of a room's scenery globals? The IR keeps
 * that list on the room as `scenery`, so the ZIL property walk is a lookup.
 */
function globalIn(ctx: RuntimeContext, obj: string, room: string): boolean {
  return ctx.world.rooms.get(room)?.scenery?.includes(obj) ?? false;
}

/**
 * Is the room lit? Its own ONBIT, the ALWAYS-LIT debug global, or any object in
 * scope that is currently providing light (ONBIT, and flame-lit sources).
 */
export function isLit(ctx: RuntimeContext, room: string): boolean {
  if (truthy(ctx.state.globals["ALWAYS-LIT"])) return true;
  if (hasFlag(ctx.state, room, "ONBIT")) return true;
  for (const entry of scope(ctx.world, ctx.state)) {
    if (hasFlag(ctx.state, entry.id, "ONBIT")) return true;
  }
  return false;
}

/** The vehicle the player is aboard, if any (ZIL checks LOC WINNER for VEHBIT). */
function vehicleCarrying(state: GameState, who: string): string | undefined {
  const location = state.locations[who];
  if (location === undefined) return undefined;
  return hasFlag(state, location, "VEHBIT") ? location : undefined;
}

/**
 * Describe a room: its title, then its description, then its contents.
 *
 * The title goes out on the `room-title` channel so a UI can style it without
 * parsing prose — ADR 0002's reason for having channels at all.
 */
export function describeRoom(
  ctx: RuntimeContext,
  id: string,
  firstVisit: boolean,
  explicitLook = false,
): void {
  const room = ctx.world.rooms.get(id);
  if (room === undefined) return;

  /*
   * Prefer the game's own DESCRIBE-ROOM / DESCRIBE-OBJECTS when the document
   * carries them (Zork I does, from gverbs.zil). They already implement
   * verbose/brief modes, the light rule, and the first-visit distinction, and
   * the engine reimplementing that would be a second, competing answer to
   * questions the IR has already answered — precisely what ADR 0001 divides
   * Group A from Group B to avoid.
   *
   * The fallback below stands in for worlds whose frontend has not extracted
   * these routines, so a partial document still boots and describes rooms.
   */
  if (ctx.routines.has("DESCRIBE-ROOM")) {
    // The argument is LOOK? — "did the player ask to look" — not firstVisit.
    // DESCRIBE-ROOM derives the first-visit case itself, from TOUCHBIT.
    //
    // The room name it prints reaches the UI on the `room-title` channel; the
    // interpreter scopes that to the routine itself (`RuntimeContext.titleRoom`),
    // because V-LOOK calls DESCRIBE-ROOM without coming through here.
    if (truthy(callRoutine("DESCRIBE-ROOM", [explicitLook], ctx))) {
      if (ctx.routines.has("DESCRIBE-OBJECTS")) {
        callRoutine("DESCRIBE-OBJECTS", [explicitLook], ctx);
      }
    }
    return;
  }

  if (!truthy(ctx.state.globals["LIT"])) {
    emitOn(ctx, "prose", "It is pitch black. You are likely to be eaten by a grue.\n");
    return;
  }

  emitOn(ctx, "room-title", `${room.name}\n`);

  // A room whose description is computed says so with an action routine and the
  // M-LOOK context; a static LDESC is printed directly. Brief mode (stage 4.5)
  // will suppress the description on revisits — hence the `firstVisit` flag.
  if (room.description !== undefined && (firstVisit || !isBrief(ctx))) {
    tell(ctx, `${room.description}\n`);
  } else if (room.action !== undefined) {
    callRoutine(room.action, [M_LOOK], ctx);
  }

  describeContents(ctx, id);
}

/** List the objects lying in a room, skipping the ones ZIL hides. */
export function describeContents(ctx: RuntimeContext, room: string): void {
  for (const id of ctx.state.children[room] ?? []) {
    if (id === PLAYER_ID) continue;
    if (hasFlag(ctx.state, id, "INVISIBLE")) continue;
    // NDESCBIT is "already mentioned in the room description" — scenery the
    // prose covers. Listing it again reads as a bug to the player.
    if (hasFlag(ctx.state, id, "NDESCBIT")) continue;

    const object = ctx.world.objects.get(id);
    if (object === undefined) continue;

    const initial = ctx.state.properties[id]?.["initialDescription"];
    if (!hasFlag(ctx.state, id, "TOUCHBIT") && typeof initial === "string") {
      // FDESC: how the object reads before anyone has disturbed it.
      tell(ctx, `${initial}\n`);
      continue;
    }
    const description = ctx.state.properties[id]?.["description"];
    if (typeof description === "string") {
      tell(ctx, `${description}\n`);
      continue;
    }
    tell(ctx, `There is a ${object.name} here.\n`);
  }
}

function isBrief(ctx: RuntimeContext): boolean {
  return truthy(ctx.state.globals["BRIEF"]);
}

/** Score changes are contract events, so they never move silently. */
export function addScore(ctx: RuntimeContext, delta: number): void {
  if (delta === 0) return;
  const score = num(ctx.state.globals["SCORE"] ?? 0) + delta;
  ctx.state.globals["SCORE"] = score;
  /*
   * ZIL's SCORE-UPD advances BASE-SCORE in lockstep with SCORE (gverbs.zil:1851).
   * BASE-SCORE is the fixed-award accumulator that the trophy-case recompute reads
   * back: LIVING-ROOM-FCN's M-END sets `SCORE = BASE-SCORE + OTVAL-FROB` on every
   * TAKE/PUT there (1actions.zil:483). A native award (room-visit value) that
   * advanced only SCORE was silently wiped the first time that recompute ran — the
   * gap surfaced the moment the engine started running room M-END actions.
   */
  ctx.state.globals["BASE-SCORE"] = num(ctx.state.globals["BASE-SCORE"] ?? 0) + delta;
  emit(ctx, { type: "score-changed", score, delta });
}

function resolveTable(ctx: RuntimeContext, ref: BehaviorValue | undefined): RuntimeTable {
  const id = typeof ref === "string" ? ref : typeof ref === "object" && ref !== null ? ref.table : undefined;
  const table = id === undefined ? undefined : ctx.state.tables[id];
  if (table === undefined) throw new Error(`not a table: ${String(ref)}`);
  return table;
}

function interruptRecord(ctx: RuntimeContext, id: BehaviorValue | undefined): RuntimeTable {
  const record = typeof id === "string" ? ctx.state.tables[id] : undefined;
  if (record === undefined) throw new Error(`not an interrupt record: ${String(id)}`);
  return record;
}
