/**
 * N-body layout, exercised with real avatars (ADR 0008 Phase 0).
 *
 * `layoutAvatars` shipped in v0.18.0 as an N-participant routine, but nothing
 * could hand it more than two bodies: the packed cast holds `hero` and `guide`
 * and the mapper stages at most both. Its N≥3 behaviour was therefore asserted
 * nowhere — and, as the ADR 0008 amendment records, at N=1 the routine collapses
 * to the old solo branch, so normal play could not have caught a regression in it
 * either. This file closes that hole ahead of the Phase 1 `LayoutAvatars` port,
 * so the port lands against a live gate rather than a promised one.
 *
 * The bodies are real: `tools/cast-fixture.ts` packs four `.avb` avatars with
 * `art/`'s own pipeline, so the widths and heights driving the arithmetic are
 * corpus geometry, not invented numbers. No canvas — `layoutAvatars` reads the
 * manifest and returns placements; only `drawFigure` touches a context.
 *
 * What is pinned here is the **contract the port must preserve**, stated as
 * properties rather than coordinates: equal margins including the edges
 * (`panel.cpp:607-616`), shrink-to-fit on overrun (`:575-585`), insertion order
 * left-to-right, and inward mirroring past centre. Phase 1 adds `IsSpeaker`
 * gating and stable slots; Phase 3 adds the byte-diff PNG gate. Coordinates stay
 * out of this file deliberately: pixels are Phase 3's job, and duplicating them
 * here would make every framing tweak a two-file edit.
 */

import { describe, expect, it } from "vitest";
import { figureFor, newCycle, type Figure } from "../src/comic/figure.js";
import { isSpeaker, layoutAvatars, orderBodies } from "../src/comic/render.js";
import { CAPTION, type Body, type Line } from "../src/comic/mapper.js";
import {
  FIXTURE_ROLES, NEUTRAL, fixtureBodies, packFixtureCast, stubCast,
} from "../tools/cast-fixture.js";

const PANEL_W = 480;
const PANEL_H = 400;

/** `SHOTS.medium`, inlined: the table is private to `render.ts` by design. */
const MEDIUM = { fill: 0.78, reveal: 0.95, backdrop: 0.75 };

const packed = packFixtureCast();
const cast = stubCast(packed);
const ROLES = Object.keys(FIXTURE_ROLES);

/** The renderer's own body→figure step (`render.ts:129-135`), minus the canvas. */
function figures(roles: readonly string[]): Array<{ body: Body; figure: Figure }> {
  return fixtureBodies(roles).map((body) => {
    const avatar = packed.manifest.cast[body.speaker];
    expect(avatar, `${body.speaker} is in the fixture cast`).toBeDefined();
    const figure = figureFor(avatar!, NEUTRAL, newCycle());
    expect(figure, `${body.speaker} yields a figure`).not.toBeNull();
    return { body, figure: figure! };
  });
}

describe("multi-body fixture", () => {
  it("packs four complex avatars the renderer can stage", () => {
    expect(ROLES).toHaveLength(4);
    for (const role of ROLES) {
      const avatar = packed.manifest.cast[role]!;
      expect(avatar.type).toBe("COMPLEX");
      // `figureFor` composites a face onto a torso; a SIMPLE avatar has neither.
      expect(avatar.faces.length).toBeGreaterThan(0);
      expect(avatar.torsos.length).toBeGreaterThan(0);
      expect(cast.sheets.get(role)).toBeDefined();
    }
  });

  it("gives the four bodies distinct silhouettes", () => {
    // Not cosmetic: identical widths would let an equal-margin bug pass, and a
    // common height would hide the per-body scale the port must keep per-body.
    const sizes = figures(ROLES).map(({ figure }) => `${figure.width}x${figure.height}`);
    expect(new Set(sizes).size).toBe(4);
  });
});

describe("layoutAvatars, N = 1..4", () => {
  for (let n = 1; n <= 4; n++) {
    const roles = ROLES.slice(0, n);

    describe(`${n} bod${n === 1 ? "y" : "ies"}`, () => {
      const placed = layoutAvatars(figures(roles), PANEL_W, PANEL_H, MEDIUM);

      it("stages every body, in insertion order", () => {
        expect(placed.map((p) => p.speaker)).toEqual(roles);
        for (let i = 1; i < placed.length; i++) {
          expect(placed[i]!.x).toBeGreaterThan(placed[i - 1]!.x);
        }
      });

      it("keeps every body inside the panel and clear of its neighbour", () => {
        for (const p of placed) {
          expect(p.x).toBeGreaterThanOrEqual(0);
          expect(p.x + p.figure.width * p.scale).toBeLessThanOrEqual(PANEL_W + 0.001);
          expect(p.scale).toBeGreaterThan(0);
        }
        for (let i = 1; i < placed.length; i++) {
          const prev = placed[i - 1]!;
          expect(placed[i]!.x).toBeGreaterThanOrEqual(prev.x + prev.figure.width * prev.scale);
        }
      });

      it("spreads them with equal margins, edges included", () => {
        // `margin = (unitWidth − Σw)/(n+1)` — the n+1 gaps are the n−1 interior
        // ones plus both edges, which is what makes a row read as composed.
        const gaps = [placed[0]!.x];
        for (let i = 1; i < placed.length; i++) {
          const prev = placed[i - 1]!;
          gaps.push(placed[i]!.x - (prev.x + prev.figure.width * prev.scale));
        }
        const last = placed[placed.length - 1]!;
        gaps.push(PANEL_W - (last.x + last.figure.width * last.scale));
        expect(gaps).toHaveLength(n + 1);
        for (const gap of gaps) expect(gap).toBeCloseTo(gaps[0]!, 6);
      });

      it("turns the row inward, by adjacency rather than by coordinate", () => {
        // `EvalPair`'s no-talk-to branch reduced over a fixed row: each body faces
        // whichever side holds more bodies, ties keeping `m_lastDir` (`false`).
        for (const [i, p] of placed.entries()) {
          expect(p.mirror).toBe(n - 1 - i < i);
        }
        // The leftmost keeps the art's rightward default at every N; the rightmost
        // turns to face the room. At N=2 that is the two-shot, unchanged.
        expect(placed[0]!.mirror).toBe(false);
        if (n > 1) expect(placed[n - 1]!.mirror).toBe(true);
      });

      it("stands every body on the same floor", () => {
        // Vertical placement is `height − h·reveal` per body, so a row shares a
        // baseline only because each body is scaled to a common fill height —
        // the divergence Phase 1 makes faithful by deleting `normHeight`.
        const feet = placed.map((p) => p.y + p.figure.height * p.scale);
        for (const foot of feet) expect(foot).toBeCloseTo(feet[0]!, 6);
      });
    });
  }

  it("shrinks the whole row, uniformly, when it overruns the panel", () => {
    const four = figures(ROLES);
    const wide = layoutAvatars(four, PANEL_W, PANEL_H, MEDIUM);
    // The same four in a panel too narrow to seat them at their natural scale.
    const narrow = layoutAvatars(four, 160, PANEL_H, MEDIUM);

    const ratios = narrow.map((p, i) => p.scale / wide[i]!.scale);
    for (const ratio of ratios) {
      expect(ratio).toBeLessThan(1);
      // Uniform: one reduction factor for the set, not per-body re-fitting —
      // relative body sizes survive the squeeze (`panel.cpp:577`).
      expect(ratio).toBeCloseTo(ratios[0]!, 6);
    }
    const last = narrow[narrow.length - 1]!;
    expect(last.x + last.figure.width * last.scale).toBeLessThanOrEqual(160 + 0.001);
  });

  it("caps figure width per body when a balloon column is reserved", () => {
    const cap = PANEL_W * 0.55;
    const capped = layoutAvatars(figures(ROLES.slice(0, 2)), PANEL_W, PANEL_H, MEDIUM, cap);
    for (const p of capped) expect(p.figure.width * p.scale).toBeLessThanOrEqual(cap + 0.001);
  });

  it("returns nothing for an empty stage", () => {
    expect(layoutAvatars([], PANEL_W, PANEL_H, MEDIUM)).toEqual([]);
  });
});

describe("isSpeaker (panel.cpp:822)", () => {
  const line = (speaker: string): Line =>
    ({ speaker, balloonClass: "CBWoodringNormal", text: "…" });
  const body = (speaker: string, requested = false): Body =>
    ({ speaker, emotion: NEUTRAL, requested });

  it("stages a requested body that says nothing — the Hero on a silent turn", () => {
    expect(isSpeaker(body("hero", true), [])).toBe(true);
  });

  it("stages an unrequested body that carries a balloon — the DM, a mob", () => {
    expect(isSpeaker(body("mob-a"), [line("mob-a")])).toBe(true);
  });

  it("drops an unrequested body with nothing to say", () => {
    // The gate that matters once mobs exist: a Grue in the room is not a Grue in
    // the frame. Before this port every staged body was drawn unconditionally.
    expect(isSpeaker(body("mob-a"), [line("hero"), line("guide")])).toBe(false);
  });

  it("does not let a caption stage anybody", () => {
    const caption: Line = { speaker: CAPTION, balloonClass: "CBWoodringBox", text: "Dark." };
    expect(isSpeaker(body("mob-a"), [caption])).toBe(false);
  });
});

describe("orderBodies (OrderAvatars stub, panel.cpp:424)", () => {
  const ids = (n: number) => Array.from({ length: n }, (_, i) => `b${i}`);

  it("keeps insertion order — seating is stubbed until mobs supply talk-tos", () => {
    const ordered = orderBodies(ids(4));
    expect(ordered.map((o) => o.body)).toEqual(ids(4));
  });

  it("leaves a lone body unflipped", () => {
    expect(orderBodies(ids(1)).map((o) => o.flip)).toEqual([false]);
  });

  it("faces the middle body of an odd row by `m_lastDir`, not by geometry", () => {
    // 3 bodies: the middle has one neighbour each side, so `EvalPair` ties and the
    // original falls back to the avatar's last direction (`panel.cpp:396-398`),
    // initialised FALSE (`avatar.cpp:894`). A coordinate rule would have had to
    // invent an answer here.
    expect(orderBodies(ids(3)).map((o) => o.flip)).toEqual([false, false, true]);
  });

  it("turns each body toward the larger side", () => {
    expect(orderBodies(ids(5)).map((o) => o.flip)).toEqual([false, false, false, true, true]);
  });
});
