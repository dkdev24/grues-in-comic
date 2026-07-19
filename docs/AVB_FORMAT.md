# The Comic Chat `.avb` Avatar Format

Normative notes for reading Microsoft Comic Chat avatar files. Written during stage 5.1
while building `art/poc/avbdec.py`, which decodes the full corpus.

**Status:** verified against all 191 `.avb` files in `original-projects/comic-chat/` —
191/191 parse, 4656/4656 images decode.

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
| `v2.1b/cchat/avatar.h` | Emotion wheel constants (`EM_*`) |

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
only shipped backdrops are three plain `.bmp` files in `v1.0/client/comicart/backdrop/`
(`field`, `pastoral`, `room8bs`, all 315×315).

Composition geometry (`cx`/`cy`, `cxDelta`/`cyDelta`, `x`/`y`) is parsed by the POC but
**not yet interpreted** — placement logic lives in `GetHeadAndBodyFromEmotion`
(`v2.1b/cchat/avatar.cpp`) and is unfinished work.

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

## Gotchas

Five things a header-only reader gets wrong. Ordered by how much time each costs.

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

The semantics are at `avbfile.h:98`:

```
00 = blank    01 = aura    10 = black    11 = white
```

Rendering straight to RGBA, use those: blank → transparent, aura → the white halo drawn
behind the figure to lift it off a backdrop, black → ink, white → paper. Using the
palette array instead yields a dark-red and navy figure — recognisably the right *shape*,
which makes it easy to assume the decode succeeded.

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

## Licensing

`AK_COPYRIGHT` and `AK_USAGE_FLAGS` exist and the format supports embedded usage
restrictions. In this corpus `AK_USAGE_FLAGS` is **unset everywhere**; `AK_COPYRIGHT`
carries a Microsoft notice in the v2.5 files. Nothing in the format complicates the MIT
grant covering these assets — see `NOTICE` and `THIRD_PARTY.md`.

## Open work

- **Compositing.** Face-onto-torso placement from `cx`/`cy`/`cxDelta`/`cyDelta`;
  selection logic in `GetHeadAndBodyFromEmotion` (`v2.1b/cchat/avatar.cpp`).
- **Mask and aura planes.** The POC decodes the image plane only. Masked-mono images
  carry all three in one 2bpp bitmap, so those are complete; DIB-format poses have
  separate mask/aura offsets that are parsed but not decoded.
- **TypeScript port.** Per ADR 0002 the production pipeline is TS. Expected output is a
  PNG sprite sheet plus a JSON manifest of `{character, part, emotion, intensity,
  cx, cy, x, y}` so the engine's `speech` events can be matched against pose metadata
  without runtime `.avb` parsing.
