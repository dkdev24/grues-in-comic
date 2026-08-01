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
import { affectFor, isRefusal, sentences } from "./affect.js";
import {
  BM_SAY, BRK, CHR, type BalloonModes, type PageLine, type PanelContext, type Register,
} from "./page.js";
import type { Turn } from "../session.js";
// The one content import, and it is the shipped default for {@link heroBalloon}'s
// rotation: `script.ts` is data and DOM-free (it imports only types from here, so
// there is no runtime cycle), and defaulting rather than requiring the option
// keeps every existing caller — the view, `density.ts`, `gate.ts`,
// `render-panel.ts` — speaking the shipped voice without having to opt in.
import { ACTION_SCRIPT, type ActionScript } from "./script.js";

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
  /** Narration or authored — ADR 0009 §2. See {@link PageLine.register}. */
  register?: Register;
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
  /** The location title to draw, or `null` — ADR 0009 §3. See {@link PanelContext}. */
  roomTitle: string | null;
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
 * lives beside this one as data: `GUIDE_SCRIPT` in `web/src/comic/script.ts`,
 * written to the identity settled in `wiki/the-guide.md`. (It lived in the view
 * until M6.1a, which moved it out so the corpus replay could measure the shipped
 * tables rather than a throwaway.) The map may be empty and the mapper is
 * unchanged if it is — tests here supply their own scripts rather than the real one.
 *
 * **A room's entry may be a {@link BeatExchange} as of M6.1e**, so the Hero can
 * answer the DM on a first visit instead of listening to him narrate. Measured,
 * that is the one authored surface that cannot wear out — a room is entered for
 * the first time exactly once — and it reaches every arrival in the corpus. A
 * bare `string` stays the DM-only form, so every existing entry and every test
 * script is unchanged.
 */
export type GuideScript = ReadonlyMap<string, string | BeatExchange>;

/**
 * One beat's authored **exchange** — ADR 0006 §4, Slice 2.
 *
 * A beat may render as DM-only, Hero-only, or a true back-and-forth, so both
 * halves are optional and either may be missing without the other degrading:
 * "a miss degrades to a single balloon or no balloon, never to a wrong
 * exchange" (§Consequences). A bare `string` is the DM-only form the beat table
 * had before this slice, kept because most beats are the idol commenting and
 * writing `{ dm: … }` around every one of them would be noise.
 */
export interface BeatExchange {
  /** The DM's line — the idol reacting to the beat the Hero just caused. */
  dm?: string;
  /**
   * The Hero's answer. Since M6.1d it fires on any turn the beat does, including
   * one where he also has a resolved action to report — the exclusion ADR 0006
   * §4 rule 2 wrote is retired by ADR 0009 §6, and only the ordering survives.
   */
  hero?: string;
}

/**
 * What one beat is worth, once or over a run — ADR 0006 §4, Slices 2 and 4.
 *
 * A bare `string` is the DM-only form; a {@link BeatExchange} is the pair. An
 * **array** is the Slice 4 addition: the beat's lines in the order they are
 * spoken, the *n*th firing taking the *n*th entry and every firing past the end
 * repeating the last. That last entry is therefore the beat's settled line — the
 * one a DM who has run this module too many times is left with — and the ones
 * before it are the reactions he has not worn out yet.
 */
export type BeatEntry =
  | string | BeatExchange | readonly (string | BeatExchange)[] | BeatCycle;

/**
 * A run with a **looping tail** — M6.1e, and an amendment to ADR 0006 §4 rule 4.
 *
 * Rule 4 said the last line of a run repeats and nothing cycles, on the reasoning
 * that a beat looping back to its opening reaction would be a DM surprised by a
 * room he has seen four times. That reasoning holds for a beat that fires four
 * times. It does not survive M6.1d's measurement: `parser-miss` fires **160 times
 * in the corpus and 139 in a single playthrough**, so "the last line repeats" is
 * one line said a hundred and fifty times, which is the stuck record the run was
 * invented to prevent.
 *
 * So: `run` is walked once — the arc, where the pair are still discovering the
 * beat — and `loop` cycles from then on. The distinction is what keeps rule 4's
 * intent: **nothing loops back to an opening reaction**, because the opening
 * reactions are in `run` and `run` is never re-entered. What cycles is only the
 * settled register, where the pair have already agreed what this beat is and are
 * just finding different ways to say so.
 *
 * A `loop` of one is exactly the old behaviour, written explicitly.
 */
export interface BeatCycle {
  /** Walked once, in order: the beat before it is worn in. */
  run: readonly (string | BeatExchange)[];
  /** Cycled for every firing after that, in order, forever. */
  loop: readonly (string | BeatExchange)[];
  /**
   * Turns this beat waits between firings, overriding
   * {@link MapperOptions.guideCooldown} — M6.1e.
   *
   * **How often a beat is worth hearing is a property of the beat**, not of the
   * table. Most are rare enough that the answer is 0 (speak every time). The two
   * refusal families are not: they are 45% of all turns between them, and a pair
   * who comment on every single one talk over the game rather than about it. The
   * measurement is blunt about it — scripting them at 0 puts the corpus at one
   * exchange every 1.6 turns, past the *bottom* of D5's band.
   */
  cooldown?: number;
}

/** Affect marker → the exchange (or the run of them) that beat earns. */
export type BeatScript = ReadonlyMap<string, BeatEntry>;

export interface MapperOptions {
  guideScript?: GuideScript;
  /**
   * Turns that must pass between two firings of **the same beat** (ADR 0009 §5,
   * M6.1d). It gates table-talk only: read-aloud is the turn's own narration and
   * is uncooled (ADR 0009 §2), and the room gazetteer is self-limiting — a first
   * visit happens once.
   *
   * It was a single budget across every authored line until M6.1d, and that is
   * what made the two limiters this stage lifts: a beat swallowed the room line
   * of the arrival three turns later (gazetteer contention), and a marker that
   * fires in clusters — a run of parser refusals is the common one — spoke once
   * and then stayed quiet through the funniest part of the game. What can
   * actually wear out is *one beat repeating*, so that is what the counter is
   * per.
   *
   * **The clock it counts is `turn.status.moves`, which does not advance on a
   * refusal** (ZIL does not charge the player for a parse the parser rejected).
   * So a run of refusals is several turns at the same number, and any non-zero
   * cooldown reads them as one. It does not bite at the shipped value (0), and
   * anything that raises it again has to answer this first.
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
   * Room id → display name, for the location box (ADR 0009 §3). Same shape and
   * same source as {@link names}, resolved by the caller from the world document,
   * because the mapper must not import it — data in, pure function out. Empty is
   * safe: a missed id falls back to the id.
   */
  roomTitles?: ReadonlyMap<string, string>;
  /**
   * Affect marker → the beat's exchange (ADR 0005 §4, ADR 0006 §4). This is what
   * makes the two *converse*: the pair is keyed on the beat the Hero just caused
   * (the §10 marker the turn produced — `combat-victory`, `grue-threat`,
   * `scored`, …) instead of on entering a scripted room. Consulted before the
   * room gazetteer and under the same cooldown, so the exchange stays
   * presentation-only and does not wear out. Empty keeps the old room-only
   * behaviour.
   *
   * A beat may carry a **run** of lines rather than one (Slice 4) — see
   * {@link BeatEntry}.
   */
  beatScript?: BeatScript;
  /**
   * The Hero's resolved-action rotation ({@link ACTION_SCRIPT}, ADR 0005 §1).
   * Defaults to the shipped table; tests supply their own, exactly as they do for
   * the other two. Unlike those, an omitted table is *not* silence — this line is
   * derived from events and always sayable, so the default is the content.
   */
  actionScript?: ActionScript;
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
  const guideScript = options.guideScript ?? new Map<string, string | BeatExchange>();
  const guideCooldown = options.guideCooldown ?? 6;
  const names = options.names ?? new Map<string, string>();
  const roomTitles = options.roomTitles ?? new Map<string, string>();
  const beatScript = options.beatScript ?? new Map<string, string>();
  const actionScript = options.actionScript ?? ACTION_SCRIPT;

  const visited = new Set<string>();
  const inventory = new Set<string>();
  /**
   * The whole of the conversational memory (ADR 0006 §4, Slice 4): marker → how
   * many times that beat has actually been **spoken** so far. It is a fold over
   * the turns already read, exactly like `visited` and `lastGuideTurn` beside it,
   * so it is a pure function of the event stream and `replayPanels` still holds.
   */
  const spokenBeats = new Map<string, number>();
  /**
   * Marker → the turn that beat last **spoke** on, which is what the cooldown is
   * measured against since M6.1d. Same fold, same guarantee as `spokenBeats`
   * beside it; a beat absent here has never been said and is free to fire.
   */
  const lastBeatTurn = new Map<string, number>();
  /**
   * Turns this mapper has read — the clock the cooldown is measured on since
   * M6.1e, and a fold like everything else here.
   *
   * It replaced `turn.status.moves`, which is the engine's move counter and
   * **does not advance on a refusal**: ZIL does not charge the player for a parse
   * it rejected, so a run of refusals is several turns wearing one number. That
   * made a cooldown on the largest beats in the game meaningless — exactly the
   * beats M6.1e needs to cool. See `docs/PITFALLS.md` → Web.
   */
  let turnsRead = 0;
  /**
   * How many take lines and drop lines the Hero has actually **said** — the run
   * cursor for {@link ACTION_SCRIPT}, kept per kind so a long collecting run does
   * not walk the drop rotation it never reaches. A fold like everything above it,
   * and it advances only when the line is emitted, so a silent turn does not skip
   * a line the reader never heard (rule 4's shape, and `spokenBeats`'s).
   */
  let tookSaid = 0;
  let droppedSaid = 0;
  let room = "";

  return {
    read(turn: Turn): TurnScript {
      turnsRead += 1;
      const text = panelText(turn.events);
      /** The same turn without the room name — the DM's read-aloud source. */
      const prose = proseText(turn.events);
      const titleText = roomTitleText(turn.events);
      /** Where the turn started, so "the room changed" is answerable (ADR 0009 §3). */
      const roomAtEntry = room;
      // Read off the channel, not out of the prose (ADR 0002's actual purpose).
      const systemChannel = turn.events.some(
        (event) => event.type === "narration" && event.channel === "system",
      );
      let firstVisit = false;
      let moved = false;
      let scoreDelta = 0;
      let gameOver = false;
      /**
       * A death specifically, as opposed to a victory or a quit — ZIL narrates
       * the killing blow and *then* resurrects, both in one turn, so `room` has
       * already moved on by the time the panel is built. See {@link panelRoom}.
       */
      let died = false;
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
            if (event.outcome === "death") died = true;
            break;
          default:
            break;
        }
      }

      const affect = affectFor({ text, gameOver, scoreDelta, systemChannel });
      /**
       * **Where this panel is set** — not always where the turn left the player
       * (M6.1g; found by reading the playthrough at M6.1f).
       *
       * A death is one turn that happens in two rooms: ZIL narrates the killing
       * blow, then `JIGS-UP` resurrects into the forest, so the turn ends with
       * `room` already the *next* room. The reaction shot ADR 0005 §4 asks for
       * depicts the first of those, and it was getting the second — the troll's
       * killing blow captioned *Forest*, drawn against the forest backdrop.
       * `room` itself must still move: the fold's memory is what makes the
       * following turns answerable. Only the panel is pinned back.
       */
      const panelRoom = died ? roomAtEntry : room;
      /** ADR 0009 §3: the turn moved the player somewhere else. */
      const roomChanged = room !== roomAtEntry && room !== "";
      // The resolved action and the authored reply are now independent (ADR 0009
      // §6): the action no longer suppresses the answer, it only precedes it.
      const action = heroBalloon(
        took, dropped, names, actionScript, took !== null ? tookSaid : droppedSaid,
      );
      if (action !== null) {
        if (took !== null) tookSaid += 1;
        else droppedSaid += 1;
      }
      const exchange = exchangeFor(firstVisit, room, affect.marker);
      const guideLine = exchange.dm;
      const camera = cameraFor({ gameOver, moved, firstVisit, salientMove, guide: guideLine });

      // The turn's utterances in draw order (ADR 0008 §2, amended by ADR 0009 §2):
      // the DM reads the narration aloud, then says his authored piece, then the
      // Hero answers. Each is one `AddLine` (`panel.cpp:1058`) — whether they land
      // in one panel or four is `page.ts`'s decision, not this module's.
      const readAloudLines = isRefusal(affect.marker)
        ? []
        : readAloud(prose, affect.matched, moved);
      // What the Hero did, then what he says back — ADR 0009 §6 retired the
      // exclusion and kept the ordering: the action is derived from events and
      // cannot be wrong, the reply is authored garnish, and garnish goes second.
      // Whether the pair shares a panel is `page.ts`'s decision, not a
      // suppression rule written upstream of the fit test.
      const heroLines: Utterance[] = [];
      if (action !== null) heroLines.push(action);
      if (exchange.hero !== null) heroLines.push({ modes: BM_SAY, text: exchange.hero });
      const lines: PageLine[] = [];
      // **A new location starts a panel.** Until 6.1c the caption did this on
      // every turn as a side effect of `BM_ACTION` (`panel.cpp:1064`); with the
      // caption gone, a room change would clone-append into the panel the last
      // room was drawn in, and `clonePanel` would relabel that panel with the new
      // room — one panel, two places, and the location box on top of it. `<Brk>`
      // (`:1067`) is the port's own way to say "not in that one".
      if (roomChanged) lines.push({ speaker: GUIDE, modes: BM_SAY, text: BRK, emotion: [] });

      // The DM's balloons for this turn: what he reads aloud, then what he says
      // (ADR 0009 §2's two registers, in that order — the module first, the table
      // second). Two of his balloons never share a panel (`AvatarInPanel`,
      // `panel.cpp:1088`), so this list is also, exactly, the turn's panel run.
      const dmLines: PageLine[] = readAloudLines.map((said) => ({
        speaker: GUIDE, modes: BM_SAY, text: said, emotion: GUIDE_EMOTION,
        register: "narration" as const,
      }));
      if (guideLine !== null) {
        dmLines.push({
          speaker: GUIDE, modes: BM_SAY, text: guideLine, emotion: GUIDE_EMOTION,
          register: "authored",
        });
      }

      for (const [i, line] of dmLines.entries()) {
        lines.push(line);
        // ADR 0009 §4: the DM keeps the floor for the whole run and the Hero is
        // *staged silent* through it — `<Chr>` is `AddLine`'s own way of saying
        // that (`panel.cpp:1073` → `AddReaction`). Without it he is simply absent
        // from every panel of the run but the last, which reads as the comic
        // cutting away from its own subject. The last balloon is left alone: his
        // line (or the closing reaction below) lands there, which is what makes an
        // arrival *end* on the two-shot.
        if (i < dmLines.length - 1) {
          lines.push({
            speaker: HERO, modes: BM_SAY, text: CHR, emotion: affect.options,
            register: "narration",
          });
        }
      }
      for (const [i, line] of heroLines.entries()) {
        lines.push({
          ...line, speaker: HERO, emotion: affect.options,
          // The resolved action is derived from events; the reply came from
          // `BEAT_SCRIPT`. The action, when there is one, is always first.
          register: i === 0 && action !== null ? "narration" : "authored",
        });
        // The mirror of the staging above, and it exists for the same reason.
        // Two Hero balloons never share a panel either (`AvatarInPanel`), so an
        // action *and* a reply (ADR 0009 §6) can open a second panel — and the DM
        // would be absent from it, the two-shot lost on exactly the turns this
        // slice added it to. `<Chr>` after the line, not before: it has to land in
        // whichever panel the line went to, and only that line knows.
        if (i > 0 && dmLines.length > 0) {
          lines.push({
            speaker: GUIDE, modes: BM_SAY, text: CHR, emotion: GUIDE_EMOTION,
            register: "narration",
          });
        }
      }

      // ADR 0005 §4's reaction shot has to *survive*, and since 6.1c nothing else
      // protects it: with no `BM_ACTION` caption breaking the panel, the next
      // turn's first balloon clone-appends into the death panel and `clonePanel`
      // takes the *incoming* context — so the death frame silently became
      // whatever happened next, and the `reaction` rung vanished from the corpus
      // entirely (11 turns, 0 panels). `<Brk>` (`panel.cpp:1067`) is the port's
      // own answer: force a new panel, add nothing. It has to be the last thing
      // the turn does, which is why the staging goes through `<Chr>` here rather
      // than through `reactions` — those are applied after every line.
      if (gameOver) {
        if (heroLines.length === 0) {
          lines.push({
            speaker: HERO, modes: BM_SAY, text: CHR, emotion: affect.options,
            register: "narration",
          });
        }
        lines.push({ speaker: HERO, modes: BM_SAY, text: BRK, emotion: [] });
      }

      const reactions = heroLines.length === 0 && !gameOver
        ? [{ speaker: HERO, emotion: affect.options }]
        : [];

      return {
        lines,
        reactions,
        context: {
          turn: turn.status.moves,
          camera,
          emphatic: camera === "establishing" && scoreDelta > 0,
          room: panelRoom,
          // ADR 0009 §3 / D4: the box names the room, and only on the turn the
          // room changes. `roomAtEntry` is the fold's own memory — no engine
          // state, so `replayPanels` still holds.
          //
          // A death is the exception in both halves. It always shows a box, even
          // when the killing blow fell in the room the turn started in: the
          // reader is about to be moved somewhere else, and the frame has to say
          // where this happened. And the title can't come from `titleText` —
          // that is the engine printing the *resurrection* room's name.
          roomTitle: died
            ? (roomTitles.get(panelRoom) || panelRoom)
            : roomChanged ? (titleText || roomTitles.get(room) || room) : null,
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

  /**
   * The turn's authored exchange — ADR 0006 §4, Slice 2.
   *
   * Three rules carry this, and each is a decision. **M6.1d rewrote two of them**
   * (ADR 0009 §5/§6 — D1 governs: where a limiter and the conversation conflict,
   * the limiter goes):
   *
   * 1. **The cooldown is per beat, and the whole exchange shares it.** The pair is
   *    a single authored event, not two channels: gating the halves separately
   *    would let the Hero answer a line the DM was too tired to say. What it no
   *    longer is, is one budget across every authored line — see
   *    {@link MapperOptions.guideCooldown}. It is still consumed only when
   *    something is actually said, so a suppressed half never burns a turn's
   *    worth of silence.
   * 2. ~~The resolved action outranks the Hero's reply.~~ **Retired at M6.1d**
   *    (ADR 0009 §6). It was there to keep two Hero balloons out of one panel,
   *    which panelization would then split — but the caption was what made a split
   *    likely, and the caption is gone. He may report *and* answer; `page.ts`
   *    decides whether that is one panel or two, and the ordering (action first,
   *    it cannot be wrong; reply second, it is garnish) is applied by the caller.
   * 3. **The gazetteer stays DM-only** — a room line is the idol narrating a
   *    place, not a beat the Hero caused, so there is nothing for him to answer —
   *    **but it is no longer cooled.** A first visit happens exactly once per
   *    room, so the room path limits itself; the shared budget only ever meant an
   *    unrelated beat three turns earlier could delete a room's one line forever.
   *
   * Slice 4 adds a fourth, and it is the one the testing contract watches:
   *
   * 4. **A beat may remember how often it has fired**, and only that. The
   *    counter is over *spoken* firings, not over marker occurrences: a beat the
   *    cooldown swallowed was never on the page, so advancing past its line would
   *    retire a reply the reader never read. It advances at the same moment
   *    `lastBeatTurn` does — after the decision to speak — which is what keeps
   *    the two from disagreeing about what happened. Past the end of the run the
   *    last line repeats; nothing cycles, because a beat that looped back to its
   *    opening reaction would be a DM surprised by a room he has seen four times.
   */
  function exchangeFor(
    firstVisit: boolean, roomId: string, marker: string | null,
  ): { dm: string | null; hero: string | null } {
    const silent = { dm: null, hero: null };

    // Beat reaction first (ADR 0005 §4): the pair answers what the Hero just did.
    // This is the whole of "they talk to each other" — the lines are chosen by the
    // marker the Hero's action produced, so the DM is replying, not narrating a
    // room on a timer.
    const entry = marker !== null ? beatScript.get(marker) : undefined;
    // The beat's own cooldown outranks the table's (M6.1e): how often this beat is
    // worth hearing is written beside its lines, because that is where the author
    // can see how many there are.
    const wait = entry !== undefined && typeof entry === "object" && "cooldown" in entry
      ? entry.cooldown ?? guideCooldown
      : guideCooldown;
    const cooled = marker !== null
      && turnsRead - (lastBeatTurn.get(marker) ?? -Infinity) <= wait;
    if (entry !== undefined && marker !== null && !cooled) {
      const exchange = variantOf(entry, spokenBeats.get(marker) ?? 0);
      const dm = exchange.dm ?? null;
      const hero = exchange.hero ?? null;
      if (dm !== null || hero !== null) {
        lastBeatTurn.set(marker, turnsRead);
        // Rule 4: the beat is one line older only now that it has been said.
        spokenBeats.set(marker, (spokenBeats.get(marker) ?? 0) + 1);
        return { dm, hero };
      }
      // An empty run says nothing; fall through rather than swallow the room line
      // that would otherwise fire.
    }

    // Then the room gazetteer, on first entry. Rule 3: uncooled since M6.1d, and
    // reached even on a turn the beat above was cooled out — the two tables no
    // longer contend for one budget. Since M6.1e the room may answer back: an
    // entry is either the DM's line alone or the pair, and the pair needs no
    // cooldown because a first visit does not come round again.
    if (firstVisit) {
      const roomLine = guideScript.get(roomId);
      if (typeof roomLine === "string") return { dm: roomLine, hero: null };
      if (roomLine !== undefined) return { dm: roomLine.dm ?? null, hero: roomLine.hero ?? null };
    }
    return silent;
  }
}

/**
 * The line a beat is on after it has been spoken `said` times — ADR 0006 §4,
 * Slice 4, as M6.1e amends it.
 *
 * An empty run is legal and says nothing, so an author can silence a beat by
 * emptying its array without deleting the key. Past the end of a plain array the
 * last entry repeats (rule 4 as written); a {@link BeatCycle} instead walks its
 * `run` once and then cycles its `loop`, which is what a beat firing 160 times
 * needs. Both are pure functions of `said`, so the oracle is unaffected either
 * way.
 */
function variantOf(entry: BeatEntry, said: number): BeatExchange {
  if (typeof entry === "string") return { dm: entry };
  if (Array.isArray(entry)) return pick(entry as readonly (string | BeatExchange)[], said);
  if (isCycle(entry)) {
    if (said < entry.run.length) return pick(entry.run, said);
    if (entry.loop.length === 0) return pick(entry.run, entry.run.length - 1);
    return pick(entry.loop, (said - entry.run.length) % entry.loop.length);
  }
  return entry as BeatExchange;
}

/** A {@link BeatCycle} rather than a bare {@link BeatExchange}. */
function isCycle(entry: object): entry is BeatCycle {
  return "run" in entry && "loop" in entry;
}

/** The `at`th line of a list, clamped to its end — an empty list says nothing. */
function pick(lines: readonly (string | BeatExchange)[], at: number): BeatExchange {
  const chosen = lines[Math.min(at, lines.length - 1)];
  if (chosen === undefined) return {};
  return typeof chosen === "string" ? { dm: chosen } : chosen;
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
  // Both refusal families (M6.1e): the parser's "no" and the map's are the same
  // beat — nothing happened, and the Hero has an opinion about it.
  if (isRefusal(input.marker)) return "refusal";
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
 * **The lines are a rotation in `script.ts`, not a template here** (M6.1e session
 * 4). One string on a trigger that fires 59 times a playthrough is a tic — see
 * {@link ACTION_SCRIPT}. `said` is which line of the rotation this is; the cursor
 * that counts it lives in the mapper's fold, like every other run cursor.
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
  script: ActionScript = ACTION_SCRIPT, said = 0,
): Utterance | null {
  const id = took ?? dropped;
  if (id === null) return null;
  const lines = took !== null ? script.take : script.drop;
  if (lines.length === 0) return null; // an emptied list silences the channel
  const name = names.get(id) ?? id;
  const text = lines[said % lines.length]!.replace("{name}", name);
  return { modes: BM_SAY, text };
}

/**
 * The **read-aloud register** — ADR 0009 §2, and the slice that retired the box.
 *
 * ADR 0006 §2 settled that the caption *is* the DM reading the module aloud; it
 * left the text in a `BM_ACTION` box because the box was there. The box was also
 * the pane's largest structural problem: `AddLine` opens a new panel on
 * `BM_ACTION` unconditionally (`panel.cpp:1064`), and 96.7% of turns carried one,
 * so panelization was told to break the panel on nearly every turn and the DM and
 * the Hero could not share one. **The text moves into the DM's speech balloon**
 * and the box becomes metadata ({@link PanelContext.roomTitle}).
 *
 * Two selections, because a turn's narration is two different things:
 *
 * - **The player moved: he reads the room.** The whole narration, packed into
 *   balloons — an arrival's description runs to 588 characters where the box only
 *   ever showed its opening clause (p50 24). This is what D2/D3 mean by "the DM
 *   speaks the room description", and it is new text on the panel, not a re-route.
 * - **Otherwise: the sentence the panel is about** — the one the §10 marker
 *   matched, else the turn's first, which is the pre-0009 rule unchanged. A
 *   parser refusal is skipped here: it is the Hero's register now (D2), and until
 *   6.1d scripts it the turn simply stays quiet rather than putting the parser's
 *   "no" in the DM's mouth.
 *
 * **Packing never splits a sentence** ({@link READ_ALOUD_MAX}, D3's raised limit).
 * A sentence longer than the limit is emitted whole rather than dropped: the old
 * "drop it, never trim it" rule existed because a box could not continue, and a
 * run of balloons can. Nothing is silently lost any more — which cost exactly
 * nine turns in 606, all of them the same 188-character sentence.
 *
 * Each balloon is one `AddLine`, so **how many panels a description becomes is
 * `page.ts`'s decision**, not this module's: two consecutive DM balloons fail
 * `AvatarInPanel` (`:1088`) and open a panel, which is the port doing exactly what
 * the port is for. Measured over the corpus: 44 of 81 arrivals fit one balloon, 12
 * need two, 25 need three or four.
 */
export const READ_ALOUD_MAX = 200;

export function readAloud(text: string, matched: string | null, moved: boolean): string[] {
  const parts = moved ? sentences(text) : [matched ?? sentences(text)[0] ?? ""].filter(Boolean);
  const out: string[] = [];
  for (const sentence of parts) {
    const last = out[out.length - 1];
    if (last !== undefined && last.length + 1 + sentence.length <= READ_ALOUD_MAX) {
      out[out.length - 1] = `${last} ${sentence}`;
    } else {
      out.push(sentence);
    }
  }
  return out;
}

/**
 * The turn's `room-title` narration, or `""` — the engine emits the room's name
 * on its own channel (v1.5.1), which is where the location box gets its text
 * (ADR 0009 §3) and why the read-aloud must not repeat it.
 */
function roomTitleText(events: readonly EngineEvent[]): string {
  for (const event of events) {
    if (event.type === "narration" && event.channel === "room-title") return event.text.trim();
  }
  return "";
}

/**
 * What the DM reads aloud: the turn's prose, with the room name left out.
 *
 * The name is on the panel already — it is the box (ADR 0009 §3) — and reading
 * it back would be both a repeat and a non-sentence, because the channels
 * concatenate without punctuation ("North of House You are facing…").
 */
function proseText(events: readonly EngineEvent[]): string {
  let out = "";
  for (const event of events) {
    if (event.type === "narration") {
      if (event.channel !== "room-title") out += event.text;
    } else if (event.type === "question" || event.type === "game-over"
      || event.type === "speech") {
      out += event.text;
    }
  }
  return out;
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
