/**
 * Generates a dev save at `web/dev-walkthrough-save.json`: the full-game
 * completion oracle, replayed through `session.ts` so the events and status
 * match what the real shell produces turn by turn, then written out in the
 * exact envelope shape `persistence.ts` expects for a save slot.
 *
 * Exists because there was no way to *see* the ending short of playing all 423
 * turns by hand. `engine/harness/complete.ts` already drives a resilient,
 * winning replay of `verification/walkthroughs/12-full-game.cmd` (combat
 * retries, thief-hoard recovery) — this tool takes that same `issued` command
 * list and runs it through the web `Session` instead of the bare engine, so
 * the output is loadable by `main.ts`'s slot machinery rather than just a
 * score/room summary.
 *
 * The output file is gitignored — regenerate it, don't commit it; the seed
 * (1234) and the walkthrough source are both already version-controlled.
 *
 * Usage:
 *   pnpm -C web run make-walkthrough-save
 *
 * Then, in a browser open to the dev server (same origin as `/play/`):
 *   fetch('/dev-walkthrough-save.json').then(r => r.text())
 *     .then(t => localStorage.setItem('grues-in-comic/save/v1/slot/1', t))
 *     .then(() => location.reload());
 * and `/load 1` in the console pane.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { WorldDocument } from "@grues-in-comic/ir";
import { runFullGame } from "../../engine/harness/complete.js";
import { createSession } from "../src/session.js";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));

const doc = JSON.parse(
  readFileSync(join(ROOT, "ir", "artifacts", "zork1.world.json"), "utf8"),
) as WorldDocument;

const result = runFullGame({ seed: 1234 });
if (!result.victory) {
  console.error("runFullGame did not win:", result);
  process.exit(1);
}

const session = createSession(doc, { seed: 1234 });
const turns = [session.start()];
for (const cmd of result.issued) turns.push(session.command(cmd));

const envelope = {
  version: 1,
  save: session.save(),
  turns: turns.map(({ command, events, status }) => ({ command, events, status })),
};

const outPath = join(ROOT, "web", "dev-walkthrough-save.json");
writeFileSync(outPath, JSON.stringify(envelope));
console.log("wrote", outPath);
console.log(`score: ${result.score} / 350  room: ${result.room}  turns: ${turns.length}`);
