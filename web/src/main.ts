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
import { createSession, type Session } from "./session.js";
import { createConsoleView } from "./console-view.js";
import { createInspectorView } from "./inspector-view.js";

/** Where `tools/serve.ts` mounts `ir/artifacts/`. ~1.8 MB, fetched once. */
const WORLD_URL = "./world/zork1.world.json";
const SAVE_KEY = "grues-in-comic/save/v1";

async function main(): Promise<void> {
  const consoleView = createConsoleView(requireEl("#console"));
  const inspector = createInspectorView(requireEl("#inspector"));
  const input = requireEl<HTMLInputElement>("#command");
  const form = requireEl<HTMLFormElement>("#command-form");

  let session: Session;
  try {
    session = createSession(await fetchWorld(), {});
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

  const play = (turn: ReturnType<Session["command"]>): void => {
    consoleView.appendTurn(turn);
    inspector.update(turn);
  };

  play(session.start());

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
    } catch (err) {
      // A crashed turn must not take the page with it — the transcript so far
      // is the bug report.
      consoleView.appendSystem(`[engine error: ${message(err)}]`);
    }
  });

  function handleShellCommand(command: string): boolean {
    const word = command.toLowerCase();
    if (word === "save") {
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(session.save()));
        consoleView.appendSystem("Ok.");
      } catch (err) {
        consoleView.appendSystem(`Save failed: ${message(err)}`);
      }
      return true;
    }
    if (word === "restore") {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw === null) {
        consoleView.appendSystem("No saved game.");
        return true;
      }
      try {
        session.load(JSON.parse(raw));
        consoleView.appendSystem("Ok.");
        consoleView.setStatus(session.status);
      } catch (err) {
        consoleView.appendSystem(`Restore failed: ${message(err)}`);
      }
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
