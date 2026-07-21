/**
 * The browser's figure assembly, checked against `art/`'s.
 *
 * There are deliberately **two** implementations of the face-onto-torso join.
 * `art/src/composite.ts` composites pixels it owns, into a raster; the shell's
 * `comic/figure.ts` composites sub-rects of a texture it does not own, into
 * `drawImage` calls. Merging them would drag the decoder — and so `node:zlib` —
 * into the browser build, which is the whole point of the Gate D asset split.
 *
 * Two implementations of one piece of geometry is exactly the arrangement that
 * drifts silently, so this test runs both over the *real* cast and asserts they
 * agree pose for pose. It is the only reason the duplication is acceptable.
 *
 * These run in Node without a canvas: `figureFor` computes geometry and chooses
 * parts; only `drawFigure` touches a context, and it is a transcription of the
 * numbers this test pins.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseAvatar, facesOf, torsosOf } from "../../art/src/avb.js";
import { compositeBody } from "../../art/src/composite.js";
import { packAvatar } from "../../art/src/pack.js";
import { EMOTION_NAMES, emotionAngle } from "../../art/src/format.js";
import type { EmotionOption } from "../../art/src/pose.js";
import type { PackedAvatar } from "../../art/src/cast-manifest.js";
import { drawFigure, figureFor, newCycle } from "../src/comic/figure.js";
import { AFFECT_MARKERS } from "../src/comic/affect.js";

const CORPUS = fileURLToPath(
  new URL("../../original-projects/comic-chat/v2.5-beta-1/comicart/", import.meta.url),
);

/**
 * The cast, per ADR 0004 §11 as amended at 5.3.
 *
 * §11 originally constrained the Hero to the 5 complex avatars owning a SHRUG
 * *torso*, because `parser-miss` is the largest marker. Running the table
 * against the corpus showed that marker asks for BORED **and** SHRUG, and that
 * the two inventories are nearly disjoint: only **dan** and **lance** own both.
 * dan is also not on the Guide shortlist, which dissolves §11's "cast both
 * together, they intersect only at susan" problem rather than resolving it.
 */
const CAST = { hero: "dan.avb", guide: "tiki.avb" };

function load(file: string) {
  const av = parseAvatar(new Uint8Array(readFileSync(CORPUS + file)), file);
  const { avatar } = packAvatar(av, file.replace(".avb", ""));
  return { av, avatar };
}

describe.each(Object.entries(CAST))("%s (%s)", (_role, file) => {
  const { av, avatar } = load(file);

  it("packs every part onto one sheet, with its aura", () => {
    const parts = [...avatar.faces, ...avatar.torsos];
    expect(parts.length).toBeGreaterThan(0);
    for (const part of parts) {
      expect(part.figure.x + part.figure.width).toBeLessThanOrEqual(avatar.sheetWidth);
      expect(part.figure.y + part.figure.height).toBeLessThanOrEqual(avatar.sheetHeight);
      if (part.aura) {
        // A figure and its halo must be the same size and on the same sheet:
        // the renderer places both from one offset, which is only correct
        // because they were packed as a pair.
        expect(part.aura.width).toBe(part.figure.width);
        expect(part.aura.height).toBe(part.figure.height);
      }
    }
  });

  it("draws mirrored about the figure box, unmirrored by default (ADR 0005 §4)", () => {
    const figure = figureFor(avatar, [{ angle: 0, intensity: 0, priority: 1 }], newCycle());
    if (!figure) throw new Error("expected a figure for a neutral pose");
    const calls: string[] = [];
    const ctx = {
      save: () => calls.push("save"),
      restore: () => calls.push("restore"),
      translate: (x: number, y: number) => calls.push(`translate(${x},${y})`),
      scale: (x: number, y: number) => calls.push(`scale(${x},${y})`),
      drawImage: () => calls.push("drawImage"),
    } as unknown as CanvasRenderingContext2D;
    const sheet = {} as CanvasImageSource;

    // Mirrored: origin moves to the figure's right edge and x is flipped, so the
    // whole join faces the other way; save/restore bracket the transform.
    drawFigure(ctx, sheet, figure, 10, 20, 2, true);
    expect(calls[0]).toBe("save");
    expect(calls.at(-1)).toBe("restore");
    expect(calls).toContain(`translate(${10 + figure.width * 2},20)`);
    expect(calls).toContain("scale(-1,1)");

    // Default: translate to the origin, no flip — the pre-§4 behaviour.
    calls.length = 0;
    drawFigure(ctx, sheet, figure, 10, 20, 2);
    expect(calls).toContain("translate(10,20)");
    expect(calls).not.toContain("scale(-1,1)");
  });

  it("never overlaps two parts on the sheet", () => {
    // A shelf packer that miscounts a row draws one pose's pixels inside
    // another's rect, which renders as a plausible figure with a wrong sleeve.
    const rects = [...avatar.faces, ...avatar.torsos].flatMap((p) =>
      p.aura ? [p.figure, p.aura] : [p.figure],
    );
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i]!, b = rects[j]!;
        const disjoint =
          a.x + a.width <= b.x || b.x + b.width <= a.x ||
          a.y + a.height <= b.y || b.y + b.height <= a.y;
        expect(disjoint).toBe(true);
      }
    }
  });

  it("computes the same join as art/src/composite.ts, for every pose", () => {
    const faces = facesOf(av);
    const torsos = torsosOf(av);
    for (const [fi, face] of faces.entries()) {
      for (const [ti, torso] of torsos.entries()) {
        const reference = compositeBody(av, face, torso);
        const figure = joinOnly(avatar, fi, ti);
        expect({
          width: figure.width, height: figure.height,
          headHeight: figure.headHeight, faceX: figure.faceX,
          facePos: figure.facePos, torsoPos: figure.torsoPos,
        }).toEqual({
          width: reference.raster.width, height: reference.raster.height,
          headHeight: reference.headHeight, faceX: reference.faceX,
          facePos: { x: reference.face.x, y: reference.face.y },
          torsoPos: { x: reference.torso.x, y: reference.torso.y },
        });
      }
    }
  });

  it("resolves every affect marker to a drawable figure", () => {
    // A marker that selects nothing renders an empty panel — and since the
    // failure is per-emotion, it would show up only on the turns that carry
    // feeling, which are the ones worth drawing.
    for (const marker of AFFECT_MARKERS) {
      const figure = figureFor(avatar, marker.options, newCycle());
      expect(figure, marker.name).not.toBeNull();
      expect(figure!.width).toBeGreaterThan(0);
      expect(figure!.height).toBeGreaterThan(0);
    }
  });
});

describe("pose cycling (§8)", () => {
  const { avatar } = load(CAST.hero);

  it("does not return the same drawing forever", () => {
    // The monotony risk is not a shortage of art — this avatar carries 220
    // figures — but `nearestByAngle` being a deterministic argmax. Comic Chat's
    // own answer was `m_lastTorso + 1`, and this is the assertion that it is
    // wired up: without it, `seen.size` is 1.
    const neutral: EmotionOption[] = [{ angle: 0, intensity: 0, priority: 1 }];
    const cycle = newCycle();
    const seen = new Set<string>();
    for (let i = 0; i < 12; i++) {
      const figure = figureFor(avatar, neutral, cycle)!;
      seen.add(`${figure.face.index}/${figure.torso.index}`);
    }
    expect(seen.size).toBeGreaterThan(1);
  });

  it("is reproducible from a given cycle state", () => {
    // A panel re-drawn on resize must show the same figures it did the first
    // time, or scrolling back reveals a different comic than the one read.
    const options: EmotionOption[] = [
      { angle: emotionAngle(EMOTION_NAMES.indexOf("BORED")), intensity: 0.5, priority: 30 },
    ];
    const first = figureFor(avatar, options, { face: 3, torso: 2 })!;
    const again = figureFor(avatar, options, { face: 3, torso: 2 })!;
    expect(again.face.index).toBe(first.face.index);
    expect(again.torso.index).toBe(first.torso.index);
  });
});

describe("the Hero can shrug (§11)", () => {
  it("owns a SHRUG torso, which parser-miss needs on every fire", () => {
    // The largest single marker is `parser-miss`, and it asks for a shrug. An
    // avatar without one silently answers with a neutral body, which is why
    // casting was constrained by pose inventory rather than by preference.
    const { avatar } = load(CAST.hero);
    expect(avatar.torsos.some((t) => t.emotion === "SHRUG")).toBe(true);
  });

  it("draws the shrug when the parser refuses a command", () => {
    const { avatar } = load(CAST.hero);
    const parserMiss = AFFECT_MARKERS.find((m) => m.name === "parser-miss")!;
    const figure = figureFor(avatar, parserMiss.options, newCycle())!;
    // The gesture claims the torso; the expression, outranking it, has already
    // claimed the face. Both halves are spoken for, which is the whole point of
    // emitting a weighted set rather than one winning emotion.
    expect(figure.torso.emotion).toBe("SHRUG");
    expect(figure.face.emotion).not.toBe("NEUTRAL");
  });

  it("owns a BORED face too, which is the other half of the same marker", () => {
    /*
     * The reason the cast changed at 5.3. A Hero with SHRUG but no BORED still
     * renders — the emotion wheel is nearest-neighbour by design, so the
     * request lands on whatever the artist drew — but it lands on COY, and the
     * comic's single most common beat then reads as the Hero being coy at the
     * parser rather than exasperated by it. That is a silent characterisation
     * change, not an error, which is exactly why it needs an assertion.
     */
    const { avatar } = load(CAST.hero);
    expect(avatar.faces.some((f) => f.emotion === "BORED")).toBe(true);
    const parserMiss = AFFECT_MARKERS.find((m) => m.name === "parser-miss")!;
    const figure = figureFor(avatar, parserMiss.options, newCycle())!;
    expect(figure.face.emotion).toBe("BORED");
    expect(figure.torso.emotion).toBe("SHRUG");
  });
});

/** `figureFor` with the round-robin pinned to one pair, for the parity check. */
function joinOnly(avatar: PackedAvatar, faceIndex: number, torsoIndex: number) {
  const face = avatar.faces[faceIndex]!;
  const torso = avatar.torsos[torsoIndex]!;
  const single: PackedAvatar = { ...avatar, faces: [face], torsos: [torso] };
  // One candidate each, so selection is forced and only the geometry varies.
  return figureFor(single, [{ angle: face.angle, intensity: face.intensity, priority: 1 }], {
    face: -1, torso: -1,
  })!;
}
