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
import { createMapper, type Mapper, type Panel } from "./comic/mapper.js";
import { loadCast, type Cast, type PoseCycle } from "./comic/figure.js";
import { renderPanel } from "./comic/render.js";
import { backdropFor } from "./comic/backdrop.js";
import { layoutStrip } from "./comic/layout.js";
import { drawPortrait, portraitCrop, PORTRAIT } from "./comic/portrait.js";

export interface ComicView {
  /** Draw the panel this turn produced. */
  appendTurn(turn: Turn): void;
  /** Report a failure in the pane rather than only in the console. */
  fail(message: string): void;
}

/**
 * Seed Guide lines for the opening scene.
 *
 * **A seam with a sample in it, not a script.** ADR 0004 §3 makes the Guide
 * presentation-only and its Consequences bound the project's authoring cost by
 * the Guide's trigger rate — a rate the ADR deliberately does not set. What 5.3
 * commits is the *mechanism*: a first-visit trigger, a cooldown, and a table
 * that may be empty. These six lines exist so the POC exercises the rung that
 * needs them (§7 rung 5, over-the-shoulder) and the one balloon class only the
 * Guide uses; the Guide's identity and voice are still open (HANDOFF #5), and
 * replacing every line here changes nothing but the words.
 */
const GUIDE_SCRIPT = new Map([
  ["WEST-OF-HOUSE", "Boarded front door. Someone did not want visitors."],
  ["NORTH-OF-HOUSE", "The path goes on. It usually does."],
  ["BEHIND-HOUSE", "That window is slightly ajar. That is an invitation."],
  ["KITCHEN", "A table, a sack, a bottle. Somebody left in a hurry."],
  ["LIVING-ROOM", "Note the rug. Rugs in this house are load-bearing."],
  ["CELLAR", "It gets dark down here. Darker than you want."],
]);

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

export async function createComicView(root: HTMLElement, assetBase: string): Promise<ComicView> {
  const strip = requireChild(root, ".comic-strip");
  const castBar = root.querySelector<HTMLElement>(".comic-cast");
  const mapper: Mapper = createMapper({ guideScript: GUIDE_SCRIPT, guideCooldown: 3 });
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
      const panel = mapper.panel(turn);
      const canvas = document.createElement("canvas");
      canvas.className = "panel";
      canvas.setAttribute("role", "img");
      canvas.setAttribute("aria-label", describe(panel));
      strip.append(canvas);
      drawn.push({ canvas, panel });
      draw(canvas, panel, measure());
      // The newest panel is the one the player just caused, so the strip
      // follows it the way the transcript follows the last line. Scroll the
      // strip rather than the panel: `scrollIntoView({ block: "end" })` aligns
      // the panel's edge with the container's *content* edge, which stops short
      // of the strip's own bottom padding and leaves the newest panel flush
      // against the pane while every earlier panel keeps its gap.
      strip.scrollTo({ top: strip.scrollHeight, behavior: "smooth" });
    },
    fail,
  };

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
    strip.style.gap = `${STRIP_GUTTER}px`;
    strip.style.gridTemplateColumns = `repeat(${layout.columns}, ${layout.panelWidth}px)`;
    return { width: layout.panelWidth, height: layout.panelHeight };
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
 * The cast bar: Comic Chat's member list, with this strip's two members in it.
 *
 * **Labelled by role, not by avatar name.** The manifest knows the Hero is dan
 * and the Guide is tiki (§11), and neither is the character's name — they are
 * the names of the *drawings*, chosen for pose inventory. The Guide's identity
 * is still open and the ADR's one standing instruction about it is not to call
 * them "Narrator", so the bar says what each one is and leaves naming to
 * whoever settles it.
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
    label.textContent = role.charAt(0).toUpperCase() + role.slice(1);
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
  if (panel.hero) parts.push(`the Hero thinks "${panel.hero.text}"`);
  if (panel.caption) parts.push(`caption: ${panel.caption.text}`);
  if (panel.guide) parts.push(`the Guide says "${panel.guide.text}"`);
  return `${parts.join("; ")}.`;
}

function requireChild(root: HTMLElement, selector: string): HTMLElement {
  const el = root.querySelector<HTMLElement>(selector);
  if (!el) throw new Error(`comic pane is missing ${selector}`);
  return el;
}
