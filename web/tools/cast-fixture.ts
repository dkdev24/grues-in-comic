/**
 * Multi-body cast fixtures (ADR 0008 Phase 0), dev-only.
 *
 * The port in Phases 1–2b — `LayoutAvatars`, `AddLine` panelization, multi-balloon
 * layout — is a pure function of `(bodies, speakers)`, and ADR 0008 §2 fixes that
 * it must be "pixel-verified now against real `.avb` avatar fixtures (2–4 bodies),
 * fully decoupled from *when* the mapper begins authoring mob lines". Today nothing
 * in the repo can produce more than two bodies: the packed cast in
 * `web/assets/comic/cast.json` holds exactly `hero` and `guide`, so every N-body
 * code path is unreachable from a test. This module is that missing input.
 *
 * **Why it packs in memory rather than extending the shipped bundle.** The build
 * cast is a *product* decision (ADR 0004 §11 casting, and `art`'s `pack` script
 * also pulls backdrops from the gitignored `reference/` tree, so it cannot be
 * re-run from a clean checkout). Mobs are not cast yet — that is a later ADR 0006
 * slice, explicitly out of ADR 0008's scope (§4) — and shipping two more sprite
 * sheets to the browser to exercise a layout routine would be paying a payload
 * cost for a test. So the fixture parses the tracked `.avb` corpus and packs it
 * with `art/`'s own pipeline at call time: the same `parseAvatar`→`packAvatar`
 * path the build uses, over the same bytes, with no committed artefact.
 *
 * **Two entry points, because two callers need different halves.** Geometry —
 * `figureFor`, `layoutAvatars` — needs a manifest and nothing else, and must stay
 * runnable in Node without a canvas (the rule `web/test/figure.test.ts` already
 * follows). Pixels need decoded sheets, which means `@napi-rs/canvas`, a
 * devDependency. Hence {@link packFixtureCast} (pure, sync, canvas-free) and
 * {@link loadFixtureCast} (async, decodes, for PNG harnesses).
 *
 * The role ids here are fixture names, **not** a casting decision: which avatar
 * plays a troll is authoring judgement that belongs with the mob-dialogue slice.
 * All four are COMPLEX avatars (faces × torsos), because `figureFor` composites a
 * face onto a torso and the SIMPLE avatars in the corpus carry neither.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { parseAvatar } from "../../art/src/avb.js";
import { packAvatar } from "../../art/src/pack.js";
import { encodePng } from "../../art/src/png.js";
import type { Raster } from "../../art/src/raster.js";
import type { CastManifest, PackedAvatar } from "../../art/src/cast-manifest.js";
import type { Cast } from "../src/comic/figure.js";
import type { Body } from "../src/comic/mapper.js";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));

/** The tracked corpus `web/test/figure.test.ts` already reads. */
export const CORPUS = join(ROOT, "original-projects", "comic-chat", "v2.5-beta-1", "comicart");

/** Where the build wrote the shipped sheets and backdrops. */
export const ASSETS = join(ROOT, "web", "assets", "comic");

/**
 * Four bodies: the two production roles plus two stand-ins.
 *
 * `hero`/`guide` keep the production casting so a fixture panel stays comparable
 * with what `render:panel` draws from disk. The mob ids are deliberately generic
 * (`mob-a`, `mob-b`) rather than `troll`/`thief` — naming them after Zork actors
 * would read as the casting decision this fixture is not making. bolo and xeno
 * are picked for contrast in silhouette and for full emotion coverage (12 each),
 * so a layout bug that only shows on a wide or a short body has somewhere to show.
 */
export const FIXTURE_ROLES: Readonly<Record<string, string>> = {
  hero: "dan.avb",
  guide: "tiki.avb",
  "mob-a": "bolo.avb",
  "mob-b": "xeno.avb",
};

/** A neutral, priority-1 emotion set — the DM's own (`mapper.ts`), reused for mobs. */
export const NEUTRAL: Body["emotion"] = [{ angle: 0, intensity: 0, priority: 1 }];

export interface PackedFixture {
  manifest: CastManifest;
  /** Role → packed sheet, undecoded. `loadFixtureCast` turns these into images. */
  rasters: Map<string, Raster>;
}

/**
 * Parse and pack N avatars from the corpus. Pure, sync, no canvas.
 *
 * Packing all four costs ~1s, so callers that run per-test should hoist it to
 * module scope (`describe` body), as the corpus tests do.
 */
export function packFixtureCast(roles: Readonly<Record<string, string>> = FIXTURE_ROLES): PackedFixture {
  const cast: Record<string, PackedAvatar> = {};
  const rasters = new Map<string, Raster>();
  for (const [role, file] of Object.entries(roles)) {
    const bytes = new Uint8Array(readFileSync(join(CORPUS, file)));
    const { avatar, sheet } = packAvatar(parseAvatar(bytes, file), file.replace(/\.avb$/i, ""));
    cast[role] = avatar;
    rasters.set(role, sheet);
  }
  return { manifest: { version: 1, cast, backdrops: [] }, rasters };
}

/**
 * A {@link Cast} whose sheets are placeholders.
 *
 * Everything upstream of `drawFigure` — pose selection, the face/torso join,
 * `layoutAvatars` — reads the manifest only; `renderPanel` consults `sheets` just
 * to *skip* bodies whose art is missing (`render.ts:132`). So a geometry test needs
 * a non-null entry per role and no pixels, which is what keeps these tests free of
 * a canvas dependency.
 */
export function stubCast(packed: PackedFixture): Cast {
  const sheets = new Map<string, ImageBitmap>();
  for (const role of packed.rasters.keys()) sheets.set(role, {} as ImageBitmap);
  return { manifest: packed.manifest, sheets, backdrops: new Map(), choice: {} };
}

/**
 * On-stage bodies for `roles`, in insertion order — the stable slot order
 * `orderBodies` stubs.
 *
 * `requested` defaults to true because a layout fixture exists to *stage what it
 * is given*: `IsSpeaker` (`panel.cpp:822`) would otherwise drop every silent body
 * and quietly turn an N-body case into a smaller one. Pass `false` to exercise the
 * gate itself.
 */
export function fixtureBodies(
  roles: readonly string[], emotion: Body["emotion"] = NEUTRAL, requested = true,
): Body[] {
  return roles.map((speaker) => ({ speaker, emotion, requested }));
}

/**
 * The same fixture with real, decoded sheets, plus the shipped backdrops.
 *
 * Backdrops come from the built assets rather than from `reference/`: the PNGs in
 * `web/assets/comic/` are tracked, so a PNG harness works from a clean checkout.
 * A missing bundle is not fatal — the fixture is about bodies — so the backdrops
 * are skipped with a note rather than throwing.
 */
export async function loadFixtureCast(
  roles: Readonly<Record<string, string>> = FIXTURE_ROLES,
): Promise<Cast> {
  const { loadImage } = await import("@napi-rs/canvas");
  const packed = packFixtureCast(roles);

  const sheets = new Map<string, Awaited<ReturnType<typeof loadImage>>>();
  for (const [role, raster] of packed.rasters) {
    sheets.set(role, await loadImage(Buffer.from(encodePng(raster))));
  }

  const backdrops = new Map<string, Awaited<ReturnType<typeof loadImage>>>();
  const manifest = packed.manifest;
  try {
    const shipped = JSON.parse(readFileSync(join(ASSETS, "cast.json"), "utf8")) as CastManifest;
    for (const backdrop of shipped.backdrops) {
      backdrops.set(backdrop.id, await loadImage(join(ASSETS, backdrop.file)));
    }
    manifest.backdrops = shipped.backdrops;
  } catch {
    console.warn("cast-fixture: no built backdrops in web/assets/comic — rendering bodies only");
  }

  // napi Images satisfy every `drawImage` call site at runtime, which is all the
  // renderer uses them for (the same cast as `render-panel.ts` makes).
  return { manifest, sheets, backdrops } as unknown as Cast;
}
