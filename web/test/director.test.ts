/**
 * The Narrative Director (ADR 0005), Slice 4 — traversal collapse (over Slice 3's
 * noise drop).
 *
 * ADR 0004 §6 (one panel per turn) is superseded: the *emitted* stream is the
 * mapper's full fold with (a) `refusal` turns dropped and (b) each maximal run of
 * consecutive `traversal` panels collapsed to its last panel (the run's
 * destination). The invariant replacing the 1:1 count is therefore **emitted ===
 * `edited(full fold)`**, where `edited` is the reference reducer below — asserted
 * over every walkthrough. Focused tests pin the buffering (a back-and-forth walk
 * collapses to one panel at the destination; a trailing run waits for `flush`), and
 * the Slice 3 refusal checks are kept.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import type { WorldDocument } from "@grues-in-comic/ir";
import { createSession } from "../src/session.js";
import { createMapper, type Panel, type TurnScript } from "../src/comic/mapper.js";
import { createDirector, speaks } from "../src/comic/director.js";
import { addScript, createPage } from "../src/comic/page.js";
import { objectNameTable } from "../src/status.js";
import type { CommandScript } from "../src/comic/script.js";

/** An empty {@link CommandScript} — see the note in `mapper.test.ts`. */
const SILENT_COMMANDS: CommandScript = {
  directionWords: new Map(), directions: [], verbs: new Map(), templates: new Map(),
};

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const WALKTHROUGHS = join(ROOT, "verification", "walkthroughs");
const WORLD = join(ROOT, "ir", "artifacts", "zork1.world.json");
const SEED = 1234;

let doc: WorldDocument;
beforeAll(() => {
  doc = JSON.parse(readFileSync(WORLD, "utf8")) as WorldDocument;
});

function commandsOf(file: string): string[] {
  return readFileSync(join(WALKTHROUGHS, file), "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));
}

function cmdFiles(): string[] {
  return readdirSync(WALKTHROUGHS).filter((f) => f.endsWith(".cmd"));
}

/** Options shared by both pipelines, so the only variable is the wrapper. */
function options() {
  return { names: objectNameTable(doc.objects) };
}

/**
 * The Slice 4 edit, as a pure reducer: drop a silent refusal, collapse each
 * maximal run of consecutive traversals to its last one. This is the golden the
 * Director must reproduce; keeping it here makes the editing contract executable.
 *
 * **A refusal that speaks is kept, not dropped** (ADR 0009 §5, and — since
 * ADR 0010 §1 gives nearly every command a declaration, including one the parser
 * then refuses — the common case rather than the rare one this reducer used to
 * assume). `speaks` is `director.ts`'s own predicate, imported rather than
 * duplicated so this reference cannot drift from what it is meant to describe.
 *
 * Since ADR 0008 Phase 2 the edit is applied to the *turn scripts*, not to panels —
 * panelization runs after it (see the module note in `director.ts`) — so the golden
 * edits scripts and then panelizes what survives, through the same `page.ts` port.
 */
function edited(full: readonly TurnScript[]): Panel[] {
  const kept: TurnScript[] = [];
  let pending: TurnScript | null = null;
  for (const script of full) {
    if (script.context.kind === "refusal" && !speaks(script)) continue;
    if (script.context.kind === "traversal") {
      pending = script; // keep only the latest — the run's destination so far
      continue;
    }
    if (pending) {
      kept.push(pending);
      pending = null;
    }
    kept.push(script);
  }
  if (pending) kept.push(pending); // trailing run (= director.flush())

  const page = createPage();
  for (const script of kept) addScript(page, script);
  return [...page.panels];
}

/**
 * `edited`'s drop rule with no collapsing — every surviving traversal step
 * panelized on its own, not just the run's last. The gap between this and
 * `edited` is what proves the collapse fires; comparing panel counts straight
 * against the kept-turn count stopped working once a turn could reliably cost
 * more than one panel (ADR 0010 §1's declaration routinely opens a second Hero
 * panel behind the DM's, M6.1h).
 */
function uncollapsed(full: readonly TurnScript[]): Panel[] {
  const kept = full.filter((script) => script.context.kind !== "refusal" || speaks(script));
  const page = createPage();
  for (const script of kept) addScript(page, script);
  return [...page.panels];
}

describe("director (Slice 4 — traversal collapse)", () => {
  it("emits edited(full fold) — refusals dropped, traversal runs collapsed — every walkthrough", () => {
    let uncollapsedTotal = 0;
    let emittedTotal = 0;
    for (const file of cmdFiles()) {
      const commands = commandsOf(file);

      // Reference: the mapper's full fold, one script per turn.
      const bare = createSession(doc, { seed: SEED });
      const mapper = createMapper(options());
      const full = [mapper.read(bare.start())];
      for (const command of commands) full.push(mapper.read(bare.command(command)));

      const wrapped = createSession(doc, { seed: SEED });
      const director = createDirector(options());
      director.ingest(wrapped.start());
      for (const command of commands) director.ingest(wrapped.command(command));
      director.flush(); // any trailing traversal run
      const emitted = [...director.panels];

      expect(emitted).toEqual(edited(full));
      // A silent refusal is still dropped; one that speaks — ADR 0010 §1 gives a
      // declaration to the command the parser then refuses — is kept as a beat
      // like any other, so the assertion is "no silent refusal survives", not
      // "no refusal panel exists" (superseded from the latter, M6.1h).
      expect(emitted.every((panel) => panel.kind !== "refusal" || panel.speakers.length > 0))
        .toBe(true);

      uncollapsedTotal += uncollapsed(full).length;
      emittedTotal += emitted.length;
    }
    // Collapse actually fired: panelizing every surviving turn with no
    // buffering costs strictly more panels than letting a traversal run
    // collapse to its last step.
    expect(emittedTotal).toBeLessThan(uncollapsedTotal);
  });

  it("collapses a back-and-forth walk to one panel at the destination (ADR 0005 §3)", () => {
    const session = createSession(doc, { seed: SEED });
    // A traversal turn now speaks too (ADR 0010 §1's declaration), so the
    // buffered panel this run collapses to is no longer wordless, and `look`'s
    // own declaration can no longer clone-append into it (two Hero balloons
    // never share a panel). That interaction is 6.1j's ("the collapse gives
    // ground") to resolve; this test isolates the collapse mechanism itself.
    const director = createDirector({ ...options(), commandScript: SILENT_COMMANDS });
    director.ingest(session.start()); // arrival, WEST-OF-HOUSE
    expect(director.ingest(session.command("north")).appended[0]?.kind).toBe("arrival"); // NORTH-OF-HOUSE
    expect(director.ingest(session.command("west")).appended).toEqual([]); // traversal → WEST-OF-HOUSE, buffered
    expect(director.ingest(session.command("north")).appended).toEqual([]); // traversal → NORTH-OF-HOUSE, buffered
    const flushed = director.ingest(session.command("look")).appended; // ambient ends the run
    // One panel, at the destination — and since 6.1c that panel *is* the ambient
    // turn's too. A revisit prints only the room name, which is the location box
    // now (ADR 0009 §3) and not a balloon, so the collapsed traversal carries no
    // words for the `look` that ends it to be kept out of: same room, no reason
    // to break, and the port merges them (`AddLine`'s clone-append).
    expect(flushed).toHaveLength(1);
    expect(flushed[0]?.room).toBe("NORTH-OF-HOUSE"); // the destination, not the rooms passed
    expect(flushed[0]?.kind).toBe("ambient"); // the panel takes its newest line's context
    expect(flushed[0]?.roomTitle).toBe("North of House");
  });

  it("holds a trailing run until flush(), which is idempotent", () => {
    const session = createSession(doc, { seed: SEED });
    const director = createDirector(options());
    director.ingest(session.start());
    director.ingest(session.command("north")); // arrival
    director.ingest(session.command("west")); // traversal, buffered
    director.ingest(session.command("north")); // traversal, buffered
    const before = director.panels.length;
    const flushed = director.flush().appended;
    // ADR 0010 §2's join needs an open frame missing the Hero to answer, and
    // here there isn't one: the arrival that preceded this walk already put
    // his own declaration on stage, so `avatarInPanel` — the ordinary
    // same-speaker rule, nothing to do with the orphan guard — blocks the
    // walk's own declaration from joining it. It opens its own panel instead
    // (`flushed[0]`), same as any turn whose declaration cannot join anything.
    // What follows is exactly what M6.1g pinned before this slice: the walk's
    // destination, wordless, since there is nothing else left to say
    // (`flushed[1]`).
    expect(flushed).toHaveLength(2);
    expect(flushed[0]?.kind).toBe("traversal");
    expect(flushed[1]?.kind).toBe("traversal");
    expect(flushed[1]?.speakers).toHaveLength(0);
    expect(flushed[1]?.bodies.length).toBeGreaterThan(0);
    expect(director.panels.length).toBe(before + 2);
    expect(director.flush().appended).toEqual([]); // nothing left to flush
  });

  it("drops a parser refusal: computed to keep state, never emitted", () => {
    const session = createSession(doc, { seed: SEED });
    const director = createDirector(options());
    director.ingest(session.start());
    const before = director.panels.length;
    // A word Zork does not know — the engine refuses on the `system` channel, so
    // the mapper tags it `refusal` (not "xyzzy", which Zork answers as a joke).
    const out = director.ingest(session.command("blorptastic"));
    expect(out.appended).toEqual([]);
    expect(director.panels.length).toBe(before); // nothing added to the stream
  });

  it("keeps the mapper's stream state whole across a dropped turn", () => {
    const session = createSession(doc, { seed: SEED });
    const director = createDirector(options());
    director.ingest(session.start()); // arrival, West of House
    expect(director.ingest(session.command("blorptastic")).appended).toEqual([]); // dropped
    // The move after a dropped refusal must still classify against up-to-date
    // visited/room state — proving the fold ran even though nothing was emitted.
    const north = director.ingest(session.command("north")).appended;
    expect(north[0]?.kind).toBe("arrival");
    expect(north[0]?.room).toBe("NORTH-OF-HOUSE");
  });
});

describe("the wordless panel is deliberate (M6.1g)", () => {
  /**
   * M6.1f flagged "empty panels" — frames with a location box and no balloon.
   * **Looked at, and kept.** They are the traversal collapse's one output: the
   * Hero has walked back through rooms he has already seen, the pair have
   * nothing to say about it, and ADR 0005 §3 draws the run as a single wide shot
   * at its destination. Rendered, it is him standing in the room under its name
   * — a wordless establishing beat, not a blank frame. Deleting it would delete
   * the only trace of the walk.
   *
   * What must never happen is the *actually* blank one: no balloon and no body.
   * A silent turn stages the Hero (`reactions`), so this holds today; the test
   * is here because nothing else would notice if that stopped being true.
   */
  it("never emits a frame with neither a balloon nor a body", () => {
    for (const file of cmdFiles()) {
      const session = createSession(doc, { seed: SEED });
      const director = createDirector(options());
      director.ingest(session.start());
      for (const command of commandsOf(file)) director.ingest(session.command(command));
      director.flush();

      for (const panel of director.panels) {
        if (panel.speakers.length > 0) continue;
        expect(panel.bodies.length, `${file}: blank frame in ${panel.room}`).toBeGreaterThan(0);
        // …and it has to say where it is, or the wordless frame is unreadable.
        expect(panel.roomTitle, `${file}: untitled wordless frame in ${panel.room}`)
          .not.toBeNull();
      }
    }
  });
});
