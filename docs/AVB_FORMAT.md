# The Comic Chat `.avb` Avatar Format

Normative notes for reading Microsoft Comic Chat avatar files. Written during stage 5.1,
first while building `art/poc/avbdec.py` and then while porting it to `art/src/`.

**Status:** stage 5.1 complete. Verified against all 191 `.avb` files in
`original-projects/comic-chat/` — 191/191 parse, 4656/4656 images decode, 2066 masks and
2908 auras decode, 4656 poses rasterize, 2348 face/torso composites assemble. The
TypeScript decoder is byte-identical to the Python POC on every directly comparable pose.

## Why this document exists

The format is well specified *in the historical source* — `artifacts/avtools/avbfile.h`
is 492 commented lines of structs, enums, and record codes, and `avbfile.cpp` is a
complete reference reader. You do not need to reverse-engineer anything.

But a reader written from the header alone will produce wrong output in five places,
and four of those fail **silently** — garbage pixels or nonsense metadata rather than an
exception. Those five are recorded in "Gotchas" below. That section is the reason this
file exists; the rest is orientation.

## Source of truth

| File (under `original-projects/comic-chat/`) | What it gives you |
|---|---|
| `artifacts/avtools/avbfile.h` | Structs, record-code enum, image format/palette enums |
| `artifacts/avtools/avbfile.cpp` | Reference reader; tag dispatch at `HandleLoadTag` |
| `v2.1b/cchat/avatario.cpp` | Client-side pose record reader — **authoritative for field scaling** |
| `v2.1b/cchat/avatar.h` | Emotion wheel constants (`EM_*`), avatar flag bits |
| `v2.1b/cchat/avatar.cpp` | Pose selection (`GetBodyFromEmotion`, `GetHeadAndBodyFromEmotion`) |
| `v2.1b/cchat/bodycam.cpp` | Compositing geometry (`GetBodyBox`) and the plane blits (`DrawBody`) |

Where `avbfile.cpp` and `avatario.cpp` disagree, `avatario.cpp` describes the file and
`avbfile.cpp`'s protocol helpers describe the wire format. See gotcha 4.

## File structure

```
AVATARHEADER            6 bytes: INT16 magic, INT16 type, INT16 version
  magic    0x8181 (new) | 0x81 (old)
  type     1 = AT_SIMPLE | 2 = AT_COMPLEX | 3 = AT_BACKDROP
  version  current = 2

tagged record stream    repeats until AK_STARTDATA
  INT16 tag
  INT16 size            ONLY when tag >= 256
  <payload>

image blob section      everything after AK_STARTDATA; records point in by offset
```

Records with tag ≥ 256 carry an explicit size, so an unknown one is skippable — the
format was designed for forward compatibility. A decoder that handles the tags it cares
about and skips the rest is viable. Records with tag < 256 are the older set and have no
size field; encountering an unknown one is unrecoverable.

### Records seen in the corpus

| Tag | Name | Payload |
|---|---|---|
| 1 | `AK_NAME` | NUL-terminated string |
| 2 | `AK_FLAGS` | INT16 |
| 3 | `AK_ICON` | INT32 offset (implies DIB / no palette) |
| 4/10 | `AK_NFACES` / `AK_NFACES2` | INT16 count, then count × face record |
| 5/11 | `AK_NTORSOS` / `AK_NTORSOS2` | INT16 count, then count × torso record |
| 6 | `AK_STARTDATA` | none — ends the record stream |
| 8 | `AK_STYLE` | INT16 |
| 9/12 | `AK_NBODIES` / `AK_NBODIES2` | INT16 count, then count × body record |
| 256 | `AK_ICON_NEW` | `AVATARICONDATA` |
| 257 | `AK_COLORPALETTE` | INT16 count, then count × 3-byte RGB |
| 259 | `AK_COPYRIGHT` | NUL-terminated string |
| 260/261 | `AK_ORIGINAL_URL` / `AK_OVERRIDE_URL` | NUL-terminated string |
| 262 | `AK_USAGE_FLAGS` | INT8 |
| 263 | `AK_OFFSET_ADJUSTMENT` | INT32 signed — see gotcha 1 |

The `2` variants (`AK_NFACES2` etc.) are the newer, more compact record layouts. The
non-`2` variants use the `olddata` structs, which are larger because of trailing padding.
Both appear in the corpus.

## Avatar types and composition

**`AT_SIMPLE`** — one *body* image per pose. Whole figure, drawn as a unit.

**`AT_COMPLEX`** — *face* and *torso* are separate images composited at runtime.
Torso images are headless. This multiplies effective variety: Tiki ships 20 faces × 12
torsos, not 32 poses.

**`AT_BACKDROP`** — declared by the format; **zero instances exist in the corpus.** The
only shipped backdrops are three plain `.bmp` files in `v1.0-pre-modern/comicart/backdrop/`
(`field`, `pastoral`, `room8bs`, all 315×315).

Composition geometry (`cx`/`cy`, `cxDelta`/`cyDelta`, `x`/`y`) is specified under
"Compositing" below.

## Pose records

Every pose carries three image offsets (image, mask, aura) plus an emotion tag. Field
sets differ per part — see gotcha 2.

| Part | Fields after the three offsets |
|---|---|
| body | `nEmotion`, `byIntensity`, `x`, `y` |
| face | `nEmotion`, `byIntensity`, `cx`, `cy`, `cxDelta`, `cyDelta`, `x`, `y` |
| torso | `nEmotion`, `byIntensity`, `cx`, `cy` |

New-layout records then append six bytes: image/mask/aura format, then image/mask/aura
palette type. Old-layout records have neither — they are always DIB / no-palette.

Packed sizes (`#pragma pack(1)`, no padding): body 35/25, face 43/33, torso 35/25
(old/new).

### Emotion vocabulary

An 8-point wheel plus neutral, indexed 1–9, then 8 named gestures (10–17):

```
1 HAPPY   2 COY    3 BORED   4 SCARED   5 SAD   6 ANGRY   7 SHOUT   8 LAUGH
9 NEUTRAL
10 WAVE   11 POINTOTHER  12 POINTSELF  13 DOUBLEPOINT
14 SHRUG  15 3QRWALK     16 SIDEWALK   17 3QFWALK
```

Corpus totals: NEUTRAL 1157, ANGRY 595, HAPPY 436, COY 414, LAUGH 406, BORED 321,
SCARED 315, SHOUT 267, SAD 232, WAVE/POINT\* 465, SHRUG + walks 48.

## Images

Two storage formats and six palette modes; three combinations occur:

| `(format, palette)` | Count | Meaning |
|---|---|---|
| `(AIF_DIB, AIP_NOPALETTE)` | 2906 | A complete `.BMP` file embedded at the offset |
| `(AIF_LZDEFLATE, AIP_MASKEDMONO)` | 1364 | zlib, 2bpp masked monochrome |
| `(AIF_LZDEFLATE, AIP_LOCALPALETTE)` | 386 | zlib, palette inline at the offset |

**`AIF_DIB`** — seek to the offset and read a whole BMP, `BITMAPFILEHEADER` onward.
Some are BI_RLE4 compressed (gotcha 5).

**`AIF_LZDEFLATE`** — at the offset:
```
[palette, if AIP_LOCALPALETTE:  INT16 tag(=257), INT16 size, INT16 count, count×3 bytes]
INT32  header size (40..240)
       BITMAPINFOHEADER minus its first DWORD
INT32  uncompressed size
INT32  compressed size
       zlib stream
```
Plain zlib — `DecompressionStream('deflate')` handles it natively in a browser, which
matters for the eventual TypeScript port.

## Compositing

An `AT_COMPLEX` avatar stores headless torsos and separate faces and joins them at render
time. The join is defined by three numbers per part, all in the drawing's own pixel space:

| Field | On | Meaning |
|---|---|---|
| `cx`, `cy` | torso | The neck socket — where a head attaches |
| `cx`, `cy` | face | The corresponding anchor inside the face image |
| `cxDelta`, `cyDelta` | face | A per-face nudge from that socket (tilted head, thrown-back laugh) |
| `x`, `y` | face, body | `faceX`/`faceY` — the balloon-tail attach point, not a placement |

The face is drawn at

```
offset = torso.c + face.cDelta - face.c
```

which lands the face's own anchor on the torso's socket, then applies the nudge. The
offset may be negative, so the composite's bounding box is the union of the torso at the
origin and the face at `offset`, and both parts are rebased onto that box
(`CBodyDouble::GetBodyBox`, `bodycam.cpp:527`; `GetDimInfo`, `avatar.cpp:106`, computes
the same thing independently).

Draw order comes from the avatar's `AK_FLAGS`. It is visible: whichever part is drawn
second overlaps the other at the neck, so `TORSOFIRST` decides whether a collar sits over
the jaw or under it.

| Bit | Name | Effect |
|---|---|---|
| 1 | `HEADMASK` | The face's mask plane is blitted |
| 2 | `TORSOMASK` | The torso's mask plane is blitted |
| 4 | `TORSOFIRST` | Torso drawn first, head over it |
| 8 | `OTHERMAPPED` | Unused in this corpus |

Observed combinations: `5` (`HEADMASK|TORSOFIRST`) on 167 files, `2` on 6, `0` on 18.
A simple avatar's body never blits a mask at all — `CBodySingle::DrawBody` draws only the
aura and the drawing.

### The three planes

Every pose carries up to three image offsets, and Comic Chat drew them as three Win32
blits (`bodycam.cpp:438`):

```
aura     MERGEPAINT   dest = dest | ~src    punch a white halo
mask     MERGEPAINT   dest = dest | ~src    punch the figure silhouette
drawing  SRCAND       dest = dest & src     AND the ink in
```

Read as alpha rather than as raster ops that says: **the mask and aura planes define
coverage, the drawing defines colour, and any pixel no plane punched keeps the backdrop**
— which is transparency. The three-blit sequence is a Win32 detail; a renderer with an
alpha channel does not need it.

Masked-mono poses carry no separate planes because all three ride in one 2bpp bitmap. In
the corpus: 2906 DIB poses have an aura and 1682 of those also a mask; 384 deflate poses
carry an `AIP_DUALMASK` mask; 1364 masked-mono poses carry neither.

The aura is the white halo that lifted a figure off a backdrop. It is pure presentation —
worth keeping separable, since a renderer compositing onto its own background may not
want it.

## Gotchas

Eight things a header-only reader gets wrong. Ordered by how much time each costs.

### 1. `AK_OFFSET_ADJUSTMENT` is a 32-bit read

`avbfile.cpp:942` says "signed 2-bit integer". It means **32-bit** — the code is
`Read32`. The value accumulates (`+=`) across records and applies to every subsequent
image offset, but **only to non-zero offsets** (`ADJUST_OFFSET`).

Tiki carries `adjust=77`. Skip this and every offset in the file is wrong.

This is the one failure that is *loud* — you land mid-blob and the magic check fails.

### 2. Body, face, and torso have different field sets

Torso has `cx`/`cy` but **no** `x`/`y`. Body has `x`/`y` but no `cx`/`cy`. Only face has
all six. See the table above.

Assuming a shared layout misaligns every torso record by four bytes. It does **not**
crash — you get plausible-looking records whose format and palette bytes are garbage
(e.g. `format=3`, `palette=132`, neither of which is a valid enum value). Sanity-check
that every format is 0 or 1 and every palette type is 0–5; anything else means the
struct walk is off.

### 3. `MaskedMonoPalette` is not the render palette

`avbfile.cpp:8` defines `MaskedMonoPalette = {white, black, (128,0,0), (0,0,128)}`. That
array is the DIB colour table used while splitting a masked-mono image into three 1bpp
DIBs for Win32 `BitBlt` raster ops (`ConvertFromMaskedMono`). It is **not** what the
pixels mean.

The semantics are:

```
00 = blank    01 = aura    10 = paper    11 = ink
```

**The header comment is wrong about the last two, and it is worth being explicit about
because trusting it inverts every masked-mono figure.** `avbfile.h:93` claims
`10 = black, 11 = white`. The code that actually runs disagrees:
`CPose::ConvertMasksCommon` (`avbfile.cpp:1636`) splits the pair into three 1bpp DIBs —
image, mask, aura —

```
00 => 0,0,0    01 => 1,0,1    10 => 0,1,1    11 => 1,1,1
```

and gives each DIB the colour table `[white, black]`. So in the image DIB `10` → 0 →
white (paper) and `11` → 1 → black (ink), the opposite of the header. The following line,
`pbDestBits[0] &= pbDestBits[1]`, then forces the aura-only region to white, which is why
`01` never carries ink.

Rendering straight to RGBA: blank → transparent, aura → the white halo drawn behind the
figure to lift it off a backdrop, paper → white, ink → black. Using the palette array
instead yields a dark-red and navy figure — recognisably the right *shape*, which makes it
easy to assume the decode succeeded. The inversion is the same trap one level down: the
shapes stay perfectly correct and only the polarity is wrong, so it survives any test that
checks coverage rather than colour. It shipped in v1.4.0 for exactly that reason;
`art/test/polarity.test.ts` now pins the mapping corpus-wide.

The three-DIB split is a Win32 implementation detail. A modern renderer with an alpha
channel does not need it.

### 4. Intensity is `byte / 255`, and there are two conflicting scalings

`avatario.cpp:158` — the file reader — is authoritative:

```c
fRec[i].intensity = (UCHAR) read8(fp) / (float)255;
```

Elsewhere in the *same file*, `EmotionToBytes` / `BytesToEmotion` use `intensity * 10`
and an `IndexToByte` transform (`+'0'`). Those are the **network protocol** path, not the
file format. Using them yields intensities like `15.3` where the range should be 0.0–1.0.

Emotion, by contrast, *is* a raw index in the file — no `IndexToByte` applied.

### 5. Four images are BI_RLE4-compressed BMPs

Check `biCompression` on embedded DIBs. Most are `BI_RGB`, but four are `BI_RLE4` (= 2)
and need a real run-length decoder: encoded runs, plus escapes for end-of-line,
end-of-bitmap, delta, and absolute runs padded to word boundaries. RLE rows are bottom-up.

The four are Bolo torso10, Cro torso12, Denise torso08, Lynnea torso17 — each duplicated
across four version directories, hence 16 failures if unhandled. No `BI_RLE8` in the
corpus, though handling it is nearly free once RLE4 works.

### 6. Mask and aura plane polarity is not constant

A mask or aura plane is a 1bpp DIB, so it is tempting to treat index 0 as the figure.
**2833 aura planes ship the colour table `[white, black]` — and 73 ship `[black, white]`.**
Assume either one and the other group renders inverted: a solid rectangle with a
figure-shaped hole, or nothing at all.

Read the polarity from the plane's own colour table. Testing luminance (`< 128` is the
punched side) rather than the raw index decodes both groups correctly and costs nothing.

Fails silently.

### 7. `AIP_DUALMASK` planes are masked-mono, not 1bpp

384 deflate poses carry a mask with palette type 5 (`AIP_DUALMASK`). These are 2bpp with
the masked-mono colour table and the masked-mono encoding — mask *and* aura in one
bitmap, which is what "dual" names. Decoding one as 1bpp reads four pixels where there
are two.

### 8. One asset relies on the blits having been `StretchBlt`

Comic Chat blitted every plane into the *same destination rectangle* as the drawing, so a
plane whose dimensions disagreed was silently scaled. **Xeno's LAUGH face carries 145×150
planes against a 150×158 drawing**, in all four versions of the file. It is the only such
asset in the corpus; every other plane matches its drawing exactly.

A decoder that indexes plane pixels by the drawing's stride reads that one pose skewed.
Resample planes to the drawing's dimensions instead.

## Licensing

`AK_COPYRIGHT` and `AK_USAGE_FLAGS` exist and the format supports embedded usage
restrictions. In this corpus `AK_USAGE_FLAGS` is **unset everywhere**; `AK_COPYRIGHT`
carries a Microsoft notice in the v2.5 files. Nothing in the format complicates the MIT
grant covering these assets — see `NOTICE` and `THIRD_PARTY.md`.

## Implementation

`art/src/` is the production decoder (TypeScript, per ADR 0002); `art/poc/avbdec.py` is
kept as the reference the port was validated against.

| Module | Covers |
|---|---|
| `avb.ts` | Record stream, pose records, offset adjustment |
| `image.ts` | Both storage formats, all palette modes, RLE4/RLE8 |
| `raster.ts` | Plane coverage → RGBA, polarity, plane resampling |
| `pose.ts` | Emotion wheel and pose selection |
| `composite.ts` | Face-onto-torso join |
| `png.ts` | Output encoding |

The only platform dependency is `inflate.ts` (Node `zlib`). `AIF_LZDEFLATE` blobs are
plain zlib, so a browser-side decoder swaps that one file for
`DecompressionStream("deflate")`.

## Open work

- **Sprite-sheet packing.** `art/tools/avbdump.ts` emits one PNG per pose plus a JSON
  manifest. Packing into a sheet is a build-pipeline concern, deferred until stage 5.3
  shows what the renderer actually wants to load.
- **Backdrops.** `AT_BACKDROP` is defined by the format but has zero instances; three
  plain `.bmp` files are all that ship. Zork I has 110 rooms. This is an M5 design
  question, not a decoding one.
