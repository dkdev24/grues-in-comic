# Art

Comic Chat visual assets: reading the historical `.avb` avatar format and, later, the
build-time pipeline that turns it into engine-consumable sprite data.

**Status:** stage 5.1 POC. Format decoding is solved and verified; nothing here is wired
into a build yet, and the production pipeline is not written.

The normative format specification is `docs/AVB_FORMAT.md` (repo root). Read it before
touching the decoder — it records five undocumented behaviours that a reader written from
the historical header alone will get wrong, four of them silently.

## Layout

| Path | Purpose |
|---|---|
| `poc/avbdec.py` | Reference `.avb` decoder — parses records, decodes images, writes PNG. Stdlib only. |

## Running the POC

```sh
python3 art/poc/avbdec.py <file.avb> <outdir> [limit]
```

For example, from the repo root:

```sh
python3 art/poc/avbdec.py \
  original-projects/comic-chat/v2.5-beta-1/comicart/tiki.avb /tmp/tiki
```

writes 32 PNGs named by part, emotion, and intensity — `face13_ANGRY_1.0.png`,
`torso06_WAVE_1.0.png`, and so on. Transparent background, black ink, white paper and
aura halo.

## Verification

Run against the whole corpus: **191/191 files parse, 4656/4656 images decode.**

There is no test harness yet. The corpus sweep in the stage 5.1 session was ad hoc; a
regression test belongs here once the module grows a real toolchain.

## Why Python, and why it is a POC

ADR 0002 commits the project to TypeScript across subsystems, and the production art
pipeline will be TypeScript. This decoder exists to *establish and document the format
semantics*, the same role `ir/poc/` plays for behavior evaluation — the substrate stays
as documentation once the real implementation lands.

Do not build the M5 asset pipeline on this script. Port it. The format work it encodes is
the durable part; the language is not.

## What is here, and what the assets actually are

31 distinct characters across 191 files (the corpus carries several versions of most).
Five — Tux, Waf, Rainbow, Pedagogue, Greg — are single-pose stubs, not usable cast. The
rest carry 18–43 poses each.

`AT_COMPLEX` avatars store faces and torsos separately and composite at runtime, so
effective variety is much higher than raw pose counts suggest.

Backdrops are the real scarcity: the format defines an `AT_BACKDROP` type but **no
instance exists in the corpus**. The only shipped backdrops are three 315×315 `.bmp`
files in `original-projects/comic-chat/v1.0/client/comicart/backdrop/`. Zork I has 110
rooms, and closing that gap is an open M5 design question, not a decoding problem.

## Open work

Tracked in full at the end of `docs/AVB_FORMAT.md`: face/torso compositing, mask and aura
planes for DIB-format poses, and the TypeScript port.
