# Vector backdrops

Workflow: **author SVG -> rasterize -> threshold to 1-bit**, as an alternative to
image generation for the backdrops that are still missing
(`docs/backdrop-generation-plan.md`, Image 4) and as a candidate replacement for
the ones that ship today.

    pnpm install                           # first time only — installs tsx + roughjs
    node gen_early.mjs                     # the ten early-game scenes -> early/*.svg
    pnpm exec tsx render.ts                # rasterize + threshold -> early/png/{512,264}
    pnpm exec tsx ab.ts                    # build the A/B page -> ab/index.html
    ./measure.sh field-copy                # ink ratio for a single scene

`woodring.mjs` is the engine (ribbons, line families, mottle, foliage lobes).
`kit.mjs` is the layer above it: a `Scene` to compose into, `hatch()` for a line
family at any angle, and the forms these scenes keep needing -- sky, trunks,
walls, tufts, rocks. `scenes/*.mjs` are the drawings; `scenes/common.mjs` holds
what more than one of them uses.

`gen_woodring.mjs` (an original scene) and `gen_field.mjs` (a copy of the shipped
`field` backdrop, as a style test) predate the kit and call the engine directly.

## The early-game set and the A/B

Ten scenes covering the white house and the forest around it -- the rooms a
player sees first, and the ones three shipped backdrops currently cover between
them:

| scene | rooms | replaces |
|---|---|---|
| `house-west` | WEST-OF-HOUSE | `field` |
| `house-north` | NORTH-OF-HOUSE | `field` |
| `house-south` | SOUTH-OF-HOUSE | `field` |
| `house-behind` | EAST-OF-HOUSE | `field` |
| `forest-dense` | FOREST-1/2/3 | `pastoral` |
| `forest-path` | PATH | `pastoral` |
| `forest-edge` | FOREST-3, MOUNTAINS | `pastoral` |
| `up-a-tree` | UP-A-TREE | `pastoral` |
| `clearing-grating` | CLEARING, GRATING-CLEARING | `grating-clearing` |
| `stone-barrow` | STONE-BARROW | `barrow-exterior` |

`ab.ts` builds a blind side-by-side of each vector plate against the image-model
backdrop it would replace, both thresholded to 1-bit at cell size, with the ink
ratio on each. **Nothing here is wired into `backdrop.ts` and no shipped asset
has changed** -- this is a comparison, not a swap.

### Draw order is load-bearing

A `bulb` closes with a bowed cap, so a trunk that stops in mid-frame reads as an
open pipe. Trunks are drawn long and buried at both ends: the canopy goes over
their tops, `groundFill()` over their feet. Getting this backwards was the first
version's most visible failure.

The `.svg` output is **generated and gitignored** -- it regenerates in seconds and runs to
megabytes (the superseded rough.js scene alone is ~1.9 MB). The small PNG renders **are**
committed, so a result stays reviewable without running anything.

## Calibrate against the real art, not against `reference/backdrops/`

`reference/backdrops/*.png` are AI-generated approximations. The actual Jim
Woodring backdrops ship with Comic Chat as `.bgb` files and are decoded by
`art/tools/bgbdump.ts` into `reference/backdrops-original/`:

    cd art && pnpm run dump:bgb -- ../reference/comic-chat-v2.5-beta-1-modern/comicart/*.bgb

`pastoral`, `room` and `field` are the 1-bit ones and are the idiom to match.
Two earlier engines here were built against the AI set and both missed, because
that set is a *wood engraving* and the Woodring art is not.

## The five rules of the idiom

Read off the decoded originals:

1. **One line family per region, at constant pitch.** Never cross-hatching.
2. **Tone is line THICKNESS, not spacing.** A line swells to carry shadow and
   thins away to nothing to carry light. `room.png` is one horizontal family
   across the entire image, and every value in it is weight.
3. **Lines follow the contour of the form.** Each object gets its own family
   running with its own shape, which is what describes the round of it.
4. **Bold closed outlines**, and the shapes are bulbous and organic.
5. **Flat frieze composition.** No vanishing point, no chiaroscuro. Foregrounds
   are white, marked only with sparse tufts.

## The primitive

Because tone is thickness, the drawing primitive is not a stroke -- SVG cannot
vary `stroke-width` along a path. It is a **ribbon**: a filled polygon built
around a centreline whose width varies per point (`ribbon()`). `lineField()`
lays down a whole family of them, taking a `line(t)` that walks the family and
a `tone(x, y)` that sets the weight.

## `cut`: how a 1-bit line carries light

The most important thing learned building the field copy, and it applies to
every scene.

A line **cannot** carry light by thinning below one output pixel. At that width
it does not read as a fine line, it reads as grey, and the whole field goes soft
and blurry -- which is exactly how the first version of this sky failed. The
originals never do this: every mark in them is full black.

They **break** the line instead. `lineField({ cut })` omits the line wherever
`tone < cut` rather than thinning it, and `wmin` is held at or above one output
pixel. Light comes from absence, not from faintness.

## One hand: every family carries the same mottle

`mottle(x, k)` is the three-scale weight noise below, and it is applied to
*every* line family in a scene -- sky, forms, ground alike. This is the single
biggest thing separating a drawing from vector art. A form whose contour lines
are smooth ribbons of smoothly-varying width reads as a shaded 3D object no
matter how good its geometry is; the same form with the sky's own irregular
thick/thin along each line reads as drawn. In the originals every family is
visibly one hand.

## Sky texture: three noise scales

Measured off a 5x crop of the original. The lines are very nearly straight --
vertical wander is under a pixel at native size -- and all of the character is
thickness variation *along* each line. That variation needs three scales, and
the fast one is the one that is easy to miss:

| term | wavelength | what it does |
|---|---|---|
| `micro` | ~3px | the fine mottle; without it, breaks come out as long dashes |
| `fine` | ~14px | the main thick/thin rhythm |
| `broad` | ~38px | slow drift across the width |
| `perLine` | -- | whole-line bias, so neighbours differ |

Multiplying the noise coordinate by `y * 3.1` decorrelates the terms line to
line, so no two neighbours thicken in the same places.

## Calibration

`measure.sh` renders at 4x, downsamples, thresholds, and reports the ink ratio.
Measured against the decoded originals at the same threshold:

| image | ink |
|---|---|
| `field.png` (original) | 0.261 |
| `field-copy` | 0.287 |
| `room.png` (original) | 0.381 |
| `pastoral.png` (original) | 0.526 |
| `31-coal-mine-woodring` | 0.457 |

## Foliage is lobes, not scribble

Bushes, scrub and canopies are **not** marks scattered inside an outline -- that
reads as doodling. The originals build a bush from a packed cluster of small
rounded LOBES, and the mass has no drawn outline at all: its silhouette is just
the bumpy edge of the outer lobes.

`foliage()` gets three things right that are easy to miss:

- **Each lobe is a black disc with a white disc offset over it toward the
  light.** At these radii that reads far crisper than a tapered arc, and it is
  what the shading actually looks like: a lunette thick on the shaded side,
  closing to nothing on the lit side.
- **Lobes must only just overlap.** At heavy overlap each row's white cap erases
  the crescent of the row behind it and only the front row survives, which is
  how the first version came out as one black mass.
- **Draw back to front, and scale to about eight lobes across.** Four across
  reads as bubbles; the originals pack roughly eight.

## What the field copy still misses

Worth knowing before trusting the engine on a new scene:

- **The tuber is the weak part.** It now carries the right line texture, but the
  four `bulb()` segments read as separate overlapping shells rather than as one
  swelling volume with subtle rims. `bulb()` models a segment as a width profile
  with bowed caps, which cannot express a form whose segments merge.
- **The highlight does not follow the form.** `lit` places the crescent at a
  fixed position in surface coordinates, so it runs as a straight vertical band.
  In the original it curves with the barrel.
- **Weight.** 0.287 against the original's 0.261.

## Superseded, kept for reference

- `gen_rough.mjs` -- rough.js. Its hachure fills and `roughness`/`bowing` are a
  good engraving engine, but the wobble is the wrong texture: Woodring's line is
  controlled, not scratchy.
- `hatch.py` + `gen_coal_mine.py` -- hand-rolled engraving engine: perspective
  surfaces, tone-field-driven multi-family hatching, rock relief.

Both are decent wood engravings and neither is this style.
