/**
 * Entry point for the TL;DR strip harness. Usage: tsx tools/render-tldr.ts [en|ko]
 *
 * `render-tldr-core.ts` does the actual rendering; this file's only job is
 * making Korean balloons legible without leaving a permanent mark on the
 * shared engine. `BALLOON_FONT`/`TITLE_FONT` (`../src/comic/balloon.ts`,
 * `render.ts`) hardcode a Latin font stack — this repo ships no
 * Hangul-capable font, so a KO run needs `TLDR-KR` prepended to both for the
 * duration of that render only. It is patched onto disk, the core script
 * runs as a **child process** (imports are evaluated at load, so the patch
 * must land before `render-tldr-core.ts` ever imports `render.js`), and the
 * patch is reverted in a `finally` — on success, failure, or Ctrl-C — so
 * `git status` on `web/src/comic/` is clean before and after every run.
 *
 * An `en` run needs none of this: it never touches the two files.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { KR_FONT_FAMILY } from "./render-tldr-font.js";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const BALLOON_TS = join(ROOT, "web", "src", "comic", "balloon.ts");
const RENDER_TS = join(ROOT, "web", "src", "comic", "render.ts");

const PATCHES: ReadonlyArray<{ file: string; from: string; to: string }> = [
  {
    file: BALLOON_TS,
    from: 'export const BALLOON_FONT = \'13px "Comic Sans MS"',
    to: `export const BALLOON_FONT = '13px "${KR_FONT_FAMILY}", "Comic Sans MS"`,
  },
  {
    file: RENDER_TS,
    from: 'const TITLE_FONT = \'bold 12px "Comic Sans MS"',
    to: `const TITLE_FONT = 'bold 12px "${KR_FONT_FAMILY}", "Comic Sans MS"`,
  },
];

function applyPatches(): void {
  for (const { file, from, to } of PATCHES) {
    const original = readFileSync(file, "utf8");
    if (!original.includes(from)) {
      throw new Error(`${file}: expected font-stack literal not found — engine source moved, update PATCHES`);
    }
    writeFileSync(file, original.replace(from, to));
  }
}

function revertPatches(): void {
  for (const { file } of PATCHES) {
    spawnSync("git", ["checkout", "--", file], { cwd: ROOT, stdio: "inherit" });
  }
}

function main(): void {
  const which = process.argv[2] === "ko" ? "ko" : "en";
  if (which === "en") {
    const result = spawnSync("npx", ["tsx", "tools/render-tldr-core.ts", "en"], {
      cwd: join(ROOT, "web"), stdio: "inherit",
    });
    process.exit(result.status ?? 1);
  }

  applyPatches();
  try {
    const result = spawnSync("npx", ["tsx", "tools/render-tldr-core.ts", "ko"], {
      cwd: join(ROOT, "web"), stdio: "inherit",
    });
    if (result.status !== 0) process.exit(result.status ?? 1);
  } finally {
    revertPatches();
  }
}

main();
