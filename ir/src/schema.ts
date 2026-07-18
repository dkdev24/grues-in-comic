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
export const IR_VERSION = "0.1.0";

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
   * Named tables (ZIL TABLE/LTABLE/ITABLE). A ZIL global whose value is a
   * table (e.g. `<GLOBAL ABOVE-GROUND <LTABLE …>>`) is represented as a table
   * entity only — the table id doubles as the global binding.
   */
  tables: Table[];
  rooms: Room[];
  objects: WorldObject[];
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
  value: ScalarValue;
  description?: string;
}

/** A reference to another IR entity by id, usable inside table elements. */
export interface EntityRef {
  ref: string;
}

export type TableElement = ScalarValue | EntityRef;

export interface Table {
  id: string;
  /** ZIL constructor: TABLE (no length word), LTABLE (length-prefixed), ITABLE (initialized). */
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
  /** Score awarded when the room is first entered (ZIL VALUE). */
  score?: number;
  /**
   * Marks a placeholder whose full definition is out of this document's
   * scope (used by partial/sample worlds so references still resolve).
   */
  stub?: boolean;
}

/** Where an object starts (ZIL IN). */
export type ObjectLocation =
  | { kind: "room"; id: string }
  | { kind: "object"; id: string }
  /** Scenery pool referenced by rooms' `scenery` lists (ZIL LOCAL-GLOBALS). */
  | { kind: "local-globals" }
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
  /** Same placeholder semantics as {@link Room.stub}. */
  stub?: boolean;
}
