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
  readonly panels: readonly Panel[];
}

/**
 * Hand one turn's script to the page, line by line — `AddLine` for each utterance,
 * then `AddReaction` for each body that is on stage without one. The single place
 * a {@link TurnScript} becomes panels; the Director and the tools both go through it.
 */
export function addScript(page: Page, script: TurnScript): PanelDelta {
  const out: PanelDelta = { replacedLast: false, appended: [] };
  for (const line of script.lines) mergeDelta(out, page.addLine(line, script.context));
  for (const body of script.reactions) {
    mergeDelta(out, page.addReaction(body.speaker, body.emotion, script.context));
  }
  if (isOrphaned(out, script)) page.startNewPanel();
  return out;
}

/**
 * Did this turn end on a **fragment** — a panel holding some of its speakers but
 * not all of them? (M6.1g; found by reading the playthrough at M6.1f.)
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

  return {
    panels,
    startNewPanel(): void {
      newPanel = true;
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
      return;
    }
    if (line.text === CHR) { // `:1073`
      addReaction(line.speaker, line.emotion, context, delta);
      return;
    }

    // `:1078-1090` — the clone-append test. Note the order: `m_newPanel` first, so
    // the tail is only read when a tail is guaranteed to exist.
    const old = panels.length > 0 ? panels[panels.length - 1]! : null;
    const fresh =
      newPanel ||
      old === null ||
      old.speakers.length >= 5 ||
      panels.length < 2 ||
      // A bodiless line is never "already in" a panel; it is also always
      // `BM_ACTION`, so the caption case has already broken the panel above.
      (line.bodiless !== true && avatarInPanel(old, line.speaker));
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
    const old = panels.length > 0 ? panels[panels.length - 1]! : null;
    const fresh = newPanel || old === null || old.bodies.length >= 5 || panels.length < 2;
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
    roomTitle: context.roomTitle ?? panel.roomTitle,
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

/** A panel under construction — the arrays are `readonly` only once it is committed. */
type MutablePanel = Omit<Panel, "bodies" | "speakers"> & { bodies: Body[]; speakers: Line[] };
