# Art

Comic Chat visual assets: reading the historical `.avb` avatar format, selecting poses
from an emotion, and compositing faces onto torsos.

**Status:** stage 5.1 complete, and wired into a build at 5.3. Format decoding, pose
selection and compositing are implemented and verified against the whole corpus;
`tools/avbpack.ts` now emits the browser cast bundle the web shell loads.

The normative format specification is `docs/AVB_FORMAT.md` (repo root). Read it before
touching the decoder — it records eight undocumented behaviours that a reader written
from the historical header alone will get wrong, six of them silently.

The presentation algorithms this module implements the *asset half* of are analysed in
`wiki/comic-chat-presentation.md`.

## Layout

| Path | Purpose |
|---|---|
| `src/avb.ts` | Record stream, pose records, offset adjustment |
| `src/image.ts` | Both storage formats, all palette modes, RLE4/RLE8 |
| `src/raster.ts` | Mask/aura plane coverage → RGBA |
| `src/pose.ts` | Emotion wheel and pose selection |
| `src/composite.ts` | Face-onto-torso join |
| `src/png.ts` | PNG output |
| `src/inflate.ts` | The one platform dependency — see below |
| `src/bmp.ts` | Standalone `.bmp` files (the three shipped backdrops) as opaque rasters |
| `src/cast-manifest.ts` | The browser bundle's types — a leaf that imports nothing, deliberately |
| `src/pack.ts` | Sheet packing: every part of an avatar onto one raster |
| `tools/avbdump.ts` | CLI: **inspect** — one PNG per pose, or assembled figures |
| `tools/avbpack.ts` | CLI: **build** — the cast bundle the browser loads |
| `poc/avbdec.py` | The Python reference the TypeScript was validated against |

## Running

```sh
npm --prefix art install

# every pose as its own PNG
npx --prefix art tsx art/tools/avbdump.ts \
  original-projects/comic-chat/v2.5-beta-1/comicart/tiki.avb /tmp/tiki

# assembled figures: each face on a neutral torso, each torso under a neutral face
npx --prefix art tsx art/tools/avbdump.ts \
  original-projects/comic-chat/v2.5-beta-1/comicart/tiki.avb /tmp/tiki --composite
```

`--no-aura` drops the white halo, which is presentation rather than figure.

```sh
# the browser cast bundle: sheets + cast.json into web/assets/comic/
npm --prefix art run pack

# the choosable roster (F16): one sheet + one manifest per character, plus
# roster.json, into web/assets/comic/roster/ — who is offered is art/src/roster.ts
npm --prefix art run pack:roster
```

Both outputs are **committed build artifacts**, and a decode change invalidates both. The two are
separate because they are used differently: `pack` builds the canonical cast the pixel gate renders
and never varies, `pack:roster` builds skins the player picks between, fetched one cast at a time.
`rosterpack` also enforces the machine-checkable half of ADR 0004 §11 — complex type, and a face for
every emotion the role's markers fire — and refuses to pack a character who fails it. Legibility and
register it cannot check: look at `roster-sheet.ts` output before adding anyone.

## Packing, decided at 5.3 (⚑ Gate D)

This was the open question 5.1 deferred. The answer, and why none of it is the obvious
choice, is documented on `src/cast-manifest.ts`; in short:

- **Parts are packed, not figures.** A complex avatar composites faces × torsos at draw
  time, so dan's 187 figures are 28 drawings. Baking figures multiplies the payload by an
  order of magnitude for identical pixels *and* freezes the join, which ADR 0004 §8's
  round-robin exists to keep re-pairing.
- **A figure and its aura are separate sub-rects.** A correctness requirement, not an
  optimization: both halos must be drawn before either figure, so a part flattened into one
  image has the second blit taking a halo-shaped bite out of the first at the neck.
- **One sheet per avatar**, shelf-packed. The whole two-role cast plus three backdrops is
  five requests and ~330 KiB.

**The browser never runs the decoder.** It imports `format.ts` and `pose.ts` — the emotion
wheel, pure arithmetic — and loads PNGs for everything else. That is why the selectors in
`pose.ts` are generic over `{ angle, intensity }` rather than fixed to `PoseRecord`: it lets
the shell run the real wheel over manifest entries instead of forking it.

## Verification

```sh
npm --prefix art test
```

The corpus is fixed and version-controlled, so the sweep asserts exact counts — a change
in any of them is a regression, not a flaky total.

**191/191 files parse · 4656/4656 images decode · 2066 masks and 2908 auras decode ·
4656 poses rasterize · 2348 composites assemble.**

Two of those deserve naming, because they are the assertions that catch silent failure
rather than crashes:

- Every rasterized pose must have *some* opaque pixel and *some* transparent one. A
  coverage or polarity bug yields a blank or solid raster, never an exception.
- Every pose record's format and palette bytes must be valid enum values. A misaligned
  struct walk produces plausible records with garbage in those fields.

The TypeScript decoder was checked pose-by-pose against `poc/avbdec.py`: **194/194
directly comparable poses hash byte-identical.** ("Directly comparable" means masked-mono
poses with no separate planes — the POC never implemented plane compositing, so the DIB
poses have no Python output to compare against.)

## Portability

`src/inflate.ts` is the only file that touches a platform API. `AIF_LZDEFLATE` blobs are
plain zlib, so a browser-side decoder swaps it for `DecompressionStream("deflate")` and
the rest of the module runs unchanged. This pipeline is build-time, so it uses Node's
synchronous inflate.

## Why the Python is still here

`poc/avbdec.py` established the format semantics; the TypeScript is what ADR 0002 commits
the project to. The POC stays as the independent implementation the port is checked
against — which is the only reason the byte-identical claim above means anything.

## What the assets actually are

31 distinct characters across 191 files (the corpus carries several versions of most).
Five — Tux, Waf, Rainbow, Pedagogue, Greg — are single-pose stubs, not usable cast. The
rest carry 18–43 poses each.

`AT_COMPLEX` avatars store faces and torsos separately and composite at runtime, so
effective variety is much higher than raw pose counts suggest: Tiki's 32 records are 20
faces and 12 torsos, which is 240 figures, not 32.

Backdrops are the real scarcity: the format defines an `AT_BACKDROP` type but **no
instance exists in the corpus**. The only shipped backdrops are three 315×315 `.bmp` files
in `original-projects/comic-chat/v1.0-pre-modern/comicart/backdrop/` — `pastoral`, `field`
and `room8bs`. Zork I has 110 rooms, and closing that gap is an open M5 design question,
not a decoding problem: 5.3 ships a stub room→backdrop rule in `web/src/comic-view.ts` that
proves the renderer can place one and claims nothing more.
