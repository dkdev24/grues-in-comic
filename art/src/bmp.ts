/**
 * Standalone `.bmp` files, as opaque rasters.
 *
 * The three shipped Comic Chat backdrops are plain Windows bitmaps rather than
 * `.avb` records, so they need a way in that is not a pose. There is no new
 * decoder here: `AIF_DIB` already means "a complete .BMP file is embedded at
 * this offset", so a bare file is that same path at offset 0.
 *
 * Backdrops are **opaque** — no mask, no aura, no transparency. That is the
 * whole difference from {@link rasterizePose}, and it is why this is six lines
 * rather than a module.
 */
import { decodeImage } from "./image.js";
import { createRaster, type Raster } from "./raster.js";
import { AIF_DIB, AIP_NOPALETTE } from "./format.js";

export function decodeBmp(bytes: Uint8Array): Raster {
  const img = decodeImage(bytes, 0, AIF_DIB, AIP_NOPALETTE);
  const raster = createRaster(img.width, img.height);

  for (let i = 0; i < img.width * img.height; i++) {
    const out = i * 4;
    if (img.rgb) {
      raster.data[out] = img.rgb[i * 3]!;
      raster.data[out + 1] = img.rgb[i * 3 + 1]!;
      raster.data[out + 2] = img.rgb[i * 3 + 2]!;
    } else {
      const colour = img.palette?.[img.pixels[i]!] ?? [0, 0, 0];
      raster.data[out] = colour[0];
      raster.data[out + 1] = colour[1];
      raster.data[out + 2] = colour[2];
    }
    raster.data[out + 3] = 255;
  }
  return raster;
}
