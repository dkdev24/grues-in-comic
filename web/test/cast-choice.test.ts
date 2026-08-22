/**
 * A chosen cast is a runtime skin (F16).
 *
 * The three properties worth pinning are the ones a player can see go wrong:
 * the default cast still loads when nobody has chosen, a chosen character
 * actually replaces the packed one *and is reported as loaded* (the save
 * records what was drawn), and a chosen character whose art 404s degrades to
 * the default instead of failing the boot.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { loadCast, loadRoster } from "../src/comic/figure.js";
import type { CastManifest, PackedAvatar } from "../../art/src/cast-manifest.js";

const BASE = "/assets/comic";

function avatar(name: string, sheet: string): PackedAvatar {
  const part = {
    kind: "face" as const, index: 0, emotion: "NEUTRAL", angle: 0, intensity: 0,
    cx: 0, cy: 0, cxDelta: 0, cyDelta: 0, x: 0,
    figure: { x: 0, y: 0, width: 10, height: 10 }, aura: null,
  };
  return {
    name, type: "COMPLEX", torsoFirst: true, sheet, sheetWidth: 10, sheetHeight: 20,
    faces: [part], torsos: [{ ...part, kind: "torso" as const }], bodies: [],
  };
}

const manifest: CastManifest = {
  version: 1,
  cast: { hero: avatar("DAN", "dan.png"), guide: avatar("Tiki", "tiki.png") },
  backdrops: [],
};

/** Every image "loads": this suite is about which URLs are asked for. */
class StubImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  set src(_url: string) {
    queueMicrotask(() => this.onload?.());
  }
}

function serve(routes: Record<string, unknown>): string[] {
  const asked: string[] = [];
  vi.stubGlobal("Image", StubImage);
  vi.stubGlobal("fetch", async (url: string) => {
    asked.push(url);
    const body = routes[url];
    if (body === undefined) throw new Error(`404 ${url}`);
    return { json: async () => structuredClone(body) } as Response;
  });
  return asked;
}

afterEach(() => vi.unstubAllGlobals());

describe("loadCast", () => {
  it("loads the packed cast when nothing is chosen", async () => {
    const asked = serve({ [`${BASE}/cast.json`]: manifest });
    const cast = await loadCast(BASE);
    expect(cast.choice).toEqual({ hero: "dan", guide: "tiki" });
    expect(asked).toEqual([`${BASE}/cast.json`]);
  });

  it("swaps in a chosen character and reports it as loaded", async () => {
    serve({
      [`${BASE}/cast.json`]: manifest,
      [`${BASE}/roster/rebecca.avatar.json`]: avatar("Rebecca", "rebecca.png"),
    });
    const cast = await loadCast(BASE, { hero: "rebecca" });
    expect(cast.manifest.cast.hero?.name).toBe("Rebecca");
    expect(cast.choice).toEqual({ hero: "rebecca", guide: "tiki" });
  });

  it("falls back to the packed default when a chosen sheet is missing", async () => {
    serve({ [`${BASE}/cast.json`]: manifest });
    const cast = await loadCast(BASE, { hero: "rebecca" });
    expect(cast.manifest.cast.hero?.name).toBe("DAN");
    expect(cast.choice.hero).toBe("dan");
    expect(cast.sheets.get("hero")).toBeDefined();
  });
});

describe("loadRoster", () => {
  it("reads the picker index without touching any art", async () => {
    const index = { version: 1, defaults: { hero: "dan" }, characters: [] };
    const asked = serve({ [`${BASE}/roster/roster.json`]: index });
    expect(await loadRoster(BASE)).toEqual(index);
    expect(asked).toEqual([`${BASE}/roster/roster.json`]);
  });
});
