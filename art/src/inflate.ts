/**
 * The one platform dependency in this module.
 *
 * `AIF_LZDEFLATE` blobs are plain zlib streams. This pipeline is build-time, so
 * it uses Node's synchronous inflate; a browser-side decoder would swap this
 * file for `DecompressionStream("deflate")`, which handles the same bytes. That
 * portability is why the dependency is isolated here rather than inlined.
 */
import { inflateSync } from "node:zlib";

export function inflate(data: Uint8Array): Uint8Array {
  return new Uint8Array(inflateSync(data));
}
