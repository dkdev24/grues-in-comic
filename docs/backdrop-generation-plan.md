# Backdrop Generation Plan — 30 Backdrops for Full Game Coverage

**Strategy**: 3 images × 2×5 grid = 30 backdrops total — all newly generated. The three MVP
backdrop *IDs* (`pastoral`, `field`, `room`) are reused, but the art is regenerated so the whole
set shares one idiom; the shipped conservatory `room8bs` is not carried forward.  
Each cell = 512×512 px (Comic Chat native 315×315 upscaled ~1.6×, then padded to a 512 power-of-two
cell for crisp rendering and a clean crop grid).  
Woodring hatch idiom, 1-bit polarity (pinned by `art/test/polarity.test.ts`).

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
| 5 | `barrow-interior` | `26-barrow-interior.png` | **Barrow Interior** | Woodring hatch style, 1-bit b&w. Stone slab tomb, coffin, treasure, ancient seal, cross-hatched stone, stippled dust of ages, sacred darkness, single beam of light. No figures. |
| 6 | `maintenance-room` | `27-maintenance-room.png` | **Maintenance Room** | Woodring hatch style, 1-bit b&w. Utility corridor, pipe junctions, valve wheels, tool board, leak stains, cross-hatched metal, stippled industrial grime, functional ugliness. No figures. |
| 7 | `loud-room` | `28-loud-room.png` | **Loud Room** | Woodring hatch style, 1-bit b&w. Echoing chamber, sound waves visualized as concentric hatching lines, vibrating walls, cross-hatched resonance pattern, stippled acoustic chaos. No figures. |
| 8 | `engravings-cave` | `29-engravings-cave.png` | **Engravings Cave** | Woodring hatch style, 1-bit b&w. Cave walls covered in ancient carvings: hunters, beasts, symbols, cross-hatched petroglyphs, stippled torchlight revealing art, prehistoric narrative. No figures. |
| 9 | `room` | `30-room.png` | **Generic Interior (Fallback)** | Woodring hatch style, 1-bit b&w. Plain stone room, arched doorway, torch sconce, flagstone floor, cross-hatched masonry, stippled shadows, versatile neutral backdrop. No figures. |

---

## Backdrop ID → Room Mapping (for `web/src/comic/backdrop.ts`)

> **Rename note:** the existing table is named `OUTDOORS` (exported as `OUTDOOR_BACKDROPS`) because
> it only held outdoor rooms. This plan extends it with dungeon, temple, cave, and endgame rooms, so
> rename it to `ROOM_BACKDROPS` (export `ROOM_BACKDROPS`) when landing — the old name would lie.
> `backdropFor` stays total: `ROOM_BACKDROPS.get(room) ?? "room"`.

```typescript
const ROOM_BACKDROPS = new Map<string, BackdropId>([
  // House exterior (field)
  ["WEST-OF-HOUSE", "field"],
  ["NORTH-OF-HOUSE", "field"],
  ["SOUTH-OF-HOUSE", "field"],
  ["EAST-OF-HOUSE", "field"],

  // Forest & hills (pastoral)
  ["FOREST-1", "pastoral"],
  ["FOREST-2", "pastoral"],
  ["FOREST-3", "pastoral"],
  ["PATH", "pastoral"],
  ["UP-A-TREE", "pastoral"],
  ["CLEARING", "pastoral"],
  ["GRATING-CLEARING", "grating-clearing"],
  ["CANYON-VIEW", "pastoral"],
  ["CLIFF-MIDDLE", "pastoral"],
  ["CANYON-BOTTOM", "pastoral"],
  ["END-OF-RAINBOW", "pastoral"],
  ["ARAGAIN-FALLS", "pastoral"],
  ["MOUNTAINS", "pastoral"],
  ["STONE-BARROW", "barrow-exterior"],

  // House interior
  ["LIVING-ROOM", "house-interior"],
  ["KITCHEN", "house-interior"],
  ["ATTIC", "attic"],
  ["CELLAR", "cellar"],
  ["TROLL-ROOM", "troll-room"],
  ["CYCLOPS-ROOM", "cyclops-room"],
  ["TIMBER-ROOM", "timber-room"],

  // Dungeon
  ["MACHINE-ROOM", "machine-room"],
  ["RESERVOIR", "reservoir"],
  ["DAM-LOBBY", "dam-lobby"],
  ["DAM-BASE", "dam-lobby"],
  ["MAZE-1", "maze"],
  ["MAZE-2", "maze"],
  ["MAZE-3", "maze"],
  ["MAZE-4", "maze"],
  ["MAZE-5", "maze"],
  ["MAZE-6", "maze"],
  ["MAZE-7", "maze"],
  ["MAZE-8", "maze"],
  ["MAZE-9", "maze"],
  ["MAZE-10", "maze"],

  // Temple complex
  ["TEMPLE", "temple"],
  ["EGYPT-ROOM", "egypt-room"],
  ["ROUND-ROOM", "round-room"],
  ["TORCH-ROOM", "torch-room"],
  ["ALTAR", "temple"],

  // Caves
  ["BAT-ROOM", "cave-system"],
  ["GAS-ROOM", "cave-system"],
  ["SANDY-CAVE", "cave-system"],
  ["SQUEAKY-ROOM", "cave-system"],
  ["SHAFT-ROOM", "cave-system"],
  ["LOWER-SHAFT", "cave-system"],

  // Special
  ["DOME-ROOM", "dome-room"],
  ["MIRROR-ROOM-1", "mirror-room"],
  ["MIRROR-ROOM-2", "mirror-room"],
  ["GALLERY", "gallery"],
  ["STUDIO", "gallery"],
  ["ATLANTIS-ROOM", "atlantis"],
  ["ENTRANCE-TO-HADES", "hades-entrance"],
  ["LAND-OF-LIVING-DEAD", "land-of-living-dead"],
  ["BARROW-INTERIOR", "barrow-interior"],
  ["MAINTENANCE-ROOM", "maintenance-room"],
  ["LOUD-ROOM", "loud-room"],
  ["ENGRAVINGS-CAVE", "engravings-cave"],

  // All remaining rooms fall through to "room" (the fallback in backdropFor)
]);
```

---

## Generation Checklist

- [ ] Generate Image 1 (cells 0–9) as 1024×2560 (2 cols × 5 rows × 512px)
- [ ] Generate Image 2 (cells 0–9) as 1024×2560
- [ ] Generate Image 3 (cells 0–9) as 1024×2560
- [ ] Crop each cell to 512×512 PNG
- [ ] Run through `art/tools/avbpack.ts` pipeline (AVB format for Comic Chat)
- [ ] Add `BackdropId` type entries in `web/src/comic/backdrop.ts`
- [ ] Rename `OUTDOORS`/`OUTDOOR_BACKDROPS` → `ROOM_BACKDROPS` and extend with all room→backdrop assignments
- [ ] Add polarity assertions in `art/test/polarity.test.ts` for each new backdrop
- [ ] Regenerate `web/assets/comic/` with `npm --prefix art run pack`
