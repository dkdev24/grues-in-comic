/**
 * Stage 2.2 POC — the SAME two routines hand-transpiled to TypeScript, the
 * competing representation. Runs against the identical world/builtin layer
 * so the differential tests isolate the representation choice.
 */

import type { BehaviorValue } from "../src/behavior.js";
import { builtins, hasFlag, tell, truthy } from "./world.js";
import type { WorldState } from "./world.js";

/** ZIL 1actions.zil:567 */
export function trapDoorExit(w: WorldState): BehaviorValue {
  if (truthy(w.globals["RUG-MOVED"] ?? false)) {
    if (hasFlag(w, "TRAP-DOOR", "OPENBIT")) return "CELLAR";
    tell(w, "The trap door is closed.", true);
    builtins["THIS-IS-IT"]!(w, ["TRAP-DOOR"]);
    return false;
  }
  tell(w, "You can't go that way.", true);
  return false;
}

/** ZIL 1actions.zil:241 */
export function kitchenWindowF(w: WorldState): BehaviorValue {
  if (w.verb === "OPEN" || w.verb === "CLOSE") {
    w.globals["KITCHEN-WINDOW-FLAG"] = true;
    builtins["OPEN-CLOSE"]!(w, [
      "KITCHEN-WINDOW",
      "With great effort, you open the window far enough to allow entry.",
      "The window closes (more easily than it opened).",
    ]);
    return false;
  }
  if (w.verb === "EXAMINE" && !truthy(w.globals["KITCHEN-WINDOW-FLAG"] ?? false)) {
    tell(w, "The window is slightly ajar, but not enough to allow entry.", true);
    return false;
  }
  if (w.verb === "WALK" || w.verb === "BOARD" || w.verb === "THROUGH") {
    builtins["DO-WALK"]!(w, [w.globals["HERE"] === "KITCHEN" ? "east" : "west"]);
    return true;
  }
  if (w.verb === "LOOK-INSIDE") {
    tell(w, "You can see ");
    if (w.globals["HERE"] === "KITCHEN") tell(w, "a clear area leading towards a forest.", true);
    else tell(w, "what appears to be a kitchen.", true);
    return false;
  }
  return false;
}
