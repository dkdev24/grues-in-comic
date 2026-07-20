# Graph Report - art  (2026-07-20)

## Corpus Check
- 14 files · ~10,104 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 112 nodes · 297 edges · 7 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8aec4e1d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- image.ts
- R
- raster.ts
- avb.ts
- index.ts
- png.ts

## God Nodes (most connected - your core abstractions)
1. `parseAvatar()` - 14 edges
2. `decodeImage()` - 14 edges
3. `rasterizeLayers()` - 14 edges
4. `R` - 11 edges
5. `Reader` - 11 edges
6. `decode_image()` - 10 edges
7. `parse()` - 10 edges
8. `rasterizePose()` - 9 edges
9. `compositeBody` - 8 edges
10. `firstNeutral()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `load()` --calls--> `parseAvatar()`  [EXTRACTED]
  test/corpus.test.ts → src/avb.ts
- `readPoseRecords()` --calls--> `emotionAngle()`  [EXTRACTED]
  src/avb.ts → src/format.ts
- `rasterizeLayers()` --calls--> `decodeImage()`  [EXTRACTED]
  src/raster.ts → src/image.ts
- `rasterizeLayers()` --calls--> `adjustOffset()`  [EXTRACTED]
  src/raster.ts → src/avb.ts
- `compositeBody` --calls--> `blit()`  [EXTRACTED]
  src/composite.ts → src/raster.ts

## Import Cycles
- None detected.

## Communities (7 total, 0 thin omitted)

### Community 0 - "image.ts"
Cohesion: 0.16
Nodes (16): parseAvatar(), readPalette(), readPoseRecords(), RGB, Bmih, DecodedImage, decodeImage(), decodeRle() (+8 more)

### Community 1 - "R"
Cohesion: 0.16
Nodes (14): bmih(), decode_image(), parse(), R, DIB rows are 4-byte aligned, bottom-up unless height<0., Returns (rows_of_palette_indices_or_rgb, width, height, palette)., Map palette indices to RGBA., CAvatarPalette::Read - INT16 count, then 3-byte RGB entries. (+6 more)

### Community 2 - "raster.ts"
Cohesion: 0.31
Nodes (15): adjustOffset(), compositeBody, compositeSimpleBody(), blit(), createRaster(), isMaskedMono(), luminance(), planeCoverage() (+7 more)

### Community 3 - "avb.ts"
Cohesion: 0.24
Nodes (11): bodiesOf(), TYPE_NAMES, Avatar, AvatarType, EMOTION_ANGLES, EMOTION_NAMES, emotionAngle(), EmotionName (+3 more)

### Community 4 - "index.ts"
Cohesion: 0.36
Nodes (14): isGesture(), Emotion, EmotionOption, firstNeutral(), headAndTorsoFor(), isNeutral(), nearestByAngle(), nearestGated() (+6 more)

### Community 5 - "png.ts"
Cohesion: 0.19
Nodes (10): facesOf(), torsosOf(), chunk(), crc32(), CRC_TABLE, encodePng(), av, manifest (+2 more)

## Knowledge Gaps
- **12 isolated node(s):** `TYPE_NAMES`, `EmotionName`, `EMOTION_ANGLES`, `MASKEDMONO_PALETTE`, `MONO_PALETTE` (+7 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `parseAvatar()` connect `image.ts` to `raster.ts`, `avb.ts`, `index.ts`, `png.ts`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **Why does `decodeImage()` connect `image.ts` to `raster.ts`, `index.ts`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Why does `Reader` connect `image.ts` to `avb.ts`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **What connects `TYPE_NAMES`, `EmotionName`, `EMOTION_ANGLES` to the rest of the system?**
  _12 weakly-connected nodes found - possible documentation gaps or missing edges._