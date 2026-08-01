/**
 * The dialogue-density report — M6.1a's measuring instrument.
 *
 * M6.1 is "the comic pane becomes a cartoon", and its target (D5) is a number:
 * **an exchange every 2–3 turns**. Before this tool there was no repeatable way
 * to read today's number off the shipped tables, because the tables lived in the
 * DOM-coupled view; the ~5.8% in `docs/DEVELOPMENT_PLAN.md` §6.1 was measured by
 * hand, once. Every later slice is measured against what this prints, so it runs
 * the **shipped** `comic/script.ts` over the **whole** corpus — the 11 scene
 * walkthroughs and the full-game completion oracle — through the production
 * wiring, at the production cooldown, with the real fit test.
 *
 * **Two stages are reported, because they answer different questions.**
 *
 * - *Script* — what the mapper says per turn, before the Director edits and
 *   before panelization. This is the authoring question: how often is there a DM
 *   line, a Hero line, an exchange at all. Slices 6.1d/6.1e move this.
 * - *Screen* — what survives into emitted panels. The Director drops refusals and
 *   collapses traversal runs (ADR 0005 §3), so a scripted line can be edited out
 *   before anyone reads it, and `AddLine` decides whether the DM and the Hero land
 *   in **one** panel or two. The panel-level counts are limiter 4 of §6.1 stated
 *   as a measurement: a caption opens a panel unconditionally (`panel.cpp:1064`),
 *   which is what splits the exchange into shot/reverse-shot. 6.1c moves this.
 *
 * **An exchange means both characters speak in the same turn** — a DM line plus a
 * Hero *reply*, not a Hero action report. The mapper gives the Hero at most one
 * balloon ("the resolved action outranks the reply", `exchangeFor` rule 2), so
 * the two are told apart the only way that survives a rewrite of either table: by
 * looking the text up in `BEAT_SCRIPT`. A DM line is likewise attributed to the
 * beat table or to the room gazetteer by lookup, which is what separates "they
 * talked" from "the idol narrated a room".
 *
 * Usage:
 *   npm --prefix web run density           # report, and check against the baseline
 *   npm --prefix web run density:accept    # re-write the baseline (a deliberate move)
 *
 * The baseline is committed at `web/test/golden/dialogue-density.json` and pinned
 * by `web/test/density.test.ts`. Drift here is not automatically a failure — every
 * M6.1 slice is *meant* to move these numbers — but it must be looked at and
 * accepted, exactly like the pixel gate.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createCanvas } from "@napi-rs/canvas";
import type { WorldDocument } from "@grues-in-comic/ir";
import { fullGameCommands } from "../../engine/harness/complete.js";
import { createSession, type Turn } from "../src/session.js";
import { objectNameTable, roomNameTable } from "../src/status.js";
import { createDirector, type DirectorOptions } from "../src/comic/director.js";
import { createFitTest } from "../src/comic/fit.js";
import { CAPTION, GUIDE, HERO, createMapper, type Panel } from "../src/comic/mapper.js";
import { BRK, CHR, type PanelDelta } from "../src/comic/page.js";
import { BEAT_SCRIPT, GUIDE_COOLDOWN, GUIDE_SCRIPT } from "../src/comic/script.js";
import type { BeatEntry, BeatExchange } from "../src/comic/mapper.js";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const WORLD = join(ROOT, "ir", "artifacts", "zork1.world.json");
const WALKTHROUGHS = join(ROOT, "verification", "walkthroughs");

/** The committed baseline. */
export const BASELINE = join(ROOT, "web", "test", "golden", "dialogue-density.json");

/**
 * The seed `engine/test/completion.test.ts` and the pixel gate both pin. A
 * different seed is a different world — the thief moves elsewhere, markers fire
 * on other turns — so the density numbers would not be comparable across runs.
 */
const SEED = 1234;

/**
 * The corpus, in `readdir` order so the report reads like the directory. The
 * full-game oracle is **included**: §6.1's density claim is about a playthrough,
 * and the scene walkthroughs all replay the same opening. It is reported as its
 * own row as well, because it is the only row that is a whole game.
 */
const CORPUS = [
  "01-west-of-house.cmd", "02-house-entry.cmd", "03-cellar-descent.cmd",
  "04-lamp-and-darkness.cmd", "05-troll-combat.cmd", "06-scoring-and-treasure.cmd",
  "07-forest-and-tree.cmd", "08-containers.cmd", "09-take-all-surface.cmd",
  "10-dam-and-reservoir.cmd", "11-parser-edges.cmd", "12-full-game.cmd",
] as const;

/** What one walkthrough (or the whole corpus) came to. Counts only — see {@link rates}. */
export interface DensityCounts {
  /** Turns fed to the mapper, including `start()`. */
  turns: number;
  /** Turns whose script carried a caption. **0 since 6.1c** — the channel retired. */
  caption: number;
  /** Turns whose script carried any DM balloon, and the split by register. */
  dm: number;
  /** Read-aloud: the DM speaking the turn's narration (ADR 0009 §2). Free. */
  dmReadAloud: number;
  /** Table-talk: a line out of `GUIDE_SCRIPT`/`BEAT_SCRIPT`, and which of the two. */
  dmTalk: number;
  dmBeat: number;
  dmGazetteer: number;
  /** Turns whose script carried a Hero balloon, split by what it is. */
  hero: number;
  heroAction: number;
  heroReply: number;
  /**
   * Turns where **both** spoke: any DM line and the Hero's authored *reply*. The
   * headline, and D5's unit. His action report does not count — "The lamp, then."
   * is him narrating, not answering.
   */
  exchanges: number;
  /** The looser reading: any DM balloon and any Hero balloon on the same turn. */
  bothSpeak: number;
  /** Panels the Director emitted — what a reader actually scrolls past. */
  panels: number;
  /** Emitted panels carrying a DM balloon / a Hero balloon / both speakers. */
  panelsDm: number;
  panelsHero: number;
  panelsBothSpeakers: number;
  /** Emitted panels holding a DM line **and** a Hero reply — the two-shot proper. */
  panelsExchange: number;
  /** Exchange turns whose two halves reached the screen at all (either panel). */
  screenExchangeTurns: number;
  /** …of those, the ones whose whole turn landed in exactly one panel. */
  onePanelExchangeTurns: number;
}

export interface DensityReport {
  seed: number;
  guideCooldown: number;
  /** Table sizes, so a baseline diff says whether authoring or mechanism moved. */
  script: { rooms: number; beats: number; beatLines: number };
  files: Array<{ file: string } & DensityCounts>;
  totals: DensityCounts;
}

const ZERO: DensityCounts = {
  turns: 0, caption: 0, dm: 0, dmReadAloud: 0, dmTalk: 0, dmBeat: 0, dmGazetteer: 0,
  hero: 0, heroAction: 0, heroReply: 0, exchanges: 0, bothSpeak: 0,
  panels: 0, panelsDm: 0, panelsHero: 0, panelsBothSpeakers: 0,
  panelsExchange: 0, screenExchangeTurns: 0, onePanelExchangeTurns: 0,
};

function add(into: DensityCounts, next: DensityCounts): DensityCounts {
  const out = { ...into };
  for (const key of Object.keys(ZERO) as Array<keyof DensityCounts>) out[key] += next[key];
  return out;
}

/** Every `{ dm, hero }` a beat entry can produce, run and all (`variantOf`'s domain). */
function variants(entry: BeatEntry): BeatExchange[] {
  if (typeof entry === "string") return [{ dm: entry }];
  const line = (item: string | BeatExchange): BeatExchange =>
    typeof item === "string" ? { dm: item } : item;
  if (Array.isArray(entry)) return (entry as readonly (string | BeatExchange)[]).map(line);
  // A cycling run (M6.1e): the arc and the tail are both authored lines, and the
  // report counts what was written, not how often it is reached.
  if ("run" in entry && "loop" in entry) {
    return [...entry.run, ...entry.loop].map(line);
  }
  return [entry as BeatExchange];
}

/**
 * The two text sets the report is read against.
 *
 * Attribution by *text* rather than by re-deriving the mapper's decision is
 * deliberate: re-deriving would mean a second copy of `exchangeFor`'s cooldown
 * and run-cursor logic here, which would agree with the mapper right up until
 * 6.1d changed one of them. The lookup cannot drift — it asks the shipped table.
 */
function scriptTexts(): { beatDm: Set<string>; beatHero: Set<string>; gazetteer: Set<string> } {
  const beatDm = new Set<string>();
  const beatHero = new Set<string>();
  for (const entry of BEAT_SCRIPT.values()) {
    for (const variant of variants(entry)) {
      if (variant.dm) beatDm.add(variant.dm);
      if (variant.hero) beatHero.add(variant.hero);
    }
  }
  // A room entry is the DM's line or the pair (M6.1e). Only the DM half belongs
  // in `gazetteer`: it answers "which table did this *DM* balloon come from",
  // and the Hero's half is attributed by register like every other reply.
  const gazetteer = new Set<string>();
  for (const entry of GUIDE_SCRIPT.values()) {
    const dm = typeof entry === "string" ? entry : entry.dm;
    if (dm) gazetteer.add(dm);
  }
  return { beatDm, beatHero, gazetteer };
}

/**
 * The corpus row that is a whole game, and the one that cannot be read off disk.
 *
 * `12-full-game.cmd` is authored against the *resilient* driver — it writes
 * `kill troll with sword` the number of times dfrotz needed, which is not the
 * number this engine's draw needs. Fed naively to a session the troll wins on
 * turn ~70 and the remaining ~330 commands bounce off walls (M6.1f measured it:
 * Rocky Ledge, 30/350, 16 of 110 rooms). Since that row is two thirds of the
 * corpus, every aggregate below it was two thirds a flail through the surface
 * map. So the full game comes from `runFullGame`'s own log instead — the same
 * seed, the same engine, the repeated strikes and the hoard ferry included —
 * and replaying it into a fresh session reproduces the won game turn for turn.
 */
const RESILIENT = new Set<string>(["12-full-game.cmd"]);

/** Memoised: the driver is a whole playthrough, and both stages ask for it. */
let fullGame: string[] | null = null;

function commandsOf(file: string): string[] {
  if (RESILIENT.has(file)) {
    fullGame ??= fullGameCommands({ seed: SEED });
    return fullGame;
  }
  return readFileSync(join(WALKTHROUGHS, file), "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));
}

/**
 * The harness swallows a crashing command and carries on (`safeCommand`), and
 * the log records it, so the replay has to swallow it the same way or it would
 * stop where the winning run did not. A crashed turn produces no `Turn`.
 */
function safeTurn(run: () => Turn): Turn | null {
  try {
    return run();
  } catch {
    return null;
  }
}

/** The options the pane ships (`comic-view.ts`), minus the browser. */
function productionOptions(doc: WorldDocument): DirectorOptions {
  return {
    guideScript: GUIDE_SCRIPT,
    beatScript: BEAT_SCRIPT,
    guideCooldown: GUIDE_COOLDOWN,
    names: objectNameTable(doc.objects),
    journeyRoomTitles: roomNameTable(doc.rooms),
  };
}

/** The real fit test, measuring on a scratch canvas — the same wiring as `gate.ts`. */
function fitTest() {
  const measure = createCanvas(1, 1).getContext("2d") as unknown as CanvasRenderingContext2D;
  return createFitTest(measure);
}

function measureFile(doc: WorldDocument, file: string): DensityCounts {
  const texts = scriptTexts();
  const commands = commandsOf(file);
  let counts = { ...ZERO };
  /**
   * Per turn, in order: did its own script carry a DM line and a Hero reply. The
   * two stages replay the same commands from the same seed, so the index is the
   * same turn in both — which is what lets the screen half attribute panels to
   * the turn that caused them instead of to the context a panel happens to carry.
   */
  const scripted: Array<{ dm: boolean; reply: boolean }> = [];

  // Stage 1 — the script. A bare mapper, folded turn by turn: this is what the
  // authored tables produce, before any edit.
  {
    const session = createSession(doc, { seed: SEED });
    const mapper = createMapper(productionOptions(doc));
    const turns = [
      session.start(),
      ...commands.map((c) => safeTurn(() => session.command(c))),
    ];
    for (const turn of turns) {
      if (turn === null) {
        scripted.push({ dm: false, reply: false });
        continue;
      }
      const { lines } = mapper.read(turn);
      // Sentinels (`<Brk>`, `<Chr>`) are instructions to the page, not utterances.
      const said = lines.filter((l) => l.text !== BRK && l.text !== CHR);
      const dm = said.filter((l) => l.speaker === GUIDE);
      const hero = said.filter((l) => l.speaker === HERO);
      const talk = dm.filter((l) => l.register === "authored");
      const reply = hero.find((l) => l.register === "authored") ?? null;
      counts.turns += 1;
      if (said.some((l) => l.speaker === CAPTION)) counts.caption += 1;
      if (dm.length > 0) counts.dm += 1;
      if (dm.some((l) => l.register === "narration")) counts.dmReadAloud += 1;
      if (talk.length > 0) {
        counts.dmTalk += 1;
        // Which table it came from — the register says authored, not from where.
        if (talk.some((l) => texts.beatDm.has(l.text))) counts.dmBeat += 1;
        else if (talk.some((l) => texts.gazetteer.has(l.text))) counts.dmGazetteer += 1;
      }
      if (hero.length > 0) {
        counts.hero += 1;
        if (reply !== null) counts.heroReply += 1;
        else counts.heroAction += 1;
      }
      if (dm.length > 0 && reply !== null) counts.exchanges += 1;
      if (dm.length > 0 && hero.length > 0) counts.bothSpeak += 1;
      scripted.push({ dm: dm.length > 0, reply: reply !== null });
    }
  }

  // Stage 2 — the screen. A fresh session through the production Director, so the
  // panels counted are the edited, panelized ones the pane draws.
  {
    const session = createSession(doc, { seed: SEED });
    const director = createDirector({ ...productionOptions(doc), fit: fitTest() });
    let screenExchangeTurns = 0;
    let onePanelExchangeTurns = 0;
    /**
     * How many panels this turn's own utterances touched: the ones it appended,
     * plus the one it clone-appended into. **Zero means the turn never reached the
     * screen** — the Director dropped it, or it is still buffered in a traversal
     * run. This is the honest reading of "did the exchange land in one panel", and
     * it replaced reading it off `panel.turn` at M6.1d: a panel carries the
     * context of the *last* line written into it, so once most turns spoke, whole
     * turns disappeared from that map and the split count went negative.
     */
    const touchedBy = (delta: PanelDelta): number =>
      delta.appended.length + (delta.replacedLast ? 1 : 0);
    /**
     * Did the exchange itself land in one panel — the DM's authored line and the
     * Hero's answer in the same frame, which is the facing two-shot D5 asks for.
     * Deliberately *not* "the whole turn is one panel": a turn where the DM also
     * reads three sentences of room description aloud is a panel run by ADR 0009
     * §4, and the exchange closing it is exactly what that run is built to end on.
     */
    const record = (delta: PanelDelta, index: number): void => {
      const s = scripted[index];
      if (s === undefined || !s.dm || !s.reply) return;
      const touched = touchedBy(delta);
      if (touched === 0) return; // dropped, or still buffered in a traversal run
      screenExchangeTurns += 1;
      const frames = director.panels.slice(-touched);
      const together = frames.some((panel) =>
        panel.speakers.some((l) => l.speaker === GUIDE && l.register === "authored")
        && panel.speakers.some((l) => l.speaker === HERO && l.register === "authored"));
      if (together) onePanelExchangeTurns += 1;
    };
    record(director.ingest(session.start()), 0);
    for (const [i, command] of commands.entries()) {
      const turn = safeTurn(() => session.command(command));
      if (turn === null) continue; // crashed here too — the index still holds
      record(director.ingest(turn), i + 1);
    }
    director.flush(); // a trailing traversal run is still a panel (ADR 0005 §3)
    counts = {
      ...counts, ...panelCounts(director.panels, texts),
      screenExchangeTurns, onePanelExchangeTurns,
    };
  }

  return counts;
}

type Texts = ReturnType<typeof scriptTexts>;

/** The screen half of {@link DensityCounts}, read off the emitted panel stream. */
function panelCounts(panels: readonly Panel[], texts: Texts): Partial<DensityCounts> {
  let panelsDm = 0, panelsHero = 0, panelsBothSpeakers = 0, panelsExchange = 0;

  for (const panel of panels) {
    const dm = panel.speakers.filter((line) => line.speaker === GUIDE);
    const hero = panel.speakers.filter((line) => line.speaker === HERO);
    const replies = hero.filter((line) => line.register === "authored");
    if (dm.length > 0) panelsDm += 1;
    if (hero.length > 0) panelsHero += 1;
    if (dm.length > 0 && hero.length > 0) panelsBothSpeakers += 1;
    if (dm.length > 0 && replies.length > 0) panelsExchange += 1;
  }

  // Per-turn attribution lives in `measureFile`, off the Director's own deltas —
  // a panel's context is the last line written into it, not a turn id.
  return { panels: panels.length, panelsDm, panelsHero, panelsBothSpeakers, panelsExchange };
}

export function runDensity(): DensityReport {
  const doc = JSON.parse(readFileSync(WORLD, "utf8")) as WorldDocument;
  const files = CORPUS.map((file) => ({ file, ...measureFile(doc, file) }));
  const totals = files.reduce<DensityCounts>((acc, row) => add(acc, row), { ...ZERO });
  let beatLines = 0;
  for (const entry of BEAT_SCRIPT.values()) beatLines += variants(entry).length;
  return {
    seed: SEED,
    guideCooldown: GUIDE_COOLDOWN,
    script: { rooms: GUIDE_SCRIPT.size, beats: BEAT_SCRIPT.size, beatLines },
    files,
    totals,
  };
}

export function readBaseline(): DensityReport {
  return JSON.parse(readFileSync(BASELINE, "utf8")) as DensityReport;
}

/**
 * D5′'s band (ADR 0010 §4): the share of *emitted panels* carrying both
 * speakers. Set from this slice's measurement (477/1091 = 43.7%) with room on
 * both sides for §6.1e's remaining authoring to move it — a comic where the
 * two never stop talking fails as surely as one where they never start
 * (session 4's 1.6 undershoot, `docs/DEVELOPMENT_PLAN.md` §6.1e).
 */
export const D5_PRIME_MIN = 25;
export const D5_PRIME_MAX = 60;

/** Rates worth reading — derived, so the baseline stays counts and cannot disagree. */
export function rates(c: DensityCounts) {
  const pct = (n: number) => (c.turns === 0 ? 0 : (100 * n) / c.turns);
  return {
    caption: pct(c.caption),
    dm: pct(c.dm),
    hero: pct(c.hero),
    exchange: pct(c.exchanges),
    /** D5 speaks in this unit: one exchange every *n* turns. `Infinity` if none. */
    turnsPerExchange: c.exchanges === 0 ? Infinity : c.turns / c.exchanges,
    twoShot: c.panelsExchange === 0 ? 0 : (100 * c.panelsExchange) / Math.max(1, c.panels),
    /** D5′'s own unit: `panelsBothSpeakers` as a share of `panels`. */
    bothSpeakersShare: c.panels === 0 ? 0 : (100 * c.panelsBothSpeakers) / c.panels,
  };
}

function pad(text: string, width: number): string {
  return text.length >= width ? text : text + " ".repeat(width - text.length);
}

function left(text: string, width: number): string {
  return text.length >= width ? text : " ".repeat(width - text.length) + text;
}

function report(current: DensityReport): string {
  const out: string[] = [];
  out.push(`dialogue density — seed ${current.seed}, cooldown ${current.guideCooldown}, `
    + `${current.script.rooms} rooms / ${current.script.beats} beats `
    + `(${current.script.beatLines} authored exchanges)`);
  out.push("");
  const head = ["file", "turns", "cap%", "DM", "hero", "exch", "1/n", "panels", "2-shot"];
  const widths = [26, 6, 6, 5, 5, 5, 7, 7, 7];
  out.push(head.map((h, i) => (i === 0 ? pad(h, widths[i]!) : left(h, widths[i]!))).join(" "));
  const row = (name: string, c: DensityCounts): string => {
    const r = rates(c);
    const cells = [
      String(c.turns), r.caption.toFixed(1), String(c.dm), String(c.hero),
      String(c.exchanges),
      r.turnsPerExchange === Infinity ? "—" : r.turnsPerExchange.toFixed(1),
      String(c.panels), String(c.onePanelExchangeTurns),
    ];
    return [pad(name, widths[0]!), ...cells.map((v, i) => left(v, widths[i + 1]!))].join(" ");
  };
  for (const file of current.files) out.push(row(file.file, file));
  out.push(row("TOTAL", current.totals));
  out.push("");

  const t = current.totals;
  const r = rates(t);
  out.push(`DM balloons:       ${t.dmReadAloud} read-aloud + ${t.dmTalk} table-talk `
    + `(${t.dmBeat} beat, ${t.dmGazetteer} gazetteer)`);
  out.push(`Hero balloons:     ${t.heroAction} action + ${t.heroReply} reply`);
  out.push(`exchanges:         ${t.exchanges} of ${t.turns} turns `
    + `(${r.exchange.toFixed(1)}%, one every ${r.turnsPerExchange.toFixed(1)} turns)`);
  out.push(`  reached screen:  ${t.screenExchangeTurns} `
    + `(the Director dropped or collapsed ${t.exchanges - t.screenExchangeTurns})`);
  // The split count is the whole of limiter 4: an exchange whose halves landed in
  // two panels is the shot/reverse-shot §6.1 is trying to stop drawing.
  out.push(`  in one panel:    ${t.onePanelExchangeTurns} of ${t.screenExchangeTurns} `
    + `(${t.screenExchangeTurns - t.onePanelExchangeTurns} split across two or more); `
    + `${t.panelsExchange} panels hold one, ${t.panelsBothSpeakers} carry both speakers`);
  out.push(`both speak:        ${t.bothSpeak} turns (any DM balloon + any Hero balloon)`);
  out.push(`captions:          ${t.caption} of ${t.turns} turns (${r.caption.toFixed(1)}%)`);
  out.push("");
  out.push(`D5 target: one exchange every 2–3 turns. `
    + `Today: one every ${r.turnsPerExchange.toFixed(1)}.`);
  out.push(`D5′ target: ${D5_PRIME_MIN}–${D5_PRIME_MAX}% of panels carry both speakers. `
    + `Today: ${r.bothSpeakersShare.toFixed(1)}% (${t.panelsBothSpeakers} of ${t.panels}).`);
  return out.join("\n");
}

/** Baseline drift, as a list of `field: was -> now` lines. Empty when identical. */
export function diff(baseline: DensityReport, current: DensityReport): string[] {
  const out: string[] = [];
  const seen = new Map(baseline.files.map((f) => [f.file, f]));
  for (const file of current.files) {
    const was = seen.get(file.file);
    if (!was) {
      out.push(`${file.file}: new to the corpus`);
      continue;
    }
    for (const key of Object.keys(ZERO) as Array<keyof DensityCounts>) {
      if (was[key] !== file[key]) out.push(`${file.file} ${key}: ${was[key]} -> ${file[key]}`);
    }
  }
  for (const file of baseline.files) {
    if (!current.files.some((f) => f.file === file.file)) out.push(`${file.file}: gone`);
  }
  return out;
}

async function main(): Promise<void> {
  const accept = process.argv.includes("--accept");
  const current = runDensity();
  console.log(report(current));

  if (accept) {
    writeFileSync(BASELINE, `${JSON.stringify(current, null, 2)}\n`);
    console.log(`\nbaseline written: ${BASELINE}`);
    return;
  }

  let baseline: DensityReport;
  try {
    baseline = readBaseline();
  } catch {
    console.log("\nno baseline yet — run `npm --prefix web run density:accept` to write one.");
    return;
  }
  const drift = diff(baseline, current);
  if (drift.length === 0) {
    console.log("\nbaseline: unchanged");
    return;
  }
  console.log(`\nbaseline drift (${drift.length}):`);
  for (const line of drift) console.log(`  ${line}`);
  console.log("\nlook at it, then `npm --prefix web run density:accept` if it is the intended move.");
  process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
