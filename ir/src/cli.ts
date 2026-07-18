/**
 * IR validator CLI.
 *
 *   npm run validate            # validates every .json under samples/
 *   tsx src/cli.ts <file|dir>…  # validate specific documents
 *
 * Exit code 0 when every document is valid, 1 otherwise.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { validateWorld } from "./validate.js";

function collect(paths: string[]): string[] {
  const files: string[] = [];
  for (const p of paths) {
    if (statSync(p).isDirectory()) {
      for (const entry of readdirSync(p).sort()) {
        if (entry.endsWith(".json")) files.push(join(p, entry));
      }
    } else {
      files.push(p);
    }
  }
  return files;
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("usage: tsx src/cli.ts <file|dir>…");
  process.exit(2);
}

let failed = false;
for (const file of collect(args)) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(file, "utf8"));
  } catch (err) {
    console.error(`✗ ${file}: not valid JSON — ${(err as Error).message}`);
    failed = true;
    continue;
  }
  const result = validateWorld(parsed);
  if (result.valid && result.summary) {
    const s = result.summary;
    console.log(
      `✓ ${file}: ${s.rooms} rooms (${s.stubRooms} stubs), ${s.objects} objects (${s.stubObjects} stubs), ` +
        `${s.exits} exits, ${s.globals} globals, ${s.tables} tables, ${s.flags} flags, ` +
        `${s.routineRefs.length} routine refs`,
    );
  } else {
    console.error(`✗ ${file}: ${result.errors.length} error(s)`);
    for (const e of result.errors) console.error(`    ${e.path}: ${e.message}`);
    failed = true;
  }
}
process.exit(failed ? 1 : 0);
