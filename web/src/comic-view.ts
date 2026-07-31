/**
 * The comic pane (stage 5.3) — the primary half of the ADR 0004 §4 shell.
 *
 * It is a *sibling* of the console pane over one session, not a second engine
 * handle: `main.ts` hands the same {@link Turn} to both. That is what makes §2's
 * "narration is accompanied, never replaced" a property of the wiring rather
 * than a synchronization problem, and it is the constraint 5.2 wrote down as
 * the thing most likely to be got wrong here.
 *
 * The pane owns a strip of panels, one per turn (§6). A panel is drawn to its
 * own canvas: the panel *stream* is the canonical data structure and a page is
 * a layout policy over it (§5), so nothing here composes a page — on-screen
 * policy is the Comic Chat window, which is a scrolling strip.
 */

import type { Turn } from "./session.js";
import { CAPTION, GUIDE, HERO, lineOf, type Panel } from "./comic/mapper.js";
// The authored dialogue is data, and it is not here: it is DOM-free so the
// corpus replay can measure it (M6.1a, `comic/script.ts`).
import { BEAT_SCRIPT, GUIDE_COOLDOWN, GUIDE_SCRIPT } from "./comic/script.js";
import { createDirector, type Director } from "./comic/director.js";
import { createFitTest } from "./comic/fit.js";
import { loadCast, type Cast, type PoseCycle } from "./comic/figure.js";
import { renderPanel } from "./comic/render.js";
import type { PanelDelta } from "./comic/page.js";
import { backdropFor } from "./comic/backdrop.js";
import { layoutStrip, UNIT } from "./comic/layout.js";
import { drawPortrait, portraitCrop, PORTRAIT } from "./comic/portrait.js";

export interface ComicView {
  /** Draw the panels this turn produced — 0..N (ADR 0005: a turn may be dropped,
   * buffered, or collapsed into a following panel). */
  appendTurn(turn: Turn): void;
  /** Draw any traversal run the Director is still buffering. Call after a replay
   * batch so a session resumed mid-walk shows its trailing walk (ADR 0005 §3). */
  flush(): void;
  /** Report a failure in the pane rather than only in the console. */
  fail(message: string): void;
}

/** Sub-pixel slack when deciding whether the reader is still at the newest panel. */
const PIN_SLACK = 8;

/**
 * The gutter, in script rather than in CSS, and the reason is a scar: 5.3's
 * scroll bug was a `0.6rem` gap that the pinning arithmetic did not know about
 * and could not see. Sequencing now needs the same number in two places — the
 * grid's `gap` and `layoutStrip`'s column arithmetic — so it is one constant
 * here and the stylesheet does not set it.
 */
const STRIP_GUTTER = 10;

export async function createComicView(
  root: HTMLElement, assetBase: string, names: ReadonlyMap<string, string> = new Map(),
): Promise<ComicView> {
  const strip = requireChild(root, ".comic-strip");
  const castBar = root.querySelector<HTMLElement>(".comic-cast");
  // Panelization needs to measure text, and it must measure it at the panel's
  // *native* size rather than the viewport's (ADR 0007 §2 / `fit.ts`), so it
  // gets an offscreen canvas of its own rather than a strip canvas. Without a 2D
  // context we fall back to `page.ts`'s "everything fits", which is how the pane
  // behaved before Phase 2b.
  const measurer = document.createElement("canvas").getContext("2d");
  const director: Director = createDirector({
    guideScript: GUIDE_SCRIPT, beatScript: BEAT_SCRIPT, guideCooldown: GUIDE_COOLDOWN, names,
    ...(measurer ? { fit: createFitTest(measurer) } : {}),
  });
  // Cycles live with the *view*, not with a panel: a panel re-drawn on resize
  // must not advance the round-robin, or the whole strip would change bodies
  // every time the window moved (§8).
  const cycles = new Map<string, PoseCycle>();
  const drawn: Array<{ canvas: HTMLCanvasElement; panel: Panel }> = [];

  let cast: Cast | null = null;
  try {
    cast = await loadCast(assetBase);
  } catch (err) {
    fail(`could not load the cast: ${err instanceof Error ? err.message : String(err)}`);
  }
  if (cast && castBar) drawCastBar(castBar, cast);

  // The panel width is an input to every layout decision, evaluated per render
  // rather than once (§4a). A resize therefore re-renders rather than rescaling
  // a bitmap: balloon line breaks are a function of width, and stretching a
  // canvas would leave them wrapped for a width the reader no longer has.
  // The strip follows the newest panel, but only while the reader is already
  // there: someone scrolled back through the strip must not be yanked forward.
  let pinned = true;
  strip.addEventListener("scroll", () => {
    pinned = strip.scrollHeight - strip.scrollTop - strip.clientHeight <= PIN_SLACK;
  });

  const observer = new ResizeObserver(() => {
    redrawAll();
    // A redraw re-heights every panel, so the scroll position the strip held
    // before the resize no longer points at the newest panel. Re-pin without
    // animating: the resize itself is the motion the reader is watching.
    if (pinned) strip.scrollTop = strip.scrollHeight;
  });
  observer.observe(strip);

  return {
    appendTurn(turn: Turn) {
      // A turn yields 0..N panels (ADR 0005): the Director may drop a noise turn,
      // buffer a traversal, or flush a collapsed run ahead of this panel.
      render(director.ingest(turn));
    },
    flush() {
      render(director.flush());
    },
    fail,
  };

  /**
   * Draw a batch of emitted panels and follow the strip to the newest.
   *
   * `replacedLast` is panelization's clone-append (ADR 0008 Phase 2): the line
   * grew the panel already on screen rather than starting a new one, so that
   * panel's canvas is dropped and redrawn from the grown copy. This is our stand-in
   * for `RemoveLastPanel`/`RefreshLastPanel` (`panel.cpp:993,1031`) — the strip is
   * incremental, so without it the reader would see the same panel twice.
   */
  function render(delta: PanelDelta): void {
    if (delta.replacedLast) {
      const stale = drawn.pop();
      stale?.canvas.remove();
    }
    const panels = delta.appended;
    if (panels.length === 0) return;
    for (const panel of panels) {
      const canvas = document.createElement("canvas");
      canvas.className = "panel";
      canvas.setAttribute("role", "img");
      canvas.setAttribute("aria-label", describe(panel));
      strip.append(canvas);
      drawn.push({ canvas, panel });
      draw(canvas, panel, measure());
    }
    // The newest panel is the one the player just caused, so the strip follows it
    // the way the transcript follows the last line. Scroll the strip rather than
    // the panel: `scrollIntoView({ block: "end" })` aligns the panel's edge with
    // the container's *content* edge, which stops short of the strip's own bottom
    // padding and leaves the newest panel flush against the pane while every
    // earlier panel keeps its gap.
    strip.scrollTo({ top: strip.scrollHeight, behavior: "smooth" });
  }

  /**
   * Apply the sequencing policy to the strip itself: how many panels per row,
   * and how wide each one is. Read the container's *content* width — the
   * padding is not a column.
   */
  function measure(): { width: number; height: number } {
    const style = getComputedStyle(strip);
    const inner = strip.clientWidth
      - parseFloat(style.paddingLeft || "0")
      - parseFloat(style.paddingRight || "0");
    const layout = layoutStrip(inner, { gutter: STRIP_GUTTER });

    // Width is only half the fit. A panel sized to the column width alone is as
    // tall as the aspect makes it, and on a short pane — a portrait phone, more
    // so once the on-screen keyboard has eaten half the viewport — that height
    // exceeds what the strip can show, so a single panel needs scrolling to be
    // read whole. §4a's "fully shown" is a promise about *one* panel, not the
    // strip's history, so cap the panel to the strip's visible height too and
    // let width follow at the native aspect. The row is narrower than the column
    // then, which `justify-content: center` (style.css) simply centres.
    const innerHeight = strip.clientHeight
      - parseFloat(style.paddingTop || "0")
      - parseFloat(style.paddingBottom || "0");
    let { panelWidth, panelHeight } = layout;
    if (innerHeight > 0 && panelHeight > innerHeight) {
      panelHeight = innerHeight;
      panelWidth = Math.round((panelHeight / UNIT.height) * UNIT.width);
    }

    strip.style.gap = `${STRIP_GUTTER}px`;
    strip.style.gridTemplateColumns = `repeat(${layout.columns}, ${panelWidth}px)`;
    return { width: panelWidth, height: panelHeight };
  }

  function draw(canvas: HTMLCanvasElement, panel: Panel, size: { width: number; height: number }): void {
    if (!cast) return;
    const ratio = window.devicePixelRatio || 1;
    const { width, height } = size;

    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    renderPanel(ctx, panel, cast, width, height, {
      cycles: cycleSnapshot(cycles, panel),
      backdrop: backdropFor(panel.room),
    });
  }

  function redrawAll(): void {
    // Measure once for the whole strip, not once per panel: the grid is uniform
    // (`layout.ts`), and re-measuring inside the loop would re-read a layout the
    // loop is itself mutating.
    const size = measure();
    for (const item of drawn) draw(item.canvas, item.panel, size);
  }

  function fail(text: string): void {
    const notice = document.createElement("p");
    notice.className = "comic-notice";
    notice.textContent = text;
    strip.append(notice);
  }
}

/**
 * The pose a panel was first drawn with, frozen.
 *
 * A panel's figures are chosen once, when the turn happens, and a re-render
 * must reproduce them exactly — otherwise scrolling back up shows a different
 * comic than the one the player read. The cycle state is therefore captured
 * per panel on first draw and replayed on every redraw after it.
 */
const frozen = new WeakMap<Panel, Map<string, PoseCycle>>();

function cycleSnapshot(live: Map<string, PoseCycle>, panel: Panel): Map<string, PoseCycle> {
  const existing = frozen.get(panel);
  if (existing) return new Map([...existing].map(([k, v]) => [k, { ...v }]));

  // First draw: let the live cycles advance, then remember where they started.
  const before = new Map([...live].map(([k, v]) => [k, { ...v }]));
  frozen.set(panel, before);
  return live;
}

/**
 * Display names for the cast — ADR 0006 Slice 3's relabel, and the one place
 * the surface label is decided.
 *
 * **Role ids are not labels.** `guide`/`hero` are manifest keys (ADR 0004 §11)
 * and the avatars behind them are `tiki` and `dan` — the names of the
 * *drawings*, chosen for pose inventory, never the characters'. Both stay as
 * they are; only what the page *says* changes here, which is what keeps this a
 * presentation-only relabel with no reach into the mapper, the manifest or the
 * art pipeline.
 *
 * **The DM's label is the proper name "Dungeon Master"**, used without an
 * article. ADR 0004 mandated "the Guide" and ADR 0006 §Consequences reopened it,
 * leaving three options: "the DM", "the Guide" kept as the DM's name, or a
 * proper name. A proper name is what a person at a table has — you address a DM
 * by name, not by job title — and it is the label that stops reading as a
 * *function* the comic performs. "Narrator" remains out (ADR 0004's standing
 * instruction), though §2 has now retired the reason: the caption channel is the
 * DM reading the module aloud, so there is no rival narrator left to collide
 * with.
 *
 * The Hero keeps a role label: his identity was never reopened, and in prose
 * ("the Hero says…") that reads as the role it is, beside a name that reads as
 * a name.
 */
const CAST_LABELS: ReadonlyMap<string, string> = new Map([
  [GUIDE, "Dungeon Master"],
  [HERO, "Hero"],
]);

/**
 * What the page calls a cast member. An unknown role — a mob, once ADR 0006's
 * later slices cast one — falls back to its own id, capitalized, rather than
 * disappearing from the bar.
 */
export function castLabel(role: string): string {
  return CAST_LABELS.get(role) ?? role.charAt(0).toUpperCase() + role.slice(1);
}

/**
 * The cast bar: Comic Chat's member list, with this strip's two members in it.
 */
function drawCastBar(bar: HTMLElement, cast: Cast): void {
  bar.replaceChildren();
  for (const [role, avatar] of Object.entries(cast.manifest.cast)) {
    const portrait = portraitCrop(avatar);
    const sheet = cast.sheets.get(role);
    if (!portrait || !sheet) continue;

    const item = document.createElement("figure");
    item.className = "cast-member";

    const ratio = window.devicePixelRatio || 1;
    const canvas = document.createElement("canvas");
    canvas.className = "cast-portrait";
    canvas.width = Math.round(PORTRAIT * ratio);
    canvas.height = Math.round(PORTRAIT * ratio);
    canvas.style.width = `${PORTRAIT}px`;
    canvas.style.height = `${PORTRAIT}px`;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      drawPortrait(ctx, sheet, portrait, 0, 0, PORTRAIT);
    }

    const label = document.createElement("figcaption");
    label.textContent = castLabel(role);
    // The avatar behind the role stays reachable without being on the page:
    // it is the fact you want when a portrait looks wrong, and noise otherwise.
    item.title = `${label.textContent} — ${avatar.name}`;

    item.append(canvas, label);
    bar.append(item);
  }
}

/** Alt text: the comic must be describable, not only viewable. */
function describe(panel: Panel): string {
  const parts = [`${panel.camera} shot`];
  const caption = lineOf(panel, CAPTION);
  const guide = lineOf(panel, GUIDE);
  const hero = lineOf(panel, HERO);
  // The caption is read-aloud text, not a third voice: ADR 0006 §2 makes it the
  // module's boxed text with the DM reading it. It is still labelled `caption`
  // here because a screen reader needs to know it is not a balloon.
  if (caption) parts.push(`caption: ${caption.text}`);
  if (guide) parts.push(`${castLabel(GUIDE)} says "${guide.text}"`);
  if (hero) {
    const verb = hero.balloonClass === "CBWoodringThink" ? "thinks" : "says";
    parts.push(`the ${castLabel(HERO)} ${verb} "${hero.text}"`);
  }
  // Any further participants (mobs) — described generically, in draw order.
  for (const line of panel.speakers) {
    if (line.speaker === CAPTION || line.speaker === GUIDE || line.speaker === HERO) continue;
    parts.push(`${castLabel(line.speaker)} says "${line.text}"`);
  }
  return `${parts.join("; ")}.`;
}

function requireChild(root: HTMLElement, selector: string): HTMLElement {
  const el = root.querySelector<HTMLElement>(selector);
  if (!el) throw new Error(`comic pane is missing ${selector}`);
  return el;
}
