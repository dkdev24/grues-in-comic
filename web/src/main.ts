/**
 * Browser bootstrap (stage 5.2): fetch the world document, boot a session,
 * wire the input box to the engine.
 *
 * There is no framework and no bundler here, and that is a decision rather than
 * an omission — see `web/README.md`. The engine imports the IR for *types only*
 * (ADR 0002), so `tsc` alone emits browser-native ES modules with no
 * dependency graph to resolve at runtime.
 */

import type { WorldDocument } from "@grues-in-comic/ir";
import { createSession, type Session, type Turn } from "./session.js";
import { objectNameTable, roomNameTable } from "./status.js";
import { createConsoleView } from "./console-view.js";
import { createInspectorView } from "./inspector-view.js";
import { createComicView, type ComicView } from "./comic-view.js";
import { createSessionStore, type SessionStore, StorageFullError } from "./persistence.js";
import { pickCast, DEFAULT_PLAYER_NAME } from "./cast-picker.js";
import { createReporter, mintRunId, type Reporter, type RunIdentity } from "./hof-client.js";
import type { CastChoice } from "./comic/figure.js";
import { createJumpControls } from "./jump.js";
import { PLAYER_ID } from "../../engine/src/state.js";
import { track, crossedMilestones } from "./analytics.js";

/** Where `tools/serve.ts` mounts `ir/artifacts/`. ~1.8 MB, fetched once.
 *  Absolute, not relative: the game lives at `/play/`, one level below the
 *  site root the mount is rooted at (DESIGN.md §6). */
const WORLD_URL = "/world/zork1.world.json";
/** Sheets and manifest from `art/tools/avbpack.ts`; ~330 KiB, five requests. */
const COMIC_ASSETS = "/assets/comic";
const SAVE_KEY = "grues-in-comic/save/v1";
/**
 * The cast the player last chose (F16), kept beside the save rather than in it.
 *
 * Two keys, because the choice has two lifetimes: the *envelope's* `cast` is
 * what a particular saved game was drawn with and must be replayed with, and
 * this one is the player's standing preference, which survives `/restart` and
 * a cleared save. `/cast` re-opens the picker by setting the flag and
 * reloading — the same reload-based swap `/load` uses, and for the same reason:
 * neither pane has a `reset()`, so a live re-cast would leave the Director's
 * pose cycles carrying the old cast's state.
 */
const CAST_KEY = `${SAVE_KEY}/cast`;
const CAST_PICK_FLAG = `${CAST_KEY}/pick`;
/**
 * How the player appears on the Hall of Fame board (ADR 0011 §3) — a standing
 * preference beside the cast, and for the same reason: it is *theirs*, not a
 * particular game's, so it survives `/restart` and a cleared save and is
 * re-offered rather than re-asked. The run id itself is not here — it belongs
 * to one run and rides in the save envelope.
 */
const BOARD_KEY = `${SAVE_KEY}/board`;
/** M6.2: three named slots, addressed by number — see `docs/DEVELOPMENT_PLAN.md` §6.2. */
const SLOT_COUNT = 3;

async function main(): Promise<void> {
  const consoleView = createConsoleView(requireEl("#console"));
  const inspector = createInspectorView(requireEl("#inspector"));
  const input = requireEl<HTMLInputElement>("#command");
  const form = requireEl<HTMLFormElement>("#command-form");

  let session: Session;
  let names: ReadonlyMap<string, string> = new Map();
  let roomTitles: ReadonlyMap<string, string> = new Map();
  try {
    const doc = await fetchWorld();
    session = createSession(doc, {});
    // The Hero balloon renders resolved actions by object *name* (ADR 0005 §1);
    // the id→name table is static world data, built once beside the session.
    names = objectNameTable(doc.objects ?? []);
    // The journey line names its destination (ADR 0010 §3); same static-data
    // shape as `names`, built once beside it.
    roomTitles = roomNameTable(doc.rooms ?? []);
  } catch (err) {
    document.getElementById("loading-modal")?.setAttribute("hidden", "");
    consoleView.appendSystem(`Could not start: ${message(err)}`);
    return;
  }

  // A world missing routines is playable but silently incomplete, so the shell
  // says so rather than letting the gap present as a puzzle that cannot be
  // solved (Engine.missingRoutines exists for exactly this).
  const missing = session.missingRoutines;
  if (missing.length > 0) {
    consoleView.appendSystem(`[missing routines: ${missing.join(", ")}]`);
  }
  consoleView.appendSystem("[Type /help for commands, or /hint to see what's around you.]");

  // Comic Sans MS isn't installed on every platform (Android Chrome, notably),
  // so the balloon/title canvas text falls back to whatever the OS has unless
  // the self-hosted fallback (THIRD_PARTY.md → Comic Neue) is loaded before
  // the first draw — @font-face alone doesn't trigger a fetch for a font only
  // ever used on <canvas>, never in DOM text. Best-effort: a slow or failed
  // fetch still leaves the CSS fallback chain to fall through to, same as today.
  await Promise.all([
    document.fonts.load('13px "Comic Neue"'),
    document.fonts.load('bold 12px "Comic Neue"'),
  ]).catch(() => {});

  // The comic pane is primary (§4) but it is also the only part of the shell
  // with assets to fetch, so the game stays playable if they fail: a null comic
  // degrades to 5.2's text shell rather than to a blank page.
  // The replay log behind autosave. Every turn `play()` renders is a turn a
  // resumed session has to render again, so it is appended here and nowhere
  // else — one list, written on the single path both panes go through.
  const history: Turn[] = [];
  const store = createSessionStore(SAVE_KEY, localStorage);

  // Casting happens before the comic pane exists, because the pane loads the
  // cast it will draw with (F16). A resumed game is re-cast by its envelope and
  // never asks — its strip is about to be re-drawn panel for panel, and a
  // different cast would silently rewrite pages the player has already read.
  const resumable = store.read();
  let castChoice: CastChoice = resumable?.cast ?? readPreferredCast();

  // The board identity (ADR 0011 §3). A resumed game keeps the run id it was
  // saved with — it is one *run*, not one session, and a mid-game reload must
  // not appear on the board as a second player.
  const boardPref = readBoardPreference();
  let identity: RunIdentity = {
    runId: resumable?.runId ?? mintRunId(),
    name: boardPref.name,
    listed: boardPref.listed,
  };
  const freshRun = resumable === null;

  if (!resumable || takeCastPickFlag()) {
    const picked = await pickCast(document.body, COMIC_ASSETS, castChoice, boardPref);
    castChoice = picked.cast;
    identity = { ...identity, name: picked.name, listed: picked.listed };
    writePreferredCast(castChoice);
    writeBoardPreference(picked.name, picked.listed);
  }

  // Reporting is off until the run is known to be new: `/cast` on a resumed
  // game re-opens the picker without starting a run, and re-announcing an
  // in-progress run as a fresh one would reset nothing but would look like a
  // second start. Every method is a no-op when the player opted out.
  const reporter: Reporter = createReporter(identity);
  if (freshRun) reporter.start();

  let comic: ComicView | null = null;
  try {
    comic = await createComicView(requireEl("#comic"), COMIC_ASSETS, names, roomTitles, castChoice);
    // What was drawn, not what was asked for: a sheet that failed to load fell
    // back to the packed default, and the save must record the visible cast.
    castChoice = comic.castChoice;
  } catch (err) {
    consoleView.appendSystem(`[comic pane unavailable: ${message(err)}]`);
  }

  // One control, both panes (`jump.ts`) — and this is the only place that knows
  // both, which is why it is wired here rather than owned by either pane. A
  // failed comic leaves the transcript's own jumps working.
  const jump = createJumpControls(
    requireEl(".jump-controls"),
    comic ? [comic.pane, consoleView.pane] : [consoleView.pane],
  );

  // Autosave stops at the first refusal rather than throwing once per turn for
  // the rest of the game; the player is told once, and explicit `save` still
  // reports its own failures.
  let autosaveEnabled = true;

  // Named slots (M6.2, `docs/DEVELOPMENT_PLAN.md` §6.2) are separate keys from
  // `store` above: `store` is the autosave/current-game slot `resume()` reads
  // on boot, slots are explicit player saves that never move under it.
  const slotStores: readonly SessionStore[] = Array.from({ length: SLOT_COUNT }, (_, i) =>
    createSessionStore(`${SAVE_KEY}/slot/${i + 1}`, localStorage),
  );
  // `/restart` confirms by immediate re-entry rather than a dialog; armed by
  // one `/restart` and disarmed by anything else the player types next.
  let restartArmed = false;

  // Tracks score-milestone crossings across live turns only (below). Synced
  // to the resumed/starting score once boot decides which of those this is,
  // so a reload past an already-crossed milestone can't refire it.
  let trackedScore = 0;

  const play = (turn: Turn): void => {
    // One session, one event stream, both panes. The comic never gets its own
    // engine handle — that is what makes §2's "accompanied, never replaced" a
    // property of the wiring rather than something to keep in sync.
    consoleView.appendTurn(turn);
    comic?.appendTurn(turn);
    inspector.update(turn);
    history.push(turn);
    // A turn changes both panes' scroll geometry. The panes' own scroll events
    // cover most of it, but a pane whose content still fits emits none, so the
    // control is told outright. `refresh` coalesces, so a replay of hundreds of
    // turns costs one layout read.
    jump.refresh();

    // Analytics fire only for turns actually played (never `replay()`, so a
    // resumed session's history can't be double-counted on reload).
    for (const e of turn.events) {
      if (e.type === "game-over") {
        track("game-over", { outcome: e.outcome, score: turn.status.score, moves: turn.status.moves });
        // The Stone Barrow. The comic pane derives the same thing from
        // `marker: "victory"` (`comic/mapper.ts`); this reads the event itself,
        // because the board must record a win even when the pane failed to load.
        if (e.outcome === "victory") reporter.win(turn.status.score, turn.status.moves);
      }
    }
    reporter.progress(turn.status.score, turn.status.moves);
    for (const threshold of crossedMilestones(trackedScore, turn.status.score)) {
      track("score-milestone", { score: threshold, moves: turn.status.moves });
    }
    trackedScore = turn.status.score;
  };

  /** Render a turn without recording it: replay is already in the history. */
  const replay = (turn: Turn): void => {
    consoleView.appendTurn(turn);
    comic?.appendTurn(turn);
    inspector.update(turn);
    jump.refresh();
  };

  function autosave(): void {
    if (!autosaveEnabled) return;
    try {
      store.write(session.save(), history, castChoice, identity.runId);
    } catch (err) {
      autosaveEnabled = false;
      const why = err instanceof StorageFullError ? "browser storage is full" : message(err);
      consoleView.appendSystem(`[autosave off: ${why}]`);
    }
  }

  // Resume before the opening turn, not after: `session.start()` places the
  // player and would be a second opening on top of a restored one.
  if (!resume()) {
    play(session.start());
    autosave();
  } else {
    trackedScore = session.status.score;
  }

  // The modal is visible by default (index.html) so it covers the synchronous,
  // sometimes multi-second replay `resume()` just did — comic-view.ts's render
  // is not async, so nothing else paints "ready" until this line runs.
  document.getElementById("loading-modal")?.setAttribute("hidden", "");

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const command = input.value.trim();
    if (command === "") return;
    input.value = "";

    // On-screen keyboards cover half the viewport on the stacked mobile
    // layout, hiding both panes while typing — dismiss it on every submit
    // rather than resizing around it, which would touch the ADR-0008-gated
    // comic pane. The side-by-side desktop layout has no such keyboard to
    // hide, and blurring there breaks the continuous-command rhythm players
    // rely on, so this only fires under the same breakpoint that stacks
    // #shell (style.css's `@media (max-width: 720px)`). Android Chrome
    // ignores a blur() called synchronously inside the submit handler, so
    // it's deferred to the next tick.
    if (window.matchMedia("(max-width: 720px)").matches) {
      setTimeout(() => input.blur(), 0);
    }

    // Save and restore are the shell's, not the game's: ZIL's SAVE/RESTORE
    // are Z-machine interpreter commands, and this shell is the interpreter.
    if (handleShellCommand(command)) return;

    // A crashed turn must not take the page with it — the transcript so far
    // is the bug report.
    runGameCommand(command);
  });

  /**
   * Rebuild a saved session into both panes.
   *
   * Returns false for every "there is nothing to resume" case, including the
   * damaged ones: a save this build cannot load is reported and discarded, so a
   * reload starts a new game instead of failing the same way forever.
   */
  function resume(): boolean {
    const saved = store.read();
    if (saved === null) return false;

    try {
      // State first: a rejected save (wrong contract version) must not leave
      // half a transcript on screen from turns the engine never accepted.
      session.load(saved.save);
    } catch (err) {
      store.clear();
      consoleView.appendSystem(`[saved game discarded: ${message(err)}]`);
      return false;
    }

    for (const turn of saved.turns) replay(turn);
    // A saved session may end mid-walk, leaving the Director's last traversal run
    // buffered; flush it so the resumed strip shows where the player actually is.
    comic?.flush();
    history.push(...saved.turns);
    // `load` derives status from the save because `restore` emits no events;
    // the replayed turns above are rendering, not engine execution.
    consoleView.setStatus(session.status);
    consoleView.appendSystem(`[resumed — ${saved.turns.length} turns restored]`);
    return true;
  }

  /**
   * `/save`, `/load`, `/restart`, `/help` — slash-prefixed so a shell command
   * can never shadow a real ZIL verb (M6.2, `docs/DEVELOPMENT_PLAN.md` §6.2).
   */
  function handleShellCommand(command: string): boolean {
    if (!command.startsWith("/")) return false;
    const parts = command.slice(1).trim().split(/\s+/);
    const cmd = (parts[0] ?? "").toLowerCase();
    const arg = parts[1];

    if (cmd !== "restart") restartArmed = false;

    switch (cmd) {
      case "save":
        handleSave(arg);
        return true;
      case "load":
        handleLoad(arg);
        return true;
      case "restart":
        handleRestart();
        return true;
      case "help":
        handleHelp();
        return true;
      case "hint":
        handleHint();
        return true;
      case "cast":
        handleCast();
        return true;
      default:
        consoleView.appendSystem(`Unknown command: /${cmd}. Type /help for commands.`);
        return true;
    }
  }

  function runGameCommand(command: string): void {
    try {
      play(session.command(command));
      autosave();
    } catch (err) {
      consoleView.appendSystem(`[engine error: ${message(err)}]`);
    }
  }

  /** `n` in `1..SLOT_COUNT` for a well-formed slot argument, else `null`. */
  function parseSlot(arg: string): number | null {
    const n = Number(arg);
    return Number.isInteger(n) && n >= 1 && n <= SLOT_COUNT ? n : null;
  }

  /** `1: empty` or `1: Troll Room, score 45, move 88` — derived, never typed. */
  function slotLabel(n: number): string {
    const saved = slotStores[n - 1]!.read();
    if (saved === null) return `${n}: empty`;
    const roomId = saved.save.locations[PLAYER_ID] ?? "";
    const room = roomTitles.get(roomId) ?? roomId;
    const score = Number(saved.save.globals["SCORE"] ?? 0);
    return `${n}: ${room}, score ${score}, move ${saved.save.turn}`;
  }

  function listSlots(): void {
    for (let n = 1; n <= SLOT_COUNT; n++) consoleView.appendSystem(slotLabel(n));
  }

  function handleSave(arg: string | undefined): void {
    if (arg === undefined) {
      listSlots();
      return;
    }
    const n = parseSlot(arg);
    if (n === null) {
      consoleView.appendSystem("Slot must be 1-3.");
      return;
    }
    try {
      slotStores[n - 1]!.write(session.save(), history, castChoice);
      consoleView.appendSystem("Ok.");
    } catch (err) {
      const why = err instanceof StorageFullError ? "browser storage is full" : message(err);
      consoleView.appendSystem(`Save failed: ${why}`);
    }
  }

  function handleLoad(arg: string | undefined): void {
    if (arg === undefined) {
      listSlots();
      return;
    }
    const n = parseSlot(arg);
    if (n === null) {
      consoleView.appendSystem("Slot must be 1-3.");
      return;
    }
    const saved = slotStores[n - 1]!.read();
    if (saved === null) {
      consoleView.appendSystem(`Slot ${n} is empty.`);
      return;
    }
    // Reload-based (6.2, 2026-08-02): write the slot into the current-game key
    // and let boot-time `resume()` do the actual rebuild, rather than swapping
    // state into the running page — `comic-view.ts`/`console-view.ts` have no
    // `reset()` today, and a live swap would leave the Director's pose cycles
    // and beat counters carrying the old game's conversation state.
    // No run id: a slot loaded into the current game starts a *new* board run
    // (ADR 0011 §2). The alternative — inheriting the id the slot was saved
    // with — would let one player re-submit the same run from a slot forever.
    store.write(saved.save, saved.turns, saved.cast);
    location.reload();
  }

  /**
   * `/cast` — re-open the picker.
   *
   * Reload-based, like `/load`: the flag survives the reload, boot shows the
   * picker over the resumed game, and the strip is re-drawn with whoever is
   * chosen. The save itself is untouched — only who is drawn in it changes.
   */
  function handleCast(): void {
    try {
      localStorage.setItem(CAST_PICK_FLAG, "1");
    } catch {
      consoleView.appendSystem("[browser storage is unavailable, so the cast cannot be changed]");
      return;
    }
    location.reload();
  }

  function handleRestart(): void {
    if (!restartArmed) {
      restartArmed = true;
      consoleView.appendSystem("Type /restart again to confirm — this clears the current game.");
      return;
    }
    store.clear();
    location.reload();
  }

  function handleHelp(): void {
    consoleView.appendSystem(
      "This is a text adventure: type short commands, usually a verb and an object.",
    );
    consoleView.appendSystem(
      "Examples: NORTH (or N), LOOK, EXAMINE LAMP, TAKE SWORD, OPEN DOOR, PUT COIN IN SLOT,",
    );
    consoleView.appendSystem("READ BOOK, ATTACK TROLL WITH SWORD, INVENTORY (or I), QUIT.");
    consoleView.appendSystem("/hint — see what you can currently interact with");
    consoleView.appendSystem("/save [1-3] — save to a slot, or list all three slots");
    consoleView.appendSystem("/load [1-3] — load a slot, or list all three slots");
    consoleView.appendSystem("/restart — start a new game (type it twice to confirm)");
    consoleView.appendSystem("/cast — choose who plays the Hero and the Dungeon Master");
    consoleView.appendSystem("/help — show this list");
  }

  /**
   * `/hint` (M6.6, revised): a shell-level query, not a ZIL-style turn — it
   * reads `session.hint()` directly rather than going through `session.command()`,
   * so it costs the player nothing and never reaches the comic pane (§4a: the
   * comic renders turns, and this isn't one, by the user's explicit choice).
   */
  function handleHint(): void {
    const items = session.hint();
    if (items.length === 0) {
      consoleView.appendSystem("Nothing here stands out to try commands on. Type /help for the kinds of things you can do.");
    } else {
      consoleView.appendSystem(`Things you can try commands on here: ${items.join(", ")}.`);
      consoleView.appendSystem("/hint only lists what's around, not what to do with it — that part is up to you.");
    }
  }

  input.focus();
}

async function fetchWorld(): Promise<WorldDocument> {
  const response = await fetch(WORLD_URL);
  if (!response.ok) {
    throw new Error(`world document: HTTP ${response.status} from ${WORLD_URL}`);
  }
  return (await response.json()) as WorldDocument;
}

function requireEl<T extends HTMLElement = HTMLElement>(selector: string): T {
  const el = document.querySelector<T>(selector);
  if (!el) throw new Error(`page is missing ${selector}`);
  return el;
}

function message(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

void main();


/**
 * The player's standing cast preference, or `{}` when they have never chosen.
 *
 * Every failure here — storage blocked, malformed JSON, someone else's key —
 * means "no preference", which is the packed default cast. A bad value must
 * never be able to stop the game booting over a cosmetic setting.
 */
function readPreferredCast(): CastChoice {
  try {
    const raw = localStorage.getItem(CAST_KEY);
    if (raw === null) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null) return {};
    const choice: CastChoice = {};
    for (const [role, id] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof id === "string") choice[role] = id;
    }
    return choice;
  } catch {
    return {};
  }
}

function writePreferredCast(choice: CastChoice): void {
  try {
    localStorage.setItem(CAST_KEY, JSON.stringify(choice));
  } catch {
    // A cast that cannot be remembered is still a cast that can be played.
  }
}

/**
 * The player's standing board preference (ADR 0011 §3).
 *
 * Every failure resolves to `Anonymous`, listed — the same shape a first-time
 * visitor gets. Note which way that default falls: **unreadable storage does not
 * silently opt someone in to something they declined**, because a decline is
 * written and a write that cannot be read back is a storage that keeps nothing
 * at all, in which case there is no run to suppress on the next boot either.
 */
function readBoardPreference(): { name: string; listed: boolean } {
  try {
    const raw = localStorage.getItem(BOARD_KEY);
    if (raw === null) return { name: DEFAULT_PLAYER_NAME, listed: true };
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null) return { name: DEFAULT_PLAYER_NAME, listed: true };
    const { name, listed } = parsed as { name?: unknown; listed?: unknown };
    return {
      name: typeof name === "string" && name.trim() !== "" ? name : DEFAULT_PLAYER_NAME,
      listed: listed !== false,
    };
  } catch {
    return { name: DEFAULT_PLAYER_NAME, listed: true };
  }
}

function writeBoardPreference(name: string, listed: boolean): void {
  try {
    localStorage.setItem(BOARD_KEY, JSON.stringify({ name, listed }));
  } catch {
    // A preference that cannot be remembered is still a preference that plays.
  }
}

/** Read and clear the `/cast` request, so one `/cast` opens one picker. */
function takeCastPickFlag(): boolean {
  try {
    const flag = localStorage.getItem(CAST_PICK_FLAG) !== null;
    localStorage.removeItem(CAST_PICK_FLAG);
    return flag;
  } catch {
    return false;
  }
}
