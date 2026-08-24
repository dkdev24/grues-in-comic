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

**Direction change — 1:1 room coverage (2026-08-24).** The ≤5 cap is now an interim floor, not the
goal. The target is **one backdrop per room for all 110 Zork I rooms**, at which point
`ROOM_BACKDROPS` collapses into a direct room-id → backdrop-id identity and the mapping table below
stops being a design artefact. Generation continues in bulk sheets until that is reached; the tables
in this document remain the record of what has been generated and what a given plate depicts.

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
