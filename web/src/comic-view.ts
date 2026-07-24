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
import { createDirector, type Director } from "./comic/director.js";
import { loadCast, type Cast, type PoseCycle } from "./comic/figure.js";
import { renderPanel } from "./comic/render.js";
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

/**
 * The Guide's script — one line per room, spoken once on first entry.
 *
 * ADR 0004 §3 makes the Guide presentation-only, and its Consequences bound the
 * project's authoring cost by the Guide's trigger rate. 5.3 committed the
 * *mechanism* (a first-visit trigger, a cooldown, a table keyed by room id) with
 * six placeholder lines; this is the authored script the ADR deferred. The
 * identity and voice it answers to are settled in `wiki/the-guide.md`: the Guide
 * is the tiki idol (§11), and it talks in short, present-tense, deadpan asides —
 * first sentence sees the room, second sentence knows something about it. It is
 * atmosphere, never a hint: no line here gives a puzzle away, and by §3 the Guide
 * could not act on one if it did. Keyed by room id (see `zork1.world.json`), so
 * adding a room is the whole cost of giving it a voice. Rooms absent from the map
 * are silent by design — the cooldown means not every first visit should speak.
 */
const GUIDE_SCRIPT = new Map<string, string>([
  // Above ground — the house and the forest that rings it.
  ["WEST-OF-HOUSE", "Boarded front door. Someone did not want visitors."],
  ["NORTH-OF-HOUSE", "The path goes on. It usually does."],
  ["SOUTH-OF-HOUSE", "The same white house, a different side. The boards are just as final."],
  ["EAST-OF-HOUSE", "That window is slightly ajar. That is an invitation."],
  ["FOREST-1", "Trees, and more trees. The forest keeps its one idea."],
  ["FOREST-2", "You have been among these trees before. They will not admit it."],
  ["FOREST-3", "More forest. It is patient in a way you are not."],
  ["MOUNTAINS", "The mountains forbid passage. They have had practice."],
  ["PATH", "A path worn by feet that mostly did not come back."],
  ["UP-A-TREE", "A nest, an egg, a long way down. Choose carefully."],
  ["CLEARING", "A clearing. The trees step back to watch."],
  ["GRATING-CLEARING", "Leaves, and something square beneath them. Not everything buried stays buried."],

  // Inside the house.
  ["KITCHEN", "A table, a sack, a bottle. Somebody left in a hurry."],
  ["ATTIC", "Dark, and full of the shapes of useful things. Bring your own light."],
  ["LIVING-ROOM", "Note the rug. Rugs in this house are load-bearing."],
  ["CELLAR", "It gets dark down here. Darker than you want."],

  // The first cave — troll country and the galleries.
  ["TROLL-ROOM", "The troll blocks the way and grins. He has done this to better than you."],
  ["EAST-OF-CHASM", "A chasm, and a narrow ledge. The empire keeps its treasures behind inconveniences."],
  ["GALLERY", "A painting worth more than its frame. Take one, leave the other."],
  ["STUDIO", "Someone worked here once. The chimney still remembers the way up."],

  // The maze, which is its own joke and knows it.
  ["MAZE-1", "A maze of twisty little passages, all alike. It means that literally."],
  ["MAZE-2", "Another twist. The maze does not care which."],
  ["MAZE-5", "Still the maze. Landmarks are a luxury it does not offer."],
  ["MAZE-8", "The passages keep their faces turned away. Count your steps or lose them."],
  ["DEAD-END-1", "A dead end. The maze offers several. It is generous that way."],
  ["DEAD-END-2", "Another wall where a way should be. The maze is consistent, at least."],
  ["CYCLOPS-ROOM", "The cyclops is hungry and you are on the menu. There is a name he would rather not hear."],
  ["STRANGE-PASSAGE", "A passage that connects what should not connect. Use it anyway."],
  ["TREASURE-ROOM", "The thief's own hoard. He will want it back, and he is not far."],
  ["GRATING-ROOM", "A grating overhead, and daylight past it. Locked, of course."],

  // Mirrors and the round hub of the middle empire.
  ["MIRROR-ROOM-1", "A mirror you could step through. The empire's shortcuts had style."],
  ["MIRROR-ROOM-2", "The same mirror from the other side. It kept its promise."],
  ["ROUND-ROOM", "Every passage meets here. A hub, or a snare, depending on your errand."],
  ["EW-PASSAGE", "East to west, and nothing to see between. Some rooms are only distance."],
  ["NS-PASSAGE", "North to south. The empire built corridors the way it built everything: to outlast you."],
  ["LOUD-ROOM", "The room is very loud. The room is very loud."],
  ["DAMP-CAVE", "Water somewhere close, and the smell of it older than the walls."],
  ["DEEP-CANYON", "A canyon that goes down further than your light. Down is a direction here, not a plan."],
  ["CHASM-ROOM", "A chasm too wide to argue with. Go around."],

  // The dam and the reservoir it holds.
  ["DAM-ROOM", "A dam, and a control panel. The manual is elsewhere, on purpose."],
  ["DAM-LOBBY", "Guidebooks and matches. The empire believed in signage."],
  ["MAINTENANCE-ROOM", "Buttons in four colors. Only some of them regret being pressed."],
  ["RESERVOIR-SOUTH", "The south bank. The water decides whether this is a shore or a floor."],
  ["RESERVOIR", "A reservoir, drained or full by a bolt you turned upstream. Cause, then effect."],
  ["RESERVOIR-NORTH", "The far bank, and a pump for a boat you do not yet own."],
  ["STREAM-VIEW", "A stream, viewed. The empire liked to be looked at."],
  ["DAM-BASE", "The river begins here. So does the part of the empire with no walls."],

  // Hades and the temples.
  ["ENTRANCE-TO-HADES", "The gate to the land of the dead. The dead are in."],
  ["LAND-OF-LIVING-DEAD", "Spirits, and a bell, a book, a candle. The rite is older than the empire that fears it."],
  ["ENGRAVINGS-CAVE", "Ancient carvings. They flatter no one who stops to read them."],
  ["EGYPT-ROOM", "A gold coffin, too heavy to be wise. Everyone takes it anyway."],
  ["DOME-ROOM", "A railing, a long drop, and a rope you did not think to bring. Improvise."],
  ["TORCH-ROOM", "A torch that burns without fuel. The empire had good years."],
  ["NORTH-TEMPLE", "A temple, quiet the way only abandoned holy places are."],
  ["SOUTH-TEMPLE", "An altar, and a way down. Somewhere to leave what you cannot carry further."],
  ["ATLANTIS-ROOM", "An ancient hall, and a trident in it. Atlantis kept better souvenirs than it kept itself."],

  // The Frigid River and Aragain Falls.
  ["RIVER-1", "The current has you now. It knows where it is going, which is more than you can say."],
  ["RIVER-2", "The banks slide past. Downstream is the only vote that counts here."],
  ["RIVER-3", "Still drifting. The river is in no hurry and neither, now, are you."],
  ["RIVER-4", "The water quickens. A buoy rides ahead of you, red and deliberate."],
  ["RIVER-5", "The last calm stretch. Beyond it the river stops being scenery."],
  ["WHITE-CLIFFS-NORTH", "Cliffs too sheer to land against. Keep to the water."],
  ["WHITE-CLIFFS-SOUTH", "More white cliff, no more welcoming. The river chose your route for you."],
  ["SHORE", "The far shore. The river sets you down, this once."],
  ["SANDY-BEACH", "Sand, and a buoy that rode the river before you did."],
  ["SANDY-CAVE", "A cave that wants digging. Bring a shovel and low expectations."],
  ["ARAGAIN-FALLS", "A waterfall, and a rainbow you might yet be able to walk on."],
  ["ON-RAINBOW", "You are standing on a rainbow. Do not think about it too hard."],
  ["END-OF-RAINBOW", "The end of the rainbow, and the pot they promised. For once they meant it."],
  ["CANYON-BOTTOM", "The bottom of the canyon. Everything rolls down here eventually, including you."],
  ["CLIFF-MIDDLE", "A ledge halfway up. Halfway is the worst place to stop and think."],
  ["CANYON-VIEW", "A long look down the canyon. The vertigo is complimentary."],

  // The coal mine.
  ["MINE-ENTRANCE", "The coal mine yawns. It has swallowed better-equipped men."],
  ["SQUEEKY-ROOM", "Something small lives here and does not like company."],
  ["BAT-ROOM", "A bat, and it likes shiny things. Garlic, it likes considerably less."],
  ["SHAFT-ROOM", "A shaft, a basket, a chain. Load it before you regret the weight on your back."],
  ["SMELLY-ROOM", "A smell with a warning inside it. The next room is where it comes true."],
  ["GAS-ROOM", "Gas, and an open flame in your hand. Think."],
  ["MINE-1", "Coal, and dark, and more of both. The mine repeats like the maze, but dirtier."],
  ["MINE-2", "The same coal from a different angle. Down here, angles are all you get."],
  ["MINE-4", "Deeper in. The mine gives up nothing it was not paid for in advance."],
  ["LADDER-TOP", "A ladder down. The bottom is further than the rung suggests."],
  ["LADDER-BOTTOM", "The foot of the ladder, and the mine proper. Mind your light."],
  ["TIMBER-ROOM", "Old timbers, and a gap too narrow for a full pack. Travel light or not at all."],
  ["LOWER-SHAFT", "A draft from nowhere, and pressure of the diamond-making kind. Something valuable is close."],
  ["MACHINE-ROOM", "A machine, a lid, a switch. Coal goes in; something better is supposed to come out."],
  ["SLIDE-ROOM", "A chute back to the cellar. Faster down than up, as these things always are."],

  // The end.
  ["STONE-BARROW", "The barrow, at last. The way in opens once, and only forward."],
]);

/**
 * Beat reactions (ADR 0005 §4): keyed by the affect marker the Hero's action
 * produced, so the Guide *replies to what just happened* rather than narrating a
 * room on a timer — the whole of "the two characters talk to each other." Same
 * voice as the gazetteer (`wiki/the-guide.md`) and now the same relaxed rule 6:
 * these address the beat, not only the scene. Shares the Guide cooldown, so it
 * stays presentation-only and never wears out. Death (the `reaction` shot, tight
 * on the Hero) is deliberately absent — the idol does not crowd a death.
 */
const BEAT_SCRIPT = new Map<string, string>([
  ["combat-victory", "Something that wanted you dead is dead instead. The empire keeps count."],
  ["combat-threat", "The blade knows before you do. It usually does."],
  ["grue-threat", "The dark is not empty. It is only patient."],
  ["scored", "The empire notices what leaves it. It always sends someone."],
  ["reveal", "There. It was waiting to be found, the way everything here is."],
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

export async function createComicView(
  root: HTMLElement, assetBase: string, names: ReadonlyMap<string, string> = new Map(),
): Promise<ComicView> {
  const strip = requireChild(root, ".comic-strip");
  const castBar = root.querySelector<HTMLElement>(".comic-cast");
  const director: Director = createDirector({
    guideScript: GUIDE_SCRIPT, beatScript: BEAT_SCRIPT, guideCooldown: 3, names,
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

  /** Draw a batch of emitted panels and follow the strip to the newest. */
  function render(panels: readonly Panel[]): void {
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
  const caption = lineOf(panel, CAPTION);
  const guide = lineOf(panel, GUIDE);
  const hero = lineOf(panel, HERO);
  if (caption) parts.push(`caption: ${caption.text}`);
  if (guide) parts.push(`the Guide says "${guide.text}"`);
  if (hero) {
    const verb = hero.balloonClass === "CBWoodringThink" ? "thinks" : "says";
    parts.push(`the Hero ${verb} "${hero.text}"`);
  }
  // Any further participants (mobs) — described generically, in draw order.
  for (const line of panel.speakers) {
    if (line.speaker === CAPTION || line.speaker === GUIDE || line.speaker === HERO) continue;
    parts.push(`${line.speaker} says "${line.text}"`);
  }
  return `${parts.join("; ")}.`;
}

function requireChild(root: HTMLElement, selector: string): HTMLElement {
  const el = root.querySelector<HTMLElement>(selector);
  if (!el) throw new Error(`comic pane is missing ${selector}`);
  return el;
}
