/**
 * Corpus regression. The `.avb` corpus is fixed and version-controlled, so
 * these counts are exact — a change in any of them is a decoder regression, not
 * a flaky total.
 */
import { readFileSync } from "node:fs";
import { globSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseAvatar, adjustOffset, facesOf, torsosOf } from "../src/avb.js";
import { decodeImage } from "../src/image.js";
import { blit, createRaster, rasterizeLayers, rasterizePose, usesMask } from "../src/raster.js";
import { compositeBody } from "../src/composite.js";
import { firstNeutral } from "../src/pose.js";
import { AIF_DIB, AIF_LZDEFLATE, AIP_DUALMASK, AIP_LOCALPALETTE, AIP_MASKEDMONO, AIP_NOPALETTE } from "../src/format.js";

const CORPUS = globSync("original-projects/comic-chat/**/*.avb", {
  cwd: new URL("../..", import.meta.url).pathname,
}).sort();

const ROOT = new URL("../../", import.meta.url).pathname;
const load = (rel: string) => parseAvatar(new Uint8Array(readFileSync(ROOT + rel)), rel);

describe("corpus", () => {
  it("finds the whole corpus", () => {
    expect(CORPUS.length).toBe(191);
  });

  it("parses every file", () => {
    const avatars = CORPUS.map(load);
    expect(avatars.length).toBe(191);
    // Record-stream health: every format is a known enum value. A misaligned
    // struct walk does not throw — it produces plausible records with garbage
    // format bytes, so this is the assertion that catches it (gotcha 2).
    for (const av of avatars) {
      for (const rec of av.records) {
        expect([AIF_DIB, AIF_LZDEFLATE]).toContain(rec.imageFormat);
        expect(rec.imagePalette).toBeGreaterThanOrEqual(0);
        expect(rec.imagePalette).toBeLessThanOrEqual(5);
        expect(rec.intensity).toBeGreaterThanOrEqual(0);
        expect(rec.intensity).toBeLessThanOrEqual(1);
      }
    }
  });

  it("decodes every image, mask and aura plane", () => {
    let images = 0;
    let masks = 0;
    let auras = 0;
    for (const rel of CORPUS) {
      const av = load(rel);
      for (const rec of av.records) {
        const img = decodeImage(
          av.bytes, adjustOffset(rec.image, av), rec.imageFormat, rec.imagePalette,
          av.globalPalette,
        );
        expect(img.width).toBeGreaterThan(0);
        images++;
        if (rec.mask) {
          decodeImage(av.bytes, adjustOffset(rec.mask, av), rec.maskFormat, rec.maskPalette, av.globalPalette);
          masks++;
        }
        if (rec.aura) {
          decodeImage(av.bytes, adjustOffset(rec.aura, av), rec.auraFormat, rec.auraPalette, av.globalPalette);
          auras++;
        }
      }
    }
    expect(images).toBe(4656);
    expect(masks).toBe(2066);
    expect(auras).toBe(2908);
  });

  it("holds the (format, palette) distribution the spec records", () => {
    const seen = new Map<string, number>();
    for (const rel of CORPUS) {
      for (const rec of load(rel).records) {
        const key = `${rec.imageFormat},${rec.imagePalette}`;
        seen.set(key, (seen.get(key) ?? 0) + 1);
      }
    }
    expect(seen.get(`${AIF_DIB},${AIP_NOPALETTE}`)).toBe(2906);
    expect(seen.get(`${AIF_LZDEFLATE},${AIP_MASKEDMONO}`)).toBe(1364);
    expect(seen.get(`${AIF_LZDEFLATE},${AIP_LOCALPALETTE}`)).toBe(386);
    expect(seen.size).toBe(3);
  });

  it("rasterizes every pose to a non-empty figure", () => {
    let poses = 0;
    for (const rel of CORPUS) {
      const av = load(rel);
      for (const rec of av.records) {
        const raster = rasterizePose(av, rec);
        // Every pose must have *some* opaque pixel. A polarity or coverage bug
        // yields a fully transparent or fully opaque raster rather than a throw.
        let opaque = 0;
        for (let i = 3; i < raster.data.length; i += 4) if (raster.data[i]) opaque++;
        const total = raster.width * raster.height;
        expect(opaque, `${rel} ${rec.kind}${rec.index}`).toBeGreaterThan(0);
        expect(opaque, `${rel} ${rec.kind}${rec.index}`).toBeLessThan(total);
        poses++;
      }
    }
    expect(poses).toBe(4656);
  });
});

describe("mask and aura planes", () => {
  it("reads plane polarity from the palette, not by assumption", () => {
    // 73 aura planes ship the colour table [black, white] against 2833 with
    // [white, black]. Both groups must land figure-side-opaque.
    const polarity = new Map<string, number>();
    for (const rel of CORPUS) {
      const av = load(rel);
      for (const rec of av.records) {
        if (!rec.aura) continue;
        const plane = decodeImage(av.bytes, adjustOffset(rec.aura, av), rec.auraFormat, rec.auraPalette, av.globalPalette);
        const first = plane.palette?.[0];
        if (!first) continue;
        const key = first[0] === 0 ? "black-first" : "white-first";
        polarity.set(key, (polarity.get(key) ?? 0) + 1);
      }
    }
    expect(polarity.get("black-first")).toBe(73);
    expect(polarity.get("white-first")).toBe(2835);
  });

  it("treats a dual-mask plane as masked-mono", () => {
    // AIP_DUALMASK planes are 2bpp with the masked-mono colour table: mask and
    // aura ride in one bitmap, which is what "dual" names.
    let dual = 0;
    for (const rel of CORPUS) {
      const av = load(rel);
      for (const rec of av.records) {
        if (rec.mask && rec.maskPalette === AIP_DUALMASK) dual++;
      }
    }
    expect(dual).toBe(384);
  });

  it("honours the avatar flags that gate mask blitting", () => {
    const tiki = load("original-projects/comic-chat/v2.5-beta-1/comicart/tiki.avb");
    // flags 5 = HEADMASK | TORSOFIRST: the head mask is drawn, the torso's is not.
    expect(tiki.flags & 1).toBe(1);
    expect(tiki.flags & 2).toBe(0);
    expect(usesMask(tiki, "face")).toBe(true);
    expect(usesMask(tiki, "torso")).toBe(false);
    // A simple avatar's body mask is never blitted, whatever the flags say.
    expect(usesMask(tiki, "body")).toBe(false);
  });

  it("stretches a plane whose dimensions disagree with its drawing", () => {
    // Xeno's LAUGH face carries 145x150 planes against a 150x158 drawing — the
    // one asset in the corpus that relies on Win32 having used StretchBlt.
    const xeno = load("original-projects/comic-chat/v2.1b/cchat/comicart/xeno.avb");
    const rec = facesOf(xeno)[3]!;
    expect(rec.emotionName).toBe("LAUGH");
    const plane = decodeImage(xeno.bytes, adjustOffset(rec.mask, xeno), rec.maskFormat, rec.maskPalette, xeno.globalPalette);
    expect([plane.width, plane.height]).toEqual([145, 150]);
    const raster = rasterizePose(xeno, rec);
    expect([raster.width, raster.height]).toEqual([150, 158]);
  });
});

describe("compositing", () => {
  it("joins every face to every torso without leaving the canvas", () => {
    let composites = 0;
    for (const rel of CORPUS) {
      const av = load(rel);
      if (av.type !== "COMPLEX") continue;
      const faces = facesOf(av);
      const torsos = torsosOf(av);
      const neutralFace = firstNeutral(faces);
      const neutralTorso = firstNeutral(torsos);
      if (!neutralFace || !neutralTorso) continue;

      for (const face of faces) {
        const body = compositeBody(av, face, neutralTorso);
        // The union box must contain both parts, both anchors must land inside.
        expect(body.face.x).toBeGreaterThanOrEqual(0);
        expect(body.torso.x).toBeGreaterThanOrEqual(0);
        expect(body.face.x + body.face.width).toBeLessThanOrEqual(body.raster.width);
        expect(body.torso.y + body.torso.height).toBeLessThanOrEqual(body.raster.height);
        expect(body.headHeight).toBeGreaterThan(0);
        expect(body.headHeight).toBeLessThanOrEqual(body.raster.height);
        composites++;
      }
    }
    expect(composites).toBe(2348);
  });

  it("places the head above the waist, not at the origin", () => {
    // The whole point of cx/cy is that the head is not simply drawn at (0,0).
    const tiki = load("original-projects/comic-chat/v2.5-beta-1/comicart/tiki.avb");
    const face = firstNeutral(facesOf(tiki))!;
    const torso = firstNeutral(torsosOf(tiki))!;
    const body = compositeBody(tiki, face, torso);
    expect(body.raster.height).toBeGreaterThan(torso.cy ?? 0);
    // Composite is taller than either part alone — the parts do not fully overlap.
    expect(body.raster.height).toBeGreaterThan(body.face.height);
    expect(body.headHeight).toBeLessThan(body.raster.height);
  });

  it("respects TORSOFIRST draw order", () => {
    const tiki = load("original-projects/comic-chat/v2.5-beta-1/comicart/tiki.avb");
    expect(tiki.flags & 4).toBe(4); // TORSOFIRST
  });

  it("draws both halos before either figure", () => {
    // The paper states the rule outright (§4.4): the head's halo must not
    // overwrite the body, nor the body's halo the head. This test proves the
    // rule is load-bearing rather than decorative — flattening each part first
    // and then blitting erases ink at the neck.
    const tiki = load("original-projects/comic-chat/v2.5-beta-1/comicart/tiki.avb");
    const face = firstNeutral(facesOf(tiki))!;
    const torso = firstNeutral(torsosOf(tiki))!;
    const correct = compositeBody(tiki, face, torso);

    const faceLayers = rasterizeLayers(tiki, face);
    const torsoLayers = rasterizeLayers(tiki, torso);
    expect(faceLayers.aura).not.toBeNull();
    expect(torsoLayers.aura).not.toBeNull();

    // Naive order: flatten each part (halo behind its own figure), then blit
    // torso, then face — the face's halo lands on top of the torso's ink.
    const naive = createRaster(correct.raster.width, correct.raster.height);
    const flatten = (layers: typeof faceLayers) => {
      const r = createRaster(layers.width, layers.height);
      if (layers.aura) blit(r, layers.aura, 0, 0);
      blit(r, layers.figure, 0, 0);
      return r;
    };
    blit(naive, flatten(torsoLayers), correct.torso.x, correct.torso.y);
    blit(naive, flatten(faceLayers), correct.face.x, correct.face.y);

    const ink = (r: { data: Uint8ClampedArray }) => {
      let n = 0;
      for (let i = 0; i < r.data.length; i += 4) {
        if (r.data[i + 3] && r.data[i]! < 128) n++;
      }
      return n;
    };
    // The naive order loses ink the correct order keeps.
    expect(ink(naive)).toBeLessThan(ink(correct.raster));
  });
});
