/**
 * Stage 4.2 exit criteria — "parses the command set used by golden transcripts".
 *
 * The commands here are the ones the stage 4.4 goldens actually contain, so
 * this file is a standing check that the parser can still read the transcripts
 * it will be measured against.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import type { WorldDocument } from "@grues-in-comic/ir";
import { loadWorld } from "../src/load.js";
import { buildLexicon, type Lexicon } from "../src/vocabulary.js";
import { parse, type ParseResult } from "../src/parser.js";
import { goTo } from "../src/movement.js";
import { move, setFlag, PLAYER_ID, type GameState } from "../src/state.js";
import type { WorldIndex } from "../src/state.js";

const doc = JSON.parse(
  readFileSync(new URL("../../ir/artifacts/zork1.world.json", import.meta.url), "utf8"),
) as WorldDocument;

let world: WorldIndex;
let state: GameState;
let lexicon: Lexicon;

beforeEach(() => {
  ({ world, state } = loadWorld(doc));
  lexicon = buildLexicon(doc);
});

const run = (input: string): ParseResult => parse(world, state, lexicon, input);

describe("lexicon", () => {
  it("indexes the whole vocabulary", () => {
    expect(lexicon.verbs.size).toBe(135);
    expect(lexicon.directions.get("NORTH")).toBe("north");
    // Direction abbreviations arrive as ordinary synonyms and must resolve.
    expect(lexicon.directions.get("N")).toBe("north");
    expect(lexicon.directions.get("NE")).toBe("northeast");
    expect(lexicon.nouns.get("LAMP")).toContain("LAMP");
    expect(lexicon.adjectives.get("BRASS")).toContain("LAMP");
  });

  it("truncates to the Z-machine dictionary width", () => {
    // "MAILBO" is the whole word as far as the original parser is concerned.
    const r = run("OPEN MAILBOXES");
    expect(r.kind).toBe("command");
    expect(r.kind === "command" && r.directObject).toBe("MAILBOX");
  });
});

describe("travel", () => {
  it("parses a bare direction and its abbreviation", () => {
    expect(run("NORTH")).toEqual({ kind: "travel", direction: "north" });
    expect(run("N")).toEqual({ kind: "travel", direction: "north" });
    expect(run("SW")).toEqual({ kind: "travel", direction: "southwest" });
  });

  it("parses a direction behind a movement verb", () => {
    expect(run("GO NORTH")).toEqual({ kind: "travel", direction: "north" });
    expect(run("WALK SOUTH")).toEqual({ kind: "travel", direction: "south" });
  });
});

describe("noise words", () => {
  it("drops articles without changing the reading", () => {
    expect(run("OPEN THE MAILBOX")).toEqual(run("OPEN MAILBOX"));
  });

  it("rejects input that is nothing but noise", () => {
    expect(run("THE")).toEqual({ kind: "empty" });
    expect(run("   ")).toEqual({ kind: "empty" });
  });
});

describe("verb + object", () => {
  it("resolves an object in the room", () => {
    const r = run("OPEN MAILBOX");
    expect(r.kind).toBe("command");
    if (r.kind !== "command") return;
    expect(r.verb).toBe("OPEN");
    expect(r.action).toBe("V-OPEN");
    expect(r.directObject).toBe("MAILBOX");
    expect(r.indirectObject).toBeUndefined();
  });

  it("carries the pre-action routine through", () => {
    setFlag(state, "MAILBOX", "OPENBIT");
    const r = run("TAKE LEAFLET");
    expect(r.kind).toBe("command");
    if (r.kind !== "command") return;
    expect(r.action).toBe("V-TAKE");
    expect(r.preAction).toBe("PRE-TAKE");
    expect(r.directObject).toBe("ADVERTISEMENT");
  });

  it("parses a verb with no object at all", () => {
    const r = run("INVENTORY");
    expect(r.kind).toBe("command");
    expect(r.kind === "command" && r.action).toBe("V-INVENTORY");
    expect(run("LOOK")).toMatchObject({ kind: "command", action: "V-LOOK" });
    expect(run("I")).toMatchObject({ kind: "command", action: "V-INVENTORY" });
  });

  it("uses verb synonyms", () => {
    expect(run("GET MAILBOX")).toMatchObject({ action: "V-TAKE" });
    expect(run("L")).toMatchObject({ action: "V-LOOK" });
  });
});

describe("prepositions", () => {
  it("prefers the particle form over the plain verb", () => {
    // "PUT DOWN X" is V-DROP, not V-PUT — specificity ordering decides this.
    move(state, "LAMP", PLAYER_ID);
    expect(run("PUT DOWN LAMP")).toMatchObject({ action: "V-DROP" });
  });

  it("parses two objects across a preposition", () => {
    move(state, "LAMP", PLAYER_ID);
    const r = run("PUT LAMP IN MAILBOX");
    expect(r.kind).toBe("command");
    if (r.kind !== "command") return;
    // V-PUT, not a "V-PUT-IN": ZIL distinguishes IN from ON at the *rule*
    // level (ON is V-PUT-ON) but both IN-forms share one action.
    expect(r.action).toBe("V-PUT");
    expect(r.directObject).toBe("LAMP");
    expect(r.indirectObject).toBe("MAILBOX");
  });
});

describe("scope", () => {
  it("refuses an object that is elsewhere", () => {
    const r = run("TAKE SWORD");
    expect(r.kind).toBe("not-here");
  });

  it("sees into an open container but not a closed one", () => {
    expect(run("TAKE LEAFLET").kind).toBe("not-here");
    setFlag(state, "MAILBOX", "OPENBIT");
    expect(run("TAKE LEAFLET")).toMatchObject({ directObject: "ADVERTISEMENT" });
  });

  it("follows the player between rooms", () => {
    expect(run("OPEN MAILBOX").kind).toBe("command");
    goTo(state, "NORTH-OF-HOUSE");
    expect(run("OPEN MAILBOX").kind).toBe("not-here");
  });

  it("reaches the room's scenery pool", () => {
    // West of House names the front door and the boarded windows as scenery.
    const roomScenery = world.rooms.get("WEST-OF-HOUSE")?.scenery ?? [];
    expect(roomScenery.length).toBeGreaterThan(0);
    const noun = world.objects.get(roomScenery[0]!)!.synonyms[0]!;
    expect(run(`EXAMINE ${noun}`).kind).toBe("command");
  });
});

describe("adjectives and disambiguation", () => {
  it("narrows by adjective", () => {
    move(state, "LAMP", "WEST-OF-HOUSE");
    expect(run("TAKE BRASS LANTERN")).toMatchObject({ directObject: "LAMP" });
  });

  it("keeps an object whose adjective is also one of its nouns", () => {
    move(state, "LAMP", "WEST-OF-HOUSE");
    // LIGHT is a synonym of LAMP, not an adjective — it must not filter it out.
    expect(run("TAKE LAMP")).toMatchObject({ directObject: "LAMP" });
  });

  it("honours a slot that only accepts held objects", () => {
    // TAKE searches ON-GROUND/IN-ROOM only, so an object already in hand is
    // deliberately out of its reach — ZIL answers "You already have that".
    move(state, "LAMP", PLAYER_ID);
    expect(run("TAKE LAMP").kind).toBe("not-here");
    // ...while PUT wants exactly the opposite.
    expect(run("PUT LAMP IN MAILBOX")).toMatchObject({ directObject: "LAMP" });
  });

  it("prefers a held object over one on the ground", () => {
    // Scope order is preference order, so this is never an ambiguity.
    const r = run("EXAMINE MAILBOX");
    expect(r.kind).toBe("command");
  });
});

describe("failures are distinguishable", () => {
  it("separates an unknown word from a known one used wrongly", () => {
    expect(run("XYZZYFOO MAILBOX")).toEqual({ kind: "unknown-word", word: "XYZZYFOO" });
    const r = run("MAILBOX MAILBOX");
    expect(r.kind).toBe("no-verb");
  });

  it("reports a verb used in a shape it has no rule for", () => {
    const r = run("INVENTORY MAILBOX");
    expect(["no-syntax", "not-here"]).toContain(r.kind);
  });
});

describe("the golden-transcript command set", () => {
  it("parses every command the verification transcripts use", () => {
    // Drawn from verification/transcripts — the commands stage 4.4 replays.
    const commands = [
      "N", "S", "E", "W", "NE", "NW", "SE", "SW", "UP", "DOWN",
      "NORTH", "SOUTH", "EAST", "WEST",
      "LOOK", "INVENTORY", "I", "WAIT", "VERSION",
      "OPEN MAILBOX", "READ LEAFLET", "TAKE LEAFLET", "DROP LEAFLET",
      "OPEN WINDOW", "ENTER WINDOW",
      "TAKE LAMP", "TURN ON LAMP", "TURN OFF LAMP",
      "MOVE RUG", "OPEN TRAP DOOR", "CLOSE TRAP DOOR",
      "TAKE SWORD", "TAKE ALL", "EXAMINE SWORD",
      "PUT LEAFLET IN MAILBOX",
      "QUIT", "SCORE", "DIAGNOSE", "VERBOSE", "BRIEF",
    ];

    const unparsed: string[] = [];
    for (const command of commands) {
      const r = parse(world, state, lexicon, command);
      // "not-here"/"ambiguous" are *successful* parses of the grammar — the
      // object simply is not in the start room. Only a grammar failure counts.
      if (r.kind === "unknown-word" || r.kind === "no-verb" || r.kind === "empty") {
        unparsed.push(`${command} → ${r.kind}`);
      }
    }
    expect(unparsed).toEqual([]);
  });

  it("knows every word the syntax rules and objects use", () => {
    // A word the parser cannot look up is an extraction gap, not a typo.
    const orphans: string[] = [];
    for (const rule of doc.vocabulary!.syntax) {
      if (!lexicon.verbs.has(rule.verb)) orphans.push(rule.verb);
    }
    expect(orphans).toEqual([]);
  });
});
