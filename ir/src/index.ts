export { IR_VERSION, DIRECTIONS } from "./schema.js";
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
  Room,
  ObjectLocation,
  WorldObject,
} from "./schema.js";
export { validateWorld } from "./validate.js";
export type { ValidationError, ValidationResult, WorldSummary } from "./validate.js";
