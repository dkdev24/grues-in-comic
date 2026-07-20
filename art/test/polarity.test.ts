/**
 * Ink/paper polarity for `AIP_MASKEDMONO`.
 *
 * The corpus test asserts that every pose rasterizes to a non-empty figure that
 * stays inside its canvas. Both stay true when the figure is inverted, which is
 * how a whole-corpus inversion shipped in v1.4.0: shape was covered, polarity
 * was not.
 *
 * The header comment (`avbfile.h:93`) states the ink code backwards;
 * `CPose::ConvertMasksCommon` (`avbfile.cpp:1636`) is authoritative. See the
 * note on the constants in `src/raster.ts`.
 *
 * These assertions pin the *mapping from pixel code to colour*, not any property
 * of the drawings. An earlier draft asserted that ink is a minority of the drawn
 * area — plausible for line art, and false: anna's bob is a legitimate 80% ink.
 * Art statistics are not invariants; the code table is.
 */
import { describe, expect, it } from "vitest";
import { globSync, readFileSync } from "node:fs";
import { parseAvatar, facesOf, torsosOf, adjustOffset } from "../src/avb.js";
import { rasterizeLayers } from "../src/raster.js";
import { decodeImage } from "../src/image.js";
import { AIP_DUALMASK, AIP_MASKEDMONO } from "../src/format.js";

const root = new URL("../../", import.meta.url).pathname;
const CORPUS = globSync("original-projects/comic-chat/**/*.avb", { cwd: root });
const load = (rel: string) => parseAvatar(new Uint8Array(readFileSync(root + rel)));

const PAPER = 2; // `10`
const INK = 3; // `11`

describe("masked-mono ink/paper polarity", () => {
  /**
   * The load-bearing assertion: `10` paints white and `11` paints black, for
   * every masked-mono part in the corpus. Swapping the two constants — the v1.4.0
   * bug — fails this on the first avatar, and it holds whatever the art looks like.
   */
  it("paints code 10 as paper and code 11 as ink, corpus-wide", () => {
    const offenders: string[] = [];
    let checked = 0;

    for (const rel of CORPUS) {
      const av = load(rel);
      for (const rec of [...facesOf(av), ...torsosOf(av)]) {
        if (rec.imagePalette !== AIP_MASKEDMONO && rec.imagePalette !== AIP_DUALMASK) continue;
        const img = decodeImage(
          av.bytes, adjustOffset(rec.image, av), rec.imageFormat, rec.imagePalette,
          av.globalPalette,
        );
        const fig = rasterizeLayers(av, rec, { includeAura: false }).figure;
        // A mask plane can withhold pixels the drawing carries, so only pixels
        // the figure actually drew are checked.
        let bad = 0;
        for (let i = 0; i < img.width * img.height; i++) {
          if (fig.data[i * 4 + 3] !== 255) continue;
          const code = img.pixels[i]!;
          const lum = fig.data[i * 4]!;
          if (code === PAPER && lum !== 255) bad++;
          if (code === INK && lum !== 0) bad++;
        }
        checked++;
        if (bad > 0) offenders.push(`${rel} ${rec.kind}#${rec.index} ${bad} wrong`);
      }
    }

    expect(checked).toBeGreaterThan(0);
    expect(offenders.slice(0, 10)).toEqual([]);
  });

  /**
   * The same fact pinned to a drawing a human can check, for the two avatars the
   * web shell actually casts: a pale face with dark linework, not a silhouette.
   */
  it.each([
    ["dan", "original-projects/comic-chat/v2.5-beta-1/comicart/dan.avb"],
    ["tiki", "original-projects/comic-chat/v2.5-beta-1/comicart/tiki.avb"],
  ])("gives %s a pale face, not a dark silhouette", (_name, rel) => {
    const av = load(rel);
    const fig = rasterizeLayers(av, facesOf(av)[0]!, { includeAura: false }).figure;

    let ink = 0, paper = 0;
    for (let i = 0; i < fig.width * fig.height; i++) {
      if (fig.data[i * 4 + 3] !== 255) continue;
      if (fig.data[i * 4]! < 128) ink++; else paper++;
    }
    expect(ink).toBeGreaterThan(0);
    expect(paper).toBeGreaterThan(0);

    // Centre of the face is skin. Sampled as a patch, so a feature landing on
    // the exact centre pixel cannot decide the test.
    const cx = fig.width >> 1, cy = fig.height >> 1;
    let light = 0, total = 0;
    for (let y = cy - 3; y <= cy + 3; y++) {
      for (let x = cx - 3; x <= cx + 3; x++) {
        const i = y * fig.width + x;
        if (fig.data[i * 4 + 3] !== 255) continue;
        total++;
        if (fig.data[i * 4]! > 128) light++;
      }
    }
    expect(total).toBeGreaterThan(0);
    expect(light / total).toBeGreaterThan(0.5);
  });
});
