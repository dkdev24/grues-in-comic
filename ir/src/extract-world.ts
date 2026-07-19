/**
 * Stages 3.1–3.2 — deterministic world-model extraction (ZIL AST → IR).
 *
 * Consumes the importer's committed AST artifacts (`importer/artifacts/ast/`)
 * and produces a {@link WorldDocument} containing every ROOM form (rooms,
 * exits, connections, flags, exit-condition globals — stage 3.1) and every
 * OBJECT form (properties, flags, containment, initial locations — stage 3.2).
 *
 * Three ZIL world-tree scaffolding objects are deliberately not extracted:
 * GLOBAL-OBJECTS, LOCAL-GLOBALS, and ROOMS. They exist to allocate property
 * slots and anchor the object tree; the IR represents their semantics
 * structurally instead (location kinds "global" / "local-globals" and the
 * rooms list).
 *
 * The transform is purely deterministic: any AST shape outside the known ZIL
 * exit/property grammar is a hard error, never a guess.
 */

import type {
  Direction,
  DirectionWord,
  Exit,
  FlagDeclaration,
  GlobalVariable,
  ObjectLocation,
  PseudoReference,
  Room,
  SyntaxObjectSlot,
  SyntaxRule,
  SyntaxSearchOption,
  Vocabulary,
  WordSynonym,
  WorldDocument,
  WorldObject,
} from "./schema.js";
import { IR_VERSION, SYNTAX_SEARCH_OPTIONS } from "./schema.js";
import { extractBehavior, type CatalogEntry } from "./extract-behavior.js";

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
  return node?.type === "String" ? decodeZilString(node.value as string) : undefined;
}

/**
 * Apply ZIL string semantics (verified against the golden transcripts):
 * `|` is a hard newline; a source line break is soft wrapping and renders as
 * a space. Whitespace after a hard newline is real indentation and is kept.
 */
function decodeZilString(raw: string): string {
  return raw
    .replaceAll("|\n", "\u0000")
    .replaceAll("|", "\u0000")
    .replaceAll("\n", " ")
    .replaceAll("\u0000", "\n");
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

// ---- object extraction (stage 3.2) ----

/** ZIL world-tree scaffolding OBJECT forms that must not become IR objects. */
const SCAFFOLDING_OBJECTS = new Set(["GLOBAL-OBJECTS", "LOCAL-GLOBALS", "ROOMS"]);

function extractObject(form: AstNode, roomIds: Set<string>): WorldObject {
  const elements = meaningful(form.elements!);
  const id = atomName(elements[1]) ?? fail("OBJECT", "form without a name atom");

  const object: WorldObject = {
    id,
    name: "",
    location: { kind: "nowhere" },
    synonyms: [],
    flags: [],
  };
  const synonyms: string[] = [];
  const adjectives: string[] = [];

  const intProp = (rest: AstNode[], prop: string): number => {
    const v = rest[0];
    if (v?.type !== "Number" || typeof v.value !== "number") fail(id, `${prop} is not a number`);
    return v.value;
  };

  for (const prop of elements.slice(2)) {
    if (prop.type !== "List" || !prop.elements?.length) fail(id, `unexpected property node ${prop.type}`);
    const parts = meaningful(prop.elements);
    const head = atomName(parts[0]) ?? fail(id, "property without a head atom");
    const rest = parts.slice(1);
    switch (head) {
      case "DESC":
        object.name = stringValue(rest[0]) ?? fail(id, "DESC is not a string");
        break;
      case "LDESC":
        object.description = stringValue(rest[0]) ?? fail(id, "LDESC is not a string");
        break;
      case "FDESC":
        object.initialDescription = stringValue(rest[0]) ?? fail(id, "FDESC is not a string");
        break;
      case "TEXT":
        object.text = stringValue(rest[0]) ?? fail(id, "TEXT is not a string");
        break;
      case "IN": {
        const target = atomName(rest[0]) ?? fail(id, "IN is not an atom");
        if (rest.length !== 1) fail(id, "malformed IN property");
        if (target === "LOCAL-GLOBALS") object.location = { kind: "local-globals" };
        else if (target === "GLOBAL-OBJECTS") object.location = { kind: "global" };
        else if (roomIds.has(target)) object.location = { kind: "room", id: target };
        else object.location = { kind: "object", id: target };
        break;
      }
      case "SYNONYM":
        for (const s of rest) synonyms.push(atomName(s) ?? fail(id, "SYNONYM entry is not an atom"));
        break;
      case "ADJECTIVE":
        for (const a of rest) adjectives.push(atomName(a) ?? fail(id, "ADJECTIVE entry is not an atom"));
        break;
      case "FLAGS":
        object.flags = rest.map((f) => atomName(f) ?? fail(id, "FLAGS entry is not an atom"));
        break;
      case "ACTION":
        // ADVENTURER carries `(ACTION 0)` — an explicit "no action".
        if (rest[0]?.type === "Number" && rest[0].value === 0) break;
        object.action = atomName(rest[0]) ?? fail(id, "ACTION is not an atom");
        break;
      case "DESCFCN":
        object.descriptionRoutine = atomName(rest[0]) ?? fail(id, "DESCFCN is not an atom");
        break;
      case "VTYPE":
        object.vehicleType = atomName(rest[0]) ?? fail(id, "VTYPE is not a flag atom");
        break;
      case "CAPACITY":
        object.capacity = intProp(rest, head);
        break;
      case "SIZE":
        object.size = intProp(rest, head);
        break;
      case "VALUE":
        object.value = intProp(rest, head);
        break;
      case "TVALUE":
        object.treasureValue = intProp(rest, head);
        break;
      case "STRENGTH":
        object.strength = intProp(rest, head);
        break;
      default:
        fail(id, `unknown object property "${head}"`);
    }
  }

  if (object.name === "") fail(id, "object has no DESC");
  object.synonyms = synonyms;
  if (adjectives.length > 0) object.adjectives = adjectives;
  return object;
}

// ---- compile-time COND resolution ----

/**
 * gsyntax.zil wraps some vocabulary in `<COND (<==? ,ZORK-NUMBER n> …)>`
 * compile-time gates (Zork I/II/III shared source). Resolve them exactly:
 * ZORK-NUMBER comes from `<SETG ZORK-NUMBER n>` in zork1.zil, predicates are
 * `==?` / `N==?` against a number literal, and the first true clause's body
 * joins the top-level form stream. Anything else is a hard error.
 */
function findZorkNumber(programs: AstProgram[]): number | undefined {
  let zorkNumber: number | undefined;
  for (const program of programs) {
    for (const node of program.body) {
      if (!isForm(node, "SETG")) continue;
      const elements = meaningful(node.elements!);
      if (atomName(elements[1]) === "ZORK-NUMBER" && elements[2]?.type === "Number") {
        zorkNumber = elements[2].value as number;
      }
    }
  }
  return zorkNumber;
}

function expandCompileTimeConds(programs: AstProgram[]): AstNode[] {
  const zorkNumber = findZorkNumber(programs);
  const out: AstNode[] = [];
  for (const program of programs) {
    for (const node of program.body) {
      if (!isForm(node, "COND")) {
        out.push(node);
        continue;
      }
      for (const clause of meaningful(node.elements!).slice(1)) {
        if (clause.type !== "List" || !clause.elements?.length) fail("COND", "clause is not a list");
        const [predicate, ...body] = meaningful(clause.elements!);
        if (evalCondPredicate(predicate, zorkNumber)) {
          out.push(...body);
          break;
        }
      }
    }
  }
  return out;
}

function evalCondPredicate(predicate: AstNode | undefined, zorkNumber: number | undefined): boolean {
  const op = predicate !== undefined ? atomName(predicate.elements?.[0]) : undefined;
  if (predicate === undefined || (op !== "==?" && op !== "N==?")) {
    fail("COND", `unsupported compile-time predicate (${op ?? predicate?.type})`);
  }
  const [, lhs, rhs] = meaningful(predicate.elements!);
  if (lhs?.type !== "GVal" || atomName(lhs.value as AstNode) !== "ZORK-NUMBER" || rhs?.type !== "Number") {
    fail("COND", "predicate is not ,ZORK-NUMBER vs a number literal");
  }
  if (zorkNumber === undefined) fail("COND", "ZORK-NUMBER is not set by any provided AST");
  const equal = zorkNumber === (rhs.value as number);
  return op === "==?" ? equal : !equal;
}

// ---- vocabulary extraction (stage 3.3) ----

const OPTION_SET = new Set<string>(SYNTAX_SEARCH_OPTIONS);

function extractSyntaxRule(form: AstNode): SyntaxRule {
  const parts = meaningful(form.elements!).slice(1);
  const eqIndex = parts.findIndex((p) => atomName(p) === "=");
  if (eqIndex < 1) fail("SYNTAX", "rule without a verb or =");
  const verb = atomName(parts[0]) ?? fail("SYNTAX", "verb is not an atom");
  const ctx = `SYNTAX ${verb}`;

  const objects: SyntaxObjectSlot[] = [];
  let pendingPreposition: string | undefined;
  for (const token of parts.slice(1, eqIndex)) {
    const word = atomName(token);
    if (word === "OBJECT") {
      const slot: SyntaxObjectSlot = {};
      if (pendingPreposition !== undefined) slot.preposition = pendingPreposition;
      pendingPreposition = undefined;
      objects.push(slot);
    } else if (word !== undefined) {
      if (pendingPreposition !== undefined) fail(ctx, `two prepositions in a row ("${pendingPreposition}" "${word}")`);
      pendingPreposition = word;
    } else if (token.type === "List") {
      const slot = objects[objects.length - 1] ?? fail(ctx, "option list before any OBJECT");
      const listParts = meaningful(token.elements!);
      if (atomName(listParts[0]) === "FIND") {
        const flag = atomName(listParts[1]);
        if (listParts.length !== 2 || flag === undefined) fail(ctx, "malformed (FIND flag)");
        slot.find = flag;
      } else {
        const options = listParts.map((p) => atomName(p) ?? fail(ctx, "search option is not an atom"));
        for (const option of options) {
          if (!OPTION_SET.has(option)) fail(ctx, `unknown search option "${option}"`);
        }
        slot.options = options as SyntaxSearchOption[];
      }
    } else {
      fail(ctx, `unexpected token ${token.type}`);
    }
  }
  if (pendingPreposition !== undefined) fail(ctx, `dangling preposition "${pendingPreposition}"`);
  if (objects.length > 2) fail(ctx, "more than 2 object slots");

  const rhs = parts.slice(eqIndex + 1).map((p) => atomName(p) ?? fail(ctx, "routine ref is not an atom"));
  if (rhs.length < 1 || rhs.length > 2) fail(ctx, "expected action [preAction] after =");
  const rule: SyntaxRule = { verb, objects, action: rhs[0]! };
  if (rhs[1] !== undefined) rule.preAction = rhs[1];
  return rule;
}

function extractVocabulary(topLevel: AstNode[]): Vocabulary {
  const directions: DirectionWord[] = [];
  const buzzwords: string[] = [];
  const synonyms: WordSynonym[] = [];
  const syntax: SyntaxRule[] = [];

  for (const node of topLevel) {
    if (isForm(node, "DIRECTIONS")) {
      for (const word of meaningful(node.elements!).slice(1)) {
        const name = atomName(word) ?? fail("DIRECTIONS", "entry is not an atom");
        const direction = DIRECTION_MAP[name] ?? fail("DIRECTIONS", `unknown direction "${name}"`);
        directions.push({ word: name, direction });
      }
    } else if (isForm(node, "BUZZ")) {
      for (const word of meaningful(node.elements!).slice(1)) {
        buzzwords.push(atomName(word) ?? fail("BUZZ", "entry is not an atom"));
      }
    } else if (isForm(node, "SYNONYM")) {
      const words = meaningful(node.elements!)
        .slice(1)
        .map((w) => atomName(w) ?? fail("SYNONYM", "entry is not an atom"));
      if (words.length < 2) fail("SYNONYM", "needs a word and at least one alias");
      synonyms.push({ word: words[0]!, synonyms: words.slice(1) });
    } else if (isForm(node, "SYNTAX")) {
      syntax.push(extractSyntaxRule(node));
    }
  }
  return { directions, buzzwords, synonyms, syntax };
}

// ---- global extraction ----

/** Resolve a referenced global's initial value from `<GLOBAL name value>` forms. */
function findGlobalValue(topLevel: AstNode[], name: string): boolean | number | string {
  for (const node of topLevel) {
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
  fail(name, "referenced global is not defined in any provided AST");
}

// ---- entry point ----

export interface ExtractionResult {
  world: WorldDocument;
  /** Routines batch-1 behavior extraction could not represent, with reasons. */
  catalog: CatalogEntry[];
}

/** Extract the full world model from importer AST programs. */
export function extractWorld(programs: AstProgram[]): ExtractionResult {
  const topLevel = expandCompileTimeConds(programs);
  const roomForms: AstNode[] = [];
  const objectForms = new Map<string, AstNode>();
  for (const node of topLevel) {
    if (isForm(node, "ROOM")) roomForms.push(node);
    if (isForm(node, "OBJECT")) {
      const id = atomName(meaningful(node.elements!)[1]);
      if (id !== undefined) objectForms.set(id, node);
    }
  }

  const rooms: Room[] = [];
  const globalRefs = new Set<string>();
  for (const form of roomForms) {
    const { room, globalRefs: g } = extractRoom(form);
    rooms.push(room);
    for (const ref of g) globalRefs.add(ref);
  }
  const roomIds = new Set(rooms.map((r) => r.id));

  const objects: WorldObject[] = [];
  for (const [id, form] of objectForms) {
    if (SCAFFOLDING_OBJECTS.has(id)) continue;
    objects.push(extractObject(form, roomIds));
  }

  const vocabulary = extractVocabulary(topLevel);

  // Behavior extraction (stage 3.4): worklist closure from every routine the
  // world references, following call targets into helpers.
  const routineForms = new Map<string, { form: AstNode; file: string }>();
  const callableNames = new Set<string>();
  const collectCallables = (node: AstNode): void => {
    if (isForm(node, "ROUTINE") || isForm(node, "DEFMAC")) {
      const id = atomName(meaningful(node.elements!)[1]);
      if (id !== undefined) callableNames.add(id);
    }
    for (const child of node.elements ?? []) collectCallables(child);
    if (node.value !== undefined && typeof node.value === "object") {
      collectCallables(node.value as AstNode);
    }
  };
  for (const program of programs) {
    for (const node of program.body) {
      collectCallables(node);
      if (isForm(node, "ROUTINE")) {
        const id = atomName(meaningful(node.elements!)[1]);
        if (id !== undefined) routineForms.set(id, { form: node, file: program.source });
      }
    }
  }
  const globalForms = new Map<string, AstNode>();
  const constants = new Map<string, number>();
  for (const node of topLevel) {
    if (isForm(node, "GLOBAL")) {
      const id = atomName(meaningful(node.elements!)[1]);
      if (id !== undefined && !globalForms.has(id)) globalForms.set(id, node);
    }
    if (isForm(node, "CONSTANT")) {
      const parts = meaningful(node.elements!);
      const id = atomName(parts[1]);
      if (id !== undefined && parts[2]?.type === "Number") constants.set(id, parts[2].value as number);
    }
  }
  const entityIds = new Set([...roomIds, ...objects.map((o) => o.id)]);
  const entryRefs = [
    ...new Set(
      [
        ...rooms.flatMap((r) => [
          r.action,
          ...r.exits.map((e) => (e.kind === "routine" ? e.routine : undefined)),
          ...(r.pseudo ?? []).map((p) => p.routine),
        ]),
        ...objects.flatMap((o) => [o.action, o.descriptionRoutine]),
        ...vocabulary.syntax.flatMap((s) => [s.action, s.preAction]),
      ].filter((r): r is string => r !== undefined),
    ),
  ].sort();
  const behavior = extractBehavior(entryRefs, {
    routineForms,
    callableNames,
    globalForms,
    roomAndObjectIds: entityIds,
    constants,
    directionWords: new Map(Object.entries(DIRECTION_MAP)),
    decodeString: decodeZilString,
    zorkNumber: findZorkNumber(programs),
  });

  const globals: GlobalVariable[] = [...globalRefs]
    .filter((id) => !behavior.globals.some((g) => g.id === id))
    .map((id) => ({ id, value: findGlobalValue(topLevel, id) }))
    .concat(behavior.globals)
    .sort((a, b) => a.id.localeCompare(b.id));

  const flagIds = new Set<string>();
  for (const room of rooms) for (const flag of room.flags) flagIds.add(flag);
  for (const object of objects) for (const flag of object.flags) flagIds.add(flag);
  for (const rule of vocabulary.syntax) {
    for (const slot of rule.objects) if (slot.find !== undefined) flagIds.add(slot.find);
  }
  for (const flag of behavior.flags) flagIds.add(flag);
  const flags: FlagDeclaration[] = [...flagIds].sort().map((id) => {
    const description = FLAG_DESCRIPTIONS[id];
    return description !== undefined ? { id, description } : { id };
  });

  const world: WorldDocument = {
    irVersion: IR_VERSION,
    meta: {
      title: "Zork I — world model (rooms, exits, objects)",
      source: "importer/artifacts/ast (from original-projects/zork1)",
      coverage: "partial",
      notes:
        "Stages 3.1–3.4 deterministic extraction: all ROOM forms (exits, flags, scenery/pseudo references), all OBJECT forms (properties, flags, containment, initial locations; ZIL scaffolding objects represented structurally), the parser vocabulary (SYNTAX/SYNONYM/BUZZ/DIRECTIONS with ZORK-NUMBER CONDs resolved), and batch-1 behavior routines (ADR 0001 AST; complex routines catalogued in zork1.behavior-catalog.json). Globals/tables cover exit conditions plus everything extracted behavior references. Generated by ir/src/extract-world.ts — do not edit by hand.",
    },
    flags,
    globals,
    tables: behavior.tables,
    rooms,
    objects,
    vocabulary,
    routines: behavior.routines,
  };
  return { world, catalog: behavior.catalog };
}
