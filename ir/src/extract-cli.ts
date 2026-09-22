/**
 * World-model extraction CLI (stage 3.1).
 *
 *   pnpm run extract                    # AST artifacts → artifacts/zork1.world.json
 *   tsx src/extract-cli.ts <ast-dir> <out-file>
 *
 * Reads every importer AST artifact in <ast-dir>, extracts the world model,
 * validates it, and writes it only when valid. Exit code 0 on success.
 */

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { extractWorld, type AstProgram } from "./extract-world.js";
import { validateWorld } from "./validate.js";

const [astDir = "../importer/artifacts/ast", outFile = "artifacts/zork1.world.json"] =
  process.argv.slice(2);

const programs: AstProgram[] = readdirSync(astDir)
  .filter((f) => f.endsWith(".json"))
  .sort()
  .map((f) => JSON.parse(readFileSync(join(astDir, f), "utf8")) as AstProgram);

const { world, catalog } = extractWorld(programs);
const result = validateWorld(world);
if (!result.valid) {
  console.error(`✗ extracted world is invalid — ${result.errors.length} error(s):`);
  for (const e of result.errors) console.error(`    ${e.path}: ${e.message}`);
  process.exit(1);
}

mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, JSON.stringify(world, null, 2) + "\n");
const catalogFile = join(dirname(outFile), "zork1.behavior-catalog.json");
writeFileSync(catalogFile, JSON.stringify(catalog, null, 2) + "\n");
const s = result.summary!;
console.log(
  `✓ ${outFile}: ${s.rooms} rooms (${s.stubRooms} stubs), ${s.objects} objects (${s.stubObjects} stubs), ` +
    `${s.exits} exits, ${s.globals} globals, ${s.tables} tables, ${s.flags} flags, ${s.syntaxRules} syntax rules, ` +
    `${s.routines} routines (${catalog.length} catalogued complex), ${s.routineRefs.length} routine refs`,
);
