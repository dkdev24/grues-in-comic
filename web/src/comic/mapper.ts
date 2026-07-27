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
import { BM_ACTION, BM_SAY, type BalloonModes, type PageLine, type PanelContext } from "./page.js";
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

/**
 * ADR 0005 §2: what kind of turn a panel came from, so the Director can edit the
 * stream. The mapper *classifies* — it already folds the events, so the tag is a
 * byproduct — and the Director sets *policy* on the tag: Slice 3 drops `refusal`,
 * Slice 4 collapses runs of `traversal`. Read the event contract first (moves,
 * inventory, score, game-over), and only the affect marker (itself a channel read
 * before a prose match) to tell a refusal from ordinary narration.
 */
export type PanelKind =
  | "arrival"    // first visit — somewhere new (beat)
  | "traversal"  // a move to a room already seen (beat today; Slice 4 collapses runs)
  | "action"     // took/dropped/salient object/score — the player changed the world
  | "terminal"   // game over — death or victory
  | "refusal"    // the parser said no and nothing happened (noise — Slice 3 drops it)
  | "ambient";   // narration only, no change — look/examine/read (kept in Slice 3)

/**
 * Cast/avatar ids used as {@link Line.speaker} keys — the DM, the Hero, and the
 * bodiless caption channel. They index `Cast.manifest.cast` (ADR 0008 §2), so a
 * mob would join as a fourth id with its own sheet; nothing in the mechanical
 * layer names `hero`/`guide` any more.
 */
export const HERO = "hero";
export const GUIDE = "guide";
/** The read-aloud box channel (ADR 0006 §2): a line with no speaking body. */
export const CAPTION = "caption";

/** The DM's own emotion set: it reacts to nothing, it comments (neutral pose). */
const GUIDE_EMOTION: readonly EmotionOption[] = [{ angle: 0, intensity: 0, priority: 1 }];

export interface Balloon {
  /**
   * Fixed for `caption` (box) and the DM (speech). The Hero's is chosen per line
   * (ADR 0006 §3): speech when he addresses the DM, thought for an interior aside.
   */
  balloonClass: BalloonClass;
  text: string;
}

/**
 * An utterance before panelization: the register the mapper chose, as Comic Chat's
 * `uModes` mask. `page.ts` turns it into a {@link BalloonClass} via `MakeBalloon`
 * (`panel.cpp:1036`), so the mapper never names a Woodring class — that mapping is
 * the port's, not ours.
 */
export interface Utterance {
  modes: BalloonModes;
  text: string;
}

/**
 * One utterance in a panel: a speaker and their balloon (ADR 0008 §2) — the port
 * of Comic Chat's `AddLine(id, words, mode)` triple, held in the panel's element
 * list (`m_elements`, `panel.cpp:397`; `MakeBalloon` `:335`). Emotion lives on the
 * speaker's {@link Body}, not here, because a body can be on stage (and posed)
 * without saying anything this panel — the Hero, mostly.
 */
export interface Line extends Balloon {
  /** Cast/avatar id. {@link CAPTION} marks a bodiless box (`SM_ACTION`, `panel.cpp:367`). */
  speaker: string;
}

/**
 * A participant on stage in a panel (Comic Chat's `m_bodies`, `panel.cpp:305`,
 * laid out by `LayoutAvatars`). Separate from the balloon list because presence
 * and speech are independent: the Hero is always requested on stage (`avatar.cpp`
 * `m_requested`, `panel.cpp:623`) and poses to the world's reply even on a silent
 * turn; the DM and mobs join only when they have a line.
 */
export interface Body {
  /** Cast/avatar id, indexing `Cast.manifest.cast`. */
  speaker: string;
  /** Priority-descending `CEmotionOpts` set driving this body's pose (§10). */
  emotion: readonly EmotionOption[];
  /**
   * `m_requested` (`avatar.h:87`): stage this body even on a turn it says nothing.
   * `IsSpeaker` (`panel.cpp:822`) admits a body that is requested **or** carries a
   * balloon, and drops the rest — so an unrequested, silent body is not drawn.
   * The Hero is requested (he is the panel's subject); the DM and mobs earn the
   * stage by speaking.
   */
  requested?: boolean;
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
  /**
   * On-stage participants in left-to-right order (`m_bodies`): the DM (when it
   * speaks) then the Hero (always). The renderer's N-body layout reads this.
   */
  bodies: readonly Body[];
  /**
   * The panel's utterances in draw order: caption (box, no body), then the DM,
   * then the Hero, then any mobs. Canonical balloon seam (ADR 0008 §2) — the
   * balloon stack reads this; {@link lineOf} names a speaker.
   */
  speakers: readonly Line[];
  /** Which §10 marker fired, or `null` — the correct answer ~51% of the time. */
  marker: string | null;
  /** ADR 0005 §2 classification, for the Director's edit decisions. */
  kind: PanelKind;
}

/** The line a given speaker says in this panel, or `null` — semantic-test convenience. */
export function lineOf(panel: Panel, speaker: string): Line | null {
  return panel.speakers.find((line) => line.speaker === speaker) ?? null;
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
  /**
   * Affect marker → Guide line (ADR 0005 §4). This is what makes the Guide
   * *converse*: it reacts to the beat the Hero just caused (the §10 marker the
   * turn produced — `combat-victory`, `grue-threat`, `scored`, …) instead of only
   * to entering a scripted room. Consulted before the room gazetteer and under the
   * same cooldown, so the Guide stays presentation-only and does not wear out.
   * Empty keeps the old room-only behaviour.
   */
  beatScript?: ReadonlyMap<string, string>;
}

/**
 * A turn, read as utterances (ADR 0008 Phase 2). The mapper no longer builds a
 * panel: it says *what is said, by whom, in what register*, and `page.ts` decides
 * which panel that lands in — the split ADR 0008 §Context asks for, semantic here
 * and mechanical there.
 */
export interface TurnScript {
  /** Panel-level facts that are ours, not Comic Chat's — see {@link PanelContext}. */
  context: PanelContext;
  /** The turn's utterances in draw order: caption, then the DM, then the Hero. */
  lines: readonly PageLine[];
  /**
   * Bodies to stage with no balloon — `AddReaction` (`panel.cpp:1142`). The Hero
   * on a silent turn: he poses to the world's reply and says nothing, which is
   * most turns.
   */
  reactions: readonly { speaker: string; emotion: readonly EmotionOption[] }[];
}

export interface Mapper {
  /** Fold one turn in and read off its utterances. */
  read(turn: Turn): TurnScript;
}

export function createMapper(options: MapperOptions = {}): Mapper {
  const guideScript = options.guideScript ?? new Map<string, string>();
  const guideCooldown = options.guideCooldown ?? 6;
  const names = options.names ?? new Map<string, string>();
  const beatScript = options.beatScript ?? new Map<string, string>();

  const visited = new Set<string>();
  const inventory = new Set<string>();
  let room = "";
  let lastGuideTurn = -Infinity;

  return {
    read(turn: Turn): TurnScript {
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
      const guideLine = guideFor(firstVisit, room, affect.marker, turn.status.moves);
      const camera = cameraFor({ gameOver, moved, firstVisit, salientMove, guide: guideLine });

      // The turn's utterances in draw order (ADR 0008 §2): the caption frames the
      // panel, the DM reads into it, the Hero answers. Each is one `AddLine`
      // (`panel.cpp:1058`) — whether they land in one panel or three is `page.ts`'s
      // decision now, not this module's.
      const caption = captionFor(text, affect.matched);
      const hero = heroBalloon(took, dropped, names);
      const lines: PageLine[] = [];
      if (caption) {
        // Bodiless: the caption is narration, and `BM_ACTION` alone is what makes
        // it break the panel (`panel.cpp:1064`).
        lines.push({ ...caption, speaker: CAPTION, emotion: [], bodiless: true });
      }
      if (guideLine !== null) {
        lines.push({ speaker: GUIDE, modes: BM_SAY, text: guideLine, emotion: GUIDE_EMOTION });
      }
      if (hero) lines.push({ ...hero, speaker: HERO, emotion: affect.options });

      // The Hero is always on stage — it is his adventure — and poses to the
      // world's reply (§9: his affect comes from the reply, never from his own
      // balloon). A line stages him; on a turn he says nothing, that staging is a
      // reaction (`AddReaction`, `panel.cpp:1142`). The DM and mobs earn the stage
      // by speaking, so they need no entry here.
      const reactions = hero === null ? [{ speaker: HERO, emotion: affect.options }] : [];

      return {
        lines,
        reactions,
        context: {
          turn: turn.status.moves,
          camera,
          emphatic: camera === "establishing" && scoreDelta > 0,
          room,
          focus: camera === "close-up" ? (salientMove?.object ?? null) : null,
          marker: affect.marker,
          kind: panelKind({
            gameOver, moved, firstVisit, took, dropped, salientMove,
            scoreDelta, marker: affect.marker,
          }),
        },
      };
    },
  };

  function guideFor(
    firstVisit: boolean, roomId: string, marker: string | null, turnNumber: number,
  ): string | null {
    if (turnNumber - lastGuideTurn < guideCooldown) return null;
    // Beat reaction first (ADR 0005 §4): the Guide answers what the Hero just did.
    // This is the whole of "they talk to each other" — the line is chosen by the
    // marker the Hero's action produced, so the Guide is replying, not narrating a
    // room on a timer.
    const beatLine = marker !== null ? beatScript.get(marker) : undefined;
    if (beatLine !== undefined) {
      lastGuideTurn = turnNumber;
      return beatLine;
    }
    // Then the room gazetteer, on first entry (the pre-§4 behaviour, unchanged).
    if (firstVisit) {
      const roomLine = guideScript.get(roomId);
      if (roomLine !== undefined) {
        lastGuideTurn = turnNumber;
        return roomLine;
      }
    }
    return null;
  }
}

interface LadderInput {
  gameOver: boolean;
  moved: boolean;
  firstVisit: boolean;
  salientMove: { object: string } | null;
  guide: string | null;
}

interface KindInput {
  gameOver: boolean;
  moved: boolean;
  firstVisit: boolean;
  took: string | null;
  dropped: string | null;
  salientMove: { object: string } | null;
  scoreDelta: number;
  marker: string | null;
}

/**
 * ADR 0005 §2, first matching rung wins — a beat taxonomy, not a camera. A moved
 * turn is `arrival`/`traversal` before anything else it also did (a move that
 * scores is still a place the player went); a turn that changed the world without
 * moving is an `action`; a refusal is the parser marker with none of the above;
 * everything left is narration-only `ambient`. The order is the decision.
 */
export function panelKind(input: KindInput): PanelKind {
  if (input.gameOver) return "terminal";
  if (input.moved) return input.firstVisit ? "arrival" : "traversal";
  if (input.took !== null || input.dropped !== null || input.salientMove !== null || input.scoreDelta > 0) {
    return "action";
  }
  if (input.marker === "parser-miss") return "refusal";
  return "ambient";
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
 * A **speech** balloon (`CBWoodringNormal`): the Hero now *speaks* across the
 * table to the DM (ADR 0006 §3, Slice 1). This is the break with ADR 0004 §2a /
 * ADR 0005 §4 — the resolved action is a line he says aloud, not a caption on his
 * life. The *thought* register (`CBWoodringThink`) is retained for interior asides
 * the DM doesn't hear: balloon class is chosen per line, not per character, and
 * the thought class stays live in the type and the renderer. Aside *content* is
 * authored in a later slice, so the resolved-action line here is always spoken.
 *
 * The lines are the Hero's settled voice (`wiki/the-hero.md`): a systems-minded,
 * genre-literate, middle-aged player working a familiar dungeon — terse, dry,
 * faintly proprietary. Templates over object DESCs, so they must stay grammatical
 * across every name the world holds ("leaflet", "jewel-encrusted egg").
 */
export function heroBalloon(
  took: string | null, dropped: string | null, names: ReadonlyMap<string, string>,
): Utterance | null {
  const id = took ?? dropped;
  if (id === null) return null;
  const name = names.get(id) ?? id;
  const text = took !== null ? `The ${name}, then.` : `The ${name} can stay.`;
  return { modes: BM_SAY, text };
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

export function captionFor(text: string, matched: string | null): Utterance | null {
  const candidate = matched ?? sentences(text)[0] ?? null;
  if (candidate === null || candidate.length > CAPTION_MAX) return null;
  return { modes: BM_ACTION, text: candidate };
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
