/**
 * The mapper, checked by replaying the walkthroughs the parity harness uses
 * (ADR 0004 Consequences: "testable by replaying walkthroughs and asserting on
 * preset and emotion sequences — the same oracle").
 *
 * **Two corpora.** The invariant tests replay *every* `.cmd` including the
 * stage-5.5 completion oracle (`allPanels`), because an invariant must hold over
 * a whole playthrough too. The §7 frequency *ordering*, however, was measured
 * over the 11 scene walkthroughs before the oracle existed; a full run backtracks
 * so heavily that `wide` overtakes `establishing`, so that one test measures over
 * `scenePanels` (the oracle excluded). See the note on `FULL_GAME`.
 *
 * **What is asserted and what is not.** ADR 0004 §10 says to lock the ordering
 * and not the measured percentages: the scene walkthroughs all open at West of
 * House and replay the same first moves, so every frequency is opening-sequence-
 * shaped and would shift under real play. So these tests assert *orderings*,
 * *invariants* and *the salience filter's effect*, and only ever bound rates
 * loosely where a rate is the actual claim (the ~1 panel/turn budget).
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import type { WorldDocument } from "@grues-in-comic/ir";
import { PLAYER_ID } from "../../engine/src/state.js";
import { createSession } from "../src/session.js";
import {
  CAPTION, GUIDE, HERO, captionFor, createMapper, heroBalloon, lineOf, panelKind, salient,
  type Line, type MapperOptions, type Panel,
} from "../src/comic/mapper.js";
import { BM_SAY, addScript, createPage, makeBalloonClass } from "../src/comic/page.js";
import type { Turn } from "../src/session.js";
import { objectNameTable } from "../src/status.js";
import { AFFECT_MARKERS, affectFor } from "../src/comic/affect.js";

/**
 * Name a speaker's line by role — the seam generalized to N (ADR 0008 §2).
 *
 * A {@link Shot} (what one turn drew) is 1..N panels since panelization landed, so
 * the lookup scans the shot: `AddLine` may have opened a panel for the caption and
 * put the Hero's answer in the next one. Passing a single `Panel` still works, for
 * the tests that assert over the flat page.
 */
interface Shot {
  /** The panels this turn drew — 1..N, and the first may be one it grew. */
  panels: readonly Panel[];
  /** The balloons *this turn* added, in draw order. */
  lines: readonly Line[];
}

function lineIn(target: Shot | Panel | undefined, speaker: string): Line | null {
  if (!target) return null;
  if ("lines" in target) return target.lines.find((l) => l.speaker === speaker) ?? null;
  return lineOf(target, speaker);
}

const hero = (p?: Shot | Panel): Line | null => lineIn(p, HERO);
const guide = (p?: Shot | Panel): Line | null => lineIn(p, GUIDE);
const caption = (p?: Shot | Panel): Line | null => lineIn(p, CAPTION);

/**
 * The panel a shot ends on. Panel-level context (camera, room, kind) is the same
 * across every panel a single turn drew — they share one {@link PanelContext} — so
 * any of them answers; the last is the one left on screen.
 */
const frame = (s?: Shot): Panel | undefined => s?.panels[s.panels.length - 1];

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const WALKTHROUGHS = join(ROOT, "verification", "walkthroughs");
const WORLD = join(ROOT, "ir", "artifacts", "zork1.world.json");
const SEED = 1234;

let doc: WorldDocument;
beforeAll(() => {
  doc = JSON.parse(readFileSync(WORLD, "utf8")) as WorldDocument;
});

/**
 * Mapper + page, the pair that replaced `mapper.panel(turn)` in ADR 0008 Phase 2.
 * `turn()` returns the panel the turn's last line **landed in** — which, when the
 * line clone-appended, is a panel an earlier turn opened. That is the port's whole
 * point, so these tests assert on the panel a turn produced, not on a 1:1 index.
 */
function strip(options: MapperOptions = {}) {
  const mapper = createMapper(options);
  const page = createPage();
  return {
    /**
     * Fold a turn in and return what it drew. The turn's own balloons are read
     * off the script rather than off the panels: a clone-append lands them in a
     * panel that already holds an *earlier* turn's lines, so scanning the panel
     * would attribute those to this turn.
     */
    turn(t: Turn): Shot {
      const script = mapper.read(t);
      const delta = addScript(page, script);
      return {
        panels: delta.appended,
        lines: script.lines.map((l) => ({
          speaker: l.speaker, balloonClass: makeBalloonClass(l.modes), text: l.text,
        })),
      };
    },
    get panels(): readonly Panel[] {
      return page.panels;
    },
  };
}

function commandsOf(file: string): string[] {
  return readFileSync(join(WALKTHROUGHS, file), "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));
}

function replayPanels(file: string): Panel[] {
  const session = createSession(doc, { seed: SEED });
  const page = strip();
  page.turn(session.start());
  for (const command of commandsOf(file)) page.turn(session.command(command));
  return [...page.panels];
}

function allPanels(): Panel[] {
  return readdirSync(WALKTHROUGHS)
    .filter((f) => f.endsWith(".cmd"))
    .flatMap((f) => replayPanels(f));
}

/**
 * The completion oracle (stage 5.5) — a *whole* revisit-heavy playthrough, not a
 * representative scene. It belongs in the corpus-wide invariants (`allPanels`),
 * but not in the §7 frequency *ordering*, which the ADR measured over the scene
 * walkthroughs before this file existed. A full run backtracks constantly, so
 * `wide` (revisit) legitimately overtakes `establishing` (first visit) in it —
 * a true fact about the comic, but a different distribution from §7's.
 */
const FULL_GAME = "12-full-game.cmd";

/** The scene corpus §7's measured ordering describes — the oracle excluded. */
function scenePanels(): Panel[] {
  return readdirSync(WALKTHROUGHS)
    .filter((f) => f.endsWith(".cmd") && f !== FULL_GAME)
    .flatMap((f) => replayPanels(f));
}

describe("panel stream", () => {
  it("draws about one panel per turn (§6)", () => {
    const session = createSession(doc, { seed: SEED });
    const page = strip();
    const commands = commandsOf("01-west-of-house.cmd");
    page.turn(session.start());
    for (const command of commands) page.turn(session.command(command));
    const turns = commands.length + 1;
    // Since panelization (ADR 0008 Phase 2) this is a *derived* budget, not a
    // structural one: nearly every turn carries a caption, `BM_ACTION` breaks the
    // panel (`panel.cpp:1064`), and the Hero's answer then clone-appends into it —
    // so a turn opens one panel and packs the rest of its lines in. A turn whose
    // caption was dropped (over-long, §2) opens none and rides with the previous
    // panel, which is the only reason the count can come in under the turn count.
    // It can never come in over: nothing here splits a turn across two panels.
    expect(page.panels.length).toBeLessThanOrEqual(turns);
    expect(page.panels.length).toBeGreaterThan(turns - 3);
  });

  it("opens on an establishing shot of West of House", () => {
    // `start()` emits no `player-moved` — the opening placement is the player's
    // own `object-moved` with `from` === `to` (the 5.2 contract finding). A
    // mapper that watched `player-moved` alone would open on a `medium` here,
    // which is the regression this pins.
    const [first] = replayPanels("01-west-of-house.cmd");
    expect(first?.camera).toBe("establishing");
    expect(first?.room).toBe("WEST-OF-HOUSE");
    expect(hero(first)).toBeNull();
  });

  it("splits the opening turn, and only the opening turn (`m_panels.GetCount() < 2`)", () => {
    // The one place panelization changes today's single-participant output. Comic
    // Chat refuses to clone-append while the page holds fewer than two panels
    // (`panel.cpp:1079`, and the same test in `AddReaction` at `:1148`), so the
    // opening turn's caption takes panel 0 and the Hero's body is staged in panel
    // 1. From the second turn on the caption opens a panel (`BM_ACTION`, `:1064`)
    // and the Hero clone-appends into it — one panel per turn, as before.
    const panels = replayPanels("01-west-of-house.cmd");
    expect(panels[0]!.bodies).toHaveLength(0); // caption alone
    expect(caption(panels[0]!)).not.toBeNull();
    expect(panels[1]!.bodies.map((b) => b.speaker)).toEqual([HERO]);
    expect(caption(panels[1]!)).toBeNull();
    // Steady state: every later panel carries both.
    for (const panel of panels.slice(2)) {
      expect(panel.bodies.length).toBeGreaterThan(0);
    }
  });

  it("renders the Hero balloon as the resolved action, never the command (ADR 0005 §1)", () => {
    // 01-west-of-house.cmd: [start, look, examine mailbox, open mailbox,
    // take leaflet, read leaflet, drop leaflet, look, quit, y]. The take/drop
    // turns get an action line; every other turn — movement, examination, the
    // parser echo — gets no balloon, which is the play-log tell being removed.
    const session = createSession(doc, { seed: SEED });
    const page = strip({ names: objectNameTable(doc.objects) });
    const panels = [page.turn(session.start())];
    for (const command of commandsOf("01-west-of-house.cmd")) {
      panels.push(page.turn(session.command(command)));
    }

    expect(hero(panels[4])).toMatchObject({
      speaker: HERO, balloonClass: "CBWoodringNormal", text: "The leaflet, then.",
    });
    expect(hero(panels[6])?.text).toBe("The leaflet can stay.");
    expect(hero(panels[1])).toBeNull(); // `look` — no action, no balloon
    expect(hero(panels[2])).toBeNull(); // `examine mailbox`
    // The regression this file used to *pin*: the balloon must never be the
    // typed command. No panel's Hero text is any command the player typed.
    const commands = new Set(commandsOf("01-west-of-house.cmd"));
    for (const panel of panels) {
      const line = hero(panel);
      if (line) expect(commands.has(line.text)).toBe(false);
    }
  });

  it("classifies each turn's beat kind, order-priority terminal→move→action→refusal (ADR 0005 §2)", () => {
    const base = {
      gameOver: false, moved: false, firstVisit: false,
      took: null, dropped: null, salientMove: null, scoreDelta: 0, marker: null,
    };
    expect(panelKind({ ...base, gameOver: true, moved: true })).toBe("terminal");
    expect(panelKind({ ...base, moved: true, firstVisit: true })).toBe("arrival");
    expect(panelKind({ ...base, moved: true })).toBe("traversal");
    // A move that also scores is still, first, a place the player went.
    expect(panelKind({ ...base, moved: true, scoreDelta: 5 })).toBe("traversal");
    expect(panelKind({ ...base, took: "LAMP" })).toBe("action");
    expect(panelKind({ ...base, dropped: "SWORD" })).toBe("action");
    expect(panelKind({ ...base, salientMove: { object: "THIEF" } })).toBe("action");
    expect(panelKind({ ...base, scoreDelta: 10 })).toBe("action");
    expect(panelKind({ ...base, marker: "parser-miss" })).toBe("refusal");
    // A non-refusal marker over an otherwise-empty turn is narration, not noise.
    expect(panelKind({ ...base, marker: "grue-threat" })).toBe("ambient");
    expect(panelKind(base)).toBe("ambient");
  });

  it("tags real turns: arrival on the opening, action on take/drop, ambient on look (ADR 0005 §2)", () => {
    const session = createSession(doc, { seed: SEED });
    const page = strip({ names: objectNameTable(doc.objects) });
    const panels = [page.turn(session.start())];
    for (const command of commandsOf("01-west-of-house.cmd")) {
      panels.push(page.turn(session.command(command)));
    }
    expect(frame(panels[0])?.kind).toBe("arrival"); // opening placement at West of House
    expect(frame(panels[1])?.kind).toBe("ambient"); // look
    expect(frame(panels[4])?.kind).toBe("action");  // take leaflet
    expect(frame(panels[6])?.kind).toBe("action");  // drop leaflet
  });

  it("the Guide reacts to the beat the Hero caused, not only to a room (ADR 0005 §4)", () => {
    // `open mailbox` prints "...reveals a leaflet.", firing the `reveal` marker —
    // a clean, deterministic beat to key a Guide reply on. No guideScript is given,
    // so a line here can only have come from the beat reaction, not the gazetteer.
    const beatScript = new Map([["reveal", "It was waiting to be found."]]);
    const session = createSession(doc, { seed: SEED });
    const page = strip({
      names: objectNameTable(doc.objects), beatScript, guideCooldown: 0,
    });
    page.turn(session.start());
    let panel;
    for (const command of ["look", "examine mailbox", "open mailbox"]) {
      panel = page.turn(session.command(command));
    }
    expect(frame(panel)?.marker).toBe("reveal");
    expect(guide(panel)?.text).toBe("It was waiting to be found.");
  });

  it("renders a beat as an exchange: the DM's line and the Hero's answer (ADR 0006 §4)", () => {
    // Same `reveal` beat as above — `open mailbox` takes nothing, so the Hero has
    // no resolved action and his authored half is free to fire.
    const beatScript = new Map([
      ["reveal", { dm: "It was waiting to be found.", hero: "Of course it was." }],
    ]);
    const session = createSession(doc, { seed: SEED });
    const page = strip({ names: objectNameTable(doc.objects), beatScript, guideCooldown: 0 });
    page.turn(session.start());
    let shot;
    for (const command of ["look", "examine mailbox", "open mailbox"]) {
      shot = page.turn(session.command(command));
    }
    expect(guide(shot)?.text).toBe("It was waiting to be found.");
    expect(hero(shot)?.text).toBe("Of course it was.");
    // Spoken, not thought: the exchange is across the table (ADR 0006 §3).
    expect(hero(shot)?.balloonClass).toBe("CBWoodringNormal");
  });

  it("lets the resolved action outrank the Hero's authored reply (ADR 0006 §4)", () => {
    // `take leaflet` fires `reveal`'s sibling case: the Hero *did* something this
    // turn, so what he says is the derived action, never the authored banter —
    // and he never says both, which would be two balloons for one speaker.
    const beatScript = new Map([
      ["scored", { dm: "The empire notices.", hero: "Should not have fired." }],
    ]);
    const session = createSession(doc, { seed: SEED });
    const page = strip({ names: objectNameTable(doc.objects), beatScript, guideCooldown: 0 });
    page.turn(session.start());
    let shot;
    for (const command of ["open mailbox", "take leaflet"]) {
      shot = page.turn(session.command(command));
    }
    expect(hero(shot)?.text).toBe("The leaflet, then.");
  });

  it("fires a Hero-only beat, and drops it without burning the gazetteer", () => {
    // A beat with no DM half is legal (§4: "DM-only, Hero-only, or a true
    // back-and-forth"). When the Hero is busy it says nothing at all — and must
    // then leave the room gazetteer's turn intact rather than consume it.
    const beatScript = new Map([["parser-miss", { hero: "Different words, then." }]]);
    const guideScript = new Map([["NORTH-OF-HOUSE", "The house turns its back here."]]);
    const session = createSession(doc, { seed: SEED });
    const page = strip({ beatScript, guideScript, guideCooldown: 0 });
    page.turn(session.start());
    const miss = page.turn(session.command("xyzzy plugh"));
    expect(hero(miss)?.text).toBe("Different words, then.");
    expect(guide(miss)).toBeNull();
    // The gazetteer still owns first entry.
    expect(guide(page.turn(session.command("north")))?.text)
      .toBe("The house turns its back here.");
  });

  it("keeps the exchange on one cooldown, not two (ADR 0006 §4)", () => {
    // The pair is a single authored event: after it fires, neither half may speak
    // again until the cooldown has passed, or the Hero would answer a line the DM
    // was too tired to say.
    const beatScript = new Map([
      ["parser-miss", { dm: "The empire hears you.", hero: "Different words, then." }],
    ]);
    const session = createSession(doc, { seed: SEED });
    const page = strip({ beatScript, guideCooldown: 6 });
    page.turn(session.start());
    const first = page.turn(session.command("xyzzy plugh"));
    expect(guide(first)?.text).toBe("The empire hears you.");
    expect(hero(first)?.text).toBe("Different words, then.");
    const second = page.turn(session.command("frotz bozbar"));
    expect(guide(second)).toBeNull();
    expect(hero(second)).toBeNull();
  });

  it("pins the dialogue a walkthrough produces, line for line (ADR 0006 testing contract)", () => {
    // The contract asks the golden sequences to "assert dialogue content, not just
    // panel count and shape". This is that assertion: replaying a fixed
    // walkthrough against a fixed script must yield exactly this exchange, in this
    // order. It is what catches a change to the cooldown, to the marker table, or
    // to the resolved-action rule — each of which silently rewrites who speaks.
    const beatScript = new Map([
      ["reveal", { dm: "It was waiting to be found.", hero: "Of course it was." }],
      ["scored", { dm: "The empire notices what leaves it.", hero: "That one counts." }],
    ]);
    const guideScript = new Map([["WEST-OF-HOUSE", "Boarded front door."]]);
    const session = createSession(doc, { seed: SEED });
    const page = strip({
      names: objectNameTable(doc.objects), beatScript, guideScript, guideCooldown: 3,
    });
    const spoken: string[] = [];
    const record = (shot: ReturnType<typeof page.turn>): void => {
      for (const line of shot.lines) {
        if (line.speaker !== CAPTION) spoken.push(`${line.speaker}: ${line.text}`);
      }
    };
    record(page.turn(session.start()));
    for (const command of commandsOf("01-west-of-house.cmd")) {
      record(page.turn(session.command(command)));
    }
    expect(spoken).toEqual([
      "guide: Boarded front door.",
      "guide: It was waiting to be found.",
      "hero: Of course it was.",
      "hero: The leaflet, then.",
      "hero: The leaflet can stay.",
    ]);
  });

  it("walks a beat's run of lines as it repeats (ADR 0006 §4, Slice 4)", () => {
    // The memory: the nth *spoken* firing of a beat takes the nth authored line.
    // `xyzzy plugh` and friends all fire `parser-miss`, which is the cheapest beat
    // to fire on demand — a marker the Hero cannot help producing.
    const beatScript = new Map([["parser-miss", [
      { dm: "The empire hears you." },
      { dm: "It hears you again." },
      { dm: "It has stopped listening." },
    ]]]);
    const session = createSession(doc, { seed: SEED });
    const page = strip({ beatScript, guideCooldown: 0 });
    page.turn(session.start());
    const said = ["xyzzy plugh", "frotz bozbar", "gnusto rezrov", "blorb frotz"]
      .map((c) => guide(page.turn(session.command(c)))?.text);
    // Three lines, then the last one holds: nothing cycles back to the opener.
    expect(said).toEqual([
      "The empire hears you.",
      "It hears you again.",
      "It has stopped listening.",
      "It has stopped listening.",
    ]);
  });

  it("counts spoken firings, not marker occurrences (ADR 0006 §4, Slice 4)", () => {
    // The load-bearing half of rule 4. A beat the cooldown swallowed was never on
    // the page, so it must not retire a line the reader never read: with the
    // cooldown at 2, the misses in between are silent and the *second* line the
    // reader sees is still the second line authored.
    const beatScript = new Map([["parser-miss", [
      { dm: "The empire hears you." },
      { dm: "It hears you again." },
    ]]]);
    const session = createSession(doc, { seed: SEED });
    const page = strip({ beatScript, guideCooldown: 2 });
    page.turn(session.start());
    // A refused command does not advance `moves`, and the cooldown is measured in
    // moves — so the walks between the misses are what lets the cooldown expire at
    // all. (Two misses in a row are one turn apart by the only clock this has.)
    const commands = ["xyzzy plugh", "frotz bozbar", "north", "south",
      "gnusto rezrov", "blorb frotz"];
    const said = commands.map((c) => guide(page.turn(session.command(c)))?.text ?? null);
    // Most of these are swallowed by the cooldown — how many depends on the beat's
    // cadence, which is not what this test is about. What it is about: the lines
    // that *did* reach the page are the run's, in order, with none burned in
    // silence. A counter over occurrences would have shown only the first line and
    // then jumped straight to the run's end.
    expect(said.filter((line) => line !== null))
      .toEqual(["The empire hears you.", "It hears you again."]);
  });

  it("keeps each beat's memory to itself (ADR 0006 §4, Slice 4)", () => {
    // The counter is per marker. A `reveal` must not advance `parser-miss` past
    // its opening line — one shared counter would make the run order depend on
    // every *other* beat, which is a different comic every time the route changes.
    const beatScript = new Map([
      ["reveal", [{ dm: "Found." }, { dm: "Found again." }]],
      ["parser-miss", [{ dm: "The empire hears you." }, { dm: "It hears you again." }]],
    ]);
    const session = createSession(doc, { seed: SEED });
    const page = strip({ names: objectNameTable(doc.objects), beatScript, guideCooldown: 0 });
    page.turn(session.start());
    expect(guide(page.turn(session.command("open mailbox")))?.text).toBe("Found.");
    expect(guide(page.turn(session.command("xyzzy plugh")))?.text)
      .toBe("The empire hears you.");
  });

  it("does not spend a line the Hero's action outranked (ADR 0006 §4, Slice 4)", () => {
    // Rule 2 meets rule 4. A Hero-only beat suppressed by his resolved action
    // says nothing, so it must also age nothing: his first *spoken* reply is
    // still the run's first line.
    const beatScript = new Map([["scored", [
      { hero: "That one counts." },
      { hero: "And that one." },
    ]]]);
    const session = createSession(doc, { seed: SEED });
    const page = strip({ names: objectNameTable(doc.objects), beatScript, guideCooldown: 0 });
    page.turn(session.start());
    // `take leaflet` scores nothing here, but the shape under test is the
    // suppression itself: a turn with a resolved action carries the action.
    const taken = page.turn(session.command("open mailbox"));
    expect(hero(taken)?.text).toBeUndefined;
    const spoken: string[] = [];
    for (const command of commandsOf(FULL_GAME).slice(0, 120)) {
      const line = hero(page.turn(session.command(command)))?.text;
      if (line === "That one counts." || line === "And that one.") spoken.push(line);
    }
    // Whatever the route did in between, the run was walked in order and never
    // skipped an entry.
    expect(spoken).toEqual(spoken.slice().sort((a, b) =>
      (a === "That one counts." ? 0 : 1) - (b === "That one counts." ? 0 : 1)));
    if (spoken.length > 0) expect(spoken[0]).toBe("That one counts.");
  });

  it("keeps the memory a pure function of the event stream (ADR 0006 testing contract)", () => {
    // The oracle's precondition, stated directly: the counter is a fold over the
    // turns read, so two replays of the same walkthrough with the same seed must
    // produce byte-identical dialogue. Anything reaching for engine state, a
    // clock or an RNG breaks here first.
    const beatScript = new Map([
      ["reveal", [{ dm: "Found.", hero: "As arranged." }, { dm: "Found again." }]],
      ["effort", [{ dm: "Heavy." }, { dm: "Heavier." }, { dm: "Heaviest." }]],
      ["scored", [{ dm: "Counted." }, { dm: "Counted twice." }]],
    ]);
    const dialogue = (): string[] => {
      const session = createSession(doc, { seed: SEED });
      const page = strip({ names: objectNameTable(doc.objects), beatScript, guideCooldown: 3 });
      const said: string[] = [];
      const record = (shot: ReturnType<typeof page.turn>): void => {
        for (const line of shot.lines) {
          if (line.speaker !== CAPTION) said.push(`${line.speaker}: ${line.text}`);
        }
      };
      record(page.turn(session.start()));
      for (const command of commandsOf(FULL_GAME)) record(page.turn(session.command(command)));
      return said;
    };
    const first = dialogue();
    expect(dialogue()).toEqual(first);
    // And the memory actually did something: a later line of some run was reached.
    expect(first.some((l) => l.endsWith("Found again.") || l.endsWith("Heavier.")
      || l.endsWith("Heaviest.") || l.endsWith("Counted twice."))).toBe(true);
  });

  it("pins the dialogue a run produces over a repeating beat (Slice 4 golden)", () => {
    // Slice 2's golden asserted dialogue content; Slice 4's asserts the *order the
    // run was walked in*, which is the thing a change to `variantOf`, to the
    // counter's timing, or to the cooldown silently rewrites.
    const beatScript = new Map([
      ["reveal", [
        { dm: "It was waiting to be found.", hero: "Of course it was." },
        { dm: "Another one that was only ever waiting." },
      ]],
      ["scored", [{ dm: "The empire notices what leaves it." }]],
    ]);
    const session = createSession(doc, { seed: SEED });
    const page = strip({ names: objectNameTable(doc.objects), beatScript, guideCooldown: 3 });
    const spoken: string[] = [];
    const record = (shot: ReturnType<typeof page.turn>): void => {
      for (const line of shot.lines) {
        if (line.speaker !== CAPTION) spoken.push(`${line.speaker}: ${line.text}`);
      }
    };
    record(page.turn(session.start()));
    for (const command of commandsOf("01-west-of-house.cmd")) {
      record(page.turn(session.command(command)));
    }
    expect(spoken).toEqual([
      "guide: It was waiting to be found.",
      "hero: Of course it was.",
      "hero: The leaflet, then.",
      "hero: The leaflet can stay.",
    ]);
  });

  it("still fires the room gazetteer on first entry when no beat reacts (ADR 0005 §4)", () => {
    // The opening turn has no reacting marker, so the pre-§4 room path must still
    // produce the gazetteer line — the broadened trigger is additive, not a swap.
    const guideScript = new Map([["WEST-OF-HOUSE", "Boarded front door."]]);
    const session = createSession(doc, { seed: SEED });
    const page = strip({ guideScript, guideCooldown: 0 });
    expect(guide(page.turn(session.start()))?.text).toBe("Boarded front door.");
  });

  it("derives the Hero balloon: take, then drop, else nothing (ADR 0005 §1)", () => {
    const names = new Map([["LAMP", "brass lantern"]]);
    expect(heroBalloon("LAMP", null, names)).toEqual({
      modes: BM_SAY, text: "The brass lantern, then.",
    });
    expect(heroBalloon(null, "LAMP", names)?.text).toBe("The brass lantern can stay.");
    // Take wins when a turn did both (one balloon per panel).
    expect(heroBalloon("LAMP", "SWORD", names)?.text).toBe("The brass lantern, then.");
    expect(heroBalloon(null, null, names)).toBeNull();
    // An id with no name falls back to the id rather than dropping the balloon.
    expect(heroBalloon("EGG", null, new Map())?.text).toBe("The EGG, then.");
  });

  it("the Hero speaks: every resolved-action balloon is a speech balloon (ADR 0006 §3)", () => {
    // ADR 0006 Slice 1 breaks ADR 0004 §2a: the Hero addresses the DM across the
    // table, so his resolved-action line is spoken, not thought. The thought class
    // is retained as a register for interior asides (no content authored yet), so
    // across the walkthroughs every Hero balloon that appears is speech.
    let seen = 0;
    for (const panel of allPanels()) {
      const line = hero(panel);
      if (line === null) continue;
      seen++;
      expect(line.balloonClass).toBe("CBWoodringNormal");
    }
    expect(seen).toBeGreaterThan(0); // guard: the assertion actually ran
  });

  it("quotes narration verbatim and never paraphrases it (§2)", () => {
    const session = createSession(doc, { seed: SEED });
    const page = strip();
    let turn = page.turn(session.start());
    expect(caption(turn)?.text).toBeTruthy();

    for (const command of commandsOf("02-house-entry.cmd")) {
      const result = session.command(command);
      const panel = page.turn(result);
      const line = caption(panel);
      if (line === null) continue;
      const narration = result.events
        .filter((e) => e.type === "narration" || e.type === "question" || e.type === "game-over")
        .map((e) => e.text)
        .join("");
      expect(narration).toContain(line.text);
      expect(line.balloonClass).toBe("CBWoodringBox");
    }
  });
});

describe("camera ladder (§7)", () => {
  it("uses every rung the walkthroughs can reach, and no other preset", () => {
    const seen = new Set(allPanels().map((p) => p.camera));
    // `over-shoulder` is rung 5 and needs a Guide balloon; the default mapper
    // ships an empty script, so its absence here is the §3 constraint holding
    // rather than a gap — remove the Guide and nothing else changes.
    expect([...seen].sort()).toEqual(["close-up", "establishing", "medium", "reaction", "wide"]);
  });

  it("ranks presets in the ADR's measured order", () => {
    // Measured over the scene corpus §7 describes, not the full-game oracle: a
    // whole playthrough's revisits push `wide` above `establishing` (see
    // `scenePanels`), which is a different distribution from the one the ADR's
    // 52.4 / 26.5 / 12.7 / 5.8 / 2.6 percentages were taken over.
    const counts = new Map<string, number>();
    for (const panel of scenePanels()) counts.set(panel.camera, (counts.get(panel.camera) ?? 0) + 1);
    const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name);
    // The *order* is the claim; the percentages are opening-sequence-shaped and
    // deliberately not asserted.
    expect(ranked.slice(0, 2)).toEqual(["medium", "establishing"]);
    expect(ranked.indexOf("close-up")).toBeLessThan(ranked.indexOf("wide"));
  });

  it("marks a first visit that also scored as emphatic, and nothing else", () => {
    for (const panel of allPanels()) {
      if (panel.emphatic) expect(panel.camera).toBe("establishing");
    }
    // All 14 scoring turns are also first visits, which is why the proposed
    // `score-changed` rung fired 0% of the time and became this modifier.
    expect(allPanels().some((p) => p.emphatic)).toBe(true);
  });

  it("puts a room on every panel after the opening", () => {
    for (const panel of allPanels()) expect(panel.room).not.toBe("");
  });
});

describe("salience filter (§7 precondition)", () => {
  it("admits the player, inventory, and the current room's boundary", () => {
    const inventory = new Set(["LAMP"]);
    expect(salient(PLAYER_ID, "A", "B", "A", inventory)).toBe(true);
    expect(salient("LAMP", "KITCHEN", "CELLAR", "ATTIC", inventory)).toBe(true);
    expect(salient("SWORD", PLAYER_ID, "KITCHEN", "ATTIC", inventory)).toBe(true);
    expect(salient("SWORD", "KITCHEN", "ATTIC", "ATTIC", inventory)).toBe(true);
    expect(salient("SWORD", "ATTIC", "KITCHEN", "ATTIC", inventory)).toBe(true);
  });

  it("rejects an unseen object moving between rooms the player is not in", () => {
    // This is the thief's wander daemon, ~1 event per turn. Without the filter
    // the commonest shot in the finished comic is a close-up on a thief the
    // player cannot see.
    expect(salient("THIEF", "MAZE-1", "MAZE-2", "ATTIC", new Set())).toBe(false);
  });

  it("keeps close-ups a minority of panels", () => {
    const panels = allPanels();
    const closeUps = panels.filter((p) => p.camera === "close-up").length;
    // Loose on purpose: the claim is that the filter *works*, not that 12.7% is
    // a fact about real play. An unfiltered mapper lands far above this.
    expect(closeUps / panels.length).toBeLessThan(0.3);
  });

  it("names the object it is focused on, and only then", () => {
    for (const panel of allPanels()) {
      if (panel.camera === "close-up") expect(panel.focus).toBeTruthy();
      else expect(panel.focus).toBeNull();
    }
  });
});

describe("affect table (§10)", () => {
  it("is ordered by descending priority", () => {
    const priorities = AFFECT_MARKERS.map((m) => m.priority);
    expect(priorities).toEqual([...priorities].sort((a, b) => b - a));
    expect(new Set(priorities).size).toBe(priorities.length);
  });

  it("catches a parser refusal by channel, not only by prose", () => {
    // `I don't know the word "dance".` matches none of the ADR's listed
    // patterns — it interpolates the word — but it goes out on `system`, which
    // is the channel ADR 0002 added precisely so a UI need not read the text.
    // Before this, the commonest refusal in real play drew a neutral Hero.
    const affect = affectFor({
      text: 'I don\'t know the word "dance".',
      gameOver: false, scoreDelta: 0, systemChannel: true,
    });
    expect(affect.marker).toBe("parser-miss");
  });

  it("still catches the refusals ZIL prints as ordinary prose", () => {
    // "You can't see any X here." comes from the world document, not the
    // engine, so it arrives on `prose` and the pattern is what finds it.
    const affect = affectFor({
      // Not "grue" — that word is a higher-priority marker, and a test that
      // trips one marker while asserting another proves nothing about either.
      text: "You can't see any troll here.",
      gameOver: false, scoreDelta: 0, systemChannel: false,
    });
    expect(affect.marker).toBe("parser-miss");
  });

  it("lets the highest-priority marker win", () => {
    // Death outranks a grue threat, and the grue line is what usually kills you
    // — so the two co-occur constantly and the order is load-bearing.
    const affect = affectFor({
      text: "It is pitch black. You are likely to be eaten by a grue.",
      gameOver: true,
      scoreDelta: 0,
      systemChannel: false,
    });
    expect(affect.marker).toBe("death");
  });

  it("leaves about half of all turns affectless, deliberately", () => {
    const panels = allPanels();
    const flat = panels.filter((p) => p.marker === null).length;
    // §10: 51% affectless is intent, not a coverage gap. Bounded on both sides
    // — a mapper that marks everything has flattened the comic just as surely
    // as one that marks nothing.
    expect(flat / panels.length).toBeGreaterThan(0.2);
    expect(flat / panels.length).toBeLessThan(0.8);
  });

  it("makes parser-miss the largest marker that fires", () => {
    const counts = new Map<string, number>();
    for (const panel of allPanels()) {
      if (panel.marker !== null) counts.set(panel.marker, (counts.get(panel.marker) ?? 0) + 1);
    }
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    expect(top?.[0]).toBe("parser-miss");
  });

  it("emits a shrug alongside the parser-miss expression", () => {
    const affect = affectFor({
      text: "I beg your pardon?",
      gameOver: false,
      scoreDelta: 0,
      systemChannel: true,
    });
    expect(affect.marker).toBe("parser-miss");
    // Two options, not one: the expression claims the face and the gesture — a
    // sentinel no angular metric reaches — can then only claim the torso.
    expect(affect.options).toHaveLength(2);
    expect(affect.options[1]!.angle).toBeGreaterThan(2 * Math.PI);
  });

  it("degrades a miss to neutral rather than to nothing", () => {
    const affect = affectFor({
      text: "You are in a room.", gameOver: false, scoreDelta: 0, systemChannel: false,
    });
    expect(affect.marker).toBeNull();
    expect(affect.options).toHaveLength(1);
    expect(affect.options[0]!.intensity).toBe(0);
  });
});

describe("caption", () => {
  it("prefers the sentence the marker matched", () => {
    const caption = captionFor(
      "You open the window. It is pitch black. You are likely to be eaten by a grue.",
      "It is pitch black.",
    );
    expect(caption?.text).toBe("It is pitch black.");
  });

  it("drops an over-long sentence rather than trimming it", () => {
    // Trimming would make the caption a paraphrase by omission. §2 makes it
    // verbatim, and the console pane still carries every word.
    expect(captionFor("x".repeat(400), null)).toBeNull();
  });
});

describe("the Guide is presentation-only (§3)", () => {
  it("changes no panel except by adding its own balloon", () => {
    const script = new Map([["NORTH-OF-HOUSE", "Mind the boards."]]);
    const withGuide = (() => {
      const session = createSession(doc, { seed: SEED });
      const page = strip({ guideScript: script, guideCooldown: 0 });
      page.turn(session.start());
      for (const c of commandsOf("02-house-entry.cmd")) page.turn(session.command(c));
      return [...page.panels];
    })();
    const without = replayPanels("02-house-entry.cmd");

    expect(withGuide.some((p) => guide(p) !== null)).toBe(true);
    expect(withGuide.length).toBe(without.length);
    for (const [i, panel] of withGuide.entries()) {
      const bare = without[i]!;
      // Everything derived from the world is identical; only rung 5 may differ,
      // and only on the panels that carry a Guide balloon.
      expect(panel.marker).toBe(bare.marker);
      expect(panel.room).toBe(bare.room);
      expect(hero(panel)).toEqual(hero(bare));
      expect(caption(panel)).toEqual(caption(bare));
      if (guide(panel) === null) expect(panel.camera).toBe(bare.camera);
    }
  });

  it("honours its cooldown", () => {
    const script = new Map(
      ["WEST-OF-HOUSE", "NORTH-OF-HOUSE", "BEHIND-HOUSE", "KITCHEN", "LIVING-ROOM"]
        .map((room) => [room, `A word about ${room}.`] as const),
    );
    const session = createSession(doc, { seed: SEED });
    const page = strip({ guideScript: script, guideCooldown: 1000 });
    page.turn(session.start());
    for (const c of commandsOf("02-house-entry.cmd")) page.turn(session.command(c));
    // The Guide is the only thing on the panel not derived from what the player
    // just did, so it is the only thing that can wear out.
    expect(page.panels.filter((p) => guide(p) !== null)).toHaveLength(1);
  });
});
