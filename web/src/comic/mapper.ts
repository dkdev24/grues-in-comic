/**
 * Events to panels (ADR 0004 §2, §7, §10) — the whole of the presentation
 * decision, as a pure function of the ADR 0002 event stream.
 *
 * The mapper reads no engine internals and holds no DOM. It keeps per-session
 * memory (visited rooms, the player's room, the player's inventory) because the
 * camera ladder needs it, and all three are *derived from the stream* rather
 * than read from the engine — which is what lets the whole mapping be tested by
 * replaying walkthroughs, the same oracle the parity harness uses.
 *
 * What must not happen here: no new event types, no presentational fields
 * pushed back into the contract, and no styling decision made by parsing prose
 * beyond the §10 affect table, which is quarantined in `affect.ts` and is the
 * one place ADR 0004 knowingly accepts that cost.
 */

import type { EngineEvent } from "../../../engine/src/events.js";
import { PLAYER_ID } from "../../../engine/src/state.js";
import type { EmotionOption } from "../../../art/src/pose.js";
import { affectFor, sentences } from "./affect.js";
import type { Turn } from "../session.js";

/**
 * §7's six rungs. `establishing` carries the "emphatic" modifier separately
 * rather than as a seventh preset: it is a modifier on rung 2, which is the
 * only thing left of the `score-changed` rung that measurement killed.
 */
export type CameraPreset =
  | "reaction"      // 1 — tight on Hero
  | "establishing"  // 2 — first visit
  | "wide"          // 3 — revisit, two-shot
  | "close-up"      // 4 — salient object
  | "over-shoulder" // 5 — Guide → Hero
  | "medium";       // 6 — default

export type BalloonClass = "CBWoodringThink" | "CBWoodringBox" | "CBWoodringNormal";

export interface Balloon {
  channel: "hero" | "caption" | "guide";
  /** Fixed per channel by §2/§2a — never chosen per panel. */
  balloonClass: BalloonClass;
  text: string;
}

export interface Panel {
  /** Turn counter this panel was drawn from. */
  turn: number;
  camera: CameraPreset;
  /** §7 rung 2's modifier: a first visit that also scored. */
  emphatic: boolean;
  /** Room id the panel is set in, `""` before the first placement. */
  room: string;
  /** Object id rung 4 focused on, when the camera is a close-up. */
  focus: string | null;
  /** The player's command, as a thought balloon. Absent on the opening turn. */
  hero: Balloon | null;
  /** A verbatim pull-quote from the turn's narration. */
  caption: Balloon | null;
  /** The only authored text in the system. */
  guide: Balloon | null;
  /** Priority-descending `CEmotionOpts` set for the Hero (§10). */
  emotion: readonly EmotionOption[];
  /** Which §10 marker fired, or `null` — the correct answer ~51% of the time. */
  marker: string | null;
}

/**
 * Authored Guide lines, keyed by the room a first visit lands in.
 *
 * This module owns the *mechanism* — first-visit trigger, cooldown, a table that
 * may be empty (ADR 0004 §3 keeps the Guide presentation-only, and the project's
 * authoring cost is bounded by its trigger rate). The script itself is content and
 * lives with the view: `GUIDE_SCRIPT` in `web/src/comic-view.ts`, written to the
 * identity settled in `wiki/the-guide.md`. The map may be empty and the mapper is
 * unchanged if it is — tests here supply their own scripts rather than the real one.
 */
export type GuideScript = ReadonlyMap<string, string>;

export interface MapperOptions {
  guideScript?: GuideScript;
  /**
   * Turns that must pass between Guide balloons. The Guide is the only thing on
   * the panel that can wear out, because it is the only thing not derived from
   * what the player just did.
   */
  guideCooldown?: number;
  /**
   * Object id → display name (ADR 0005 §1). The Hero balloon is the *resolved
   * action* — "I take the leaflet." — not the typed command, so it needs the
   * name behind the id the `object-moved` event carries. Empty is safe: a missed
   * id falls back to the id, and the tests here supply their own table.
   */
  names?: ReadonlyMap<string, string>;
}

export interface Mapper {
  /** Fold one turn in and get its panel. ~1 panel per turn (§6). */
  panel(turn: Turn): Panel;
  /** Every panel produced so far — the canonical stream of §5. */
  readonly panels: readonly Panel[];
}

export function createMapper(options: MapperOptions = {}): Mapper {
  const guideScript = options.guideScript ?? new Map<string, string>();
  const guideCooldown = options.guideCooldown ?? 6;
  const names = options.names ?? new Map<string, string>();

  const visited = new Set<string>();
  const inventory = new Set<string>();
  const panels: Panel[] = [];
  let room = "";
  let lastGuideTurn = -Infinity;

  return {
    panels,
    panel(turn: Turn): Panel {
      const text = panelText(turn.events);
      // Read off the channel, not out of the prose (ADR 0002's actual purpose).
      const systemChannel = turn.events.some(
        (event) => event.type === "narration" && event.channel === "system",
      );
      let firstVisit = false;
      let moved = false;
      let scoreDelta = 0;
      let gameOver = false;
      let salientMove: { object: string } | null = null;
      // ADR 0005 §1: the first object the Hero gained or gave up this turn, which
      // the Hero balloon renders as an action. Movement, examination and parser
      // refusals leave both null and the balloon absent — the pose carries them.
      let took: string | null = null;
      let dropped: string | null = null;

      for (const event of turn.events) {
        switch (event.type) {
          case "player-moved":
            moved = true;
            room = event.to;
            if (!visited.has(room)) {
              visited.add(room);
              firstVisit = true;
            }
            break;
          case "object-moved": {
            // The opening placement arrives as the player's own `object-moved`
            // with `from` === `to`, because `start()` emits no `player-moved`
            // (the 5.2 contract finding). Scope that to the player: the thief's
            // wander daemon emits about one `object-moved` per turn, and a
            // looser rule sets every panel in the thief's room.
            if (event.object === PLAYER_ID) {
              moved = true;
              room = event.to;
              if (!visited.has(room)) {
                visited.add(room);
                firstVisit = true;
              }
              break;
            }
            // §7's precondition. Without it the single most common shot in the
            // finished comic is a close-up on a thief the player cannot see:
            // only 31 of 187 `object-moved` are player-salient.
            if (salient(event.object, event.from, event.to, room, inventory)) {
              salientMove ??= { object: event.object };
            }
            if (event.to === PLAYER_ID) {
              inventory.add(event.object);
              took ??= event.object;
            } else if (event.from === PLAYER_ID) {
              inventory.delete(event.object);
              dropped ??= event.object;
            }
            break;
          }
          case "score-changed":
            scoreDelta += event.delta;
            break;
          case "game-over":
            gameOver = true;
            break;
          default:
            break;
        }
      }

      const affect = affectFor({ text, gameOver, scoreDelta, systemChannel });
      const guideLine = guideFor(firstVisit, room, turn.status.moves);
      const camera = cameraFor({ gameOver, moved, firstVisit, salientMove, guide: guideLine });

      const panel: Panel = {
        turn: turn.status.moves,
        camera,
        emphatic: camera === "establishing" && scoreDelta > 0,
        room,
        focus: camera === "close-up" ? (salientMove?.object ?? null) : null,
        hero: heroBalloon(took, dropped, names),
        caption: captionFor(text, affect.matched),
        guide: guideLine === null
          ? null
          : { channel: "guide", balloonClass: "CBWoodringNormal", text: guideLine },
        emotion: affect.options,
        marker: affect.marker,
      };
      panels.push(panel);
      return panel;
    },
  };

  function guideFor(firstVisit: boolean, roomId: string, turnNumber: number): string | null {
    if (!firstVisit) return null;
    if (turnNumber - lastGuideTurn < guideCooldown) return null;
    const line = guideScript.get(roomId);
    if (line === undefined) return null;
    lastGuideTurn = turnNumber;
    return line;
  }
}

interface LadderInput {
  gameOver: boolean;
  moved: boolean;
  firstVisit: boolean;
  salientMove: { object: string } | null;
  guide: string | null;
}

/** §7, first matching rung wins. The order is the decision; do not reorder. */
export function cameraFor(input: LadderInput): CameraPreset {
  if (input.gameOver) return "reaction";
  if (input.moved && input.firstVisit) return "establishing";
  if (input.moved) return "wide";
  if (input.salientMove) return "close-up";
  if (input.guide !== null) return "over-shoulder";
  return "medium";
}

/**
 * §7's salience filter. An `object-moved` is salient only if the object is the
 * player, sits in the player's inventory, or crosses the boundary of the room
 * the player is in.
 */
export function salient(
  object: string, from: string, to: string, room: string, inventory: ReadonlySet<string>,
): boolean {
  if (object === PLAYER_ID) return true;
  if (inventory.has(object) || from === PLAYER_ID || to === PLAYER_ID) return true;
  return room !== "" && (from === room || to === room);
}

/**
 * The Hero balloon: the *resolved action*, not the typed command (ADR 0005 §1).
 *
 * The player authored the Hero's action; the command was the authoring, not the
 * Hero's dialogue. So a turn that moved an object into or out of the Hero's hands
 * renders that outcome — "I take the leaflet." — and every other turn (movement,
 * examination, a parser refusal) renders **no balloon**: the pose and the caption
 * carry it, and a thought bubble reading `s` or `look` was the play-log tell this
 * whole ADR exists to remove. Take wins over drop when a turn did both; one
 * balloon per panel is the Comic Chat rule §6 inherits (`AddLine`).
 *
 * Still a *thought* balloon (`CBWoodringThink`) — whether the Hero *speaks* is a
 * two-shot question ADR 0005 §4 answers in Slice 5, not here.
 *
 * The lines are the Hero's settled voice (`wiki/the-hero.md`): a systems-minded,
 * genre-literate, middle-aged player working a familiar dungeon — terse, dry,
 * faintly proprietary. Templates over object DESCs, so they must stay grammatical
 * across every name the world holds ("leaflet", "jewel-encrusted egg").
 */
export function heroBalloon(
  took: string | null, dropped: string | null, names: ReadonlyMap<string, string>,
): Balloon | null {
  const id = took ?? dropped;
  if (id === null) return null;
  const name = names.get(id) ?? id;
  const text = took !== null ? `The ${name}, then.` : `The ${name} can stay.`;
  return { channel: "hero", balloonClass: "CBWoodringThink", text };
}

/**
 * The caption: a **verbatim** pull-quote, never a paraphrase (§2).
 *
 * The rule is that the panel quotes the sentence its Hero is reacting to — the
 * one the §10 marker matched — and falls back to the turn's first sentence when
 * no marker fired, which is the ~51% case where the first sentence is a room
 * name or a routine acknowledgement and is the right thing to show anyway.
 *
 * A long sentence is dropped rather than trimmed. Truncating would make the
 * caption a paraphrase by omission, and narration is accompanied, never
 * replaced: the console pane still carries every word.
 */
const CAPTION_MAX = 180;

export function captionFor(text: string, matched: string | null): Balloon | null {
  const candidate = matched ?? sentences(text)[0] ?? null;
  if (candidate === null || candidate.length > CAPTION_MAX) return null;
  return { channel: "caption", balloonClass: "CBWoodringBox", text: candidate };
}

/** Player-visible text for the turn, on the same definition the harness uses. */
function panelText(events: readonly EngineEvent[]): string {
  let out = "";
  for (const event of events) {
    if (event.type === "narration" || event.type === "question" || event.type === "game-over") {
      out += event.text;
    } else if (event.type === "speech") {
      out += event.text;
    }
  }
  return out;
}
