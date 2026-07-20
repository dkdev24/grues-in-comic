# Graph Report - art  (2026-07-21)

## Corpus Check
- 19 files · ~12,638 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 134 nodes · 370 edges · 8 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9397d70f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- image.ts
- R
- raster.ts
- avb.ts
- index.ts
- png.ts
- pack.ts

## God Nodes (most connected - your core abstractions)
1. `parseAvatar()` - 17 edges
2. `decodeImage()` - 17 edges
3. `rasterizeLayers()` - 17 edges
4. `R` - 11 edges
5. `createRaster()` - 11 edges
6. `Reader` - 11 edges
7. `decode_image()` - 10 edges
8. `parse()` - 10 edges
9. `rasterizePose()` - 9 edges
10. `compositeBody` - 8 edges

## Surprising Connections (you probably didn't know these)
- `load()` --calls--> `parseAvatar()`  [EXTRACTED]
  test/corpus.test.ts → src/avb.ts
- `load()` --calls--> `parseAvatar()`  [EXTRACTED]
  test/polarity.test.ts → src/avb.ts
- `readPoseRecords()` --calls--> `emotionAngle()`  [EXTRACTED]
  src/avb.ts → src/format.ts
- `decodeBmp()` --calls--> `decodeImage()`  [EXTRACTED]
  src/bmp.ts → src/image.ts
- `rasterizeLayers()` --calls--> `decodeImage()`  [EXTRACTED]
  src/raster.ts → src/image.ts

## Import Cycles
- None detected.

## Communities (8 total, 0 thin omitted)

### Community 0 - "image.ts"
Cohesion: 0.14
Nodes (18): parseAvatar(), readPalette(), readPoseRecords(), RGB, Bmih, DecodedImage, decodeImage(), decodeRle() (+10 more)

### Community 1 - "R"
Cohesion: 0.16
Nodes (14): bmih(), decode_image(), parse(), R, DIB rows are 4-byte aligned, bottom-up unless height<0., Returns (rows_of_palette_indices_or_rgb, width, height, palette)., Map palette indices to RGBA., CAvatarPalette::Read - INT16 count, then 3-byte RGB entries. (+6 more)

### Community 2 - "raster.ts"
Cohesion: 0.28
Nodes (16): adjustOffset(), decodeBmp(), compositeBody, compositeSimpleBody(), blit(), createRaster(), isMaskedMono(), luminance() (+8 more)

### Community 3 - "avb.ts"
Cohesion: 0.27
Nodes (10): TYPE_NAMES, Avatar, AvatarType, EMOTION_ANGLES, EMOTION_NAMES, emotionAngle(), EmotionName, PartKind (+2 more)

### Community 4 - "index.ts"
Cohesion: 0.36
Nodes (14): isGesture(), Emotion, EmotionOption, firstNeutral(), headAndTorsoFor(), isNeutral(), nearestByAngle(), nearestGated() (+6 more)

### Community 5 - "png.ts"
Cohesion: 0.24
Nodes (8): chunk(), crc32(), CRC_TABLE, encodePng(), av, manifest, options, [src, outdir, ...flags]

### Community 7 - "pack.ts"
Cohesion: 0.16
Nodes (16): ADR-0004, bodiesOf(), facesOf(), torsosOf(), CastManifest, PackedAvatar, PackedBackdrop, PackedPart (+8 more)

## Knowledge Gaps
- **18 isolated node(s):** `TYPE_NAMES`, `PackedBackdrop`, `ADR-0004`, `EmotionName`, `EMOTION_ANGLES` (+13 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `parseAvatar()` connect `image.ts` to `raster.ts`, `avb.ts`, `index.ts`, `png.ts`, `pack.ts`?**
  _High betweenness centrality (0.068) - this node is a cross-community bridge._
- **Why does `decodeImage()` connect `image.ts` to `raster.ts`, `index.ts`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Why does `Reader` connect `image.ts` to `avb.ts`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **What connects `TYPE_NAMES`, `PackedBackdrop`, `ADR-0004` to the rest of the system?**
  _18 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `image.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.14022988505747128 - nodes in this community are weakly interconnected._