/**
 * Stage 4.3 exit criteria — "LOOK/TAKE/DROP/inventory flows produce correct
 * events".
 *
 * These drive the *whole* engine through its public surface (`createEngine`,
 * `command`), because that is the surface stage 4.4 and the UI will use. Where
 * a test reaches into state it is to arrange a situation, never to assert one
 * the events should already have reported.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import type { WorldDocument } from "@grues-in-comic/ir";
import { createEngine, type Engine } from "../src/engine.js";
import { transcriptText, type EngineEvent } from "../src/events.js";

const doc = JSON.parse(
  readFileSync(new URL("../../ir/artifacts/zork1.world.json", import.meta.url), "utf8"),
) as WorldDocument;

let engine: Engine;

beforeEach(() => {
  engine = createEngine(doc, { seed: 1 });
});

const text = (events: EngineEvent[]): string => transcriptText(events);
const say = (input: string): EngineEvent[] => engine.command(input).events;

describe("opening", () => {
  it("describes the start room", () => {
    const events = engine.start().events;
    // The room name arrives as ordinary prose, not on the `room-title` channel:
    // Zork's own DESCRIBE-ROOM prints it with <TELL D ,HERE>, and the engine
    // delegates to the game's routine rather than second-guessing it. Splitting
    // the title back out would mean parsing prose, which the contract forbids.
    // A UI wanting the title reads `player-moved`.to and looks up the room name.
    // Recorded as an open issue for 4.4/5.2.
    expect(text(events)).toMatch(/West of House/);
    expect(text(events)).toMatch(/open field west of a white house/);
    expect(text(events)).toMatch(/mailbox/i);
  });
});

describe("travel", () => {
  it("emits player-moved and describes the destination", () => {
    engine.start();
    const events = say("north");
    const moved = events.find((e) => e.type === "player-moved");
    expect(moved).toEqual({ type: "player-moved", from: "WEST-OF-HOUSE", to: "NORTH-OF-HOUSE" });
    expect(text(events)).toMatch(/North of House/);
  });

  it("prints the authored refusal for a blocked exit", () => {
    engine.start();
    expect(text(say("east"))).toMatch(/boarded/);
    // A refused move must not emit player-moved.
    expect(say("east").some((e) => e.type === "player-moved")).toBe(false);
  });

  it("refuses a direction the room does not offer", () => {
    engine.start();
    expect(text(say("up"))).toMatch(/can't go that way/i);
  });

  it("orders prose after the move it follows", () => {
    engine.start();
    const events = say("north");
    const movedAt = events.findIndex((e) => e.type === "player-moved");
    const proseAt = events.findIndex((e) => e.type === "narration");
    expect(movedAt).toBeGreaterThanOrEqual(0);
    // The new room's description must follow the move, or a UI replaying the
    // stream renders the destination before the player has arrived in it.
    expect(proseAt).toBeGreaterThan(movedAt);
  });
});

describe("objects", () => {
  it("opens a container and reveals its contents", () => {
    engine.start();
    const opened = text(say("open mailbox"));
    expect(opened).toMatch(/leaflet/i);
  });

  it("takes and drops, emitting object-moved both ways", () => {
    engine.start();
    say("open mailbox");

    const taken = say("take leaflet");
    const takeEvent = taken.find((e) => e.type === "object-moved");
    expect(takeEvent).toBeDefined();
    expect(takeEvent && "object" in takeEvent && takeEvent.object).toBe("ADVERTISEMENT");
    expect(text(taken)).toMatch(/taken/i);

    const dropped = say("drop leaflet");
    expect(dropped.some((e) => e.type === "object-moved")).toBe(true);
    expect(text(dropped)).toMatch(/dropped/i);
  });

  it("reports an empty inventory, then a full one", () => {
    engine.start();
    expect(text(say("inventory"))).toMatch(/empty-handed|nothing/i);
    say("open mailbox");
    say("take leaflet");
    expect(text(say("inventory"))).toMatch(/leaflet/i);
  });

  it("reads an object's text", () => {
    engine.start();
    say("open mailbox");
    say("take leaflet");
    expect(text(say("read leaflet"))).toMatch(/WELCOME TO ZORK|ZORK/i);
  });

  it("looks again on demand", () => {
    engine.start();
    expect(text(say("look"))).toMatch(/West of House/);
  });
});

describe("parser failures reach the player", () => {
  it("distinguishes the refusals", () => {
    engine.start();
    expect(text(say("xyzzyfoo"))).toMatch(/don't know the word/i);
    expect(text(say("take unicorn"))).toMatch(/don't know the word|can't see any such thing/i);
    // ZIL's NOT-HERE-PRINT echoes the player's own noun rather than answering
    // generically — "You can't see any sword here!"
    expect(text(say("take sword"))).toMatch(/can't see any sword here/i);
  });

  it("does not advance the clock on a parse failure", () => {
    engine.start();
    const before = engine.snapshot().globals["MOVES"];
    engine.command("xyzzyfoo");
    expect(engine.snapshot().globals["MOVES"]).toBe(before);
  });

  it("advances the clock on a real turn", () => {
    engine.start();
    const before = Number(engine.snapshot().globals["MOVES"] ?? 0);
    engine.command("look");
    expect(Number(engine.snapshot().globals["MOVES"])).toBe(before + 1);
  });
});

describe("determinism (ADR 0002's contract term)", () => {
  const script = ["open mailbox", "take leaflet", "read leaflet", "north", "east", "look"];

  it("same seed and commands ⇒ identical events", () => {
    const runOnce = (seed: number): EngineEvent[] => {
      const e = createEngine(doc, { seed });
      const events = [...e.start().events];
      for (const command of script) events.push(...e.command(command).events);
      return events;
    };
    expect(runOnce(7)).toEqual(runOnce(7));
  });

  it("state round-trips through a JSON save", () => {
    engine.start();
    for (const command of script) engine.command(command);

    const save = JSON.parse(JSON.stringify(engine.snapshot()));
    const after = engine.command("look");

    const restored = createEngine(doc, { seed: 1 });
    restored.restore(save);
    expect(restored.command("look").events).toEqual(after.events);
  });

  it("refuses a save from an incompatible contract", () => {
    const save = engine.snapshot();
    expect(() => engine.restore({ ...save, contractVersion: "99.0.0" })).toThrow(/contract/);
  });
});

describe("ZIL semantics that failed silently", () => {
  /*
   * Each of these encodes a bug that produced a *plausible* wrong answer rather
   * than a crash — the class of defect a transcript diff catches late and
   * expensively, so each gets a named test at the point it was fixed.
   */

  it("resolves verb? against PRSA, not the typed verb word", () => {
    // "ENTER WINDOW" parses with the verb ENTER but the action V-THROUGH, and
    // the window's routine tests THROUGH. Comparing the word left the window
    // unenterable while every ordinary verb still worked.
    engine = createEngine(doc, { seed: 1, start: "EAST-OF-HOUSE" });
    engine.start();
    say("open window");
    const events = say("enter window");
    expect(events.some((e) => e.type === "player-moved")).toBe(true);
    expect(text(events)).toMatch(/Kitchen/);
  });

  it("passes the numeric M-LOOK context to a room action routine", () => {
    // The contexts are numbers (gmain.zil M-LOOK = 3). Passing the string
    // "M-LOOK" matched nothing, and rooms whose description is computed lost it
    // while rooms with a static description read correctly.
    engine.start();
    expect(text(say("look"))).toMatch(/open field west of a white house/);
  });

  it("supplies ZIL property defaults for objects that declare none", () => {
    // The player declares no SIZE; PROPDEF gives it 5. Returning false instead
    // made V-TAKE's weight arithmetic throw, so *every* take failed.
    engine.start();
    say("open mailbox");
    expect(text(say("take leaflet"))).toMatch(/taken/i);
  });

  it("treats PERFORM's first argument as a verb name", () => {
    // DO-WALK calls <PERFORM ,V?WALK .DIR>; extraction reduces that to "WALK",
    // so the action is V-WALK. Using the name verbatim dispatched to nothing.
    // From the Kitchen, west is an ordinary exit to the Living Room. The move
    // only happens if PERFORM resolved "WALK" to the V-WALK action.
    engine = createEngine(doc, { seed: 1, start: "KITCHEN" });
    engine.start();
    const events = say("west");
    expect(events.some((e) => e.type === "player-moved")).toBe(true);
    expect(text(events)).toMatch(/Living Room/);
  });
});

describe("the sword's glow (the ADR 0003 exit scan)", () => {
  /*
   * I-SWORD is the only routine that reads a room's *neighbours*, so it is the
   * only behavioral check on the derived adjacency list and the rewrite that
   * walks it. Walkthrough 10 cannot do this job: the glow reports whether a
   * villain is in or next to the room, so its turns there depend on whether
   * the randomized fight left the troll alive, and both of them are
   * quarantined for exactly that reason.
   *
   * This route has no fight in it. The player picks up the sword and descends
   * to the Cellar with the troll untouched next door, which pins all three
   * levels and, more importantly, the transitions between them — the ZIL only
   * prints when the level *changes*, so a scan that returned a constant would
   * still print once and could pass a weaker check.
   */
  const DESCEND = [
    "north", "east", "open window", "enter house", "west",
    "take lamp", "take sword", "move rug", "open trap door", "turn on lamp",
  ];

  const glow = (input: string): string =>
    text(say(input)).split("\n").find((line) => /glow/i.test(line)) ?? "";

  it("reports a villain next door, in the room, and gone", () => {
    engine.start();
    for (const command of DESCEND) say(command);

    // Cellar: the troll is in the adjacent Troll Room, not this one.
    expect(glow("down")).toMatch(/faint blue glow/);
    // The Troll Room itself — INFESTED? answers about HERE, before any scan.
    expect(glow("north")).toMatch(/begun to glow very brightly/);
    // Back to merely adjacent: the level drops, so the faint message reprints.
    expect(glow("south")).toMatch(/faint blue glow/);
    // East of Chasm neighbours the Cellar but not the Troll Room.
    expect(glow("south")).toMatch(/no longer glowing/);
  });

  it("says nothing on a turn that does not change the level", () => {
    // The guard against a scan that reports every turn: two turns in a row at
    // the same glow level must produce one message, not two.
    engine.start();
    for (const command of DESCEND) say(command);
    expect(glow("down")).toMatch(/faint blue glow/);
    expect(glow("look")).toBe("");
  });
});

describe("multiple objects (ZIL's MANY option)", () => {
  it("takes everything loose in the room, naming each result", () => {
    engine = createEngine(doc, { seed: 1, start: "KITCHEN" });
    engine.start();
    const out = text(say("take all"));
    // ZIL prefixes each result with the object's name so several answers stay
    // attributable — and the space after the colon is part of that.
    expect(out).toMatch(/brown sack: Taken\./);
  });

  it("does not reach inside containers", () => {
    // The sack holds garlic and a lunch; "take all" takes the sack, and they
    // come along inside it rather than being taken individually.
    engine = createEngine(doc, { seed: 1, start: "KITCHEN" });
    engine.start();
    const out = text(say("take all"));
    expect(out).not.toMatch(/garlic:/);
    expect(out).not.toMatch(/lunch:/);
  });

  it("understands ALL even though it is a buzzword", () => {
    // ALL sits in the BUZZ list; it has to be recognised before buzzword
    // filtering, or "take all" reduces to a bare "take" and is rejected.
    engine = createEngine(doc, { seed: 1, start: "KITCHEN" });
    engine.start();
    expect(text(say("take all"))).not.toMatch(/isn't one I recognize/i);
  });
});

describe("robustness across the map", () => {
  it("walks a long route without an interpreter crash", () => {
    engine.start();
    const route = [
      "north", "east", "open window", "enter window", "west", "look",
      "east", "east", "north", "north", "look", "south", "south",
    ];
    for (const command of route) {
      expect(() => engine.command(command)).not.toThrow();
    }
  });

  it("survives every verb applied to a visible object", () => {
    // A crude fuzz over the real vocabulary: no command may throw, whatever it
    // does. Behavior is data, and an unhandled AST shape must surface as a
    // refusal, never as an exception escaping into the host.
    engine.start();
    const verbs = [...new Set(doc.vocabulary!.syntax.map((s) => s.verb))];
    const failures: string[] = [];
    for (const verb of verbs) {
      for (const input of [verb, `${verb} mailbox`]) {
        try {
          engine.command(input);
        } catch (error) {
          failures.push(`${input}: ${(error as Error).message}`);
        }
      }
    }
    expect(failures).toEqual([]);
  });
});
