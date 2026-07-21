/**
 * Game-specific action routines the extractor catalogued but could not
 * mechanically translate (stage 5.5).
 *
 * ADR 0001 extracts game logic to the behavior AST; ADR 0002 keeps
 * `builtins.ts` to the *game-agnostic* ZIL library ("No `zork1` identifier
 * appears here"). A handful of routines fall between the two: they are
 * Zork-specific, so they do not belong in `builtins.ts`, yet they manipulate
 * things the IR deliberately abstracts away — the raw parser buffer, or the
 * win/lose *outcome* the IR's `FINISH` does not distinguish — so the extractor
 * catalogued rather than translated them (the same class as I-SWORD before
 * ADR 0003; ADR 0003 solved its case in the extractor, these are solved here).
 *
 * This module is the explicit, quarantined home for that handful. Every routine
 * cites its ZIL source and states what was **not** ported and why, so the
 * liberty is visible rather than silent. It is registered into the builtins map
 * by `createEngine`, so `callRoutine` finds these by name exactly as it finds an
 * extracted routine — no dispatch change, and a later extractor pass can replace
 * any of them by defining the routine in the world document (document wins).
 */

import type { BehaviorValue } from "@grues-in-comic/ir";
import { num } from "./interpreter.js";
import { tell, type Builtin, type RuntimeContext } from "./runtime.js";
import { M_BEG, M_END, M_LOOK } from "./builtins.js";
import { clearFlag, truthy } from "./state.js";

/** The barrow victory text, ZORK I branch of `STONE-BARROW-FCN` (1actions.zil). */
const BARROW_WIN =
  "Inside the Barrow\n" +
  "As you enter the barrow, the door closes inexorably behind you. Around you " +
  "it is dark, but ahead is an enormous cavern, brightly lit. Through its center " +
  "runs a wide stream. Spanning the stream is a small wooden footbridge, and " +
  "beyond a path leads into a dark tunnel. Above the bridge, floating in the air, " +
  "is a large sign. It reads:  All ye who stand before this bridge have completed " +
  "a great and perilous adventure which has tested your wit and courage. You have " +
  "mastered the first part of the ZORK trilogy. Those who pass over this bridge " +
  "must be prepared to undertake an even greater adventure that will severely test " +
  "your skill and bravery!\n\n" +
  'The ZORK trilogy continues with "ZORK II: The Wizard of Frobozz" and is ' +
  'completed in "ZORK III: The Dungeon Master."\n';

/**
 * `STONE-BARROW-FCN` (1actions.zil) — entering the Stone Barrow wins the game.
 *
 * On `M-BEG` the ZIL fires for `ENTER`, for `WALK` west/in, or for `THROUGH` the
 * barrow, prints the win text, and calls `<FINISH>`. The engine's `FINISH`
 * defaults its outcome to *death* (there is no won-flag in the Z-machine; the
 * victory/death split is the engine's own event semantics), so this is the
 * engine's **first** victory path and it must set the outcome itself.
 *
 * `WON-FLAG`, the map, and the "look to your treasures" whisper are already
 * handled by the extracted `SCORE-UPD` when the score reaches 350 — that is what
 * opens the West-of-House → Stone Barrow exit — so nothing about the win
 * condition lives here. This routine is only the final step across the threshold.
 */
function stoneBarrow(ctx: RuntimeContext, [rarg]: BehaviorValue[]): BehaviorValue {
  if (num(rarg ?? 0) !== M_BEG) return false;
  const dir = String(ctx.directObject ?? "").toLowerCase();
  const enters =
    ctx.verb === "ENTER" ||
    (ctx.verb === "WALK" && (dir === "west" || dir === "in")) ||
    (ctx.verb === "THROUGH" && ctx.directObject === "BARROW");
  if (!enters) return false;
  tell(ctx, BARROW_WIN);
  ctx.finished = { outcome: "victory", text: "" };
  return true;
}

const LOUD_DESC =
  "This is a large room with a ceiling which cannot be detected from the ground. " +
  "There is a narrow passage from east to west and a stone stairway leading upward.";

/**
 * `LOUD-ROOM-FCN` (1actions.zil) — the Loud Room and its "echo" puzzle.
 *
 * Ported: the room description (`M-LOOK`), and the puzzle itself — saying
 * `ECHO` sets `LOUD-FLAG` and clears `SACREDBIT` on the platinum `BAR`
 * (1actions.zil:1718). Clearing `SACREDBIT` matters for the thief, who will not
 * lift a sacred object; it does **not** gate `V-TAKE`.
 *
 * Not ported, deliberately: the deafening-state modal read-loop the ZIL runs on
 * `M-ENTER`, which reads raw words from `P-LEXV` and accepts only echo /
 * directions / save-restore-quit ("the rest of your commands have been lost in
 * the noise"). That is exactly the parser-buffer manipulation the IR abstracts
 * away — the reason this routine was catalogued, not extracted. Its only
 * player-visible consequence on the winning route is that the bar is reachable a
 * turn earlier than in the reference (the walkthrough echoes first regardless).
 * The roaring-state `M-END` ejection (gates open, reservoir high) is likewise
 * off the completion route and not reproduced.
 */
function loudRoom(ctx: RuntimeContext, [rarg]: BehaviorValue[]): BehaviorValue {
  const g = ctx.state.globals;
  const quiet =
    truthy(g["LOUD-FLAG"]) || (!truthy(g["GATES-OPEN"]) && truthy(g["LOW-TIDE"]));
  switch (num(rarg ?? 0)) {
    case M_LOOK:
      tell(
        ctx,
        `${LOUD_DESC}${
          quiet
            ? " The room is eerie in its quietness."
            : " The room is deafeningly loud with an undetermined rushing sound. The" +
              " sound seems to reverberate from all of the walls, making it difficult" +
              " even to think."
        }\n`,
      );
      return true;
    case M_BEG:
      if (ctx.verb === "ECHO") {
        g["LOUD-FLAG"] = true;
        clearFlag(ctx.state, "BAR", "SACREDBIT");
        tell(ctx, "The acoustics of the room change subtly.\n");
        return true;
      }
      return false;
    case M_END:
      return false;
    default:
      return false;
  }
}

/**
 * Register the game-specific action routines into the builtins map. Called by
 * `createEngine` after `createBuiltins`. A routine the world document defines
 * takes precedence (see `callRoutine`), so this only fills genuine gaps.
 */
export function registerGameActions(builtins: Map<string, Builtin>): void {
  builtins.set("STONE-BARROW-FCN", stoneBarrow);
  builtins.set("LOUD-ROOM-FCN", loudRoom);
}
