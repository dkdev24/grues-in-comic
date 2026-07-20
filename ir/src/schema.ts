/**
 * Grues in Comic — Intermediate Representation (IR).
 *
 * Stage 2.1 subset: the **declarative world** — rooms, exits, objects,
 * flags/properties, globals, and tables. Imperative behavior (ROUTINE/ACTION
 * bodies) is deliberately out of scope; wherever the world refers to behavior,
 * the IR stores an *opaque routine name* (a plain string). Stage 2.2 decides
 * what those names resolve to.
 *
 * Design constraints (see docs/IR_SCHEMA.md for the normative spec):
 * - Independent of ZIL, browser APIs, WebAssembly, and rendering technology.
 * - JSON-serializable: an IR document is plain data, no functions.
 * - Traceable: entity ids keep the original upper-case ZIL names
 *   (e.g. "WEST-OF-HOUSE") so every IR entity can be diffed against source.
 * - Strict: validation rejects unknown keys so schema drift is caught early.
 */

/** Version of the IR schema itself (not the game data). */
export const IR_VERSION = "0.14.0";

import type { BehaviorRoutine, TableRef } from "./behavior.js";
export type { BehaviorRoutine, TableRef } from "./behavior.js";

/**
 * Property keys legal in behavior `prop`/`set-prop` ops — the IR field names
 * of {@link WorldObject} properties that ZIL code reads/writes dynamically
 * (`,P?LDESC` → "description", …). Closed set: extraction denies unmapped
 * ZIL property atoms, validation rejects keys outside this list.
 */
export const BEHAVIOR_PROPERTY_KEYS = [
  "action",
  /**
   * A room's {@link Room.adjacent} list, as a table id — the only key here
   * with no ZIL property atom behind it. No `,P?NAME` maps to it, so
   * extraction never produces it from a `GETP`; it exists solely as the
   * handle the ADR 0003 exit-scan rewrite reads, and the engine materializes
   * it at load. Read-only in practice: nothing writes it with `set-prop`.
   */
  "adjacentRooms",
  "capacity",
  "description",
  "descriptionRoutine",
  "initialDescription",
  "size",
  "strength",
  "text",
  "treasureValue",
  "value",
  "vehicleType",
] as const;

export type BehaviorPropertyKey = (typeof BEHAVIOR_PROPERTY_KEYS)[number];

/**
 * Travel directions. ZIL's abbreviated direction properties map to full words
 * (NE → "northeast", SW → "southwest", …). "land" is used by water rooms.
 */
export const DIRECTIONS = [
  "north",
  "south",
  "east",
  "west",
  "northeast",
  "northwest",
  "southeast",
  "southwest",
  "up",
  "down",
  "in",
  "out",
  "land",
] as const;

export type Direction = (typeof DIRECTIONS)[number];

/** Root of an IR world document. */
export interface WorldDocument {
  /** Must equal {@link IR_VERSION}. */
  irVersion: string;
  meta?: WorldMeta;
  /** Registry of every flag the document may use. */
  flags: FlagDeclaration[];
  /** Scalar global variables (ZIL GLOBAL with an atom/number/string value). */
  globals: GlobalVariable[];
  /**
   * Named tables (ZIL TABLE/LTABLE/ITABLE) — the storage itself.
   *
   * `<GLOBAL ABOVE-GROUND <LTABLE …>>` declares *two* things: a table and a
   * global variable holding a pointer to it. Both are emitted, sharing the one
   * ZIL name — the single exception to the flat-id rule, because the runtime
   * keeps variables and table storage in separate namespaces and inventing a
   * second id would cost the traceability the IR's ids exist for. The global's
   * initial `value` is `{table, offset: 0}`; reads go through the variable, so
   * a `set-global` that retargets the pointer works as ZIL's does.
   */
  tables: Table[];
  rooms: Room[];
  objects: WorldObject[];
  /**
   * The object tree's structural anchors (ZIL GLOBAL-OBJECTS / LOCAL-GLOBALS /
   * ROOMS). Absent in documents whose behavior never names them.
   */
  metaEntities?: MetaEntity[];
  /** Parser vocabulary and verb syntax (stage 3.3); absent in partial worlds. */
  vocabulary?: Vocabulary;
  /**
   * Extracted behavior routines (ADR 0001 behavior AST; stage 3.4+).
   * Routine references not present here are engine builtins or routines
   * still catalogued as complex (see the extraction catalog artifact).
   */
  routines?: BehaviorRoutine[];
}

/**
 * Parser vocabulary (ZIL gsyntax): verb syntax rules plus the word-level
 * tables the tokenizer needs. Object nouns/adjectives stay on the objects
 * themselves. Words keep their upper-case ZIL spelling for traceability.
 */
export interface Vocabulary {
  /** Travel words the parser accepts as bare commands (ZIL DIRECTIONS). */
  directions: DirectionWord[];
  /** Noise words the parser drops (ZIL BUZZ), including punctuation tokens. */
  buzzwords: string[];
  /** Word aliases (ZIL SYNONYM): every alias parses as `word`. */
  synonyms: WordSynonym[];
  /** Verb syntax rules (ZIL SYNTAX), in source order. */
  syntax: SyntaxRule[];
}

export interface DirectionWord {
  word: string;
  direction: Direction;
}

export interface WordSynonym {
  word: string;
  synonyms: string[];
}

/**
 * Where the parser may look for a syntax object, mirroring ZIL search-option
 * atoms: held by the player, inside something carried, in the room, on the
 * ground, multiple allowed, implicit take, or "must have".
 */
export const SYNTAX_SEARCH_OPTIONS = [
  "HELD",
  "CARRIED",
  "IN-ROOM",
  "ON-GROUND",
  "MANY",
  "HAVE",
  "TAKE",
] as const;

export type SyntaxSearchOption = (typeof SYNTAX_SEARCH_OPTIONS)[number];

/**
 * One verb syntax rule: `<SYNTAX verb [prep] [OBJECT …] [prep] [OBJECT …] =
 * action [preAction]>`. A verb may have many rules; the parser matches the
 * most specific one.
 */
export interface SyntaxRule {
  verb: string;
  /** 0–2 object slots, in the order they appear in the command. */
  objects: SyntaxObjectSlot[];
  /** Opaque verb action routine (V-*; stage 2.2). */
  action: string;
  /** Opaque pre-action routine (PRE-*; stage 2.2). */
  preAction?: string;
}

export interface SyntaxObjectSlot {
  /** Word required before the object (ZIL preposition position). */
  preposition?: string;
  /** Flag the parser prefers when disambiguating (ZIL `(FIND flag)`). */
  find?: string;
  /** Allowed search locations (ZIL search-option list). */
  options?: SyntaxSearchOption[];
}

export interface WorldMeta {
  title?: string;
  /** Provenance, e.g. "original-projects/zork1 (1dungeon.zil)". */
  source?: string;
  /** "sample" | "partial" | "full" — informational only. */
  coverage?: string;
  notes?: string;
}

/**
 * A declared flag (ZIL FLAGS bit such as ONBIT, TAKEBIT). Every flag used by
 * a room or object must be declared here; the registry is the single place a
 * reader can learn what a flag means.
 */
export interface FlagDeclaration {
  id: string;
  description?: string;
}

/** Scalar values a global can hold. ZIL `<>` maps to `false`, `T` to `true`. */
export type ScalarValue = boolean | number | string;

export interface GlobalVariable {
  id: string;
  /**
   * A scalar, or a pointer to a table when ZIL declared the global as
   * `<GLOBAL name <TABLE …>>` (see {@link WorldDocument.tables}). The pointer
   * is the initial value only — `set-global` may retarget it, which is how the
   * lamp/candle countdowns advance (`<SETG LAMP-TABLE <REST .TBL 4>>`).
   */
  value: ScalarValue | TableRef;
  description?: string;
}

/** A reference to another IR entity by id, usable inside table elements. */
export interface EntityRef {
  ref: string;
}

/**
 * A table element. Beyond scalars and entity refs, an element may be a
 * {@link TableRef} — ZIL nests anonymous `<TABLE …>` forms inside a table
 * (VILLAINS holds one per villain). The nested table is emitted as its own
 * entry in {@link WorldDocument.tables} under a derived id and the parent
 * stores a pointer at offset 0, so `<GET ,VILLAINS .CNT>` yields exactly the
 * pointer the runtime already understands — no new behavior ops.
 */
export type TableElement = ScalarValue | EntityRef | TableRef;

export interface Table {
  id: string;
  /**
   * ZIL constructor: TABLE (no length word), LTABLE (length-prefixed),
   * ITABLE (zero-filled to a fixed length). ITABLE addresses like TABLE —
   * only its initializer differs, and that is already baked into `elements`.
   */
  kind: "table" | "ltable" | "itable";
  /** ZIL (PURE) — the table is read-only at runtime. */
  pure?: boolean;
  elements: TableElement[];
  description?: string;
}

/**
 * One exit from a room. Discriminated by `kind`, mirroring the ZIL exit
 * property variants exactly:
 *
 * | ZIL                                | IR kind       |
 * |------------------------------------|---------------|
 * | `(EAST TO KITCHEN)`                | "to"          |
 * | `(EAST "The door is boarded…")`    | "blocked"     |
 * | `(SW TO BARROW IF WON-FLAG)`       | "conditional" |
 * | `(WEST TO X IF FLAG ELSE "msg")`   | "conditional" |
 * | `(EAST TO X IF DOOR-OBJ IS OPEN)`  | "door"        |
 * | `(DOWN PER TRAP-DOOR-EXIT)`        | "routine"     |
 */
export type Exit =
  | PlainExit
  | BlockedExit
  | ConditionalExit
  | DoorExit
  | RoutineExit;

export interface ExitBase {
  direction: Direction;
}

/** Unconditional travel to another room. */
export interface PlainExit extends ExitBase {
  kind: "to";
  to: string;
}

/** No travel; print the message instead. */
export interface BlockedExit extends ExitBase {
  kind: "blocked";
  message: string;
}

/**
 * Travel allowed only while a boolean global is true; otherwise print `else`
 * (or the engine's default refusal when `else` is absent).
 */
export interface ConditionalExit extends ExitBase {
  kind: "conditional";
  to: string;
  /** Id of a global variable. */
  if: string;
  else?: string;
}

/**
 * Travel through a door object, allowed while the door has OPENBIT set;
 * otherwise print `else` (or the engine's default refusal).
 */
export interface DoorExit extends ExitBase {
  kind: "door";
  to: string;
  /** Id of an object carrying the DOORBIT flag. */
  door: string;
  else?: string;
}

/**
 * Travel resolved by a routine (ZIL `PER`). Opaque behavior reference —
 * representation of the routine itself is a stage 2.2 decision.
 */
export interface RoutineExit extends ExitBase {
  kind: "routine";
  routine: string;
}

/**
 * ZIL PSEUDO entry: a noun that exists only in this room and routes to a
 * routine (e.g. "NAILS" in the Living Room).
 */
export interface PseudoReference {
  noun: string;
  /** Opaque routine name (stage 2.2). */
  routine: string;
}

/**
 * Exit kinds that carry a static destination — the IR spelling of ZIL's
 * UEXIT / CEXIT / DEXIT. See {@link Room.adjacent} for why `blocked` and
 * `routine` are absent.
 */
const STATIC_DESTINATION_EXITS = new Set(["to", "conditional", "door"]);

/**
 * Derive {@link Room.adjacent} from a room's exits.
 *
 * The single definition of the invariant: `extract-world` calls it to emit
 * the field and `validate` calls it to re-check the field it reads, so a
 * hand-edited or stale adjacency list fails validation rather than silently
 * disagreeing with the exits beside it (ADR 0003).
 */
export function deriveAdjacent(exits: Exit[]): string[] {
  const seen: string[] = [];
  for (const exit of exits) {
    if (!STATIC_DESTINATION_EXITS.has(exit.kind)) continue;
    const to = (exit as { to: string }).to;
    if (!seen.includes(to)) seen.push(to);
  }
  return seen;
}

export interface Room {
  id: string;
  /** Short name shown in the status line / room heading (ZIL DESC). */
  name: string;
  /**
   * Static long description (ZIL LDESC). Rooms whose description is computed
   * by their action routine (M-LOOK) omit this — that text is behavior.
   */
  description?: string;
  exits: Exit[];
  flags: string[];
  /** Opaque room action routine name (ZIL ACTION; stage 2.2). */
  action?: string;
  /**
   * Ids of scenery objects reachable from this room (ZIL room GLOBAL list —
   * objects living in "local-globals").
   */
  scenery?: string[];
  pseudo?: PseudoReference[];
  /**
   * **Derived, not transcribed** — the ids of rooms this room declares a
   * static exit *to*, deduped, in `exits` order. Regenerated by
   * `extract-world.ts`; never hand-edited, and validation re-derives it from
   * `exits` so the two cannot drift (ADR 0003).
   *
   * "Declared", not "reachable": a `conditional` exit whose global is false
   * and a `door` exit whose door is shut are both **included**, because the
   * ZIL this models tests the exit's *shape* (UEXIT/CEXIT/DEXIT), not its
   * state. `blocked` exits (NEXIT — a message, no destination) and `routine`
   * exits (FEXIT/`PER` — the destination is computed) have no static
   * destination and are **excluded**. Do not use this field for pathfinding
   * or for a map view; it answers "what rooms does this room name", which is
   * a different question from "where can the player go from here".
   */
  adjacent?: string[];
  /** Score awarded when the room is first entered (ZIL VALUE). */
  score?: number;
  /**
   * Marks a placeholder whose full definition is out of this document's
   * scope (used by partial/sample worlds so references still resolve).
   */
  stub?: boolean;
}

/**
 * The three roles ZIL's world-tree scaffolding objects play. Each is the
 * container of one class of entity, and behavior code names them directly
 * (`<IN? .OBJ ,ROOMS>`, `<FIRST? ,ROOMS>`, `<EQUAL? ,PRSO ,ROOMS>`).
 */
export const META_ENTITY_ROLES = ["rooms", "global-objects", "local-globals"] as const;

export type MetaEntityRole = (typeof META_ENTITY_ROLES)[number];

/**
 * A structural anchor of the object tree (ZIL GLOBAL-OBJECTS / LOCAL-GLOBALS /
 * ROOMS). These are not game entities — they hold no name, flags, or
 * properties — but they are real containers: behavior tests membership with
 * `in?`, walks their children with `first`/`next`, and compares against them
 * with `equal?`, so an engine must give each one a node in the object tree.
 *
 * Membership is derived, never duplicated per entity. At load time an engine
 * parents:
 * - every {@link Room} under the `"rooms"` meta entity, in document order;
 * - every {@link WorldObject} whose `location.kind` is `"global"` under the
 *   `"global-objects"` one, and `"local-globals"` under the `"local-globals"`
 *   one.
 *
 * The meta entities themselves nest per `location` (in Zork I, LOCAL-GLOBALS
 * sits inside GLOBAL-OBJECTS — the parser's scope walk relies on that).
 */
export interface MetaEntity {
  id: string;
  role: MetaEntityRole;
  /** Id of the meta entity containing this one; absent = object-tree root. */
  location?: string;
  description?: string;
}

/** Where an object starts (ZIL IN). */
export type ObjectLocation =
  | { kind: "room"; id: string }
  | { kind: "object"; id: string }
  /** Scenery pool referenced by rooms' `scenery` lists (ZIL LOCAL-GLOBALS). */
  | { kind: "local-globals" }
  /** In scope in every room (ZIL GLOBAL-OBJECTS), e.g. hands, walls, the grue. */
  | { kind: "global" }
  /** Defined but initially nowhere in the world. */
  | { kind: "nowhere" };

export interface WorldObject {
  id: string;
  /** Short noun phrase used in messages (ZIL DESC), e.g. "small mailbox". */
  name: string;
  location: ObjectLocation;
  /** Nouns the parser accepts for this object (ZIL SYNONYM). */
  synonyms: string[];
  /** Adjectives the parser accepts (ZIL ADJECTIVE). */
  adjectives?: string[];
  flags: string[];
  /** Opaque object action routine name (ZIL ACTION; stage 2.2). */
  action?: string;
  /** Description when lying in a room after being moved (ZIL LDESC). */
  description?: string;
  /** Description before the object is first disturbed (ZIL FDESC). */
  initialDescription?: string;
  /** Text shown when the object is read (ZIL TEXT). `|` → newline applied. */
  text?: string;
  /** Container capacity (ZIL CAPACITY). */
  capacity?: number;
  /** Bulk/weight (ZIL SIZE). */
  size?: number;
  /** Score for taking the object (ZIL VALUE). */
  value?: number;
  /** Score for depositing the treasure in the trophy case (ZIL TVALUE). */
  treasureValue?: number;
  /** Weapon/villain strength (ZIL STRENGTH). */
  strength?: number;
  /**
   * Room-flag id the object requires of rooms it can travel through as a
   * vehicle (ZIL VTYPE), e.g. the boat's NONLANDBIT.
   */
  vehicleType?: string;
  /** Opaque routine computing the object's description (ZIL DESCFCN; stage 2.2). */
  descriptionRoutine?: string;
  /** Same placeholder semantics as {@link Room.stub}. */
  stub?: boolean;
}
