/**
 * Packing an avatar's parts onto one sheet — the build-time half of the browser
 * cast bundle. The manifest it describes, and the decisions behind its shape,
 * are `art/src/cast-manifest.ts`; this file only produces it.
 */
import { facesOf, torsosOf, bodiesOf } from "./avb.js";
import { blit, createRaster, rasterizeLayers, type Raster } from "./raster.js";
import { TORSOFIRST, type Avatar, type PoseRecord } from "./format.js";
import type { PackedAvatar, PackedPart, SheetRect } from "./cast-manifest.js";

export type * from "./cast-manifest.js";

interface Placement { raster: Raster; rect: SheetRect }

/**
 * Shelf packing, tallest first. Deliberately the simplest algorithm that works:
 * an avatar is 30–45 parts of similar height, so the waste a better packer
 * would recover is a few percent of a file already measured in tens of KiB.
 */
export function pack(
  rasters: readonly Raster[], maxWidth = 1024,
): { sheet: Raster; rects: SheetRect[] } {
  const order = rasters
    .map((raster, i) => ({ raster, i }))
    .sort((a, b) => b.raster.height - a.raster.height);

  const rects: SheetRect[] = new Array(rasters.length);
  const placements: Placement[] = [];
  let x = 0, y = 0, shelfHeight = 0, width = 0;

  for (const { raster, i } of order) {
    if (x > 0 && x + raster.width > maxWidth) {
      y += shelfHeight;
      x = 0;
      shelfHeight = 0;
    }
    const rect = { x, y, width: raster.width, height: raster.height };
    rects[i] = rect;
    placements.push({ raster, rect });
    x += raster.width;
    width = Math.max(width, x);
    shelfHeight = Math.max(shelfHeight, raster.height);
  }

  const sheet = createRaster(width, y + shelfHeight);
  for (const { raster, rect } of placements) blit(sheet, raster, rect.x, rect.y);
  return { sheet, rects };
}

function partOf(rec: PoseRecord, figure: SheetRect, aura: SheetRect | null): PackedPart {
  return {
    kind: rec.kind,
    index: rec.index,
    emotion: rec.emotionName,
    angle: rec.angle,
    intensity: rec.intensity,
    cx: rec.cx ?? 0,
    cy: rec.cy ?? 0,
    cxDelta: rec.cxDelta ?? 0,
    cyDelta: rec.cyDelta ?? 0,
    x: rec.x ?? 0,
    figure,
    aura,
  };
}

/** Rasterize every part of an avatar onto one sheet, and describe them. */
export function packAvatar(av: Avatar, sheetName: string): { avatar: PackedAvatar; sheet: Raster } {
  const faces = facesOf(av);
  const torsos = torsosOf(av);
  const bodies = av.type === "COMPLEX" ? [] : bodiesOf(av);
  const records = [...faces, ...torsos, ...bodies];

  // Each part contributes up to two rasters, packed together so a figure and
  // its halo can never land on different sheets.
  const layers = records.map((rec) => rasterizeLayers(av, rec, { includeAura: true }));
  const rasters: Raster[] = [];
  const slots = layers.map((layer) => {
    const figure = rasters.push(layer.figure) - 1;
    const aura = layer.aura ? rasters.push(layer.aura) - 1 : -1;
    return { figure, aura };
  });

  const { sheet, rects } = pack(rasters);
  const parts = records.map((rec, i) => {
    const slot = slots[i]!;
    return partOf(rec, rects[slot.figure]!, slot.aura < 0 ? null : rects[slot.aura]!);
  });

  const avatar: PackedAvatar = {
    name: av.name ?? sheetName,
    type: av.type,
    torsoFirst: (av.flags & TORSOFIRST) !== 0,
    sheet: `${sheetName}.png`,
    sheetWidth: sheet.width,
    sheetHeight: sheet.height,
    faces: parts.slice(0, faces.length),
    torsos: parts.slice(faces.length, faces.length + torsos.length),
    bodies: parts.slice(faces.length + torsos.length),
  };
  return { avatar, sheet };
}
