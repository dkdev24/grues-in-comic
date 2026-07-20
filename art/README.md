# Art

Comic Chat visual assets: reading the historical `.avb` avatar format, selecting poses
from an emotion, and compositing faces onto torsos.

**Status:** stage 5.1 complete. Format decoding, pose selection and compositing are
implemented and verified against the whole corpus. Nothing here is wired into a build
yet — sprite-sheet packing waits on stage 5.3, which will show what the renderer wants.

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
| `tools/avbdump.ts` | CLI: dump an avatar as PNGs plus a JSON manifest |
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
instance exists in the corpus**. The only shipped backdrops are three 315×315 `.bmp`
files in `original-projects/comic-chat/v1.0/client/comicart/backdrop/`. Zork I has 110
rooms, and closing that gap is an open M5 design question, not a decoding problem.
