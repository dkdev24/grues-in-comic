/**
 * Stage 2.2 differential tests: for every scenario, the interpreted behavior
 * AST and the hand-transpiled TypeScript must produce the identical outcome —
 * transcript, return value, mutated state, walk re-dispatches, pronoun
 * binding. Plus golden assertions against the ZIL source's expected text.
 */

import { describe, expect, it } from "vitest";
import type { BehaviorValue } from "../src/behavior.js";
import { runRoutine } from "../poc/interpreter.js";
import { KITCHEN_WINDOW_F, TRAP_DOOR_EXIT } from "../poc/routines.js";
import { kitchenWindowF, trapDoorExit } from "../poc/transpiled.js";
import { makeWorld, snapshot } from "../poc/world.js";
import type { WorldState } from "../poc/world.js";

interface Scenario {
  name: string;
  routine: "trap-door-exit" | "kitchen-window-f";
  world: () => WorldState;
}

const scenarios: Scenario[] = [
  {
    name: "trap door: rug not moved",
    routine: "trap-door-exit",
    world: () => makeWorld({ here: "LIVING-ROOM", verb: "WALK", globals: { "RUG-MOVED": false } }),
  },
  {
    name: "trap door: rug moved, door closed",
    routine: "trap-door-exit",
    world: () => makeWorld({ here: "LIVING-ROOM", verb: "WALK", globals: { "RUG-MOVED": true } }),
  },
  {
    name: "trap door: rug moved, door open",
    routine: "trap-door-exit",
    world: () =>
      makeWorld({
        here: "LIVING-ROOM",
        verb: "WALK",
        globals: { "RUG-MOVED": true },
        flags: { "TRAP-DOOR": ["OPENBIT"] },
      }),
  },
  {
    name: "window: OPEN while closed",
    routine: "kitchen-window-f",
    world: () =>
      makeWorld({ here: "EAST-OF-HOUSE", verb: "OPEN", globals: { "KITCHEN-WINDOW-FLAG": false } }),
  },
  {
    name: "window: OPEN while already open",
    routine: "kitchen-window-f",
    world: () =>
      makeWorld({
        here: "EAST-OF-HOUSE",
        verb: "OPEN",
        globals: { "KITCHEN-WINDOW-FLAG": true },
        flags: { "KITCHEN-WINDOW": ["OPENBIT"] },
      }),
  },
  {
    name: "window: CLOSE while open",
    routine: "kitchen-window-f",
    world: () =>
      makeWorld({
        here: "KITCHEN",
        verb: "CLOSE",
        globals: { "KITCHEN-WINDOW-FLAG": true },
        flags: { "KITCHEN-WINDOW": ["OPENBIT"] },
      }),
  },
  {
    name: "window: EXAMINE before ever opening",
    routine: "kitchen-window-f",
    world: () =>
      makeWorld({ here: "EAST-OF-HOUSE", verb: "EXAMINE", globals: { "KITCHEN-WINDOW-FLAG": false } }),
  },
  {
    name: "window: EXAMINE after opening (falls through, unhandled)",
    routine: "kitchen-window-f",
    world: () =>
      makeWorld({ here: "EAST-OF-HOUSE", verb: "EXAMINE", globals: { "KITCHEN-WINDOW-FLAG": true } }),
  },
  {
    name: "window: WALK from the kitchen goes east",
    routine: "kitchen-window-f",
    world: () =>
      makeWorld({ here: "KITCHEN", verb: "WALK", globals: { "KITCHEN-WINDOW-FLAG": true } }),
  },
  {
    name: "window: THROUGH from outside goes west",
    routine: "kitchen-window-f",
    world: () =>
      makeWorld({ here: "EAST-OF-HOUSE", verb: "THROUGH", globals: { "KITCHEN-WINDOW-FLAG": true } }),
  },
  {
    name: "window: LOOK-INSIDE from the kitchen",
    routine: "kitchen-window-f",
    world: () =>
      makeWorld({ here: "KITCHEN", verb: "LOOK-INSIDE", globals: { "KITCHEN-WINDOW-FLAG": true } }),
  },
  {
    name: "window: LOOK-INSIDE from outside",
    routine: "kitchen-window-f",
    world: () =>
      makeWorld({ here: "EAST-OF-HOUSE", verb: "LOOK-INSIDE", globals: { "KITCHEN-WINDOW-FLAG": true } }),
  },
];

function runInterpreted(scenario: Scenario) {
  const world = scenario.world();
  const routine = scenario.routine === "trap-door-exit" ? TRAP_DOOR_EXIT : KITCHEN_WINDOW_F;
  return snapshot(world, runRoutine(routine, world));
}

function runTranspiled(scenario: Scenario) {
  const world = scenario.world();
  const fn = scenario.routine === "trap-door-exit" ? trapDoorExit : kitchenWindowF;
  const returned: BehaviorValue = fn(world);
  return snapshot(world, returned);
}

describe("interpreted AST vs transpiled TypeScript (differential)", () => {
  for (const scenario of scenarios) {
    it(scenario.name, () => {
      expect(runInterpreted(scenario)).toEqual(runTranspiled(scenario));
    });
  }
});

describe("golden outcomes (against ZIL source expectations)", () => {
  const byName = new Map(scenarios.map((s) => [s.name, s]));
  const run = (name: string) => runInterpreted(byName.get(name)!);

  it("refuses travel while the rug hides the trap door", () => {
    const r = run("trap door: rug not moved");
    expect(r.returned).toBe(false);
    expect(r.transcript).toBe("You can't go that way.\n");
  });

  it("refuses travel through the closed trap door and binds 'it'", () => {
    const r = run("trap door: rug moved, door closed");
    expect(r.returned).toBe(false);
    expect(r.transcript).toBe("The trap door is closed.\n");
    expect(r.itObject).toBe("TRAP-DOOR");
  });

  it("travels to the cellar through the open trap door", () => {
    const r = run("trap door: rug moved, door open");
    expect(r.returned).toBe("CELLAR");
    expect(r.transcript).toBe("");
  });

  it("opening the window sets OPENBIT and the examined flag", () => {
    const r = run("window: OPEN while closed");
    expect(r.transcript).toBe(
      "With great effort, you open the window far enough to allow entry.\n",
    );
    expect(r.flags["KITCHEN-WINDOW"]).toContain("OPENBIT");
    expect(r.globals["KITCHEN-WINDOW-FLAG"]).toBe(true);
  });

  it("re-opening yields the dummy refusal", () => {
    expect(run("window: OPEN while already open").transcript).toBe("Look around.\n");
  });

  it("closing clears OPENBIT", () => {
    const r = run("window: CLOSE while open");
    expect(r.transcript).toBe("The window closes (more easily than it opened).\n");
    expect(r.flags["KITCHEN-WINDOW"]).not.toContain("OPENBIT");
  });

  it("examining the never-opened window describes it as ajar", () => {
    expect(run("window: EXAMINE before ever opening").transcript).toBe(
      "The window is slightly ajar, but not enough to allow entry.\n",
    );
  });

  it("examining after opening is left to the default handler", () => {
    const r = run("window: EXAMINE after opening (falls through, unhandled)");
    expect(r.returned).toBe(false);
    expect(r.transcript).toBe("");
  });

  it("walking through the window picks the direction by location", () => {
    expect(run("window: WALK from the kitchen goes east").walks).toEqual(["east"]);
    expect(run("window: THROUGH from outside goes west").walks).toEqual(["west"]);
    expect(run("window: WALK from the kitchen goes east").returned).toBe(true);
  });

  it("looking inside describes the far side", () => {
    expect(run("window: LOOK-INSIDE from the kitchen").transcript).toBe(
      "You can see a clear area leading towards a forest.\n",
    );
    expect(run("window: LOOK-INSIDE from outside").transcript).toBe(
      "You can see what appears to be a kitchen.\n",
    );
  });
});
