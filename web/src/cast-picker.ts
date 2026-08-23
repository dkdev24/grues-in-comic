/**
 * "Choose your cast" — the screen a new game opens on (F16).
 *
 * What this screen is *for* is validation, not taste. Any character it offers
 * has already cleared ADR 0004 §11's four gates: complex type and the marker
 * inventory the role needs are asserted at pack time (`art/tools/rosterpack.ts`,
 * `art/test/roster.test.ts`); legibility and register were judged by looking at
 * figures in `docs/casting-roster-survey.md`. So the picker never validates —
 * it renders a list that is valid by construction, and a character absent from
 * `roster.json` is absent deliberately.
 *
 * **Art is fetched per selection, never per screen.** Fifteen sheets are ~1.4
 * MiB; a cast is ~150 KiB. The grid shows names, and the preview pane pulls one
 * character's sheet when the player lands on them, cached thereafter. That is
 * the same reason `loadCast` fetches a chosen avatar rather than the roster.
 *
 * The choice is a **runtime skin**: it never re-packs `cast.json`, and the pixel
 * gate keeps rendering its canonical dan/tiki cast whatever anyone picks.
 */

import {
  loadRoster, figureFor, drawFigure, newCycle,
  type CastChoice, type RosterCharacter, type RosterIndex,
} from "./comic/figure.js";
import type { PackedAvatar } from "../../art/src/cast-manifest.js";
import type { EmotionOption } from "../../art/src/pose.js";

/** The preview draws the same resting figure a wordless panel would (§8). */
const NEUTRAL: readonly EmotionOption[] = [{ angle: 0, intensity: 0, priority: 1 }];

/**
 * Preview box, in CSS pixels. Tall, because these figures are ~200×450 in
 * register — and capped against the viewport, because the whole screen has to
 * fit above the Begin button on a laptop as well as a desktop.
 */
const PREVIEW_WIDTH = 200;
const PREVIEW_MAX_HEIGHT = 300;
const PREVIEW_MIN_HEIGHT = 170;

function previewBox(): { width: number; height: number } {
  const available = Math.round((window.innerHeight || PREVIEW_MAX_HEIGHT) * 0.36);
  return {
    width: PREVIEW_WIDTH,
    height: Math.max(PREVIEW_MIN_HEIGHT, Math.min(PREVIEW_MAX_HEIGHT, available)),
  };
}

const ROLE_LABELS: ReadonlyMap<string, string> = new Map([
  ["hero", "Hero"],
  ["guide", "Dungeon Master"],
]);

const ROLE_BLURBS: ReadonlyMap<string, string> = new Map([
  ["hero", "You. Argues with the parser more than anything else."],
  ["guide", "Narrates, nudges, and never breaks a neutral expression."],
]);

export interface CastPicker {
  /** Resolves with the cast the player begins with. */
  choice: Promise<CastChoice>;
}

/**
 * What the player settled on before pressing Begin: a cast, and — since
 * 6.8d — how they appear on the Hall of Fame board (ADR 0011 §3).
 *
 * The board fields live on this screen because a board that shows runs *in
 * progress* needs a name before the run has an ending to ask at.
 */
export interface PickResult {
  cast: CastChoice;
  /** What the player typed, or `Anonymous` for an untouched field. */
  name: string;
  /** `false` when they opted out — then no run of theirs is ever recorded. */
  listed: boolean;
}

/** The name an untouched field submits (ADR 0011 §3). */
export const DEFAULT_PLAYER_NAME = "Anonymous";

/** Matches the endpoint's allowlist, so the field can say so before Begin. */
const NAME_LIMIT = 12;

/**
 * Show the picker over `host` and resolve with the chosen cast.
 *
 * Resolves with `initial` — the packed default, or a resumed game's cast —
 * without showing anything if the roster cannot be fetched. A player who cannot
 * reach `roster.json` should get dan and tiki and a playable game, not a screen
 * that will not go away.
 */
export async function pickCast(
  host: HTMLElement, assetBase: string, initial: CastChoice = {},
  board: { name?: string; listed?: boolean } = {},
): Promise<PickResult> {
  const fallback: PickResult = {
    cast: initial,
    name: board.name ?? DEFAULT_PLAYER_NAME,
    listed: board.listed !== false,
  };

  let roster: RosterIndex;
  try {
    roster = await loadRoster(assetBase);
  } catch {
    return fallback;
  }

  const chosen: CastChoice = { ...roster.defaults, ...initial };
  const roles = [...new Set(roster.characters.flatMap((c) => c.roles))];

  const overlay = document.createElement("div");
  overlay.id = "cast-picker";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "Choose your cast");

  const box = document.createElement("div");
  box.className = "cast-picker-box";
  const heading = document.createElement("h2");
  heading.textContent = "Choose your cast";
  const blurb = document.createElement("p");
  blurb.className = "cast-picker-blurb";
  blurb.textContent =
    "Every character here is drawn from Microsoft Comic Chat's own art, " +
    "and every one can act the emotions this comic asks their role for.";
  box.append(heading, blurb);

  const nameField = document.createElement("input");
  const listedBox = document.createElement("input");

  const columns = document.createElement("div");
  columns.className = "cast-picker-roles";
  for (const role of roles) columns.append(roleColumn(role));
  box.append(columns);

  box.append(boardFields());

  const actions = document.createElement("div");
  actions.className = "cast-picker-actions";
  const begin = document.createElement("button");
  begin.type = "button";
  begin.className = "cast-picker-begin";
  begin.textContent = "Begin";
  actions.append(begin);
  box.append(actions);
  overlay.append(box);
  host.append(overlay);

  return new Promise<PickResult>((resolve) => {
    begin.addEventListener("click", () => {
      overlay.remove();
      resolve({ cast: chosen, name: nameOf(nameField.value), listed: listedBox.checked });
    });
    begin.focus();
  });

  /**
   * The board row, one line of disclosure, and the opt-out (ADR 0011 §3).
   *
   * Three rules are load-bearing and none of them is cosmetic: the field is
   * **optional**, `Anonymous` is what an untouched one submits, and neither
   * control may block Begin. The disclosure line is required — the run is
   * recorded because the player pressed Begin, not because they chose to be
   * listed after winning, and they are owed the sentence that says so.
   */
  function boardFields(): HTMLElement {
    const section = document.createElement("section");
    section.className = "cast-picker-board";

    const label = document.createElement("label");
    label.className = "cast-picker-name";
    label.htmlFor = "cast-picker-name-field";
    label.textContent = "Name on the board";

    nameField.id = "cast-picker-name-field";
    nameField.type = "text";
    nameField.maxLength = NAME_LIMIT;
    nameField.placeholder = DEFAULT_PLAYER_NAME;
    nameField.autocomplete = "off";
    // Never pre-filled with the default: a field showing `Anonymous` reads as a
    // value the player has to clear, and this one is meant to cost nothing.
    nameField.value = board.name && board.name !== DEFAULT_PLAYER_NAME ? board.name : "";

    const note = document.createElement("p");
    note.className = "cast-picker-disclosure";
    note.textContent =
      "Your run appears on the Hall of Fame board while you play and after you stop — " +
      "this name, your score, your moves and your country. Nothing else.";

    const optOut = document.createElement("label");
    optOut.className = "cast-picker-optout";
    listedBox.type = "checkbox";
    listedBox.checked = board.listed !== false;
    optOut.append(listedBox, document.createTextNode(" Show my run on the board"));

    section.append(label, nameField, note, optOut);
    return section;
  }

  function nameOf(raw: string): string {
    const trimmed = raw.trim().replace(/\s+/g, " ");
    return trimmed === "" ? DEFAULT_PLAYER_NAME : trimmed;
  }

  function roleColumn(role: string): HTMLElement {
    const column = document.createElement("section");
    column.className = "cast-picker-role";

    const title = document.createElement("h3");
    title.textContent = ROLE_LABELS.get(role) ?? role;
    const note = document.createElement("p");
    note.className = "cast-picker-note";
    note.textContent = ROLE_BLURBS.get(role) ?? "";

    const canvas = document.createElement("canvas");
    canvas.className = "cast-preview";
    const caption = document.createElement("p");
    caption.className = "cast-preview-caption";
    caption.setAttribute("aria-live", "polite");

    const list = document.createElement("div");
    list.className = "cast-options";
    list.setAttribute("role", "radiogroup");
    list.setAttribute("aria-label", ROLE_LABELS.get(role) ?? role);

    const candidates = roster.characters.filter((c) => c.roles.includes(role));
    const buttons = new Map<string, HTMLButtonElement>();
    for (const character of candidates) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "cast-option";
      button.setAttribute("role", "radio");
      button.textContent = character.name;
      button.addEventListener("click", () => select(character));
      buttons.set(character.id, button);
      list.append(button);
    }

    column.append(title, note, canvas, caption, list);

    const start = candidates.find((c) => c.id === chosen[role]) ?? candidates[0];
    if (start) void select(start);
    return column;

    async function select(character: RosterCharacter): Promise<void> {
      chosen[role] = character.id;
      for (const [id, button] of buttons) {
        const on = id === character.id;
        button.classList.toggle("is-chosen", on);
        button.setAttribute("aria-checked", String(on));
      }
      caption.textContent = describe(character);
      await drawPreview(canvas, assetBase, character);
    }
  }
}

/**
 * The one line of stats worth showing: how many drawings this character can be
 * posed from, and whether they own the shrug `parser-miss` prefers (§11's
 * tiebreaker — a Hero without one draws a bored face on a resting body, which
 * is correct and less funny).
 */
function describe(character: RosterCharacter): string {
  const figures = `${character.figures} drawings`;
  return character.shrugTorso ? `${figures} · shrugs at the parser` : figures;
}

/** Chosen sheets and manifests survive a re-selection: browsing is free twice. */
const previews = new Map<string, { avatar: PackedAvatar; sheet: HTMLImageElement }>();

async function drawPreview(
  canvas: HTMLCanvasElement, assetBase: string, character: RosterCharacter,
): Promise<void> {
  const box = previewBox();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.round(box.width * ratio);
  canvas.height = Math.round(box.height * ratio);
  canvas.style.width = `${box.width}px`;
  canvas.style.height = `${box.height}px`;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, box.width, box.height);

  let entry = previews.get(character.id);
  if (!entry) {
    try {
      const [avatar, sheet] = await Promise.all([
        fetch(`${assetBase}/roster/${character.manifest}`).then((r) => r.json() as Promise<PackedAvatar>),
        loadImage(`${assetBase}/roster/${character.sheet}`),
      ]);
      entry = { avatar, sheet };
      previews.set(character.id, entry);
    } catch {
      // A preview that will not load is not a reason to block the pick: the
      // character is still valid, and `loadCast` falls back on its own if the
      // same fetch fails again at boot.
      return;
    }
  }

  const figure = figureFor(entry.avatar, NEUTRAL, newCycle());
  if (!figure) return;
  // Uniform scale, same rule as every other figure draw (ADR 0004 §4a) — and
  // the reason a taller Hero looks taller here rather than being squashed to
  // match dan. Framing them in a panel is a separate pass (F4).
  const scale = Math.min(box.width / figure.width, box.height / figure.height);
  drawFigure(
    ctx, entry.sheet, figure,
    (box.width - figure.width * scale) / 2,
    box.height - figure.height * scale,
    scale,
  );
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`could not load ${url}`));
    image.src = url;
  });
}
