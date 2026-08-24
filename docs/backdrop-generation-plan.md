# Backdrop Generation Plan — Full Game Coverage, Capped Reuse

**Status:** the 30-backdrop set below (Images 1–3) is shipped and is the live mapping in
`web/src/comic/backdrop.ts` — every one of Zork I's 110 rooms is assigned, none fall through to the
`room` fallback. This doc was originally written *ahead of* that implementation and drifted out of
sync with it; the tables below were corrected against the shipped code on 2026-08-07 (see
**Sync corrections**).

**Diversity pass (Image 4) — 10 of 11 generated, 2026-08-24.** Three backdrops shipped as heavy
catch-alls: `cave-system` (25 rooms), `pastoral` (22 rooms), `maze` (20 rooms). Reused art at that
scale means readers see the same room repeatedly under different names. **Rule at the time: no
backdrop may cover more than 5 rooms.** Applying that cap required **11 new backdrops** (§ Image 4).
Ten of them now exist as cropped 512×512 PNGs in `reference/backdrops/` (`31-coal-mine` through
`40-maze-twisting`); `41-maze-dead-ends` is **not generated** and has moved to the Image 5 sheet.
None of the ten are wired into `web/src/comic/backdrop.ts` yet.

**Direction change — 1:1 room coverage (2026-08-24). Reached the same day, Image 13.** The ≤5 cap
was an interim floor, not the goal; the target became **one backdrop per room for all 110 Zork I
rooms**, including the maze (subtle rock-formation/camera-angle variety only, no solving aids —
confirmed with the user before generating). `ROOM_BACKDROPS` is now effectively a direct room-id →
backdrop-id identity — 112 backdrops in `cast.json` (110 rooms, one each, plus `barrow-interior` for
the victory marker and the unused `room` fallback). The tables below remain the record of what was
generated and what each plate depicts; Images 6–13 cover the 1:1 pass.

Woodring hatch idiom, 1-bit polarity (pinned by `art/test/polarity.test.ts`), 512×512 px cells,
5×2 grid sheets (ten cells per bulk generation), same as the shipped set.

---

## Sync corrections (against `web/src/comic/backdrop.ts`, 2026-08-07)

The original mapping block below (now replaced) predated the shipped implementation and had drifted:

- **Room id fixes:** the temple complex is `NORTH-TEMPLE` / `SOUTH-TEMPLE` in the world document, not
  a single `TEMPLE` plus a separate `ALTAR`. The squeaky room's ZIL id is `SQUEEKY-ROOM` (the
  original's own spelling), not `SQUEAKY-ROOM`.
- **Regrouping fix:** `SHAFT-ROOM`, `LADDER-TOP`, `LADDER-BOTTOM`, and `LOWER-SHAFT` draw
  `timber-room`, not `cave-system` — they're part of the timbered mine shaft, not the natural cave
  network.
- **Coverage:** this doc's old mapping block only assigned ~55 of 110 rooms and left the rest to the
  `room` fallback. The shipped table assigns all 110 explicitly; see `backdrop.ts` for the untouched
  portion (everything outside `cave-system`/`pastoral`/`maze`, which is unchanged by this pass).
- **`barrow-interior` was shipped but orphaned** — no room in the world document maps to it (entering
  `STONE-BARROW` triggers the win ending directly; there is no separate interior room). **Resolved at
  v0.27.6:** it is now drawn for the ending's panels, keyed on the `victory` affect marker rather
  than on a room id (`backdrop.ts` → `MARKER_BACKDROPS`). It was not part of this pass.

---

## Image 1: Outdoors & House (cells 0–9)

| Cell | Backdrop ID | Filename | Title | Image Generation Prompt |
|------|-------------|----------|-------|-------------------------|
| 0 | `pastoral` | `01-pastoral.png` | **Forest & Hills** | Woodring hatch style, 1-bit b&w. Rolling forested hills, winding dirt path disappearing into trees, distant mountains, scattered boulders, cross-hatched foliage, stippled sky. No figures. High contrast linework, ink on bristol texture. |
| 1 | `field` | `02-field.png` | **House Clearing** | Woodring hatch style, 1-bit b&w. Open grassy clearing with white colonial house center, boarded front door, mailbox to side, small garden patch, trees framing edges, forest beyond. Clean cross-hatched grass, stippled house siding. No figures. |
| 2 | `barrow-exterior` | `03-barrow-exterior.png` | **Stone Barrow Mound** | Woodring hatch style, 1-bit b&w. Ancient grassy burial mound with stone slab entrance, standing stones nearby, windblown grass, gnarled tree roots, cross-hatched earth texture, dramatic sky with heavy stippling. No figures. |
| 3 | `grating-clearing` | `04-grating-clearing.png` | **Grating Clearing** | Woodring hatch style, 1-bit b&w. Forest clearing with rusted iron grating set in stone frame, surrounded by ferns and moss, dappled light through canopy, cross-hatched ground vegetation, stippled tree trunks. No figures. |
| 4 | `house-interior` | `05-house-interior.png` | **Living Room & Kitchen** | Woodring hatch style, 1-bit b&w. Cozy colonial interior: living room with fireplace, worn rug, trophy case, door to kitchen visible, attic stairs, cross-hatched wood paneling, stippled brick fireplace, warm hatching for lamplight. No figures. |
| 5 | `attic` | `06-attic.png` | **Cluttered Attic** | Woodring hatch style, 1-bit b&w. Cramped attic under peaked roof, trunks and boxes piled, cobwebs in corners, dust motes in shaft of light from dormer window, cross-hatched floorboards, stippled shadows. No figures. |
| 6 | `cellar` | `07-cellar.png` | **Damp Cellar** | Woodring hatch style, 1-bit b&w. Stone-walled cellar, trap door above, wine racks, damp patches on walls, barrel-vaulted ceiling, cross-hatched stone texture, heavy stippled shadows, single shaft of light. No figures. |
| 7 | `troll-room` | `08-troll-room.png` | **Troll's Lair** | Woodring hatch style, 1-bit b&w. Rough cavern, scattered bones, bloody axe on floor, shadowy alcove, stalactites, cross-hatched rock walls, dramatic chiaroscuro hatching, deep stippled darkness. No figures. |
| 8 | `cyclops-room` | `09-cyclops-room.png` | **Cyclops Chamber** | Woodring hatch style, 1-bit b&w. High-ceilinged cave, massive stone table, giant's club leaning, heap of treasure glinting, cyclops-sized doorway, cross-hatched stone, stippled highlights on gold. No figures. |
| 9 | `timber-room` | `10-timber-room.png` | **Timber Room** | Woodring hatch style, 1-bit b&w. Low passage shored with rough timbers, mining tools on walls, wooden beams cross-hatched, damp earth floor, stippled shadows between beams, oppressive low ceiling. No figures. |

---

## Image 2: Dungeon Depths (cells 0–9)

| Cell | Backdrop ID | Filename | Title | Image Generation Prompt |
|------|-------------|----------|-------|-------------------------|
| 0 | `machine-room` | `11-machine-room.png` | **Machine Room** | Woodring hatch style, 1-bit b&w. Industrial cavern, massive gears and pistons, pressure gauges, steam pipes, control levers, cross-hatched metal surfaces, stippled steam, dramatic mechanical hatching. No figures. |
| 1 | `reservoir` | `12-reservoir.png` | **Reservoir** | Woodring hatch style, 1-bit b&w. Vast underground lake, dam wall with sluice gates, control room windows, still water reflecting cavern ceiling, cross-hatched stone, stippled water surface, atmospheric perspective. No figures. |
| 2 | `dam-lobby` | `13-dam-lobby.png` | **Dam Lobby** | Woodring hatch style, 1-bit b&w. Concrete corridor, maintenance hatch, instrument panels, warning signs, water stains, cross-hatched concrete, stippled corrosion, industrial institutional feel. No figures. |
| 3 | `maze` | `14-maze.png` | **Twisty Maze** | Woodring hatch style, 1-bit b&w. Identical passages repeating, each with slight variation: rockfall, skeleton, scratches on walls, cross-hatched stone, disorienting perspective, stippled uniformity. No figures. |
| 4 | `temple` | `15-temple.png` | **Ancient Temple** | Woodring hatch style, 1-bit b&w. Stone temple interior, altar, carved pillars, glyphs on walls, shaft of light from above, cross-hatched masonry, stippled dust motes, sacred atmosphere. No figures. |
| 5 | `egypt-room` | `16-egypt-room.png` | **Egyptian Room** | Woodring hatch style, 1-bit b&w. Hieroglyph-covered walls, sarcophagus, canopic jars, torch sconces, sand on floor, cross-hatched sandstone, stippled torchlight, archaeological mystery. No figures. |
| 6 | `round-room` | `17-round-room.png` | **Round Room** | Woodring hatch style, 1-bit b&w. Circular chamber, multiple exits, central column, torchlight, curved walls with cross-hatched stone, stippled radial light pattern, disorienting symmetry. No figures. |
| 7 | `torch-room` | `18-torch-room.png` | **Torch Room** | Woodring hatch style, 1-bit b&w. Wall of flickering torches, stone alcove, ancient weapon rack, heat distortion suggested by wavering hatching, cross-hatched flames, stippled smoke. No figures. |
| 8 | `cave-system` | `19-cave-system.png` | **Cave System** | Woodring hatch style, 1-bit b&w. Network of natural caverns: bat guano, flowstone, underground stream, narrow squeezes, cross-hatched limestone, stippled water reflections, organic rock forms. No figures. |
| 9 | `dome-room` | `20-dome-room.png` | **Dome Room** | Woodring hatch style, 1-bit b&w. Geodesic dome interior, control panels, viewing ports to void, technical hatching, stippled starlight through ports, futuristic-ancient contrast. No figures. |

---

## Image 3: Special Locations & Endgame (cells 0–9)

| Cell | Backdrop ID | Filename | Title | Image Generation Prompt |
|------|-------------|----------|-------|-------------------------|
| 0 | `mirror-room` | `21-mirror-room.png` | **Mirror Rooms** | Woodring hatch style, 1-bit b&w. Two connected chambers with full-wall mirrors, infinite reflections suggested by recursive hatching, frame details, cross-hatched glass, stippled reflective surfaces. No figures. |
| 1 | `gallery` | `22-gallery.png` | **Art Gallery** | Woodring hatch style, 1-bit b&w. Eccentric gallery: paintings in ornate frames, sculpture pedestals, display cases, cross-hatched artworks (abstract), stippled gallery lighting, cultured oddness. No figures. |
| 2 | `atlantis` | `23-atlantis.png` | **Lost Atlantis** | Woodring hatch style, 1-bit b&w. Submerged city glimpsed: columns, domes, seaweed, shafts of light through water, cross-hatched architecture, stippled aquatic atmosphere, mythic scale. No figures. |
| 3 | `hades-entrance` | `24-hades-entrance.png` | **Entrance to Hades** | Woodring hatch style, 1-bit b&w. River Styx shore, Charon's boat, grim cavern, ghostly light, cross-hatched water, stippled mist, ominous hatching, underworld threshold. No figures. |
| 4 | `land-of-living-dead` | `25-land-of-living-dead.png` | **Land of the Living Dead** | Woodring hatch style, 1-bit b&w. Gray misty plain, standing stones, silent figures suggested by negative space, cross-hatched fog, stippled desolation, bleak eternal twilight. No figures. |
| 5 | `barrow-interior` | `26-barrow-interior.png` | **Barrow Interior** | Woodring hatch style, 1-bit b&w. Stone slab tomb, coffin, treasure, ancient seal, cross-hatched stone, stippled dust of ages, sacred darkness, single beam of light. No figures. *(Shipped, currently orphaned — see Sync corrections above and `docs/FUTURE_WORK.md` §2.1.)* |
| 6 | `maintenance-room` | `27-maintenance-room.png` | **Maintenance Room** | Woodring hatch style, 1-bit b&w. Utility corridor, pipe junctions, valve wheels, tool board, leak stains, cross-hatched metal, stippled industrial grime, functional ugliness. No figures. |
| 7 | `loud-room` | `28-loud-room.png` | **Loud Room** | Woodring hatch style, 1-bit b&w. Echoing chamber, sound waves visualized as concentric hatching lines, vibrating walls, cross-hatched resonance pattern, stippled acoustic chaos. No figures. |
| 8 | `engravings-cave` | `29-engravings-cave.png` | **Engravings Cave** | Woodring hatch style, 1-bit b&w. Cave walls covered in ancient carvings: hunters, beasts, symbols, cross-hatched petroglyphs, stippled torchlight revealing art, prehistoric narrative. No figures. |
| 9 | `room` | `30-room.png` | **Generic Interior (Fallback)** | Woodring hatch style, 1-bit b&w. Plain stone room, arched doorway, torch sconce, flagstone floor, cross-hatched masonry, stippled shadows, versatile neutral backdrop. No figures. |

---

## Image 4: Diversity Pass — new backdrops to cap reuse at 5 (cells 0–9, plus one overflow cell)

> **Vector route, undecided (v0.31.0).** Ten of the *shipped* early-game backdrops were redrawn with
> the vector engine and put in a blind A/B against the image-model plates — see
> `art/vector/README.md`. Nothing was swapped. If that route wins, the same kit draws the 11 below;
> if it does not, they stay image-generated per the prompts in this table.

**Status (2026-08-24): 10 of 11 generated.** `31-coal-mine` … `40-maze-twisting` are cropped and
sitting in `reference/backdrops/` as 512×512 PNGs. `41-maze-dead-ends` is **not generated** — it is
now cell 0 of the Image 5 sheet. Nothing from this pass is wired into the engine yet: no `BackdropId`
entries, no `ROOM_BACKDROPS` rows, no AVB pack, no polarity assertions.

Source sheet: `reference/backdrops-bulk-generation-4(5x2).png` (2752×1536, 5×2, ~527 px cells), kept
in-repo as the provenance for the ten crops. Each cell was inset 8 px to drop the panel frame,
centre-cropped square (511 px), and resized to 512×512 — native resolution, no upscaling.

**The sheet's captions are wrong in three places; the crops are named by *content*, not by caption.**
Row 1 cell 3 is captioned "Small Cave" but depicts the winding tunnel → `33-winding-passage`. Row 1
cell 4 is captioned "Rocky Highlands" but depicts the stalagmite chamber → `34-small-cave`. Row 2
cells 1–2 are swapped: River Bend is printed first, Rainbow & Falls second. Do not re-derive the
filenames from the sheet's labels.

These 11 split `cave-system` (4 new + the existing one), `pastoral` (4 new + the existing one), and
`maze` (3 new + the existing one) so no backdrop in the game covers more than 5 rooms — the interim
cap, now superseded as a *goal* by 1:1 room coverage (see the header). `coal-mine`, `chasm-cave`,
`winding-passage`, and `small-cave` share the existing `cave-system` idiom (natural limestone
caverns); `highlands`, `rainbow-falls`, `river`, and `shoreline` share the existing `pastoral` idiom
(outdoor, high-contrast landscape); `maze-deep` and `maze-twisting` share the existing `maze` idiom
(repeating stone passages) and `maze-dead-ends` is its terminal variant.

Cells 0–9 below are generated. The eleventh backdrop, `41-maze-dead-ends`, was never generated
and has been **moved to Image 5** (cell 0) rather than run as a one-cell sheet.

| Cell | Backdrop ID | Filename | Title | Image Generation Prompt |
|------|-------------|----------|-------|-------------------------|
| 0 | `coal-mine` | `31-coal-mine.png` | **Coal Mine Tunnels** | Woodring hatch style, 1-bit b&w. Rough-hewn mine shaft, ore cart tracks, pickaxes leaning on the wall, timber supports, coal dust texture, cross-hatched rock, stippled coal glints, cramped industrial-era mining feel. No figures. |
| 1 | `chasm-cave` | `32-chasm-cave.png` | **Chasm Cavern** | Woodring hatch style, 1-bit b&w. Yawning chasm splitting the cave floor, jagged rock bridge, echoing depths below, stalactites overhead, cross-hatched chasm walls, stippled void shadows, vertiginous scale. No figures. |
| 2 | `winding-passage` | `33-winding-passage.png` | **Winding Passage** | Woodring hatch style, 1-bit b&w. Narrow twisting tunnel, uneven low ceiling, rough-cut rock, single bend disappearing from view, cross-hatched stone walls, stippled tight shadows, claustrophobic passage. No figures. |
| 3 | `small-cave` | `34-small-cave.png` | **Small Cave** | Woodring hatch style, 1-bit b&w. Tight natural chamber, low ceiling, a few stalagmites, single narrow exit, cross-hatched rock, stippled close shadows, unremarkable transitional cave. No figures. |
| 4 | `highlands` | `35-highlands.png` | **Rocky Highlands** | Woodring hatch style, 1-bit b&w. Rugged canyon rim, sheer drop-offs, wind-scoured stone, sparse scrub brush, cross-hatched cliff face, stippled distant haze, exposed high vantage. No figures. |
| 5 | `rainbow-falls` | `36-rainbow-falls.png` | **Rainbow & Falls** | Woodring hatch style, 1-bit b&w. Waterfall cascading into mist, faint rainbow arc, wet cliff rock, spray-soaked ferns, cross-hatched falling water, stippled mist, luminous natural wonder. No figures. |
| 6 | `river` | `37-river.png` | **River Bend** | Woodring hatch style, 1-bit b&w. Slow river between mossy banks, overhanging branches, smooth stones in the shallows, cross-hatched water ripples, stippled reflected light, quiet current. No figures. |
| 7 | `shoreline` | `38-shoreline.png` | **Sandy Shoreline** | Woodring hatch style, 1-bit b&w. Open sandy beach meeting dark water, driftwood, gentle surf line, cross-hatched sand texture, stippled foam, wide flat horizon. No figures. |
| 8 | `maze-deep` | `39-maze-deep.png` | **Maze, Deeper Passages** | Woodring hatch style, 1-bit b&w. Identical stone passages with a subtly different marking (chalk arrow, dropped item), deeper and danker than the entrance maze, cross-hatched stone, stippled damp, same disorienting repetition. No figures. |
| 9 | `maze-twisting` | `40-maze-twisting.png` | **Maze, Twisting Section** | Woodring hatch style, 1-bit b&w. Tightly zigzagging passages, sharper turns, more debris and old bones, cross-hatched stone, stippled deep shadow, maximum disorientation. No figures. |

---

## Image 5: Outdoor 1:1 Split + Maze Dead Ends (cells 0–9)

**Status (2026-08-24): generated and cropped.** `reference/backdrop-image-sheet-5.png` is the source
sheet; all 10 cells are cropped to 512×512 in `reference/backdrops/` (`41-maze-dead-ends.png` …
`50-sandy-beach.png`), inset 8px, centre-cropped square. Captions matched their content on
inspection — no relabeling needed this time. `BackdropId` and `ROOM_BACKDROPS` in
`web/src/comic/backdrop.ts` now carry the full post-Image-5 mapping (this table plus the Image 4
cave-system/maze split, previously unwired); `web/test/backdrop.test.ts` updated and passing. Wired into the AVB pack: all 20 new plates
downscaled 512→315px (matching the ship-cell size the other 30 use) and converted to BMP in
`reference/backdrops/bmp/`, `art/package.json`'s `pack` script carries `--backdrop` args for all of
them, `npm --prefix art run pack` regenerated `web/assets/comic/cast.json` with 50 backdrops.
`art/test/polarity.test.ts`'s backdrop count updated 30→50; full `art` (54) and `web` (385) suites
pass, including the pixel gate.

After this sheet: `pastoral` covers FOREST-1 only, `highlands` covers MOUNTAINS only, `shoreline`
covers SHORE only — every other room in those three groups has its own plate. Nine rooms move off
shared art.

| Cell | Backdrop ID | Filename | Title | Rooms | Image Generation Prompt |
|------|-------------|----------|-------|-------|-------------------------|
| 0 | `maze-dead-ends` | `41-maze-dead-ends.png` | **Maze Dead Ends** | DEAD-END-1…4, GRATING-ROOM | Woodring hatch style, 1-bit b&w. A passage that terminates abruptly at bare rock, dust and cobwebs undisturbed, cross-hatched wall, stippled stagnant air, sense of a wrong turn. No figures. |
| 1 | `forest-dark` | `42-forest-dark.png` | **Dark Forest** | FOREST-2 | Woodring hatch style, 1-bit b&w. Dense stand of tall trunks pressed close, canopy nearly sealed overhead, thin shafts of light on the leaf litter, cross-hatched bark, stippled undergrowth shadow, oppressive enclosure. No figures. |
| 2 | `forest-edge` | `43-forest-edge.png` | **Forest Edge** | FOREST-3 | Woodring hatch style, 1-bit b&w. Treeline thinning into open ground, last trunks at the margin, tall grass beyond, cross-hatched foliage, stippled open light, transition from wood to field. No figures. |
| 3 | `forest-path` | `44-forest-path.png` | **Forest Path** | PATH | Woodring hatch style, 1-bit b&w. Narrow worn trail running between trees, packed dirt and exposed roots, trunks flanking both sides, cross-hatched bark, stippled dappled light, clear direction of travel. No figures. |
| 4 | `up-a-tree` | `45-up-a-tree.png` | **Up a Tree** | UP-A-TREE | Woodring hatch style, 1-bit b&w. View from a thick branch high in an old tree, boughs and leaves framing the foreground, ground far below through gaps, a bird's nest on the limb, cross-hatched bark, stippled canopy, vertiginous perch. No figures. |
| 5 | `east-clearing` | `46-east-clearing.png` | **Forest Clearing** | CLEARING | Woodring hatch style, 1-bit b&w. Open grassy clearing ringed by trees, trampled grass at the centre, sky visible above, cross-hatched treeline, stippled meadow texture, calm breathing space. No figures. Distinct from the grating clearing — no grating in the grass. |
| 6 | `canyon-view` | `47-canyon-view.png` | **Canyon View** | CANYON-VIEW | Woodring hatch style, 1-bit b&w. Rim overlook onto a deep river canyon, banded rock walls receding into haze, thin river far below, cross-hatched strata, stippled distance, panoramic depth. No figures. |
| 7 | `cliff-middle` | `48-cliff-middle.png` | **Cliff Ledge** | CLIFF-MIDDLE | Woodring hatch style, 1-bit b&w. Narrow ledge partway down a sheer cliff face, rock wall on one side and open drop on the other, a few tenacious shrubs, cross-hatched cliff, stippled exposure, precarious foothold. No figures. |
| 8 | `canyon-bottom` | `49-canyon-bottom.png` | **Canyon Bottom** | CANYON-BOTTOM | Woodring hatch style, 1-bit b&w. Floor of a deep canyon, towering walls closing in overhead, boulder rubble and a shallow stream, narrow strip of sky, cross-hatched walls, stippled damp shade, enclosed by scale. No figures. |
| 9 | `sandy-beach` | `50-sandy-beach.png` | **Sandy Beach** | SANDY-BEACH | Woodring hatch style, 1-bit b&w. Broad underground beach of pale sand against still dark water, ripple marks in the sand, low rock ceiling far above, cross-hatched sand, stippled water sheen, quiet subterranean shore. No figures. |

**Sheet spec:** 5×2 grid, generous portrait cells matching `reference/backdrops-bulk-generation-4(5x2).png`
as the geometry reference; crop each cell inset 8 px, centre-crop square, resize to 512×512. Verify
each caption against its content before naming the crops (Image 4 shipped three wrong captions).

---

## Image 6: Reservoir + Timber Shaft 1:1 Split (cells 0–9)

**Status (2026-08-24): generated, cropped, wired.** `reference/backdrop-image-sheet-6.png` (3264×1312)
is the source sheet. Unlike Image 4/5, the model baked visible captions into each cell and the two
rows came out unequal heights (row 0 panels ~604 px tall border-to-border, row 1 panels ~445 px) —
cropped each row to its own measured bounds rather than a uniform grid formula, centre-square-cropped
inset from the panel border (not the cell edge, since ~18 px of cream gutter surrounds each panel),
then scaled to 512×512. No relabeling needed — captions matched content on inspection.

After this sheet: `reservoir` covers RESERVOIR only, `timber-room` covers TIMBER-ROOM only — every
other room in those two groups has its own plate. Eight rooms move off shared art; both groups drop
from 5 rooms to 1.

| Cell | Backdrop ID | Filename | Title | Rooms | Image Generation Prompt |
|------|-------------|----------|-------|-------|--------------------------|
| 0 | `reservoir-south` | `51-reservoir-south.png` | **Reservoir South** | RESERVOIR-SOUTH | Woodring hatch style, 1-bit b&w. South shore of a dammed reservoir, exposed muddy bank at low tide, dam wall visible in the distance to one side, stream mouth to the other, cross-hatched wet mud, stippled still water. No figures. |
| 1 | `reservoir` | `52-reservoir.png` | **Reservoir** | RESERVOIR | Woodring hatch style, 1-bit b&w. Open water of a flooded reservoir seen from water level, dam walls bounding it north and south, drowned tree stumps breaking the surface, cross-hatched ripples, stippled overcast sky reflected in water. No figures. |
| 2 | `reservoir-north` | `53-reservoir-north.png` | **Reservoir North** | RESERVOIR-NORTH | Woodring hatch style, 1-bit b&w. North shore of the reservoir, stone stairs climbing out of the water toward higher ground, mud flat exposed at low tide, cross-hatched stonework, stippled damp bank. No figures. |
| 3 | `stream-view` | `54-stream-view.png` | **Stream View** | STREAM-VIEW | Woodring hatch style, 1-bit b&w. Dirt path running beside a gently flowing stream, water moving west to east, reeds along the bank, cross-hatched current lines, stippled grassy verge. No figures. |
| 4 | `in-stream` | `55-in-stream.png` | **In the Stream** | IN-STREAM | Woodring hatch style, 1-bit b&w. Low water-level view mid-stream, twisting channel walls closing off the view downstream, narrow beach visible to land on, cross-hatched water surface, stippled rock walls pressing close. No figures. |
| 5 | `shaft-room` | `56-shaft-room.png` | **Shaft Room** | SHAFT-ROOM | Woodring hatch style, 1-bit b&w. Large chamber centered on a small shaft dropping into darkness, metal framework over the opening, heavy iron chain hanging into the shaft, exits west and north, cross-hatched stone floor, stippled shaft darkness. No figures. |
| 6 | `ladder-top` | `57-ladder-top.png` | **Ladder Top** | LADDER-TOP | Woodring hatch style, 1-bit b&w. Cramped chamber with a rickety wooden ladder descending in the corner, staircase leading up on the opposite side, cross-hatched rough-hewn walls, stippled shadow around the ladder well. No figures. |
| 7 | `ladder-bottom` | `58-ladder-bottom.png` | **Ladder Bottom** | LADDER-BOTTOM | Woodring hatch style, 1-bit b&w. Wide chamber at the foot of a narrow wooden ladder, passages leading west and south, cross-hatched dirt floor, stippled gloom beneath the ladder. No figures. |
| 8 | `timber-room` | `59-timber-room.png` | **Timber Room** | TIMBER-ROOM | Woodring hatch style, 1-bit b&w. Long narrow passage cluttered with broken timbers, wide opening at one end narrowing to a tight passage at the other, strong draft implied by scattered debris, cross-hatched fallen beams, stippled dust in the air. No figures. |
| 9 | `lower-shaft` | `60-lower-shaft.png` | **Lower Shaft** | LOWER-SHAFT | Woodring hatch style, 1-bit b&w. Small drafty room at the bottom of a long vertical shaft, heavy iron chain visible hanging in the shaft above, narrow passages south and east, cross-hatched close walls, stippled draft-blown dust. No figures. |

Wired into `web/src/comic/backdrop.ts` (`BackdropId` and `ROOM_BACKDROPS`), packed into
`web/assets/comic/cast.json` (58 backdrops total), `art/package.json`'s `pack` script updated —
`reservoir` and `timber-room` now point at the new dedicated plates (52, 59) rather than the old
five-room placeholders (12, 10). `art/test/polarity.test.ts`'s backdrop count updated 50→58; `art`
(54/54) and `web` (385/385) suites pass.

**Correction (2026-08-24, post-review): row-0 crops shipped with a visible top border/margin sliver.**
The row-0 y=8 top inset (from the § Image 6/7 crop note below) landed inside the panel's black
border rather than past it — the border on this sheet runs from y≈12 to y≈25 (not the ~4 px assumed),
so an 8 px inset only cleared the cream gutter, not the border itself. Re-measured with zoomed
(`scale=…:…:flags=neighbor`) strips: row-0 panels actually run **y=32 to y=600 (568 px tall)**, not
y=8 to y=612. All ten row-0 plates from Images 6 and 7 (`51`–`55`, `61`–`65`) were re-cropped at
`568×568` centred per column and repacked; row-1 plates (`56`–`60`, `66`–`70`) were unaffected. **When
measuring panel bounds on a new sheet, zoom the boundary strip before picking an inset — a border can
be 3× thicker than it looks at full-image scale.**

**Remaining shared groups after this sheet (5 rooms each, unchanged):** `winding-passage`,
`small-cave`, `river`, `rainbow-falls`, `chasm-cave`, `cave-system` — six groups, 30 rooms, three more
5×2 sheets to 1:1.

---

## Image 7: River + Rainbow Falls 1:1 Split (cells 0–9)

**Status (2026-08-24): generated, cropped, wired.** `reference/backdrop-image-sheet-7.png` (3264×1312,
same geometry as Image 6). **The generated sheet's captions were stale copies of Image 6's labels**
(RESERVOIR-SOUTH, SHAFT-ROOM, etc.) rather than this sheet's — the per-cell prompt text did not
include label instructions, so the model reused whatever caption pattern it had cached. Content matched
the intended room order, so this was a labeling-only defect, not a content mismatch; ids and filenames
below reflect the actual pictorial content, not the sheet's baked-in text. **Lesson: every future
per-cell prompt must state its own label explicitly** — do not rely on cell position alone. Cropped
with the same row-specific bounds as Image 6 (row 0: 568×568 from y=32, corrected — see the § Image 6
correction note; row 1: 445×445 from y=710) — the two sheets share pixel geometry closely enough that
the same crop coordinates applied cleanly.

After this sheet: `river` covers RIVER-1 only, `rainbow-falls` covers ARAGAIN-FALLS only — every other
room in those two groups has its own plate. Eight rooms move off shared art; both groups drop from 5
rooms to 1.

| Cell | Backdrop ID | Filename | Title | Rooms | Image Generation Prompt |
|------|-------------|----------|-------|-------|--------------------------|
| 0 | `river` | `61-river-1.png` | **Frigid River (Dam)** | RIVER-1 | Woodring hatch style, 1-bit b&w. Wide, quiet river near a dam, a landing visible on the west shore, calm current, cross-hatched water surface, stippled overcast sky. No figures. |
| 1 | `river-2` | `62-river-2.png` | **Frigid River (Bend)** | RIVER-2 | Woodring hatch style, 1-bit b&w. River bending around a corner, tall white chalk cliffs looming on one bank, jagged rocks breaking the surface on the other, cross-hatched cliff face, stippled fast current. No figures. |
| 2 | `river-3` | `63-river-3.png` | **Frigid River (Valley)** | RIVER-3 | Woodring hatch style, 1-bit b&w. River descending into a narrowing valley, a thin beach below sheer cliffs on one shore, distant mist implying rumbling water ahead, cross-hatched canyon walls, stippled spray. No figures. |
| 3 | `river-4` | `64-river-4.png` | **Frigid River (Rapids)** | RIVER-4 | Woodring hatch style, 1-bit b&w. Faster water rushing toward a distant roar, a sandy beach on one shore and a small strip of beach below cliffs on the other, cross-hatched ripples, stippled foam at the banks. No figures. |
| 4 | `river-5` | `65-river-5.png` | **Frigid River (Falls Approach)** | RIVER-5 | Woodring hatch style, 1-bit b&w. Current nearly violent here, a wide landing area on one shore, spray filling the air, cross-hatched turbulent water, heavy stippled mist. No figures. |
| 5 | `end-of-rainbow` | `66-end-of-rainbow.png` | **End of Rainbow** | END-OF-RAINBOW | Woodring hatch style, 1-bit b&w. Small rocky beach where a river canyon opens to the sky, White Cliffs pressing close on one side, a narrow path leading off along the shore, sunlight breaking through from above, cross-hatched rock walls, stippled sunbeams. No figures. |
| 6 | `on-rainbow` | `67-on-rainbow.png` | **On the Rainbow** | ON-RAINBOW | Woodring hatch style, 1-bit b&w. Standing on the arc of a rainbow above a waterfall, the falls dropping away below, cross-hatched mist rising off the water, stippled rainbow bands rendered in hatch density rather than colour, dizzying open-air view. No figures. |
| 7 | `rainbow-falls` | `68-aragain-falls.png` | **Aragain Falls** | ARAGAIN-FALLS | Woodring hatch style, 1-bit b&w. Brink of a massive waterfall, river water pouring over the edge into a distant gorge, spray drifting upward, cross-hatched cliff edge, heavy stippled mist obscuring the drop. No figures. |
| 8 | `white-cliffs-north` | `69-white-cliffs-north.png` | **White Cliffs Beach (North)** | WHITE-CLIFFS-NORTH | Woodring hatch style, 1-bit b&w. Narrow strip of beach at the base of tall white cliffs, a tight passage leading into the rock to one side, a path along the shore to the other, cross-hatched cliff face, stippled sand. No figures. |
| 9 | `white-cliffs-south` | `70-white-cliffs-south.png` | **White Cliffs Beach (South)** | WHITE-CLIFFS-SOUTH | Woodring hatch style, 1-bit b&w. Rocky, narrow strip of beach beside the white cliffs, a path leading off along the shoreline, cross-hatched loose stone, stippled waterline. No figures. |

Wired into `web/src/comic/backdrop.ts` (`BackdropId` and `ROOM_BACKDROPS`), packed into
`web/assets/comic/cast.json` (66 backdrops total), `art/package.json`'s `pack` script updated —
`river` and `rainbow-falls` now point at the new dedicated plates (61, 68) rather than the old
five-room placeholders (37, 36). `art/test/polarity.test.ts`'s backdrop count updated 58→66; `art`
(54/54) and `web` (385/385) suites pass.

**Remaining shared groups after this sheet (5 rooms each, unchanged):** `winding-passage`,
`small-cave`, `chasm-cave`, `cave-system` — four groups, 20 rooms, two more 5×2 sheets to 1:1.

---

## Image 8: Winding Passage + Small Cave 1:1 Split (cells 0–9)

**Status (2026-08-24): generated, cropped, wired.** `reference/backdrop-image-sheet-8.png`
(3264×1312, same geometry as Images 6/7). First sheet generated with the per-cell label fix from
Image 7's lesson — each panel's prompt stated its own label text explicitly, and all ten captions
came back correct on inspection. Cropped with the corrected bounds from the § Image 6 correction
note (row 0: 568×568 from y=32; row 1: 445×445 from y=710) — clean on the first pass, no rework.

After this sheet: `winding-passage` covers WINDING-PASSAGE only, `small-cave` covers SMALL-CAVE only
— every other room in those two groups has its own plate. Eight rooms move off shared art; both
groups drop from 5 rooms to 1.

| Cell | Backdrop ID | Filename | Title | Rooms | Image Generation Prompt |
|------|-------------|----------|-------|-------|--------------------------|
| 0 | `strange-passage` | `71-strange-passage.png` | **Strange Passage** | STRANGE-PASSAGE | Woodring hatch style, 1-bit b&w. Long passage with an old wooden door set in one wall, a large cyclops-sized opening broken through it, a plain entrance at the other end, cross-hatched stone walls, stippled floor dust. No figures. |
| 1 | `narrow-passage` | `72-narrow-passage.png` | **Narrow Passage** | NARROW-PASSAGE | Woodring hatch style, 1-bit b&w. Long north-south corridor that briefly pinches to a tight squeeze partway down, walls closing in at the narrow point then opening again, cross-hatched rock, stippled shadow at the pinch. No figures. |
| 2 | `winding-passage` | `73-winding-passage.png` | **Winding Passage** | WINDING-PASSAGE | Woodring hatch style, 1-bit b&w. A passage that curves out of sight, exits visible to the east and north only, cross-hatched curving walls, stippled floor, sense of a bent corridor with no straight sightline. No figures. |
| 3 | `twisting-passage` | `74-twisting-passage.png` | **Twisting Passage** | TWISTING-PASSAGE | Woodring hatch style, 1-bit b&w. A passage that curves the opposite way, exits to the east and north, cross-hatched rock walls twisting away from view, stippled gloom, distinct S-curve from the winding passage's arc. No figures. |
| 4 | `cold-passage` | `75-cold-passage.png` | **Cold Passage** | COLD-PASSAGE | Woodring hatch style, 1-bit b&w. Cold, damp corridor where a long east-west passage bends south, moisture beading on the walls, cross-hatched wet stone, stippled condensation, noticeably colder rendering than the other passages. No figures. |
| 5 | `small-cave` | `76-small-cave.png` | **Small Cave** | SMALL-CAVE | Woodring hatch style, 1-bit b&w. Tiny cave chamber with openings west and north and a staircase leading down, compact and low-ceilinged, cross-hatched rock walls, stippled floor. No figures. |
| 6 | `tiny-cave` | `77-tiny-cave.png` | **Tiny Cave** | TINY-CAVE | Woodring hatch style, 1-bit b&w. Tiny cave chamber with openings west and north and a dark, forbidding staircase leading down into blackness, cross-hatched walls, heavy stippled shadow pooling at the stairs — darker and more ominous than the small cave. No figures. |
| 7 | `ew-passage` | `78-ew-passage.png` | **East-West Passage** | EW-PASSAGE | Woodring hatch style, 1-bit b&w. Narrow east-west corridor with a tight stairway leading down at one end, cross-hatched straight walls, stippled floor, plain utilitarian passage. No figures. |
| 8 | `ns-passage` | `79-ns-passage.png` | **North-South Passage** | NS-PASSAGE | Woodring hatch style, 1-bit b&w. Tall, narrow north-south passage that forks off to the northeast partway along, cross-hatched high walls emphasizing verticality, stippled shadow at the fork. No figures. |
| 9 | `dead-end-5` | `80-dead-end-5.png` | **Dead End** | DEAD-END-5 | Woodring hatch style, 1-bit b&w. A mine passage terminating abruptly at bare rock, a small heap of coal on the floor, dust and disuse, cross-hatched wall, stippled stagnant air, sense of a wrong turn. No figures. |

Wired into `web/src/comic/backdrop.ts` (`BackdropId` and `ROOM_BACKDROPS`), packed into
`web/assets/comic/cast.json` (74 backdrops total), `art/package.json`'s `pack` script updated —
`winding-passage` and `small-cave` now point at the new dedicated plates (73, 76) rather than the old
five-room placeholders (33, 34). `art/test/polarity.test.ts`'s backdrop count updated 66→74; `art`
(54/54) and `web` (385/385) suites pass.

**Remaining shared groups after this sheet (5 rooms each, unchanged):** `chasm-cave`, `cave-system` —
two groups, 10 rooms, one more 5×2 sheet to 1:1.

---

## Image 9: Chasm Cave + Cave System 1:1 Split (cells 0–9)

**Status (2026-08-24): generated, cropped, wired.** `reference/backdrop-image-sheet-9.png`
(3264×1312, same geometry as Images 6–8). Explicit per-cell labels and the corrected crop bounds
both worked cleanly, no rework.

This was the last of the **diversity-pass** groups (the ones Image 4 created to cap reuse at 5).
`chasm-cave` now covers CHASM-ROOM only, `cave-system` covers MINE-ENTRANCE only.

| Cell | Backdrop ID | Filename | Title | Rooms | Image Generation Prompt |
|------|-------------|----------|-------|-------|--------------------------|
| 0 | `east-of-chasm` | `81-east-of-chasm.png` | **East of Chasm** | EAST-OF-CHASM | Woodring hatch style, 1-bit b&w. Standing at the east edge of a bottomless chasm, a narrow passage leading off to one side, the path continuing along the rim, cross-hatched rock edge, stippled darkness where the chasm floor should be. No figures. |
| 1 | `deep-canyon` | `82-deep-canyon.png` | **Deep Canyon** | DEEP-CANYON | Woodring hatch style, 1-bit b&w. Wide ledge overlooking a deep canyon, a stairway cut into the rock leading down, sheer walls dropping away, cross-hatched canyon walls, stippled depth haze. No figures. |
| 2 | `chasm-cave` | `83-chasm-cave.png` | **Chasm Room** | CHASM-ROOM | Woodring hatch style, 1-bit b&w. A chasm running diagonally through the room, the path following its south edge, a crack opening into a passage on one side, cross-hatched rock, stippled void below the chasm's edge. No figures. |
| 3 | `damp-cave` | `84-damp-cave.png` | **Damp Cave** | DAMP-CAVE | Woodring hatch style, 1-bit b&w. Cave with exits on two sides narrowing to a tight crack on a third, earth glistening with moisture, cross-hatched wet cave walls, stippled damp ground. No figures. |
| 4 | `sandy-cave` | `85-sandy-cave.png` | **Sandy Cave** | SANDY-CAVE | Woodring hatch style, 1-bit b&w. Small sand-filled cave with a single exit, drifts of pale sand banked against the walls, cross-hatched cave ceiling, stippled sand texture underfoot. No figures. |
| 5 | `cave-system` | `86-cave-system.png` | **Mine Entrance** | MINE-ENTRANCE | Woodring hatch style, 1-bit b&w. Entrance to an old coal mine, a timbered shaft opening into one wall, another exit at the room's end, cross-hatched rough-cut rock, stippled shaft darkness. No figures. |
| 6 | `squeeky-room` | `87-squeeky-room.png` | **Squeaky Room** | SQUEEKY-ROOM | Woodring hatch style, 1-bit b&w. Small room with a passage leading off where faint squeaking sounds seem to originate, another exit to the side, cross-hatched close walls, stippled shadow gathering at the passage mouth. No figures. |
| 7 | `bat-room` | `88-bat-room.png` | **Bat Room** | BAT-ROOM | Woodring hatch style, 1-bit b&w. Cave chamber with a high ceiling lost in shadow, jagged rock outcroppings suggesting roosting spots, cross-hatched stone, heavy stippled darkness overhead. No figures, no bats rendered explicitly — only implied by the setting. |
| 8 | `smelly-room` | `89-smelly-room.png` | **Smelly Room** | SMELLY-ROOM | Woodring hatch style, 1-bit b&w. Small nondescript room, a narrow descending staircase to one side, a tight tunnel leading off, faint fumes suggested by wavering hatch lines near the stairs, cross-hatched plain walls, stippled haze. No figures. |
| 9 | `gas-room` | `90-gas-room.png` | **Gas Room** | GAS-ROOM | Woodring hatch style, 1-bit b&w. Small room with a short climb of stairs and a narrow tunnel leading off, hazy fumes rendered as a soft stippled cloud filling the upper half of the room, cross-hatched rock walls. No figures. |

Wired into `web/src/comic/backdrop.ts` (`BackdropId` and `ROOM_BACKDROPS`), packed into
`web/assets/comic/cast.json` (82 backdrops total), `art/package.json`'s `pack` script updated —
`chasm-cave` and `cave-system` now point at the new dedicated plates (83, 86) rather than the old
five-room placeholders (32, 19). `art/test/polarity.test.ts`'s backdrop count updated 74→82; `art`
(54/54) and `web` (385/385) suites pass.

**Scope correction: the diversity-pass groups are now all at 1:1, but 110/110 is not yet reached.**
The "remaining groups" tracked through Images 6–9 were only the eleven ids Image 4 created to cap
reuse at 5 (`coal-mine` … `maze-dead-ends`). That was never the full multi-room set — eight ids from
the **original 30-backdrop set** (pre-diversity-pass) still cover more than one room each and were
never in scope for these nine sheets:

| Backdrop ID | Rooms |
|---|---|
| `field` | WEST-OF-HOUSE, NORTH-OF-HOUSE, SOUTH-OF-HOUSE, EAST-OF-HOUSE (4) |
| `dam-lobby` | DAM-ROOM, DAM-LOBBY, DAM-BASE (3) |
| `coal-mine` | MINE-1, MINE-2, MINE-3, MINE-4, SLIDE-ROOM (5) |
| `temple` | NORTH-TEMPLE, SOUTH-TEMPLE (2) |
| `mirror-room` | MIRROR-ROOM-1, MIRROR-ROOM-2 (2) |
| `house-interior` | KITCHEN, LIVING-ROOM (2) |
| `gallery` | GALLERY, STUDIO (2) |
| `cyclops-room` | CYCLOPS-ROOM, TREASURE-ROOM (2) |

22 rooms across these eight groups. Separately, the four maze ids (`maze`, `maze-deep`,
`maze-twisting`, `maze-dead-ends`, 9 rooms) are **intentionally** left shared — the maze rooms are
silent by design (confirmed with the user 2026-08-22, `docs/DEVELOPMENT_PLAN.md` §6.1e) and print the
same "Maze" name, so a shared backdrop matches the room, not a gap. Splitting them is not blocked on
anything; it just was not asked for.

**If 110/110 is still the goal, the eight-group table above is the actual remaining work** — roughly
two more 5×2 sheets (`field`+`dam-lobby`+`temple`+`mirror-room` is 11 cells, one over; some
combination across the eight groups closes it in two sheets with one cell to spare or three sheets
comfortably under 10 each).

---

## Image 10: Coal Mine + Dam Lobby + Temple 1:1 Split (cells 0–9)

**Status (2026-08-24): generated, cropped, wired.** `reference/backdrop-image-sheet-10.png`
(3264×1312, same geometry as Images 6–9). Explicit per-cell labels and the corrected crop bounds
both worked cleanly, no rework. First sheet drawing from the *original* 30-backdrop set rather than
the diversity pass — confirmed the § scope-correction table above was accurate.

MINE-1 through MINE-4 all print identical in-game text ("This is a nondescript part of a coal
mine.") — the same situation as the maze rooms, just not previously flagged as intentionally shared.
Gave each a distinct camera angle/prop consistent with "generic mine tunnel" rather than fabricating
distinguishing text; if this reads as unwanted busywork for four rooms a player can't tell apart by
text, treat it as reversible — merge them back under `coal-mine` and delete `92`–`94`.

After this sheet: `coal-mine` covers MINE-1 only, `dam-lobby` covers DAM-LOBBY only, `temple` covers
NORTH-TEMPLE only — every other room in those three groups has its own plate. Seven rooms move off
shared art; all three groups drop to 1 room.

| Cell | Backdrop ID | Filename | Title | Rooms | Image Generation Prompt |
|------|-------------|----------|-------|-------|--------------------------|
| 0 | `coal-mine` | `91-coal-mine.png` | **Coal Mine (1)** | MINE-1 | Woodring hatch style, 1-bit b&w. Plain coal-mine tunnel, low ceiling, coal dust coating the walls, a passage continuing east and another forking northeast, cross-hatched rough-cut rock, stippled coal grime. No figures. |
| 1 | `mine-2` | `92-mine-2.png` | **Coal Mine (2)** | MINE-2 | Woodring hatch style, 1-bit b&w. Plain coal-mine tunnel, a passage continuing north and a fork leading southeast, small scattered coal fragments on the floor, cross-hatched rock walls, stippled dust in the air. No figures. |
| 2 | `mine-3` | `93-mine-3.png` | **Coal Mine (3)** | MINE-3 | Woodring hatch style, 1-bit b&w. Plain coal-mine tunnel, passages continuing south and forking southwest, old timber support half-collapsed against one wall, cross-hatched rock, stippled coal dust. No figures. |
| 3 | `mine-4` | `94-mine-4.png` | **Coal Mine (4)** | MINE-4 | Woodring hatch style, 1-bit b&w. Plain coal-mine tunnel, a passage continuing west and another leading north toward a downward opening, pickaxe marks scoring the walls, cross-hatched rock, stippled dust. No figures. |
| 4 | `slide-room` | `95-slide-room.png` | **Slide Room** | SLIDE-ROOM | Woodring hatch style, 1-bit b&w. Small chamber with "GRANITE WALL" crudely etched into one wall, a long passage leading off to one side and a steep metal slide twisting down out of sight on the other, cross-hatched rock walls, stippled metal sheen on the slide. No figures. |
| 5 | `dam-room` | `96-dam-room.png` | **Dam** | DAM-ROOM | Woodring hatch style, 1-bit b&w. Interior of a massive concrete dam, a huge control panel of levers and gauges set into one wall, sluice machinery overhead, cross-hatched concrete, stippled industrial detail. No figures. |
| 6 | `dam-lobby` | `97-dam-lobby.png` | **Dam Lobby** | DAM-LOBBY | Woodring hatch style, 1-bit b&w. Waiting-room lobby with open doorways marked "PRIVATE," a path leading out over the top of the dam visible through an archway, cross-hatched tiled floor, stippled institutional walls. No figures. |
| 7 | `dam-base` | `98-dam-base.png` | **Dam Base** | DAM-BASE | Woodring hatch style, 1-bit b&w. Standing at the base of a towering concrete dam looming overhead, the Frigid River flowing past, white cliffs stretching along the far shore, cross-hatched dam face, stippled river current. No figures. |
| 8 | `temple` | `99-temple.png` | **Temple** | NORTH-TEMPLE | Woodring hatch style, 1-bit b&w. North end of a large temple, an ancient inscription carved into one wall above a staircase leading down, huge marble pillars framing the north exit, cross-hatched stone columns, stippled carved prayer text. No figures. |
| 9 | `south-temple` | `100-south-temple.png` | **Altar** | SOUTH-TEMPLE | Woodring hatch style, 1-bit b&w. South end of the temple, a stone altar dominating the space, a small dark hole in one corner of the floor leading down into blackness, cross-hatched altar stone, stippled shadow around the hole. No figures. |

Wired into `web/src/comic/backdrop.ts` (`BackdropId` and `ROOM_BACKDROPS`), packed into
`web/assets/comic/cast.json` (89 backdrops total), `art/package.json`'s `pack` script updated —
`coal-mine`, `dam-lobby` and `temple` now point at the new dedicated plates (91, 97, 99) rather than
the old placeholders (31, 13, 15). `art/test/polarity.test.ts`'s backdrop count updated 82→89; `art`
(54/54) and `web` (385/385) suites pass.

**Remaining shared groups (2 rooms each, unchanged):** `mirror-room`, `house-interior`, `gallery`,
`cyclops-room` — four groups, 8 rooms, one more (undersized) 5×2 sheet closes 110/110.

**Direction change (2026-08-24): literal 110/110, maze included.** The user asked for full 1:1 with
no sharing at all — including the maze, reversing the 2026-08-22 "silent by design" decision for
those rooms specifically for backdrop art (the *text* stays silent; only the art gets variety). Total
new backdrops needed: the nine shared groups (`maze`/`maze-deep`/`maze-twisting`/`maze-dead-ends` at
5 rooms each, `field` at 4, `mirror-room`/`house-interior`/`gallery`/`cyclops-room` at 2 each — 32
rooms) each keep their id for one room and need a new id for the rest: 32 − 9 = **23 new backdrops**,
across three sheets (10 + 10 + 3). Maze variety is rock formation and camera angle only — no
landmarks, signage, or directional cues that would help solve the maze; confirmed with the user
before generating (2026-08-24, "split anyway, subtly").

---

## Image 11: Maze A–D + Maze E–H + Living Room + Studio (cells 0–9)

**Status (2026-08-24): generated, cropped, wired.** `reference/backdrop-image-sheet-11.png` — the
model returned **2752×1536** this time, not the usual 3264×1312, so the Image 6 crop bounds did not
apply. Re-measured from scratch with zoomed boundary strips (per the Image 6 correction's lesson):
border is much thinner on this sheet (~10 px vs ~13 px before) and the cell proportions are taller,
so **width is the limiting dimension** here (opposite of Images 6–10, where height was limiting).
Row 0: 490×490 from (col + 30, 115). Row 1: 490×490 from (col + 30, 885). Column starts: 0, 550,
1101, 1651, 2202. **Always re-measure a new sheet's bounds — a prior sheet's numbers are only valid
if the pixel dimensions match exactly.**

Explicit per-cell labels worked cleanly (all ten captions correct). MAZE-1 keeps `maze`, MAZE-6 keeps
`maze-deep`; the other eight maze rooms get distinct rock-formation/camera-angle variety only —
MAZE-5's skeleton detail is already textual in-game (not a new spoiler). KITCHEN keeps
`house-interior`, GALLERY keeps `gallery`.

| Cell | Backdrop ID | Filename | Title | Rooms | Image Generation Prompt |
|------|-------------|----------|-------|-------|--------------------------|
| 0 | `maze-2` | `101-maze-2.png` | **Maze A** | MAZE-2 | Woodring hatch style, 1-bit b&w. Twisty rock passage bending sharply, walls of jagged natural stone close on both sides, cross-hatched rock, stippled floor. No figures. |
| 1 | `maze-3` | `102-maze-3.png` | **Maze B** | MAZE-3 | Woodring hatch style, 1-bit b&w. Twisty rock passage opening into a slightly wider pocket before narrowing again, cross-hatched uneven walls, stippled shadow in the pocket. No figures. |
| 2 | `maze-4` | `103-maze-4.png` | **Maze C** | MAZE-4 | Woodring hatch style, 1-bit b&w. Twisty rock passage with a low, dipping ceiling forcing a stoop, cross-hatched jagged stone, stippled floor debris. No figures. |
| 3 | `maze-5` | `104-maze-5.png` | **Maze D** | MAZE-5 | Woodring hatch style, 1-bit b&w. Twisty rock passage with a scattering of old bones half-buried in the dirt floor, weathered and disturbed, cross-hatched rock walls, stippled dust settled around the bones. No figures. |
| 4 | `maze-7` | `105-maze-7.png` | **Maze E** | MAZE-7 | Woodring hatch style, 1-bit b&w. Twisty rock passage curving upward slightly, a rough natural step in the floor, cross-hatched stone, stippled shadow pooling at the step. No figures. |
| 5 | `maze-8` | `106-maze-8.png` | **Maze F** | MAZE-8 | Woodring hatch style, 1-bit b&w. Twisty rock passage with an outcropping of sharp rock spurs jutting from one wall, cross-hatched stone, stippled floor. No figures. |
| 6 | `maze-9` | `107-maze-9.png` | **Maze G** | MAZE-9 | Woodring hatch style, 1-bit b&w. Twisty rock passage that widens briefly into a small alcove before pinching narrow again, cross-hatched walls, stippled alcove shadow. No figures. |
| 7 | `maze-10` | `108-maze-10.png` | **Maze H** | MAZE-10 | Woodring hatch style, 1-bit b&w. Twisty rock passage with visible strata banding in the rock, layered stone texture, cross-hatched banded walls, stippled floor. No figures. |
| 8 | `living-room` | `109-living-room.png` | **Living Room** | LIVING-ROOM | Woodring hatch style, 1-bit b&w. A cozy living room, a rug covering a closed trap door set into the floorboards, a nailed-shut door on one wall, a trophy case against another, cross-hatched wood paneling, stippled shadow around the trap door's outline. No figures. |
| 9 | `studio` | `110-studio.png` | **Studio** | STUDIO | Woodring hatch style, 1-bit b&w. An artist's studio, walls and floor spattered with paint, an open paint-smeared door at one end, a dark narrow chimney rising from a fireplace, cross-hatched splatter texture, stippled soot around the chimney opening. No figures. |

Wired into `web/src/comic/backdrop.ts` (`BackdropId` and `ROOM_BACKDROPS`), packed into
`web/assets/comic/cast.json` (99 backdrops total), `art/package.json`'s `pack` script gains 10 new
`--backdrop` args (`maze`/`maze-deep`/`house-interior`/`gallery` needed no repoint — their existing
plates already suited the room that kept the id). `art/test/polarity.test.ts`'s backdrop count updated
89→99; `web/test/backdrop.test.ts`'s `LIVING-ROOM` expectation updated to `living-room`.
**Pixel gate**: `wk04-dark-p19-establishing` moved (LIVING-ROOM now draws its own art instead of the
shared `house-interior` fireplace scene, right at the walkthrough's trap-door panel) — confirmed
against the walkthrough command file, re-accepted with `npm run gate:accept` on macOS. `art` (54/54)
and `web` (385/385) suites pass.

**Remaining for full 110/110 (no sharing):** `maze-twisting` (4 new), `maze-dead-ends` (4 new),
`mirror-room` (1 new), `cyclops-room` (1 new) — 10 rooms, one sheet (Image 12). Then `field` (3 new)
— 3 rooms, one small sheet (Image 13). 13 backdrops left.

---

## Image 12: Maze I–L + Maze Dead Ends A–C + Grating Room + Mirror Room 2 + Treasure Room (cells 0–9)

**Status (2026-08-24): generated, cropped, wired.** `reference/backdrop-image-sheet-12.png` came back
at 2752×1536, matching Image 11 exactly — the Image 11 crop bounds (row 0: 490×490 from (col+30,
115); row 1: 490×490 from (col+30, 885); columns at 0/550/1101/1651/2202) applied directly, no
re-measurement needed. Explicit per-cell labels worked cleanly. MAZE-11 keeps `maze-twisting`,
DEAD-END-1 keeps `maze-dead-ends`, MIRROR-ROOM-1 keeps `mirror-room`, CYCLOPS-ROOM keeps
`cyclops-room` — their existing plates already suited the kept room, no repointing needed.

| Cell | Backdrop ID | Filename | Title | Rooms | Image Generation Prompt |
|------|-------------|----------|-------|-------|--------------------------|
| 0 | `maze-12` | `111-maze-12.png` | **Maze I** | MAZE-12 | Woodring hatch style, 1-bit b&w. Twisty rock passage with a tight S-curve, walls pressing close on both turns, cross-hatched jagged stone, stippled floor grit. No figures. |
| 1 | `maze-13` | `112-maze-13.png` | **Maze J** | MAZE-13 | Woodring hatch style, 1-bit b&w. Twisty rock passage descending slightly with loose scree underfoot, cross-hatched uneven walls, stippled scattered stone fragments. No figures. |
| 2 | `maze-14` | `113-maze-14.png` | **Maze K** | MAZE-14 | Woodring hatch style, 1-bit b&w. Twisty rock passage with a cluster of small stalactites hanging from the low ceiling, cross-hatched dripping rock, stippled shadow beneath the points. No figures. |
| 3 | `maze-15` | `114-maze-15.png` | **Maze L** | MAZE-15 | Woodring hatch style, 1-bit b&w. Twisty rock passage where the walls widen unevenly, one side bulging into a shallow hollow, cross-hatched rock, stippled hollow shadow. No figures. |
| 4 | `dead-end-2` | `115-dead-end-2.png` | **Maze Dead End A** | DEAD-END-2 | Woodring hatch style, 1-bit b&w. A passage terminating abruptly at solid rock, faint claw marks scored near the base of the wall, cross-hatched dead-end face, stippled settled dust. No figures. |
| 5 | `dead-end-3` | `116-dead-end-3.png` | **Maze Dead End B** | DEAD-END-3 | Woodring hatch style, 1-bit b&w. A passage terminating at a rough boulder wedged into the opening, no way past, cross-hatched boulder texture, stippled loose gravel at its base. No figures. |
| 6 | `dead-end-4` | `117-dead-end-4.png` | **Maze Dead End C** | DEAD-END-4 | Woodring hatch style, 1-bit b&w. A passage terminating where the ceiling and floor pinch together into a solid seam, cross-hatched converging rock, stippled shadow at the seam. No figures. |
| 7 | `grating-room` | `118-grating-room.png` | **Grating Room** | GRATING-ROOM | Woodring hatch style, 1-bit b&w. Small rock chamber with a rusted iron grating set into the ceiling, faint light filtering down through the bars, cross-hatched rough walls, stippled light shafts from above. No figures. |
| 8 | `mirror-room-2` | `119-mirror-room-2.png` | **Mirror Room (2)** | MIRROR-ROOM-2 | Woodring hatch style, 1-bit b&w. Large square room, walls covered floor to ceiling with tall mirrors reflecting the chamber back on itself, a single crack running down one mirror's corner, cross-hatched mirror frames, stippled reflected light. No figures. |
| 9 | `treasure-room` | `120-treasure-room.png` | **Treasure Room** | TREASURE-ROOM | Woodring hatch style, 1-bit b&w. Large room with a solid granite east wall, crumbling discarded bags scattered on the floor, a staircase leading up in one corner, cross-hatched granite, stippled bag debris. No figures. |

Wired into `web/src/comic/backdrop.ts` (`BackdropId` and `ROOM_BACKDROPS`), packed into
`web/assets/comic/cast.json` (109 backdrops total), `art/package.json`'s `pack` script gains 10 new
`--backdrop` args. `art/test/polarity.test.ts`'s backdrop count updated 99→109. No pixel-gate cases
touch any of these ten rooms — `art` (54/54) and `web` (385/385) suites pass with no gate changes.

**Remaining for full 110/110:** `field` (3 new: NORTH-OF-HOUSE, SOUTH-OF-HOUSE, EAST-OF-HOUSE) — one
small (3-cell) sheet closes it out completely.

---

## Image 13: North/South/Behind House — the final sheet (cells 0–2)

**Status (2026-08-24): generated, cropped, wired. 110/110 reached — every room has its own
backdrop, no sharing anywhere.** `reference/backdrop-image-sheet-13.png` came back as a genuine
3-panel single row (3584×1184) rather than a 5×2 grid padded to 10, since only 3 cells were asked
for — the model followed the "three-panel strip" framing instead of the usual sheet template. New
resolution meant a full re-measurement: panel content box is roughly x∈[40,1160], y∈[25,1085] per
column (columns at 0/1195/2389), border thinner again (~8–10 px) than either prior geometry. Final
crop: 1060×1060 from (col + 70, 25).

WEST-OF-HOUSE alone keeps the `field` id; its existing plate (the original Image 1 house-clearing
scene) already suits that specific room.

| Cell | Backdrop ID | Filename | Title | Rooms | Image Generation Prompt |
|------|-------------|----------|-------|-------|--------------------------|
| 0 | `north-of-house` | `121-north-of-house.png` | **North of House** | NORTH-OF-HOUSE | Woodring hatch style, 1-bit b&w. Facing the north side of a white colonial house, no door on this face, windows boarded shut, a narrow path winding off through the trees to the north, cross-hatched clapboard siding, stippled tree line. No figures. |
| 1 | `south-of-house` | `122-south-of-house.png` | **South of House** | SOUTH-OF-HOUSE | Woodring hatch style, 1-bit b&w. Facing the south side of the same white house, no door on this face either, windows boarded shut, forest edge visible beyond the far corner, cross-hatched siding, stippled grass. No figures. |
| 2 | `east-of-house` | `123-east-of-house.png` | **Behind House** | EAST-OF-HOUSE | Woodring hatch style, 1-bit b&w. Facing the east side of the house, a small window visible in the wall (closed), an open clearing stretching away to the east, cross-hatched siding, stippled clearing grass. No figures. |

Wired into `web/src/comic/backdrop.ts` (`BackdropId` and `ROOM_BACKDROPS`), packed into
`web/assets/comic/cast.json` (**112 backdrops total** — 110 rooms, one each, plus `barrow-interior`
for the victory marker and the unused `room` fallback). `art/package.json`'s `pack` script gains 3
new `--backdrop` args. `art/test/polarity.test.ts`'s count updated 109→112.
`web/test/backdrop.test.ts`'s house-clearing test rewritten — it previously asserted all four house
rooms shared `field`; now it asserts WEST-OF-HOUSE alone does, and the other three resolve to their
own ids (kept as a regression guard against the historical `/HOUSE/`-matches-`pastoral`-first bug,
just no longer asserting the shared-`field` behavior that Image 13 deliberately removed). `art`
(54/54) and `web` (385/385) suites pass.

**Confirmed zero shared backdrop ids remain**: `grep -o '\["[A-Z0-9-]*", *"[a-z0-9-]*"\]'
web/src/comic/backdrop.ts | awk -F'"' '{print $4}' | sort | uniq -c | sort -rn | awk '$1>1'` returns
nothing.

---

## Backdrop ID → Room Mapping (target state for `web/src/comic/backdrop.ts`)

This is the assignment **after Image 4 only** — it does not yet include Image 5. When that sheet
lands, the nine new ids take one room each out of the `pastoral`, `highlands` and `shoreline` rows
(see § Image 5 for which room goes where).

It replaces the old (drifted, ~55-room) mapping block, and shows the **full 110-room assignment
after the diversity pass** — everything outside the three split groups is unchanged from what's
already shipped in `backdrop.ts` today; only the `cave-system` / `pastoral` / `maze` rows change.

```typescript
export type BackdropId =
  | "pastoral" | "field" | "barrow-exterior" | "grating-clearing"
  | "house-interior" | "attic" | "cellar" | "troll-room" | "cyclops-room"
  | "timber-room" | "machine-room" | "reservoir" | "dam-lobby" | "maze"
  | "temple" | "egypt-room" | "round-room" | "torch-room" | "cave-system"
  | "dome-room" | "mirror-room" | "gallery" | "atlantis" | "hades-entrance"
  | "land-of-living-dead" | "barrow-interior" | "maintenance-room" | "loud-room"
  | "engravings-cave" | "room"
  // New in the diversity pass:
  | "coal-mine" | "chasm-cave" | "winding-passage" | "small-cave"
  | "highlands" | "rainbow-falls" | "river" | "shoreline"
  | "maze-deep" | "maze-twisting" | "maze-dead-ends";

const ROOM_BACKDROPS = new Map<string, BackdropId>([
  // --- Unchanged from shipped backdrop.ts (79 rooms, all backdrops ≤5 rooms already) ---
  // Above ground / house / cellar / gallery / dungeon / temple / endgame rooms —
  // see backdrop.ts for the authoritative list; none of these move.

  // --- pastoral, split (was 22 rooms on one backdrop; now 5 backdrops, ≤5 rooms each) ---
  ["FOREST-1", "pastoral"], ["FOREST-2", "pastoral"], ["FOREST-3", "pastoral"],
  ["PATH", "pastoral"], ["UP-A-TREE", "pastoral"],

  ["MOUNTAINS", "highlands"], ["CLEARING", "highlands"], ["CANYON-VIEW", "highlands"],
  ["CLIFF-MIDDLE", "highlands"], ["CANYON-BOTTOM", "highlands"],

  ["END-OF-RAINBOW", "rainbow-falls"], ["ON-RAINBOW", "rainbow-falls"],
  ["ARAGAIN-FALLS", "rainbow-falls"], ["WHITE-CLIFFS-NORTH", "rainbow-falls"],
  ["WHITE-CLIFFS-SOUTH", "rainbow-falls"],

  ["RIVER-1", "river"], ["RIVER-2", "river"], ["RIVER-3", "river"],
  ["RIVER-4", "river"], ["RIVER-5", "river"],

  ["SHORE", "shoreline"], ["SANDY-BEACH", "shoreline"],

  // --- maze, split (was 20 rooms on one backdrop; now 4 backdrops, ≤5 rooms each) ---
  ["MAZE-1", "maze"], ["MAZE-2", "maze"], ["MAZE-3", "maze"], ["MAZE-4", "maze"],
  ["MAZE-5", "maze"],

  ["MAZE-6", "maze-deep"], ["MAZE-7", "maze-deep"], ["MAZE-8", "maze-deep"],
  ["MAZE-9", "maze-deep"], ["MAZE-10", "maze-deep"],

  ["MAZE-11", "maze-twisting"], ["MAZE-12", "maze-twisting"], ["MAZE-13", "maze-twisting"],
  ["MAZE-14", "maze-twisting"], ["MAZE-15", "maze-twisting"],

  ["DEAD-END-1", "maze-dead-ends"], ["DEAD-END-2", "maze-dead-ends"],
  ["DEAD-END-3", "maze-dead-ends"], ["DEAD-END-4", "maze-dead-ends"],
  ["GRATING-ROOM", "maze-dead-ends"],

  // --- cave-system, split (was 25 rooms on one backdrop; now 5 backdrops, ≤5 rooms each) ---
  ["MINE-ENTRANCE", "cave-system"], ["SQUEEKY-ROOM", "cave-system"], ["BAT-ROOM", "cave-system"],
  ["SMELLY-ROOM", "cave-system"], ["GAS-ROOM", "cave-system"],

  ["MINE-1", "coal-mine"], ["MINE-2", "coal-mine"], ["MINE-3", "coal-mine"],
  ["MINE-4", "coal-mine"], ["SLIDE-ROOM", "coal-mine"],

  ["EAST-OF-CHASM", "chasm-cave"], ["DEEP-CANYON", "chasm-cave"], ["CHASM-ROOM", "chasm-cave"],
  ["DAMP-CAVE", "chasm-cave"], ["SANDY-CAVE", "chasm-cave"],

  ["STRANGE-PASSAGE", "winding-passage"], ["NARROW-PASSAGE", "winding-passage"],
  ["WINDING-PASSAGE", "winding-passage"], ["TWISTING-PASSAGE", "winding-passage"],
  ["COLD-PASSAGE", "winding-passage"],

  ["SMALL-CAVE", "small-cave"], ["TINY-CAVE", "small-cave"], ["EW-PASSAGE", "small-cave"],
  ["NS-PASSAGE", "small-cave"], ["DEAD-END-5", "small-cave"],

  // ["SHAFT-ROOM"|"LADDER-TOP"|"LADDER-BOTTOM"|"TIMBER-ROOM"|"LOWER-SHAFT", "timber-room"]
  // unchanged — already ≤5, not part of this pass.
]);
```

**Reuse count after this pass** (all backdrops, max 5): `field` 4 · `dam-lobby` 3 · `timber-room` 5 ·
`reservoir` 5 · `pastoral` 5 · `highlands` 5 · `rainbow-falls` 5 · `river` 5 · `shoreline` 2 ·
`maze` 5 · `maze-deep` 5 · `maze-twisting` 5 · `maze-dead-ends` 5 · `cave-system` 5 · `coal-mine` 5 ·
`chasm-cave` 5 · `winding-passage` 5 · `small-cave` 5 · everything else (house, gallery, temple,
endgame rooms, etc.) already 1–2. `barrow-interior` and `room` remain at 0 (orphaned / fallback, see
Sync corrections).

---

## Generation Checklist

**Done**

- [x] Generate Images 1–3 (30 backdrops, shipped)
- [x] Pack and wire into `web/src/comic/backdrop.ts` / `cast.json` (shipped)
- [x] Generate Image 4 cells 0–9 (10 backdrops, `31-coal-mine` … `40-maze-twisting`), 2026-08-24
- [x] Crop each cell to 512×512 PNG in `reference/backdrops/`

**Remaining for Image 4**

- [x] Fold `41-maze-dead-ends` into the next bulk sheet instead of a one-cell generation (now § Image 5, cell 0)
- [ ] Run the ten through `art/tools/avbpack.ts` (AVB format for Comic Chat)
- [ ] Add the new `BackdropId` entries in `web/src/comic/backdrop.ts`
- [ ] Update `ROOM_BACKDROPS` per the target mapping above (only the `pastoral`/`maze`/`cave-system`
      rows change)
- [ ] Add polarity assertions in `art/test/polarity.test.ts` for each new backdrop
- [ ] Regenerate `web/assets/comic/` with `npm --prefix art run pack`
- [ ] Update coverage assertions in `web/test/backdrop.test.ts` for the new ids

**Remaining for Image 5**

- [x] Generate the Image 5 sheet (10 cells, `41-maze-dead-ends` … `50-sandy-beach`)
- [ ] Crop each cell to 512×512 PNG in `reference/backdrops/`
- [ ] Fold the nine new ids into `BackdropId`, `ROOM_BACKDROPS`, polarity tests and the AVB pack
      alongside the Image 4 backlog above

**Toward 1:1 room coverage (110 rooms)**

- [ ] Enumerate the rooms still sharing a backdrop after Image 4 and group them into 5×2 bulk sheets
- [ ] Generate, crop, and record each sheet here as a new `## Image N` section
- [ ] When every room has its own plate, collapse `ROOM_BACKDROPS` to an identity mapping and retire
      the mapping table in this document

---

## Bulk generation sessions

| Sheet | Date | Cells | Result |
|---|---|---|---|
| Images 1–3 | shipped | 30 | Live in `web/assets/comic/` |
| `reference/backdrops-bulk-generation-4(5x2).png` | 2026-08-24 | 10 | Cropped to `reference/backdrops/31-…` – `40-…`; three captions wrong (see § Image 4); not yet packed |

**Sheet conventions, learned the hard way (2026-08-24):** the image model follows the *reference
sheet's* geometry over the prompt's — asking for a 3×3 of squares against a 5×2 portrait reference
produced a 5×2 of portraits anyway, with one cell duplicated to pad the count. Generate 5×2 to match
the reference, ask for generous cells so the square centre-crop keeps its subject, and verify each
caption against its content before naming the crops.
