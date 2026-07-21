/**
 * Ad-hoc stage 5.5 probe: replay the full-game walkthrough through the engine
 * and report the END STATE (score, room, victory), not text parity.
 *
 * Combat is a random draw, and the engine's generator is not frotz's — so the
 * walkthrough's fixed hit-counts (tuned to dfrotz seed 1234) do not kill the
 * troll/thief under the engine's draws. To see the engine's *non-combat* gaps,
 * this probe is combat-resilient: a `kill <villain> with <weapon>` command is
 * repeated (re-arming on a disarm) until the villain leaves the room or the
 * player dies. That models what a player does and is only a diagnostic; the
 * committed completion test is separate.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { WorldDocument } from "@grues-in-comic/ir";
import { createEngine, type Engine } from "../src/engine.js";
import type { EngineEvent } from "../src/events.js";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const doc = JSON.parse(
  readFileSync(join(ROOT, "ir", "artifacts", "zork1.world.json"), "utf8"),
) as WorldDocument;
const raw = readFileSync(
  join(ROOT, "verification", "walkthroughs", "12-full-game.cmd"),
  "utf8",
);
const commands = raw
  .split("\n")
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith("#"));

const SEED = process.env.SEED ? Number(process.env.SEED) : 1234;
const TRACE = process.env.TRACE ? Number(process.env.TRACE) : 0;
const engine: Engine = createEngine(doc, { seed: SEED });
engine.start();

const VILLAIN: Record<string, string> = { troll: "TROLL", thief: "THIEF" };
const WEAPON: Record<string, string> = { sword: "SWORD", knife: "KNIFE" };
const RESURRECT = /FOREST|PATH|CLEARING/;

let score = 0;
let room = "WEST-OF-HOUSE";
let playerId = "";
let victory = false;
let deaths = 0;
let over: string | null = null;
const misses: { i: number; cmd: string; text: string }[] = [];
const crashes = new Map<string, number>();

function safeCommand(input: string): EngineEvent[] {
  try {
    return engine.command(input).events;
  } catch (err) {
    const msg = (err as Error).message;
    crashes.set(msg, (crashes.get(msg) ?? 0) + 1);
    return [];
  }
}

function apply(events: EngineEvent[]): string {
  let text = "";
  for (const e of events) {
    if (e.type === "score-changed") score = e.score;
    if (e.type === "player-moved") room = e.to;
    if (e.type === "game-over") {
      over = e.outcome;
      if (e.outcome === "victory") victory = true;
      if (e.outcome === "death") deaths++;
    }
    if (e.type === "narration" || e.type === "question" || e.type === "game-over") text += e.text + " ";
  }
  return text;
}

commands.forEach((cmd, i) => {
  const kill = /^kill (\w+) with (\w+)$/.exec(cmd);
  const villainWord = kill?.[1] ?? "";
  const weaponWord = kill?.[2] ?? "";
  if (kill && VILLAIN[villainWord] && WEAPON[weaponWord]) {
    const villain = VILLAIN[villainWord]!;
    const weapon = WEAPON[weaponWord]!;
    // Capture player id lazily from the weapon we are wielding.
    if (!playerId) playerId = engine.snapshot().locations[weapon] ?? "";
    let n = 0;
    while (n++ < 30) {
      const before = room;
      const loc = engine.snapshot().locations;
      if (loc[villain] !== room) break; // villain gone => dead or fled
      if (playerId && loc[weapon] && loc[weapon] !== playerId && loc[weapon] === room) {
        apply(safeCommand(`take ${weaponWord}`)); // re-arm after a disarm
      }
      apply(safeCommand(cmd));
      if (RESURRECT.test(room) && !RESURRECT.test(before)) break; // died & resurrected
    }
    if (TRACE && i + 1 <= TRACE) console.log(`#${i + 1} [${room}] kill-loop ${villain} x${n} score=${score}`);
    return;
  }
  const text = apply(safeCommand(cmd));
  if (/don't understand|can't see|not a verb|don't know the word|nothing here|can't go that way/i.test(text)) {
    misses.push({ i: i + 1, cmd, text: text.slice(0, 68).replace(/\s+/g, " ") });
  }
  if (TRACE && i + 1 <= TRACE) console.log(`#${i + 1} [${room}] "${cmd}" -> ${text.slice(0, 74).replace(/\s+/g, " ")}`);
});

// Treasure scoring runs through the extracted SCORE-UPD, which writes
// globals.SCORE directly and emits no score-changed event — so read the truth
// from state, not from the event stream (which only carries room-visit scores).
score = Number(engine.snapshot().globals["SCORE"] ?? score);
console.log(`\nseed=${SEED} commands=${commands.length}`);
console.log(`final score: ${score} / 350`);
console.log(`final room: ${room}`);
console.log(`victory: ${victory}  deaths: ${deaths}  game-over: ${over ?? "(none)"}`);
console.log(`missingRoutines: ${JSON.stringify(engine.missingRoutines())}`);
console.log(`\ncrashes (${[...crashes.values()].reduce((a, b) => a + b, 0)} total):`);
for (const [msg, n] of crashes) console.log(`  x${n}  ${msg}`);
console.log(`\nfirst 25 misses (${misses.length} total):`);
for (const m of misses.slice(0, 25)) console.log(`  #${m.i} "${m.cmd}" -> ${m.text}`);
