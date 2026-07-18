/**
 * Stage 3.1 — deterministic world-model extraction (ZIL AST → IR).
 *
 * Consumes the importer's committed AST artifacts (`importer/artifacts/ast/`)
 * and produces a stage 2.1 {@link WorldDocument} containing every ROOM form:
 * rooms, exits, connections, room flags, and the globals the exits condition
 * on. Objects referenced by rooms (scenery lists, door exits) are emitted as
 * `stub: true` entries carrying only their identity fields (name, synonyms,
 * adjectives, flags, location) so references resolve — full object extraction
 * is stage 3.2.
 *
 * The transform is purely deterministic: any AST shape outside the known ZIL
 * exit/property grammar is a hard error, never a guess.
 */

import type {
  Direction,
  Exit,
  FlagDeclaration,
  GlobalVariable,
  ObjectLocation,
  PseudoReference,
  Room,
  WorldDocument,
  WorldObject,
} from "./schema.js";
import { IR_VERSION } from "./schema.js";

// ---- minimal AST node model (importer artifact shape) ----

interface AstNode {
  type: string;
  name?: string;
  value?: unknown;
  elements?: AstNode[];
  body?: AstNode[];
  source?: string;
}

export interface AstProgram extends AstNode {
  type: "Program";
  source: string;
  body: AstNode[];
}

function isForm(node: AstNode, head?: string): boolean {
  const first = node.elements?.[0];
  return (
    node.type === "Form" &&
    first?.type === "Atom" &&
    (head === undefined || first.name === head)
  );
}

function atomName(node: AstNode | undefined): string | undefined {
  return node?.type === "Atom" ? node.name : undefined;
}

function stringValue(node: AstNode | undefined): string | undefined {
  return node?.type === "String" ? (node.value as string) : undefined;
}

/** Property-list elements with ZIL comment nodes removed (e.g. TREASURE-ROOM's `(FLAGS RLANDBIT ;"…")`). */
function meaningful(elements: AstNode[]): AstNode[] {
  return elements.filter((e) => e.type !== "Comment");
}

function fail(context: string, message: string): never {
  throw new Error(`extract-world: ${context}: ${message}`);
}

// ---- ZIL direction properties → IR directions ----

const DIRECTION_MAP: Record<string, Direction> = {
  NORTH: "north",
  SOUTH: "south",
  EAST: "east",
  WEST: "west",
  NE: "northeast",
  NW: "northwest",
  SE: "southeast",
  SW: "southwest",
  UP: "up",
  DOWN: "down",
  IN: "in",
  OUT: "out",
  LAND: "land",
};

/** Known Zork I flag meanings, carried into the registry for readability. */
const FLAG_DESCRIPTIONS: Record<string, string> = {
  RLANDBIT: "Room is dry land (travel without a vehicle)",
  ONBIT: "Room is lit / object is providing light",
  SACREDBIT: "The thief does not visit this room",
  MAZEBIT: "Room is part of the maze",
  NONLANDBIT: "Room is water — travel requires a vehicle",
  DOORBIT: "Object is a door (door exits test its OPENBIT)",
  NDESCBIT: "Object is not listed in room descriptions",
  OPENBIT: "Container/door is currently open (runtime state)",
  CONTBIT: "Object is a container",
  TAKEBIT: "Object can be picked up",
  READBIT: "Object can be read (has text)",
  BURNBIT: "Object is flammable",
  TRYTAKEBIT: "Parser routes TAKE to the object's action first",
  INVISIBLE: "Object starts hidden from the parser",
  TRANSBIT: "Container is transparent (contents visible when closed)",
  VEHBIT: "Object is a vehicle",
  TOOLBIT: "Object is a tool",
  TURNBIT: "Object can be turned",
  CLIMBBIT: "Object can be climbed",
  SURFACEBIT: "Object is a surface things can be put on",
  SEARCHBIT: "LOOK IN searches the object's contents deeply",
  FOODBIT: "Object can be eaten",
  DRINKBIT: "Object can be drunk",
  LIGHTBIT: "Object can be switched on as a light source",
  FLAMEBIT: "Object is burning",
  WEAPONBIT: "Object is a weapon",
  ACTORBIT: "Object is an actor/villain",
  FIGHTBIT: "Object participates in combat",
  VILLAIN: "Object is a villain",
  STAGGERED: "Combat state — actor is staggered",
  TOUCHBIT: "Object/room has been disturbed or visited (runtime state)",
};

// ---- exit parsing ----

/**
 * Parse one ZIL room direction property into an IR exit. Grammar (after the
 * direction atom, comments removed):
 *
 *   "msg"                          → blocked
 *   TO room                        → to
 *   TO room IF global [ELSE "m"]   → conditional
 *   TO room IF obj IS OPEN [ELSE "m"] → door
 *   PER routine                    → routine
 */
function parseExit(roomId: string, zilDir: string, rest: AstNode[]): Exit {
  const ctx = `${roomId} (${zilDir})`;
  const direction = DIRECTION_MAP[zilDir];
  if (direction === undefined) fail(ctx, `unknown direction "${zilDir}"`);

  const msg = stringValue(rest[0]);
  if (rest.length === 1 && msg !== undefined) {
    return { direction, kind: "blocked", message: msg };
  }

  const head = atomName(rest[0]);
  if (head === "PER") {
    const routine = atomName(rest[1]);
    if (rest.length !== 2 || routine === undefined) fail(ctx, "malformed PER exit");
    return { direction, kind: "routine", routine };
  }

  if (head !== "TO") fail(ctx, `unrecognized exit shape (head ${head ?? rest[0]?.type})`);
  const to = atomName(rest[1]);
  if (to === undefined) fail(ctx, "TO without a room atom");
  if (rest.length === 2) return { direction, kind: "to", to };

  if (atomName(rest[2]) !== "IF") fail(ctx, `expected IF, got ${atomName(rest[2])}`);
  const condition = atomName(rest[3]);
  if (condition === undefined) fail(ctx, "IF without a condition atom");

  // Door variant: TO room IF obj IS OPEN [ELSE "msg"]
  if (atomName(rest[4]) === "IS") {
    if (atomName(rest[5]) !== "OPEN") fail(ctx, "IS not followed by OPEN");
    const elseMsg = parseElse(ctx, rest.slice(6));
    return { direction, kind: "door", to, door: condition, ...(elseMsg !== undefined && { else: elseMsg }) };
  }

  const elseMsg = parseElse(ctx, rest.slice(4));
  return { direction, kind: "conditional", to, if: condition, ...(elseMsg !== undefined && { else: elseMsg }) };
}

function parseElse(ctx: string, rest: AstNode[]): string | undefined {
  if (rest.length === 0) return undefined;
  const msg = stringValue(rest[1]);
  if (rest.length !== 2 || atomName(rest[0]) !== "ELSE" || msg === undefined) {
    fail(ctx, "malformed ELSE clause");
  }
  return msg;
}

// ---- room extraction ----

interface RoomExtraction {
  room: Room;
  sceneryRefs: string[];
  doorRefs: string[];
  globalRefs: string[];
}

function extractRoom(form: AstNode): RoomExtraction {
  const elements = meaningful(form.elements!);
  const id = atomName(elements[1]);
  if (id === undefined) fail("ROOM", "form without a name atom");

  const room: Room = { id, name: "", exits: [], flags: [] };
  const sceneryRefs: string[] = [];
  const doorRefs: string[] = [];
  const globalRefs: string[] = [];
  const pseudo: PseudoReference[] = [];

  for (const prop of elements.slice(2)) {
    if (prop.type !== "List" || !prop.elements?.length) fail(id, `unexpected property node ${prop.type}`);
    const parts = meaningful(prop.elements);
    const head = atomName(parts[0]);
    if (head === undefined) fail(id, "property without a head atom");
    const rest = parts.slice(1);

    switch (head) {
      case "DESC":
        room.name = stringValue(rest[0]) ?? fail(id, "DESC is not a string");
        break;
      case "LDESC":
        room.description = stringValue(rest[0]) ?? fail(id, "LDESC is not a string");
        break;
      case "ACTION":
        room.action = atomName(rest[0]) ?? fail(id, "ACTION is not an atom");
        break;
      case "VALUE": {
        const v = rest[0];
        if (v?.type !== "Number" || typeof v.value !== "number") fail(id, "VALUE is not a number");
        room.score = v.value;
        break;
      }
      case "FLAGS":
        room.flags = rest.map((f) => atomName(f) ?? fail(id, "FLAGS entry is not an atom"));
        break;
      case "GLOBAL":
        for (const g of rest) sceneryRefs.push(atomName(g) ?? fail(id, "GLOBAL entry is not an atom"));
        break;
      case "PSEUDO": {
        if (rest.length % 2 !== 0) fail(id, "PSEUDO list is not noun/routine pairs");
        for (let i = 0; i < rest.length; i += 2) {
          const noun = stringValue(rest[i]) ?? fail(id, "PSEUDO noun is not a string");
          const routine = atomName(rest[i + 1]) ?? fail(id, "PSEUDO routine is not an atom");
          pseudo.push({ noun, routine });
        }
        break;
      }
      case "IN":
        // `(IN ROOMS)` is the room's containment declaration, not an exit.
        if (rest.length === 1 && atomName(rest[0]) === "ROOMS") break;
        room.exits.push(parseExit(id, "IN", rest));
        break;
      default: {
        if (!(head in DIRECTION_MAP)) fail(id, `unknown room property "${head}"`);
        room.exits.push(parseExit(id, head, rest));
      }
    }
  }

  if (room.name === "") fail(id, "room has no DESC");
  if (sceneryRefs.length > 0) room.scenery = sceneryRefs;
  if (pseudo.length > 0) room.pseudo = pseudo;

  for (const exit of room.exits) {
    if (exit.kind === "conditional") globalRefs.push(exit.if);
    if (exit.kind === "door") doorRefs.push(exit.door);
  }
  return { room, sceneryRefs, doorRefs, globalRefs };
}

// ---- referenced-object stubs (identity fields only; full extraction is stage 3.2) ----

function extractStubObject(form: AstNode, roomIds: Set<string>): { object: WorldObject; containerRef?: string } {
  const elements = meaningful(form.elements!);
  const id = atomName(elements[1]) ?? fail("OBJECT", "form without a name atom");

  let name = id;
  let location: ObjectLocation = { kind: "nowhere" };
  let containerRef: string | undefined;
  const synonyms: string[] = [];
  const adjectives: string[] = [];
  let flags: string[] = [];

  for (const prop of elements.slice(2)) {
    if (prop.type !== "List" || !prop.elements?.length) continue;
    const parts = meaningful(prop.elements);
    const head = atomName(parts[0]);
    const rest = parts.slice(1);
    switch (head) {
      case "DESC":
        name = stringValue(rest[0]) ?? name;
        break;
      case "IN": {
        const target = atomName(rest[0]);
        if (target === "LOCAL-GLOBALS" || target === "GLOBAL-OBJECTS") location = { kind: "local-globals" };
        else if (target !== undefined && roomIds.has(target)) location = { kind: "room", id: target };
        else if (target !== undefined) {
          location = { kind: "object", id: target };
          containerRef = target;
        }
        break;
      }
      case "SYNONYM":
        for (const s of rest) synonyms.push(atomName(s) ?? fail(id, "SYNONYM entry is not an atom"));
        break;
      case "ADJECTIVE":
        for (const a of rest) adjectives.push(atomName(a) ?? fail(id, "ADJECTIVE entry is not an atom"));
        break;
      case "FLAGS":
        flags = rest.map((f) => atomName(f) ?? fail(id, "FLAGS entry is not an atom"));
        break;
      default:
        break; // other object properties are stage 3.2 scope
    }
  }

  const object: WorldObject = { id, name, location, synonyms, flags, stub: true };
  if (adjectives.length > 0) object.adjectives = adjectives;
  return containerRef !== undefined ? { object, containerRef } : { object };
}

// ---- global extraction ----

/** Resolve a referenced global's initial value from `<GLOBAL name value>` forms. */
function findGlobalValue(programs: AstProgram[], name: string): boolean | number | string {
  for (const program of programs) {
    for (const node of program.body) {
      if (!isForm(node, "GLOBAL")) continue;
      const elements = meaningful(node.elements!);
      if (atomName(elements[1]) !== name) continue;
      const value = elements[2];
      if (value?.type === "Form" && (value.elements?.length ?? 0) === 0) return false; // <>
      if (value?.type === "Atom" && value.name === "T") return true;
      if (value?.type === "Number" && typeof value.value === "number") return value.value;
      if (value?.type === "String") return value.value as string;
      fail(name, `global has a non-scalar initial value (${value?.type})`);
    }
  }
  fail(name, "referenced global is not defined in any provided AST");
}

// ---- entry point ----

/** Extract the full world model from importer AST programs. */
export function extractWorld(programs: AstProgram[]): WorldDocument {
  const roomForms: AstNode[] = [];
  const objectForms = new Map<string, AstNode>();
  for (const program of programs) {
    for (const node of program.body) {
      if (isForm(node, "ROOM")) roomForms.push(node);
      if (isForm(node, "OBJECT")) {
        const id = atomName(meaningful(node.elements!)[1]);
        if (id !== undefined) objectForms.set(id, node);
      }
    }
  }

  const rooms: Room[] = [];
  const sceneryRefs = new Set<string>();
  const doorRefs = new Set<string>();
  const globalRefs = new Set<string>();
  for (const form of roomForms) {
    const { room, sceneryRefs: s, doorRefs: d, globalRefs: g } = extractRoom(form);
    rooms.push(room);
    for (const ref of s) sceneryRefs.add(ref);
    for (const ref of d) doorRefs.add(ref);
    for (const ref of g) globalRefs.add(ref);
  }
  const roomIds = new Set(rooms.map((r) => r.id));

  // Stub objects for every reference, pulling in container objects transitively.
  const objects: WorldObject[] = [];
  const emitted = new Set<string>();
  const queue = [...sceneryRefs, ...doorRefs].sort();
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (emitted.has(id)) continue;
    emitted.add(id);
    const form = objectForms.get(id) ?? fail(id, "referenced object has no OBJECT form");
    const { object, containerRef } = extractStubObject(form, roomIds);
    objects.push(object);
    if (containerRef !== undefined && !emitted.has(containerRef)) queue.push(containerRef);
  }

  const globals: GlobalVariable[] = [...globalRefs].sort().map((id) => ({
    id,
    value: findGlobalValue(programs, id),
  }));

  const flagIds = new Set<string>();
  for (const room of rooms) for (const flag of room.flags) flagIds.add(flag);
  for (const object of objects) for (const flag of object.flags) flagIds.add(flag);
  const flags: FlagDeclaration[] = [...flagIds].sort().map((id) => {
    const description = FLAG_DESCRIPTIONS[id];
    return description !== undefined ? { id, description } : { id };
  });

  return {
    irVersion: IR_VERSION,
    meta: {
      title: "Zork I — world model (rooms, exits, connections)",
      source: "importer/artifacts/ast (from original-projects/zork1)",
      coverage: "partial",
      notes:
        "Stage 3.1 deterministic extraction: all ROOM forms with exits, flags, scenery/pseudo references, and exit-condition globals. Objects appear only as stub identity entries so references resolve; full objects are stage 3.2. Generated by ir/src/extract-world.ts — do not edit by hand.",
    },
    flags,
    globals,
    tables: [],
    rooms,
    objects,
  };
}
