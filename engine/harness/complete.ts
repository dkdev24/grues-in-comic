/**
 * The full-game completion driver — the resilient replay that actually *wins*.
 *
 * `12-full-game.cmd` is a fixed command list authored against dfrotz seed 1234.
 * Two of its assumptions are RNG-dependent and break under the engine's own
 * generator (ADR 0002 keeps the engine's PRNG rather than reproducing the
 * Z-machine's):
 *
 *   1. **Combat hit-counts.** A `kill <villain> with <weapon>` line is written
 *      the exact number of times dfrotz needed. Under a different draw the troll
 *      or thief survives, so the list is combat-resilient here: repeat the strike
 *      (re-arming after a disarm) until the villain leaves or the player dies.
 *
 *   2. **Which treasures the thief hoards.** The thief steals a different set,
 *      and drops all of it in TREASURE-ROOM when he dies — so treasures the
 *      walkthrough assumed were already cased (and ones the player can't recover
 *      because the inventory limit is full at the fight) are stranded there. At
 *      seed 1234 that strands SKULL + TORCH, 16 points shy of 350.
 *
 * So this driver stops the fixed list just before the barrow finish, then runs
 * a recovery loop: while the score is short of 350, fetch any treasure stranded
 * in TREASURE-ROOM back to the trophy case, making as many case trips as it
 * takes and dropping non-treasure junk to stay under the load limit. When the
 * case is complete, `SCORE-UPD` reveals the map and the barrow tail wins the
 * game — asserted by the committed completion test.
 *
 * This is NOT fitting the engine to one RNG stream: the recovery is exactly what
 * a player does when the thief scatters the loot, and it works for any draw that
 * ends with the hoard in the thief's hideaway.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { WorldDocument } from "@grues-in-comic/ir";
import { createEngine, type Engine } from "../src/engine.js";
import type { EngineEvent } from "../src/events.js";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));

export function loadWorldDoc(): WorldDocument {
  return JSON.parse(
    readFileSync(join(ROOT, "ir", "artifacts", "zork1.world.json"), "utf8"),
  ) as WorldDocument;
}

export function loadCommands(): string[] {
  const raw = readFileSync(
    join(ROOT, "verification", "walkthroughs", "12-full-game.cmd"),
    "utf8",
  );
  return raw
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));
}

const VILLAIN: Record<string, string> = { troll: "TROLL", thief: "THIEF" };
const WEAPON: Record<string, string> = { sword: "SWORD", knife: "KNIFE" };
const RESURRECT = /FOREST|PATH|CLEARING/;

/** Where the thief hoards, and the fixed path between it and the trophy case. */
const HIDEAWAY = "TREASURE-ROOM";
const CASE_ROOM = "LIVING-ROOM";
const TO_HIDEAWAY = ["w", "w", "u"]; // LIVING-ROOM -> TREASURE-ROOM
const TO_CASE = ["d", "e", "e"]; //     TREASURE-ROOM -> LIVING-ROOM
/** Non-light, non-treasure items worth shedding to make load room in a pinch. */
const JUNK = ["knife", "match", "garlic", "sack", "screwdriver", "nasty", "rope"];

export interface RunResult {
  score: number;
  room: string;
  victory: boolean;
  deaths: number;
  over: string | null;
  missingRoutines: string[];
  crashes: Map<string, number>;
  /** Treasures still outside the case at the end — empty on a clean win. */
  stranded: string[];
  /**
   * The highest score ever carried by a `score-changed` *event*, not read from
   * state. Treasure deposits move SCORE inside extracted routines, so this only
   * tracks the truth if the engine reconciles those into the event stream —
   * which is what makes the web score display update on take/case.
   */
  eventScore: number;
  /**
   * Every input actually handed to `engine.command`, in order — the *resilient*
   * list, not the authored one: the repeated strikes, the re-arms, the hoard
   * ferry. Replaying it into a fresh engine at the same seed reproduces this run
   * exactly, which is how a presentation-layer tool measures a game that is won
   * without importing the recovery logic (`web/tools/density.ts`, M6.1g).
   */
  issued: string[];
}

export interface RunOptions {
  seed?: number;
  trace?: boolean;
}

export function runFullGame(opts: RunOptions = {}): RunResult {
  const seed = opts.seed ?? 1234;
  const doc = loadWorldDoc();
  const commands = loadCommands();

  /** Treasure ids and the input word each answers to (first synonym). */
  const treasureWord = new Map<string, string>();
  for (const o of doc.objects) {
    if ((o.treasureValue ?? 0) > 0 || (o.value ?? 0) > 0) {
      const w = (o.synonyms?.[0] ?? o.id).toLowerCase();
      treasureWord.set(o.id, w);
    }
  }
  const isTreasure = (id: string) => treasureWord.has(id);

  const engine: Engine = createEngine(doc, { seed });
  engine.start();

  let score = 0;
  let room = "WEST-OF-HOUSE";
  let playerId = "";
  let victory = false;
  let deaths = 0;
  let over: string | null = null;
  let eventScore = 0;
  const crashes = new Map<string, number>();
  const issued: string[] = [];

  function safeCommand(input: string): EngineEvent[] {
    // Logged before the call and whatever it throws: a crashing command still
    // ran, and a replay that skipped it would diverge from this run's state.
    issued.push(input);
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
      if (e.type === "score-changed") {
        score = e.score;
        eventScore = Math.max(eventScore, e.score);
      }
      if (e.type === "player-moved") room = e.to;
      if (e.type === "game-over") {
        over = e.outcome;
        if (e.outcome === "victory") victory = true;
        if (e.outcome === "death") deaths++;
      }
      if (e.type === "narration" || e.type === "question" || e.type === "game-over")
        text += e.text + " ";
    }
    return text;
  }

  /** Authoritative score: SCORE-UPD writes globals.SCORE without an event. */
  const readScore = () => Number(engine.snapshot().globals["SCORE"] ?? score);
  const player = () => {
    if (!playerId) playerId = engine.snapshot().locations["ADVENTURER"] ?? "ADVENTURER";
    return "ADVENTURER";
  };

  function playCombat(cmd: string, weaponWord: string, villain: string, weapon: string) {
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
  }

  /** Treasures presently lying in the thief's hideaway. */
  function strandedInHideaway(): string[] {
    const loc = engine.snapshot().locations;
    return [...treasureWord.keys()].filter((id) => loc[id] === HIDEAWAY);
  }

  /**
   * Ferry every treasure the thief scattered in his hideaway back to the case,
   * one load at a time, until the score reaches 350 or no load can be recovered.
   */
  function recoverHoard() {
    player();
    let guard = 0;
    while (readScore() < 350 && guard++ < 8) {
      const need = strandedInHideaway();
      if (need.length === 0) break;
      apply(safeCommand("turn on lantern")); // the path down is dark
      for (const d of TO_HIDEAWAY) apply(safeCommand(d));
      // Shed junk so the load limit can't block the treasures.
      for (const j of JUNK) apply(safeCommand(`drop ${j}`));
      const took: string[] = [];
      for (const id of need) {
        const word = treasureWord.get(id)!;
        const text = apply(safeCommand(`take ${word}`));
        if (engine.snapshot().locations[id] === player()) took.push(word);
        else if (/too many/i.test(text)) break; // full — case what we have, loop back
      }
      for (const d of TO_CASE) apply(safeCommand(d));
      for (const word of took) apply(safeCommand(`put ${word} in case`));
    }
  }

  // The barrow finish depends on the map, which SCORE-UPD reveals only at 350;
  // stop the fixed list just before it, recover the hoard, then run the tail.
  const splitAt = commands.findIndex((c) => c === "take map");
  const head = splitAt >= 0 ? commands.slice(0, splitAt) : commands;
  const tail = splitAt >= 0 ? commands.slice(splitAt) : [];

  const runOne = (cmd: string, i: number) => {
    const kill = /^kill (\w+) with (\w+)$/.exec(cmd);
    const villainWord = kill?.[1] ?? "";
    const weaponWord = kill?.[2] ?? "";
    if (kill && VILLAIN[villainWord] && WEAPON[weaponWord]) {
      playCombat(cmd, weaponWord, VILLAIN[villainWord]!, WEAPON[weaponWord]!);
    } else {
      const text = apply(safeCommand(cmd));
      if (opts.trace) console.log(`#${i + 1} [${room}] "${cmd}" -> ${text.slice(0, 70).replace(/\s+/g, " ")}`);
      return;
    }
    if (opts.trace) console.log(`#${i + 1} [${room}] kill-loop score=${score}`);
  };

  head.forEach(runOne);
  recoverHoard();
  tail.forEach((cmd, i) => runOne(cmd, head.length + i));

  score = readScore();
  return {
    score,
    room,
    victory,
    deaths,
    over,
    missingRoutines: engine.missingRoutines(),
    crashes,
    stranded: strandedInHideaway(),
    eventScore,
    issued,
  };
}

/**
 * The command list that *wins*, for anyone who needs the turns rather than the
 * outcome. `12-full-game.cmd` on its own does not: it is authored against the
 * resilient driver above, so a naive replay loses the troll fight on turn ~70
 * and bounces off walls for the remaining ~330 commands (`PITFALLS.md` → Web).
 * This runs the driver once and hands back what it actually typed.
 */
export function fullGameCommands(opts: RunOptions = {}): string[] {
  return runFullGame(opts).issued;
}
