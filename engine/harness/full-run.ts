/**
 * Stage 5.5 probe: drive the full-game walkthrough to *completion* through the
 * engine and report the END STATE (score, room, victory), not text parity.
 *
 * The resilient replay itself lives in `complete.ts` (`runFullGame`), shared
 * with the committed completion test so the probe and the assertion exercise the
 * same code. This file is the human-readable front end: run it to see the score
 * climb to 350, the barrow won, and any treasure that stayed stranded.
 *
 *   npx tsx harness/full-run.ts            # seed 1234, the committed run
 *   SEED=7 npx tsx harness/full-run.ts     # sample another RNG stream
 *   TRACE=1 npx tsx harness/full-run.ts    # per-command trace
 */
import { runFullGame } from "./complete.js";

const seed = process.env.SEED ? Number(process.env.SEED) : 1234;
const r = runFullGame({ seed, trace: Boolean(process.env.TRACE) });

console.log(`\nseed=${seed}`);
console.log(`final score: ${r.score} / 350`);
console.log(`final room: ${r.room}`);
console.log(`victory: ${r.victory}  deaths: ${r.deaths}  game-over: ${r.over ?? "(none)"}`);
console.log(`missingRoutines: ${JSON.stringify(r.missingRoutines)}`);
console.log(`stranded treasures: ${r.stranded.length ? r.stranded.join(", ") : "(none)"}`);
const crashTotal = [...r.crashes.values()].reduce((a, b) => a + b, 0);
console.log(`\ncrashes (${crashTotal} total):`);
for (const [msg, n] of r.crashes) console.log(`  x${n}  ${msg}`);
