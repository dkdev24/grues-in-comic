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
import { objectNameTable } from "./status.js";
import { createConsoleView } from "./console-view.js";
import { createInspectorView } from "./inspector-view.js";
import { createComicView, type ComicView } from "./comic-view.js";
import { createSessionStore, StorageFullError } from "./persistence.js";

/** Where `tools/serve.ts` mounts `ir/artifacts/`. ~1.8 MB, fetched once. */
const WORLD_URL = "./world/zork1.world.json";
/** Sheets and manifest from `art/tools/avbpack.ts`; ~330 KiB, five requests. */
const COMIC_ASSETS = "./assets/comic";
const SAVE_KEY = "grues-in-comic/save/v1";

async function main(): Promise<void> {
  const consoleView = createConsoleView(requireEl("#console"));
  const inspector = createInspectorView(requireEl("#inspector"));
  const input = requireEl<HTMLInputElement>("#command");
  const form = requireEl<HTMLFormElement>("#command-form");

  let session: Session;
  let names: ReadonlyMap<string, string> = new Map();
  try {
    const doc = await fetchWorld();
    session = createSession(doc, {});
    // The Hero balloon renders resolved actions by object *name* (ADR 0005 §1);
    // the id→name table is static world data, built once beside the session.
    names = objectNameTable(doc.objects ?? []);
  } catch (err) {
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

  // The comic pane is primary (§4) but it is also the only part of the shell
  // with assets to fetch, so the game stays playable if they fail: a null comic
  // degrades to 5.2's text shell rather than to a blank page.
  let comic: ComicView | null = null;
  try {
    comic = await createComicView(requireEl("#comic"), COMIC_ASSETS, names);
  } catch (err) {
    consoleView.appendSystem(`[comic pane unavailable: ${message(err)}]`);
  }

  // The replay log behind autosave. Every turn `play()` renders is a turn a
  // resumed session has to render again, so it is appended here and nowhere
  // else — one list, written on the single path both panes go through.
  const history: Turn[] = [];
  const store = createSessionStore(SAVE_KEY, localStorage);
  // Autosave stops at the first refusal rather than throwing once per turn for
  // the rest of the game; the player is told once, and explicit `save` still
  // reports its own failures.
  let autosaveEnabled = true;

  const play = (turn: Turn): void => {
    // One session, one event stream, both panes. The comic never gets its own
    // engine handle — that is what makes §2's "accompanied, never replaced" a
    // property of the wiring rather than something to keep in sync.
    consoleView.appendTurn(turn);
    comic?.appendTurn(turn);
    inspector.update(turn);
    history.push(turn);
  };

  /** Render a turn without recording it: replay is already in the history. */
  const replay = (turn: Turn): void => {
    consoleView.appendTurn(turn);
    comic?.appendTurn(turn);
    inspector.update(turn);
  };

  function autosave(): void {
    if (!autosaveEnabled) return;
    try {
      store.write(session.save(), history);
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
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const command = input.value.trim();
    if (command === "") return;
    input.value = "";

    // Save and restore are the shell's, not the game's: ZIL's SAVE/RESTORE
    // are Z-machine interpreter commands, and this shell is the interpreter.
    if (handleShellCommand(command)) return;

    try {
      play(session.command(command));
      autosave();
    } catch (err) {
      // A crashed turn must not take the page with it — the transcript so far
      // is the bug report.
      consoleView.appendSystem(`[engine error: ${message(err)}]`);
    }
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

  function handleShellCommand(command: string): boolean {
    const word = command.toLowerCase();
    if (word === "save") {
      try {
        store.write(session.save(), history);
        autosaveEnabled = true;
        consoleView.appendSystem("Ok.");
      } catch (err) {
        const why = err instanceof StorageFullError ? "browser storage is full" : message(err);
        consoleView.appendSystem(`Save failed: ${why}`);
      }
      return true;
    }
    if (word === "restore") {
      // Restoring into a page that already has a strip would append a second
      // game to the first. A reload replays cleanly through `resume()`, so this
      // reports what to do rather than rendering something incoherent.
      const saved = store.read();
      consoleView.appendSystem(
        saved === null ? "No saved game." : "Reload the page to resume the saved game.",
      );
      return true;
    }
    return false;
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
