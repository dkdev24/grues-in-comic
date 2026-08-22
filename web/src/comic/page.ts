/**
 * Panelization (ADR 0008 Phase 2) — the port of `CUnitPanelPage`.
 *
 * This is the mechanical half of "one utterance at a time": the mapper decides
 * *what* is said and by whom (semantic, ours), and this module decides *which
 * panel it lands in* (mechanical, Comic Chat's). Ported line-by-line against
 * `original-projects/comic-chat/v2.5-beta-1-modern/panel.cpp` per the ADR 0007
 * standing rule — read the C++ first, cite it.
 *
 * The rule set is small and entirely `AddLine` (`panel.cpp:1058`):
 *
 * - a caption (`BM_ACTION` alone) always starts a new panel (`:1064`);
 * - otherwise the line **clone-appends** into the previous panel, unless that
 *   panel already holds 5 balloons, unless the page holds fewer than 2 panels,
 *   unless the speaker is already on stage there (`:1079`);
 * - a balloon that will not fit discards the candidate, starts a fresh panel and
 *   retries; the part that did fit keeps its panel and the remainder recurses
 *   (`:1110-1135`).
 *
 * Clone-append means the previous panel is **replaced**, not mutated: the page
 * removes the old tail and appends the grown copy (`RemoveLastPanel:993` /
 * `AddPanel:1029`). {@link PanelDelta} reports that so a view can repaint its
 * last panel instead of appending a duplicate — our stand-in for the original's
 * `RefreshLastPanel`.
 *
 * The page stays a pure function of the line stream (ADR 0006 invariant 3): no
 * DOM, no engine internals, no clock. `replayPanels` still applies.
 */

import type { EmotionOption } from "../../../art/src/pose.js";
import type {
  BalloonClass, Body, CameraPreset, Line, Panel, PanelKind, TurnScript,
} from "./mapper.js";

/**
 * Balloon mode bits, verbatim from `defines.h:63-66`. Kept as a bitmask rather
 * than a friendlier union because the panelization rule tests the *whole* mask —
 * `uModes == BM_ACTION` (`panel.cpp:1064`) forces a new panel, but the combined
 * `BM_ACTION|BM_SAY` does not, and it draws a box either way (`MakeBalloon:1046`).
 */
export const BM_SAY = 0x0001;
export const BM_WHISPER = 0x0002;
export const BM_THINK = 0x0004;
export const BM_ACTION = 0x0008;

/** A `uModes` bitmask (`BM_*`). */
export type BalloonModes = number;

/** `panel.cpp:1067` — the debugging break sentinel: force a new panel, add nothing. */
export const BRK = "<Brk>";
/** `panel.cpp:1073` — the reaction sentinel: stage the body, say nothing. */
export const CHR = "<Chr>";

/**
 * One utterance handed to {@link Page.addLine} — the port of `AddLine`'s
 * `(uID, szWords, uModes)` triple. `emotion` rides along because our bodies carry
 * their pose set per line (ADR 0004 §10) where Comic Chat kept a mutable current
 * body per avatar; see the note on `ResetAvatar` in {@link Page}.
 */
export interface PageLine {
  /** Cast/avatar id (`uID`). */
  speaker: string;
  /** `szWords`. {@link BRK} and {@link CHR} are sentinels, not text. */
  text: string;
  /** `uModes`. */
  modes: BalloonModes;
  /** Priority-descending pose set for this speaker's body this panel. */
  emotion: readonly EmotionOption[];
  /**
   * This line stages no body — our one divergence from `AddLine`, where every
   * balloon belongs to somebody who typed it. The caption channel (ADR 0006 §2)
   * is narration with no speaker on stage. Kept as a flag on the line rather than
   * a cast id the page has to recognise, so panelization stays cast-agnostic.
   */
  bodiless?: boolean;
  /**
   * ADR 0010 §2: this line answers the frame it may clone-append into across a
   * turn boundary. `isOrphaned` (below) still forces the *next* line after a
   * fragment to open fresh — the M6.1g mis-pairing guard — but a line that
   * carries this fact is let through. The fact rides on the line, not on a cast
   * id, so `page.ts` stays cast-agnostic (only the mapper knows that today it is
   * always the Hero's declaration).
   */
  answers?: boolean;
  /**
   * Overrides {@link PanelContext.room} (and blanks `roomTitle`) for this line
   * alone, when it differs from the script's own `context.room`. Exists for
   * ADR 0010 §1/§2's declaration: it is drawn (or clone-appended) speaking in
   * the room the Hero is *leaving*, not the one `context` otherwise depicts —
   * that room has not been entered yet at the moment he says the words. Every
   * other line in a script shares the one `context.room`; this is the single
   * exception, carried per-line for the same cast-agnostic reason as
   * {@link answers}.
   */
  room?: string;
  /**
   * Overrides {@link PanelContext.dark} for this line alone — the light half of
   * the same exception {@link room} is the place half of.
   *
   * The turn's `dark` is the light at the *end* of the turn, which is the right
   * answer for every line the turn narrates and the wrong one for the
   * declaration: he says "down looks right" standing in the lit room he is
   * about to leave, and the panel that opens for those words would otherwise be
   * black a frame early (and, going the other way, lit a frame early on the way
   * out of the dark). Set only on a turn that changed the light — `undefined`
   * elsewhere, so the shared context is reused unchanged.
   */
  dark?: boolean;
  /**
   * Overrides {@link PanelContext.marker} for this line alone — the *affect*
   * half of the same exception {@link room} and {@link dark} are the place and
   * light halves of (v0.27.6, the win screen).
   *
   * The turn's marker describes what the turn turned out to be, and the
   * declaration is said before the turn resolves. It only matters where the
   * marker is also load-bearing for the picture: the barrow win draws the
   * *interior* backdrop off `victory` (`backdrop.ts`), and the Hero's "Let's
   * head west." is spoken at the door, outside it. `null` says "this frame has
   * no marker", which is why the type admits it and `undefined` means "no
   * override" as everywhere else here.
   */
  marker?: string | null;
  /**
   * Overrides {@link PanelContext.camera} for this line alone — the *framing*
   * half of the exception {@link room}, {@link dark} and {@link marker} are the
   * place, light and affect halves of (F18, v0.28.4).
   *
   * The ladder (ADR 0004 §7) picks one rung per *turn*, which is right while a
   * turn's panels all depict the same moment. An ending is the case where they
   * do not: the victory turn narrates five sentences of barrow and *then* holds
   * on the Hero's face, and those want `establishing` and `reaction`
   * respectively. Before this the whole turn wore rung 1, so the payoff was five
   * talking heads in a washed-out room. Carried per-line for the same
   * cast-agnostic reason as the other three.
   */
  camera?: CameraPreset;
  /**
   * Where the words came from — ADR 0009 §2's two registers, as a fact on the
   * line instead of a thing the reader has to infer from the text.
   *
   * `"narration"` is derived from the event stream and is verbatim (the DM
   * reading the module aloud, the Hero's resolved action). `"authored"` came out
   * of a script table. They have different economics — the cooldown governs the
   * authored voice only, and the M6.1e corpus is the authored one — so anything
   * counting or gating one of them needs to be able to name it. `page.ts` itself
   * never reads this: it is carried, not used, exactly like `emotion`.
   */
  register?: Register;
}

/** See {@link PageLine.register}. */
export type Register = "narration" | "authored";

/**
 * The panel-level facts that are *ours*, not Comic Chat's: the camera rung, the
 * room, the Director's beat tag. A `CPanel` carries none of this — it is a frame
 * of a chat log — so the port has to say what happens to it when two turns'
 * lines merge into one panel.
 *
 * **Decision: the newest line wins.** A clone-appended panel depicts the moment
 * of its last utterance — that is the frame the reader is looking at — so camera,
 * room, focus, marker, kind and turn all take the incoming line's context. The
 * alternative (freeze at the panel's first line) would leave a panel framed for a
 * beat that its own newest balloon has already moved past.
 */
export interface PanelContext {
  turn: number;
  camera: CameraPreset;
  emphatic: boolean;
  room: string;
  focus: string | null;
  marker: string | null;
  kind: PanelKind;
  /**
   * The location title this panel shows, or `null` — ADR 0009 §3.
   *
   * **Panel metadata, not a line.** It is drawn by the renderer from the panel,
   * never entering the balloon list, which is the whole point: a `BM_ACTION`
   * caption unconditionally opens a panel (`:1064`) and the box was doing that on
   * 96.7% of turns. Set only on the turn the room changes (D4) — the status bar
   * carries the persistent answer.
   */
  roomTitle: string | null;
  /**
   * The panel is set in an unlit room: the Hero cannot see, and neither can the
   * reader. The renderer paints the frame black instead of drawing the room's
   * backdrop and figures.
   *
   * Panel-level like {@link roomTitle}, and it takes the newest line's context
   * like everything else here — striking a match mid-panel lights the frame the
   * reader is looking at, which is the moment the panel depicts.
   */
  dark: boolean;
}

/**
 * Whether a candidate panel's balloons can be laid out, and what did not fit —
 * the seam for `CUnitPanel::LayoutBalloons` (`panel.cpp:855`) and its overflow
 * split `ForceFitBalloon:877`/`SplitHeight` (`balloon.cpp:777,1533`).
 *
 * Phase 2b ports the real driver behind this signature. Until then {@link ALWAYS_FITS}
 * stands in, which is exactly the behaviour of the code this replaces (our
 * balloon stack has never refused a panel), so wiring the port in changes no
 * pixels on its own.
 */
export interface FitResult {
  fits: boolean;
  /** The remainder to re-add as a fresh line, when the balloon was split. */
  leftover?: string | null;
  /**
   * The part that stayed, when the balloon was split. `ForceFitBalloon` splits
   * *in place* — `SplitHeight` frees the balloon's string and replaces it with
   * the truncated one (`balloon.cpp:826`) before `AddLine` re-adds the rest
   * (`panel.cpp:1130`) — so the panel that keeps the line must keep the
   * shortened text, or the leftover panel would repeat it.
   */
  kept?: string | null;
}

export type FitTest = (panel: Panel) => FitResult;

/** The Phase 2b stand-in: every panel lays out. */
export const ALWAYS_FITS: FitTest = () => ({ fits: true });

/**
 * What one {@link Page.addLine} did to the panel list, so an incremental view can
 * follow along without diffing. `replacedLast` is the clone-append case: drop the
 * last panel you drew, then draw `appended` in order.
 */
export interface PanelDelta {
  replacedLast: boolean;
  appended: readonly Panel[];
}

export interface PageOptions {
  fit?: FitTest;
}

export interface Page {
  /**
   * Port of `CUnitPanelPage::AddLine` (`panel.cpp:1058`).
   *
   * `ResetAvatar(uID)` (`:1127`) has no counterpart: it returned Comic Chat's
   * per-avatar mutable body to neutral for the *next* line, and our bodies take
   * their pose from {@link PageLine.emotion} every time, so there is no state to
   * reset.
   */
  addLine(line: PageLine, context: PanelContext): PanelDelta;
  /**
   * Port of `CUnitPanelPage::AddReaction` (`panel.cpp:1142`) — stage a body with
   * no balloon. This is the silent turn: the Hero poses to what just happened and
   * says nothing.
   */
  addReaction(speaker: string, emotion: readonly EmotionOption[], context: PanelContext): PanelDelta;
  /** `CPage::StartNewPanel` (`panel.h:91`): the next line opens a fresh panel. */
  startNewPanel(): void;
  /**
   * ADR 0010 §2 / M6.1i: this turn ended on a fragment ({@link isOrphaned}).
   * Unlike {@link startNewPanel}, this does not force the next line fresh — it
   * only forces it fresh if that line is not marked {@link PageLine.answers}.
   * Consumed by the very next `addLine`/`addReaction` call either way, same as
   * `startNewPanel`'s guard.
   */
  guardFragment(): void;
  readonly panels: readonly Panel[];
}

/**
 * Hand one turn's script to the page, line by line — `AddLine` for each utterance,
 * then `AddReaction` for each body that is on stage without one. The single place
 * a {@link TurnScript} becomes panels; the Director and the tools both go through it.
 */
export function addScript(page: Page, script: TurnScript): PanelDelta {
  const out: PanelDelta = { replacedLast: false, appended: [] };
  for (const line of script.lines) {
    // `PageLine.room`, `.dark`, `.marker` and `.camera` override the place, the
    // light, the affect and the framing for this one line — the declaration's
    // departure exception (the first three) and the ending's portrait (the last). `undefined` is the overwhelmingly common case for each, so
    // the shared context is reused as-is then.
    const context = line.room === undefined && line.dark === undefined
      && line.marker === undefined && line.camera === undefined
      ? script.context
      : {
        ...script.context,
        ...(line.room !== undefined ? { room: line.room, roomTitle: null } : {}),
        ...(line.dark !== undefined ? { dark: line.dark } : {}),
        ...(line.marker !== undefined ? { marker: line.marker } : {}),
        ...(line.camera !== undefined ? { camera: line.camera } : {}),
      };
    mergeDelta(out, page.addLine(line, context));
  }
  for (const body of script.reactions) {
    mergeDelta(out, page.addReaction(body.speaker, body.emotion, script.context));
  }
  // ADR 0010 §2 recast: a fragment no longer forces the next line to open
  // fresh unconditionally — it arms a guard that only an unmarked line trips.
  // `page.addLine` cannot know that at the moment this turn ends, because the
  // thing that would let it through (`PageLine.answers`) has not arrived yet.
  if (isOrphaned(out, script)) page.guardFragment();
  return out;
}

/**
 * Did this turn end on a **fragment** — a panel holding some of its speakers but
 * not all of them? (M6.1g; found by reading the playthrough at M6.1f. Recast for
 * ask-vs-answer at ADR 0010 §2 / M6.1i — see {@link Page.guardFragment}.)
 *
 * The case that matters is the split exchange. The DM asks in one panel, the
 * Hero's answer will not fit and opens a second, and that second panel now holds
 * one body — his. So when the *next* turn's DM line arrives, `AvatarInPanel`
 * says the DM is not there and clone-appends it in, and the reader sees the Hero
 * answering a question asked after he spoke. At M6.1f's read that was 144 of 300
 * split exchanges, and long refusal stretches became whole sequences of offset
 * pairs. The unsplit two-shot never had the bug: the DM is already in the panel,
 * so the test at `:1083` breaks it for us.
 *
 * Since ADR 0010 §1 the Hero also *answers* the DM across the turn boundary on
 * purpose — his declaration for turn N+1 is meant to clone-append into the DM's
 * still-open frame from turn N. So this function no longer decides whether the
 * next line is let in; it only decides whether a guard is armed. What passes
 * the guard is ask-vs-answer, decided per line in {@link addLine} because only
 * the incoming line knows whether it is one ({@link PageLine.answers}) — this
 * function is called before that line exists.
 *
 * The rule is cast-agnostic on purpose — `page.ts` knows nothing about the DM or
 * the Hero (ADR 0006 §2), and "the frame is missing someone who spoke this turn"
 * is the same statement without the cast. A turn that fits in one panel, and a
 * panel run whose last frame closes the exchange (ADR 0009 §4), both hold every
 * speaker and are left alone — the clone-append that collapses a traversal run
 * is untouched. `<Brk>`, `<Chr>` and bodiless captions are not utterances.
 */
function isOrphaned(delta: PanelDelta, script: TurnScript): boolean {
  const last = delta.appended[delta.appended.length - 1];
  if (last === undefined || delta.appended.length < 2) return false;
  const spoke = new Set<string>();
  for (const line of script.lines) {
    if (line.text === BRK || line.text === CHR || line.bodiless === true) continue;
    spoke.add(line.speaker);
  }
  if (spoke.size < 2) return false;
  return [...spoke].some((speaker) => !last.speakers.some((l) => l.speaker === speaker));
}

/**
 * Fold one delta into a running one. `replacedLast` only survives from the *first*
 * delta: once the batch has appended a panel of its own, a later clone-append
 * replaces a panel the caller has not drawn yet, so it is the batch's own tail that
 * changes, not the caller's.
 */
export function mergeDelta(into: PanelDelta, next: PanelDelta): void {
  const appended = into.appended as Panel[];
  if (next.replacedLast) {
    if (appended.length > 0) appended.pop();
    else into.replacedLast = true;
  }
  appended.push(...next.appended);
}

/** `MakeBalloon` (`panel.cpp:1036`) — the mode → balloon-class taxonomy. */
export function makeBalloonClass(modes: BalloonModes): BalloonClass {
  if (modes & BM_ACTION) return "CBWoodringBox"; // `:1046-1050`, incl. the combined masks
  switch (modes) {
    case BM_SAY:
      return "CBWoodringNormal";
    // `CBWoodringWhisper` (`:1043`) has no counterpart in `balloon.ts` — nothing
    // in this game whispers yet, so the register collapses to speech rather than
    // adding an undrawable class.
    case BM_WHISPER:
      return "CBWoodringNormal";
    case BM_THINK:
      return "CBWoodringThink";
    default:
      return "CBWoodringNormal"; // `:1053` "security only - should never happen!"
  }
}

export function createPage(options: PageOptions = {}): Page {
  const fit = options.fit ?? ALWAYS_FITS;
  const panels: Panel[] = [];
  // `CPage::CPage() { m_newPanel = TRUE; }` (`panel.h:78`).
  let newPanel = true;
  // ADR 0010 §2's guard — see `Page.guardFragment`. Armed by `addScript` when a
  // turn ends orphaned; consumed by the very next line, whichever kind it is.
  let fragmentGuard = false;

  return {
    panels,
    startNewPanel(): void {
      newPanel = true;
    },
    guardFragment(): void {
      fragmentGuard = true;
    },
    addLine(line: PageLine, context: PanelContext): PanelDelta {
      const delta: PanelDelta = { replacedLast: false, appended: [] };
      addLine(line, context, delta);
      return delta;
    },
    addReaction(speaker: string, emotion: readonly EmotionOption[], context: PanelContext): PanelDelta {
      const delta: PanelDelta = { replacedLast: false, appended: [] };
      addReaction(speaker, emotion, context, delta);
      return delta;
    },
  };

  function addLine(line: PageLine, context: PanelContext, delta: PanelDelta): void {
    // `:1064` — a caption box unconditionally starts a new panel. Exact mask, so
    // an action that is *also* speech rides with the panel it comments on.
    if (line.modes === BM_ACTION) newPanel = true;

    if (line.text === BRK) { // `:1067`
      newPanel = true;
      fragmentGuard = false; // already breaking outright; nothing left to gate
      return;
    }
    if (line.text === CHR) { // `:1073`
      addReaction(line.speaker, line.emotion, context, delta);
      return;
    }

    // `:1078-1090` — the clone-append test. Note the order: `m_newPanel` first, so
    // the tail is only read when a tail is guaranteed to exist.
    //
    // ADR 0010 §2: the fragment guard is consumed by this line, whatever it
    // decides — it only ever gates the *first* line to reach the page after a
    // turn ends orphaned. An unmarked line forces fresh, same as `startNewPanel`
    // always did; a line marked `answers` is let through to the ordinary rules
    // below, exactly as if the guard had never been armed.
    const guarded = fragmentGuard;
    fragmentGuard = false;
    const old = panels.length > 0 ? panels[panels.length - 1]! : null;
    const fresh =
      newPanel ||
      (guarded && line.answers !== true) ||
      old === null ||
      old.speakers.length >= 5 ||
      panels.length < 2 ||
      // A bodiless line is never "already in" a panel; it is also always
      // `BM_ACTION`, so the caption case has already broken the panel above.
      //
      // An *answering* line only needs the weaker `avatarSpokeInPanel` test —
      // but only when it is not *also* carrying a `room` override. A silent
      // traversal turn stages the Hero's reaction body into the DM's one panel
      // (`reactions`, below `addScript`'s per-line loop), which is exactly the
      // still-open frame ADR 0010 §2 wants the *next* turn's declaration to
      // land in — `AvatarInPanel`'s literal port (`:655`) does not distinguish
      // a posed body from a spoken one, so without this exemption it forced a
      // fresh panel purely because the Hero was already *standing* there,
      // splitting the two-shot the declaration exists to make. But `line.room`
      // exists precisely so a departure-room line reads correctly when it opens
      // a *fresh* panel (`addScript`'s comment above); clone-appending it into
      // an *older*, already-committed panel instead relabels that panel's room
      // to wherever *this* line's own turn happened to depart from, which has
      // nothing to do with the older panel's own room — found via the journey
      // line inheriting a collapsed run's last step's departure room and
      // mis-painting the run's arrival panel with it. A bodiless/room-less
      // answering line is unaffected; only that combination is excluded.
      (line.bodiless !== true &&
        (line.answers === true && line.room === undefined
          ? avatarSpokeInPanel(old, line.speaker)
          : avatarInPanel(old, line.speaker)));
    const candidate = fresh ? emptyPanel(context) : clonePanel(old!, context);
    if (fresh) newPanel = false;
    const replaceLast = !fresh;

    // `:1095-1103` — balloon, speaker, then substitute the freshly requested body.
    const balloon: Line = {
      speaker: line.speaker,
      balloonClass: makeBalloonClass(line.modes),
      text: line.text,
      // Carried, never read here — see `PageLine.register`.
      ...(line.register ? { register: line.register } : {}),
    };
    if (line.bodiless !== true) fetchSpeaker(candidate, line.speaker, line.emotion);
    candidate.speakers.push(balloon);
    if (line.bodiless !== true) replaceBody(candidate, line.speaker, line.emotion);
    // `LayoutAvatars():1105` is not called here: our layout is a pure function of
    // the finished panel, run at draw time by `render.ts`, so there is nothing to
    // precompute. It still has to *succeed*, which is what `fit` below stands for.

    const result = fit(candidate);
    if (!result.fits) {
      // `:1110-1116` — drop the candidate, break the panel, retry. The guard is
      // the commented-out line at `:1112`: a lone balloon that will not fit even
      // in a panel of its own would recurse forever, so it is kept as-is.
      if (fresh && candidate.speakers.length <= 1) {
        commit(candidate, replaceLast, delta);
        return;
      }
      newPanel = true;
      addLine(line, context, delta);
      return;
    }

    // The split happened inside the fit test, on a copy; carry its truncated
    // text back onto the balloon we are about to commit (`balloon.cpp:826`).
    if (result.kept != null && result.kept !== "") balloon.text = result.kept;

    commit(candidate, replaceLast, delta);
    if (result.leftover != null && result.leftover !== "") { // `:1128-1135`
      addLine({ ...line, text: result.leftover }, context, delta);
    }
  }

  function addReaction(
    speaker: string, emotion: readonly EmotionOption[], context: PanelContext, delta: PanelDelta,
  ): void {
    // `:1147-1158` — same shape as `AddLine`, but the 5-cap counts **bodies**, and
    // there is no speaker-already-present test: a reaction is allowed to re-pose a
    // body that is already on stage. That is the whole point of it.
    //
    // A reaction carries no `answers` fact (`PageLine` is `addLine`'s vocabulary,
    // not this one's), so the fragment guard always forces it fresh — the same
    // unconditional break `startNewPanel` always gave it.
    const guarded = fragmentGuard;
    fragmentGuard = false;
    const old = panels.length > 0 ? panels[panels.length - 1]! : null;
    const fresh = newPanel || guarded || old === null || old.bodies.length >= 5 || panels.length < 2;
    const candidate = fresh ? emptyPanel(context) : clonePanel(old!, context);
    if (fresh) newPanel = false;
    const replaceLast = !fresh;

    // `:1161` — replace the body if it is already staged, otherwise fetch it in.
    if (!replaceBody(candidate, speaker, emotion)) {
      fetchSpeaker(candidate, speaker, emotion);
    }

    const result = fit(candidate);
    if (!result.fits) { // `:1169-1174`
      if (fresh) {
        commit(candidate, replaceLast, delta);
        return;
      }
      newPanel = true;
      addReaction(speaker, emotion, context, delta);
      return;
    }
    commit(candidate, replaceLast, delta);
  }

  /** `RemoveLastPanel:993` then `AddPanel:1029`. */
  function commit(panel: Panel, replaceLast: boolean, delta: PanelDelta): void {
    if (replaceLast) {
      panels.pop();
      delta.replacedLast = true;
    }
    panels.push(panel);
    (delta.appended as Panel[]).push(panel);
  }
}

function emptyPanel(context: PanelContext): MutablePanel {
  return { ...context, bodies: [], speakers: [] };
}

/**
 * `CPanel::CPanel(const CPanel &)` (`panel.cpp:562`). The C++ deep-copies bodies
 * and re-points each balloon's `m_speaker` at the copy; our `Line` names its
 * speaker by id and `Body` is never mutated in place, so copying the two arrays
 * is the same operation with none of the pointer-fixup trick at `:579`.
 */
function clonePanel(panel: Panel, context: PanelContext): MutablePanel {
  return {
    ...context,
    // The one field that does **not** take the incoming context: the location box
    // is metadata about *where this panel is*, not about its newest utterance
    // (ADR 0009 §3). A later same-room turn clone-appending into the panel that
    // opened the room would otherwise erase the box — and a room *change* cannot
    // reach here at all, because the mapper breaks the panel on one.
    // ...and a dark panel takes no box at all: the incoming one belongs to the
    // turn that lit the room, so letting it land here would put the room's name
    // on the frame that says it cannot be seen. A death in the dark still shows
    // its box — that one is set when the panel opens, not clone-appended.
    // ...and the inheritance is scoped to the panel's *own* room. The comment
    // above rests on "a room change cannot reach here at all, because the mapper
    // breaks the panel on one" — which a **death** breaks (F18, v0.28.4): the
    // death frame is set where the killing blow fell (`panelRoom`,
    // `mapper.ts`), the turn after it is set wherever ZIL resurrected you, and
    // the line that opens it clone-appends across that gap. Inheriting there put
    // "The Troll Room" on a panel standing in the Forest.
    roomTitle: panel.dark
      ? panel.roomTitle
      : context.roomTitle ?? (context.room === panel.room ? panel.roomTitle : null),
    // The second field that does not take the incoming context, and for a
    // neighbouring reason: a frame is drawn in the light it *opened* in. The
    // mapper breaks the panel on a light change, so the only line that can
    // arrive carrying a different answer is one that clone-appends across that
    // boundary — the Hero's declaration, which he says in the room as it was
    // when he spoke. Taking the incoming value there would relight the panel
    // that said "It is pitch black" and delete the darkness beat from the strip.
    dark: panel.dark,
    bodies: [...panel.bodies],
    speakers: [...panel.speakers],
  };
}

/**
 * `CPanel::FetchSpeaker` (`panel.cpp:606`): the speaker's body, staging it if it
 * is not already on.
 *
 * The staged body is **requested**: `CBody(avID)` sets `m_requested = TRUE`
 * (`avatar.h:90`) and the only thing that ever clears it is the talk-to graph
 * (`panel.cpp:340`, "talktos not required"), which is the stubbed half of Phase 1.
 * So every body this port stages today passes the `IsSpeaker` gate, and a silent
 * reaction body is drawn — which is the point of `AddReaction`.
 */
function fetchSpeaker(panel: MutablePanel, speaker: string, emotion: readonly EmotionOption[]): Body {
  const existing = panel.bodies.find((body) => body.speaker === speaker);
  if (existing) return existing;
  const body: Body = { speaker, emotion, requested: true };
  panel.bodies.push(body);
  return body;
}

/**
 * `CPanel::ReplaceBody` (`panel.cpp:626`): swap the staged body for the avatar's
 * freshly *requested* one — which is where a speaker earns `m_requested` (`:634`),
 * and so survives the `IsSpeaker` gate in `render.ts` on later panels it is silent in.
 */
function replaceBody(panel: MutablePanel, speaker: string, emotion: readonly EmotionOption[]): boolean {
  const index = panel.bodies.findIndex((body) => body.speaker === speaker);
  if (index < 0) return false;
  panel.bodies[index] = { speaker, emotion, requested: true };
  return true;
}

/** `CPanel::AvatarInPanel` (`panel.cpp:655`). */
function avatarInPanel(panel: Panel, speaker: string): boolean {
  return panel.bodies.some((body) => body.speaker === speaker);
}

/**
 * Did `speaker` already get a *balloon* in this panel — as opposed to merely
 * being staged (`<Chr>`/a reaction body, no balloon)? Ours, not a port; see the
 * `answers` branch in `addLine` above for why the distinction matters.
 */
function avatarSpokeInPanel(panel: Panel, speaker: string): boolean {
  return panel.speakers.some((line) => line.speaker === speaker);
}

/** A panel under construction — the arrays are `readonly` only once it is committed. */
type MutablePanel = Omit<Panel, "bodies" | "speakers"> & { bodies: Body[]; speakers: Line[] };
