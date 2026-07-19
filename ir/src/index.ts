export { IR_VERSION, DIRECTIONS, META_ENTITY_ROLES } from "./schema.js";
export type {
  Direction,
  WorldDocument,
  WorldMeta,
  FlagDeclaration,
  GlobalVariable,
  ScalarValue,
  EntityRef,
  TableElement,
  Table,
  Exit,
  PlainExit,
  BlockedExit,
  ConditionalExit,
  DoorExit,
  RoutineExit,
  PseudoReference,
  Vocabulary,
  DirectionWord,
  WordSynonym,
  SyntaxRule,
  SyntaxObjectSlot,
  SyntaxSearchOption,
  Room,
  ObjectLocation,
  WorldObject,
  MetaEntity,
  MetaEntityRole,
} from "./schema.js";
export { validateWorld } from "./validate.js";
export type { ValidationError, ValidationResult, WorldSummary } from "./validate.js";
export { extractWorld } from "./extract-world.js";
export type { AstProgram, ExtractionResult } from "./extract-world.js";
export type { BehaviorRoutine, Expr, Stmt, TellPart, CondClause, BehaviorValue, BehaviorLiteral, TableRef } from "./behavior.js";
export type { CatalogEntry } from "./extract-behavior.js";
