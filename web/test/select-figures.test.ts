/**
 * `selectFigures` — the pose-cycle seam the virtualized strip stands on.
 *
 * The strip paints a panel whenever it comes back on screen and drops its bitmap
 * when it leaves (`comic-view.ts`), so *paint order* is the reader's scroll path
 * and has nothing to do with the order the panels happened in. The round-robin
 * (§8, `m_lastTorso + 1`) is defined against the happening order, so the view
 * advances the cycle once per panel as it joins the strip and freezes what it
 * started from — and both halves of that are only correct if this function is
 * the one and only step that touches the cycle, and if it is reproducible from a
 * frozen copy.
 *
 * Those are the two properties pinned here. Their absence is a bug you can only
 * see by scrolling a long strip back up and noticing the bodies changed.
 */

import { describe, expect, it } from "vitest";
import { selectFigures } from "../src/comic/render.js";
import { newCycle, type PoseCycle } from "../src/comic/figure.js";
import type { Panel } from "../src/comic/mapper.js";
import { FIXTURE_ROLES, NEUTRAL, fixtureBodies, packFixtureCast, stubCast } from "../tools/cast-fixture.js";

const packed = packFixtureCast();
const cast = stubCast(packed);
const ROLES = Object.keys(FIXTURE_ROLES);

/** A panel staging `roles`, all of them speaking so `IsSpeaker` admits them. */
function panelOf(turn: number, roles: readonly string[]): Panel {
  return {
    turn,
    camera: "medium",
    emphatic: false,
    room: "WEST-OF-HOUSE",
    roomTitle: null,
    focus: null,
    bodies: fixtureBodies(roles),
    speakers: roles.map((speaker) => ({
      speaker, text: `line ${turn}`, balloonClass: "CBWoodringNormal" as const,
    })),
    marker: null,
    kind: "action",
  };
}

/** What a selection chose, as comparable strings. */
function poses(cast_: typeof cast, panel: Panel, cycles: Map<string, PoseCycle>): string[] {
  return selectFigures(panel, cast_, cycles)
    .map(({ body, figure }) => `${body.speaker}:${figure.face.index}/${figure.torso.index}`);
}

const copy = (cycles: ReadonlyMap<string, PoseCycle>): Map<string, PoseCycle> =>
  new Map([...cycles].map(([role, cycle]) => [role, { ...cycle }]));

describe("selectFigures", () => {
  it("advances the cycle it is given, panel by panel", () => {
    const cycles = new Map<string, PoseCycle>();
    const first = poses(cast, panelOf(1, ROLES), cycles);
    const second = poses(cast, panelOf(2, ROLES), cycles);
    // Every fixture avatar is COMPLEX with several variants, so consecutive
    // panels must not repose identically — that is the round-robin working.
    expect(second).not.toEqual(first);
  });

  it("is a pure function of the cycle state handed in", () => {
    const panel = panelOf(1, ROLES);
    const frozen = new Map<string, PoseCycle>(ROLES.map((role) => [role, newCycle()]));
    // Paint, release, repaint — arbitrarily often, and in any order relative to
    // other panels. Every one must reproduce the first.
    const expected = poses(cast, panel, copy(frozen));
    for (let i = 0; i < 5; i++) expect(poses(cast, panel, copy(frozen))).toEqual(expected);
  });

  it("reproduces a strip painted back-to-front from the frozen states", () => {
    // The staging pass: cycles advance in strip order, each panel keeping the
    // state it was chosen from. This is `comic-view.ts`'s `stage`.
    const live = new Map<string, PoseCycle>();
    const strip = [1, 2, 3, 4, 5].map((turn) => {
      const panel = panelOf(turn, ROLES);
      const before = copy(live);
      const drawn = poses(cast, panel, live);
      return { panel, before, drawn };
    });

    // The scroll: repaint from the frozen states, newest first. A strip that
    // reads differently on the way back up is the bug this guards.
    for (const { panel, before, drawn } of [...strip].reverse()) {
      expect(poses(cast, panel, copy(before))).toEqual(drawn);
    }
  });
});
