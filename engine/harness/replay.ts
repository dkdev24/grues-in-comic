/**
 * Transcript replay harness (stage 4.4) — the engine's parity oracle.
 *
 * `verification/run-transcripts.sh` runs the *reference* build under dfrotz to
 * produce the goldens. This is the other half: it replays the same walkthroughs
 * through the TypeScript engine and diffs the normalized turn text.
 *
 *   npm run replay             report parity for every walkthrough
 *   npm run replay -- --quiet  summary only, no per-turn diffs
 *
 * Exit code is the number of failing walkthroughs, so it drops into CI as-is.
 *
 * This deliberately does *not* go through `run-transcripts.sh`: that script
 * drives a Z-machine story file, and the engine is not one. Both sides compare
 * against the same goldens, which is the only thing that has to be shared.
 */

import { readFileSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { WorldDocument } from "@grues-in-comic/ir";
import { createEngine } from "../src/engine.js";
import { transcriptText } from "../src/events.js";
import {
  diffTurns,
  parseGolden,
  parseWalkthrough,
  type ParityMode,
  type TurnDiff,
} from "./golden.js";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const WALKTHROUGHS = join(ROOT, "verification", "walkthroughs");
const GOLDEN = join(ROOT, "verification", "golden");
const WORLD = join(ROOT, "ir", "artifacts", "zork1.world.json");

/**
 * The seed `run-transcripts.sh` pins dfrotz to. The engine's generator is not
 * the Z-machine's, so an identical seed does not give identical draws — it is
 * matched here so that when a random-dependent turn does diverge, the seed is
 * at least not a second unexplained variable.
 */
const SEED = 1234;

export interface WalkthroughResult {
  name: string;
  commands: string[];
  diffs: TurnDiff[];
  /** Turns that matched, out of the total compared. */
  matched: number;
  total: number;
  /** Routines a daemon needed but the document never defined. */
  missingRoutines: string[];
  /** Whether a diff here fails the suite. */
  parity: ParityMode;
  /** A completion oracle (reaches the barrow), excluded from the parity ratio. */
  oracle: boolean;
  /** Why, when it does not. */
  reason: string;
  /**
   * Diffs on turns the walkthrough declared unverifiable. Reported, never
   * failing — and kept apart from `diffs` so the two can't be confused.
   */
  informationalDiffs: TurnDiff[];
  /** Reasons given for those turns, deduplicated. */
  informationalReasons: string[];
  /** How many turns were declared unverifiable. */
  informationalTurnCount: number;
}

export function replay(name: string, doc: WorldDocument): WalkthroughResult {
  const { commands, parity, oracle, reason, informationalTurns } = parseWalkthrough(
    readFileSync(join(WALKTHROUGHS, `${name}.cmd`), "utf8"),
  );
  const golden = parseGolden(readFileSync(join(GOLDEN, `${name}.txt`), "utf8"));

  const engine = createEngine(doc, { seed: SEED });
  const actual: string[] = [];
  engine.start();
  for (const command of commands) {
    try {
      actual.push(transcriptText(engine.command(command).events));
    } catch (error) {
      // A crashed turn is a diff, not a harness failure — the report should
      // show which command broke and keep going through the rest.
      actual.push(`<<engine error: ${(error as Error).message}>>`);
    }
  }

  // The walkthroughs end with `quit` + `y`; the confirmation is interpreter
  // dialogue, not gameplay, so the comparison stops at the last real command.
  const compared = commands.length - trailingQuitLength(commands);
  const all = diffTurns(
    commands.slice(0, compared),
    golden.turns.slice(0, compared),
    actual.slice(0, compared),
  );

  // Split the diffs by whether the walkthrough claimed the turn was verifiable.
  // The strict figures below count only strict turns in both numerator and
  // denominator, so quarantining a passage can't inflate the percentage.
  const diffs = all.filter((d) => !informationalTurns.has(d.index));
  const informationalDiffs = all.filter((d) => informationalTurns.has(d.index));
  const strictTotal = compared - informationalTurns.size;

  return {
    name,
    commands,
    diffs,
    matched: strictTotal - diffs.length,
    total: strictTotal,
    missingRoutines: engine.missingRoutines(),
    parity,
    oracle,
    reason,
    informationalDiffs,
    informationalReasons: [...new Set(informationalTurns.values())],
    informationalTurnCount: informationalTurns.size,
  };
}

function trailingQuitLength(commands: readonly string[]): number {
  let n = 0;
  for (let i = commands.length - 1; i >= 0; i--) {
    const c = commands[i]!.toLowerCase();
    if (c === "y" || c === "yes" || c === "quit" || c === "q") n++;
    else break;
  }
  return n;
}

export function walkthroughNames(): string[] {
  return readdirSync(WALKTHROUGHS)
    .filter((f) => f.endsWith(".cmd"))
    .map((f) => basename(f, ".cmd"))
    .sort();
}

export function loadDocument(): WorldDocument {
  return JSON.parse(readFileSync(WORLD, "utf8")) as WorldDocument;
}

/* ---------------- CLI ---------------- */

function main(): void {
  const quiet = process.argv.includes("--quiet");
  const doc = loadDocument();

  let failed = 0;
  let matchedTotal = 0;
  let comparedTotal = 0;
  let strictMatched = 0;
  let strictTotal = 0;

  for (const name of walkthroughNames()) {
    const result = replay(name, doc);
    matchedTotal += result.matched;
    comparedTotal += result.total;
    if (result.parity === "strict") {
      strictMatched += result.matched;
      strictTotal += result.total;
    }

    const informational = result.parity === "informational";
    const status =
      result.diffs.length === 0 ? "PASS" : informational ? "INFO" : "DIFF";
    if (result.diffs.length > 0 && !informational) failed++;
    console.log(`${status}: ${name} — ${result.matched}/${result.total} turns match`);
    if (informational && result.reason.length > 0) {
      console.log(`  informational: ${result.reason}`);
    }
    for (const why of result.informationalReasons) {
      const n = result.informationalDiffs.length;
      console.log(`  ${result.informationalTurnCount} turns not verifiable (${n} diverged): ${why}`);
    }
    if (result.missingRoutines.length > 0) {
      // Not a diff but a cause: gameplay is missing because the extractor
      // catalogued these rather than extracting them.
      console.log(`  not extracted: ${result.missingRoutines.join(", ")}`);
    }

    if (!quiet) {
      for (const diff of result.diffs) {
        console.log(`\n  turn ${diff.index + 1}: > ${diff.command}`);
        console.log(`    expected: ${diff.expected || "(nothing)"}`);
        console.log(`    actual:   ${diff.actual || "(nothing)"}`);
      }
      if (result.diffs.length > 0) console.log("");
    }
  }

  const pct = comparedTotal === 0 ? 0 : Math.round((matchedTotal / comparedTotal) * 100);
  console.log(`\n${matchedTotal}/${comparedTotal} turns match (${pct}%)`);
  if (strictTotal > 0) {
    const strictPct = Math.round((strictMatched / strictTotal) * 100);
    console.log(`${strictMatched}/${strictTotal} on strict walkthroughs (${strictPct}%)`);
  }
  process.exit(failed);
}

if (process.argv[1] !== undefined && import.meta.url.endsWith(basename(process.argv[1]))) {
  main();
}
