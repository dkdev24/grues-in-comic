/**
 * Validator for IR world documents (stage 2.1 declarative-world subset).
 *
 * Two passes over a parsed JSON value:
 * 1. Structural — every entity has exactly the fields the schema allows,
 *    with the right primitive types. Unknown keys are errors (strictness
 *    catches schema drift the moment it happens).
 * 2. Referential — every id mentioned anywhere resolves: exit targets,
 *    door objects, condition globals, object locations, scenery lists,
 *    table element refs, and flag usage against the flag registry.
 *
 * Behavior references (`action`, `routine` fields) are opaque strings in
 * stage 2.1; they are collected into the result summary but not resolved.
 */

import { DIRECTIONS, IR_VERSION } from "./schema.js";

export interface ValidationError {
  /** JSON-path-ish location, e.g. `rooms[2].exits[0].to`. */
  path: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  /** Filled only when structurally valid. */
  summary?: WorldSummary;
}

export interface WorldSummary {
  rooms: number;
  stubRooms: number;
  objects: number;
  stubObjects: number;
  globals: number;
  tables: number;
  flags: number;
  exits: number;
  /** Distinct opaque behavior references (actions, PER exits, pseudo routines). */
  routineRefs: string[];
}

type Json = Record<string, unknown>;

const DIRECTION_SET = new Set<string>(DIRECTIONS);

class Ctx {
  errors: ValidationError[] = [];

  fail(path: string, message: string): void {
    this.errors.push({ path, message });
  }
}

function isObject(v: unknown): v is Json {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function checkKeys(ctx: Ctx, path: string, obj: Json, allowed: string[]): void {
  for (const key of Object.keys(obj)) {
    if (!allowed.includes(key)) ctx.fail(`${path}.${key}`, "unknown key");
  }
}

function reqString(ctx: Ctx, path: string, obj: Json, key: string): string | undefined {
  const v = obj[key];
  if (typeof v === "string" && v.length > 0) return v;
  ctx.fail(`${path}.${key}`, v === undefined ? "required" : "must be a non-empty string");
  return undefined;
}

function optString(ctx: Ctx, path: string, obj: Json, key: string): string | undefined {
  const v = obj[key];
  if (v === undefined) return undefined;
  if (typeof v === "string" && v.length > 0) return v;
  ctx.fail(`${path}.${key}`, "must be a non-empty string");
  return undefined;
}

function optInt(ctx: Ctx, path: string, obj: Json, key: string): void {
  const v = obj[key];
  if (v === undefined) return;
  if (typeof v !== "number" || !Number.isInteger(v)) ctx.fail(`${path}.${key}`, "must be an integer");
}

function optBool(ctx: Ctx, path: string, obj: Json, key: string): void {
  const v = obj[key];
  if (v !== undefined && typeof v !== "boolean") ctx.fail(`${path}.${key}`, "must be a boolean");
}

function optStringArray(ctx: Ctx, path: string, obj: Json, key: string): string[] {
  const v = obj[key];
  if (v === undefined) return [];
  if (!Array.isArray(v)) {
    ctx.fail(`${path}.${key}`, "must be an array of strings");
    return [];
  }
  const out: string[] = [];
  v.forEach((item, i) => {
    if (typeof item === "string" && item.length > 0) out.push(item);
    else ctx.fail(`${path}.${key}[${i}]`, "must be a non-empty string");
  });
  return out;
}

function reqStringArray(ctx: Ctx, path: string, obj: Json, key: string): string[] {
  if (obj[key] === undefined) {
    ctx.fail(`${path}.${key}`, "required");
    return [];
  }
  return optStringArray(ctx, path, obj, key);
}

function reqArray(ctx: Ctx, path: string, obj: Json, key: string): unknown[] {
  const v = obj[key];
  if (Array.isArray(v)) return v;
  ctx.fail(`${path}.${key}`, v === undefined ? "required" : "must be an array");
  return [];
}

function isScalar(v: unknown): boolean {
  return typeof v === "boolean" || typeof v === "string" || (typeof v === "number" && Number.isInteger(v));
}

/** Validate a parsed JSON value as an IR world document. */
export function validateWorld(input: unknown): ValidationResult {
  const ctx = new Ctx();

  if (!isObject(input)) {
    return { valid: false, errors: [{ path: "$", message: "document must be a JSON object" }] };
  }
  checkKeys(ctx, "$", input, ["irVersion", "meta", "flags", "globals", "tables", "rooms", "objects"]);

  if (input.irVersion !== IR_VERSION) {
    ctx.fail("$.irVersion", `must be "${IR_VERSION}"`);
  }
  if (input.meta !== undefined) {
    if (isObject(input.meta)) {
      checkKeys(ctx, "$.meta", input.meta, ["title", "source", "coverage", "notes"]);
      for (const key of ["title", "source", "coverage", "notes"]) optString(ctx, "$.meta", input.meta, key);
    } else {
      ctx.fail("$.meta", "must be an object");
    }
  }

  // ---- structural pass, collecting ids as we go ----

  const flagIds = new Set<string>();
  const entityIds = new Map<string, string>(); // id → section (flat namespace)
  const globalIds = new Set<string>();
  const tableIds = new Set<string>();
  const roomIds = new Set<string>();
  const objectIds = new Set<string>();
  const routineRefs = new Set<string>();
  let exitCount = 0;
  let stubRooms = 0;
  let stubObjects = 0;

  function claimId(path: string, id: string, section: string, set: Set<string>): void {
    const prior = entityIds.get(id);
    if (prior !== undefined) {
      ctx.fail(path, `duplicate id "${id}" (already defined in ${prior})`);
      return;
    }
    entityIds.set(id, section);
    set.add(id);
  }

  reqArray(ctx, "$", input, "flags").forEach((raw, i) => {
    const path = `flags[${i}]`;
    if (!isObject(raw)) return ctx.fail(path, "must be an object");
    checkKeys(ctx, path, raw, ["id", "description"]);
    const id = reqString(ctx, path, raw, "id");
    optString(ctx, path, raw, "description");
    if (id !== undefined) {
      if (flagIds.has(id)) ctx.fail(`${path}.id`, `duplicate flag "${id}"`);
      flagIds.add(id);
    }
  });

  reqArray(ctx, "$", input, "globals").forEach((raw, i) => {
    const path = `globals[${i}]`;
    if (!isObject(raw)) return ctx.fail(path, "must be an object");
    checkKeys(ctx, path, raw, ["id", "value", "description"]);
    const id = reqString(ctx, path, raw, "id");
    optString(ctx, path, raw, "description");
    if (raw.value === undefined) ctx.fail(`${path}.value`, "required");
    else if (!isScalar(raw.value)) ctx.fail(`${path}.value`, "must be a boolean, integer, or string");
    if (id !== undefined) claimId(`${path}.id`, id, "globals", globalIds);
  });

  interface PendingRef {
    path: string;
    id: string;
    kind: "room" | "object" | "door" | "scenery" | "global" | "entity";
  }
  const refs: PendingRef[] = [];
  const usedFlags: { path: string; id: string }[] = [];

  reqArray(ctx, "$", input, "tables").forEach((raw, i) => {
    const path = `tables[${i}]`;
    if (!isObject(raw)) return ctx.fail(path, "must be an object");
    checkKeys(ctx, path, raw, ["id", "kind", "pure", "elements", "description"]);
    const id = reqString(ctx, path, raw, "id");
    if (raw.kind !== "table" && raw.kind !== "ltable" && raw.kind !== "itable") {
      ctx.fail(`${path}.kind`, 'must be "table", "ltable", or "itable"');
    }
    optBool(ctx, path, raw, "pure");
    optString(ctx, path, raw, "description");
    reqArray(ctx, path, raw, "elements").forEach((el, j) => {
      const elPath = `${path}.elements[${j}]`;
      if (isScalar(el)) return;
      if (isObject(el)) {
        checkKeys(ctx, elPath, el, ["ref"]);
        const ref = reqString(ctx, elPath, el, "ref");
        if (ref !== undefined) refs.push({ path: `${elPath}.ref`, id: ref, kind: "entity" });
        return;
      }
      ctx.fail(elPath, "must be a scalar or { ref } object");
    });
    if (id !== undefined) claimId(`${path}.id`, id, "tables", tableIds);
  });

  function checkExit(path: string, raw: unknown): void {
    if (!isObject(raw)) return ctx.fail(path, "must be an object");
    exitCount++;
    const dir = raw.direction;
    if (typeof dir !== "string" || !DIRECTION_SET.has(dir)) {
      ctx.fail(`${path}.direction`, `must be one of: ${DIRECTIONS.join(", ")}`);
    }
    switch (raw.kind) {
      case "to": {
        checkKeys(ctx, path, raw, ["direction", "kind", "to"]);
        const to = reqString(ctx, path, raw, "to");
        if (to !== undefined) refs.push({ path: `${path}.to`, id: to, kind: "room" });
        break;
      }
      case "blocked":
        checkKeys(ctx, path, raw, ["direction", "kind", "message"]);
        reqString(ctx, path, raw, "message");
        break;
      case "conditional": {
        checkKeys(ctx, path, raw, ["direction", "kind", "to", "if", "else"]);
        const to = reqString(ctx, path, raw, "to");
        const cond = reqString(ctx, path, raw, "if");
        optString(ctx, path, raw, "else");
        if (to !== undefined) refs.push({ path: `${path}.to`, id: to, kind: "room" });
        if (cond !== undefined) refs.push({ path: `${path}.if`, id: cond, kind: "global" });
        break;
      }
      case "door": {
        checkKeys(ctx, path, raw, ["direction", "kind", "to", "door", "else"]);
        const to = reqString(ctx, path, raw, "to");
        const door = reqString(ctx, path, raw, "door");
        optString(ctx, path, raw, "else");
        if (to !== undefined) refs.push({ path: `${path}.to`, id: to, kind: "room" });
        if (door !== undefined) refs.push({ path: `${path}.door`, id: door, kind: "door" });
        break;
      }
      case "routine": {
        checkKeys(ctx, path, raw, ["direction", "kind", "routine"]);
        const routine = reqString(ctx, path, raw, "routine");
        if (routine !== undefined) routineRefs.add(routine);
        break;
      }
      default:
        ctx.fail(`${path}.kind`, 'must be "to", "blocked", "conditional", "door", or "routine"');
    }
  }

  reqArray(ctx, "$", input, "rooms").forEach((raw, i) => {
    const path = `rooms[${i}]`;
    if (!isObject(raw)) return ctx.fail(path, "must be an object");
    checkKeys(ctx, path, raw, [
      "id", "name", "description", "exits", "flags", "action", "scenery", "pseudo", "score", "stub",
    ]);
    const id = reqString(ctx, path, raw, "id");
    reqString(ctx, path, raw, "name");
    optString(ctx, path, raw, "description");
    optInt(ctx, path, raw, "score");
    optBool(ctx, path, raw, "stub");
    if (raw.stub === true) stubRooms++;
    const action = optString(ctx, path, raw, "action");
    if (action !== undefined) routineRefs.add(action);

    const seenDirs = new Set<string>();
    reqArray(ctx, path, raw, "exits").forEach((exit, j) => {
      const exitPath = `${path}.exits[${j}]`;
      checkExit(exitPath, exit);
      if (isObject(exit) && typeof exit.direction === "string") {
        if (seenDirs.has(exit.direction)) ctx.fail(`${exitPath}.direction`, `duplicate direction "${exit.direction}"`);
        seenDirs.add(exit.direction);
      }
    });

    for (const flag of reqStringArray(ctx, path, raw, "flags")) usedFlags.push({ path: `${path}.flags`, id: flag });
    for (const obj of optStringArray(ctx, path, raw, "scenery")) refs.push({ path: `${path}.scenery`, id: obj, kind: "scenery" });

    if (raw.pseudo !== undefined) {
      reqArray(ctx, path, raw, "pseudo").forEach((p, j) => {
        const pPath = `${path}.pseudo[${j}]`;
        if (!isObject(p)) return ctx.fail(pPath, "must be an object");
        checkKeys(ctx, pPath, p, ["noun", "routine"]);
        reqString(ctx, pPath, p, "noun");
        const routine = reqString(ctx, pPath, p, "routine");
        if (routine !== undefined) routineRefs.add(routine);
      });
    }
    if (id !== undefined) claimId(`${path}.id`, id, "rooms", roomIds);
  });

  reqArray(ctx, "$", input, "objects").forEach((raw, i) => {
    const path = `objects[${i}]`;
    if (!isObject(raw)) return ctx.fail(path, "must be an object");
    checkKeys(ctx, path, raw, [
      "id", "name", "location", "synonyms", "adjectives", "flags", "action",
      "description", "initialDescription", "text",
      "capacity", "size", "value", "treasureValue", "strength", "stub",
    ]);
    const id = reqString(ctx, path, raw, "id");
    reqString(ctx, path, raw, "name");
    for (const key of ["description", "initialDescription", "text"]) optString(ctx, path, raw, key);
    for (const key of ["capacity", "size", "value", "treasureValue", "strength"]) optInt(ctx, path, raw, key);
    optBool(ctx, path, raw, "stub");
    if (raw.stub === true) stubObjects++;
    const action = optString(ctx, path, raw, "action");
    if (action !== undefined) routineRefs.add(action);

    const loc = raw.location;
    const locPath = `${path}.location`;
    if (!isObject(loc)) {
      ctx.fail(locPath, loc === undefined ? "required" : "must be an object");
    } else {
      switch (loc.kind) {
        case "room":
        case "object": {
          checkKeys(ctx, locPath, loc, ["kind", "id"]);
          const target = reqString(ctx, locPath, loc, "id");
          if (target !== undefined) refs.push({ path: `${locPath}.id`, id: target, kind: loc.kind });
          break;
        }
        case "local-globals":
        case "nowhere":
          checkKeys(ctx, locPath, loc, ["kind"]);
          break;
        default:
          ctx.fail(`${locPath}.kind`, 'must be "room", "object", "local-globals", or "nowhere"');
      }
    }

    reqStringArray(ctx, path, raw, "synonyms");
    optStringArray(ctx, path, raw, "adjectives");
    for (const flag of reqStringArray(ctx, path, raw, "flags")) usedFlags.push({ path: `${path}.flags`, id: flag });
    if (id !== undefined) claimId(`${path}.id`, id, "objects", objectIds);
  });

  // ---- referential pass ----

  const doorFlagged = new Set<string>();
  if (Array.isArray(input.objects)) {
    for (const obj of input.objects as unknown[]) {
      if (isObject(obj) && typeof obj.id === "string" && Array.isArray(obj.flags) && obj.flags.includes("DOORBIT")) {
        doorFlagged.add(obj.id);
      }
    }
  }

  for (const { path, id, kind } of refs) {
    switch (kind) {
      case "room":
        if (!roomIds.has(id)) ctx.fail(path, `unknown room "${id}"`);
        break;
      case "object":
      case "scenery":
        if (!objectIds.has(id)) ctx.fail(path, `unknown object "${id}"`);
        break;
      case "door":
        if (!objectIds.has(id)) ctx.fail(path, `unknown object "${id}"`);
        else if (!doorFlagged.has(id)) ctx.fail(path, `object "${id}" is not flagged DOORBIT`);
        break;
      case "global":
        if (!globalIds.has(id)) ctx.fail(path, `unknown global "${id}"`);
        break;
      case "entity":
        if (!entityIds.has(id)) ctx.fail(path, `unknown entity "${id}"`);
        break;
    }
  }

  for (const { path, id } of usedFlags) {
    if (!flagIds.has(id)) ctx.fail(path, `flag "${id}" is not declared in the flags registry`);
  }

  if (ctx.errors.length > 0) {
    return { valid: false, errors: ctx.errors };
  }
  return {
    valid: true,
    errors: [],
    summary: {
      rooms: roomIds.size,
      stubRooms,
      objects: objectIds.size,
      stubObjects,
      globals: globalIds.size,
      tables: tableIds.size,
      flags: flagIds.size,
      exits: exitCount,
      routineRefs: [...routineRefs].sort(),
    },
  };
}
