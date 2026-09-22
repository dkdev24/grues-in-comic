/**
 * Stage 1.3 artifact generator: parse every `.zil` file in the historical
 * corpus and write committed artifacts under `importer/artifacts/`:
 *
 *   artifacts/ast/<file>.json   full typed AST (positions included), compact JSON
 *   artifacts/stats.json        per-file + corpus statistics
 *   artifacts/STATS.md          human-readable report
 *
 * Deterministic: file order, histogram key order, and JSON layout are stable,
 * so re-running on unchanged source produces a clean git diff.
 *
 * Run with: pnpm run artifacts
 */

import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "./parser.js";
import { corpusStats, fileStats, statsMarkdown, type FileStats } from "./stats.js";

const CORPUS = fileURLToPath(new URL("../../original-projects/zork1/", import.meta.url));
const OUT = fileURLToPath(new URL("../artifacts/", import.meta.url));
const GENERATED_BY = "pnpm run artifacts (importer/src/cli.ts)";

mkdirSync(join(OUT, "ast"), { recursive: true });

const files = readdirSync(CORPUS)
  .filter((f) => f.endsWith(".zil"))
  .sort();

const perFile: FileStats[] = [];
for (const file of files) {
  const src = readFileSync(join(CORPUS, file), "utf8");
  const ast = parse(src, file);
  writeFileSync(join(OUT, "ast", `${file}.json`), JSON.stringify(ast) + "\n");
  perFile.push(fileStats(ast, src));
  console.log(`parsed ${file}: ${perFile[perFile.length - 1]!.nodes} nodes`);
}

const stats = corpusStats(perFile, GENERATED_BY);
writeFileSync(join(OUT, "stats.json"), JSON.stringify(stats, null, 2) + "\n");
writeFileSync(join(OUT, "STATS.md"), statsMarkdown(stats));

console.log(
  `\nwrote ${files.length} ASTs + stats.json + STATS.md to ${OUT}\n` +
    `corpus: ${stats.totals.lines} lines, ${stats.totals.nodes} AST nodes`,
);
