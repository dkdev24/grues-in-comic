/*
 * SHOTS framing gallery — a dev harness for tuning the camera table in
 * `src/comic/render.ts`, per the standing method ("look at the running page").
 *
 *   pnpm -C web run build            # produce web/dist (gitignored)
 *   pnpm -C web exec tsx tools/serve.ts   # or: pnpm -C web run serve
 *   open http://localhost:8080/gallery.html
 *
 * It holds one real panel constant (real backdrop, pose and emotion, replayed
 * from a short deterministic drive) and renders every CameraPreset over it, so
 * the only variable across the row is the SHOTS row itself. Each canvas gets an
 * id (`cv-<preset>-<width>`) so a screenshot tool can grab one preset directly.
 * Imports the *built* modules under dist/, exactly as index.html does.
 */
import { createSession } from "./dist/web/src/session.js";
import { createMapper } from "./dist/web/src/comic/mapper.js";
import { renderPanel } from "./dist/web/src/comic/render.js";
import { loadCast } from "./dist/web/src/comic/figure.js";
import { backdropFor } from "./dist/web/src/comic/backdrop.js";

const status = document.getElementById("status");
const grid = document.getElementById("grid");
const PRESETS = ["establishing", "wide", "medium", "close-up", "over-shoulder", "reaction"];
const SIZES = [
  { w: 340, h: 340, tag: "square 340" },
  { w: 460, h: 300, tag: "wide 460×300" },
];

try {
  const doc = await (await fetch("/world/zork1.world.json")).json();
  const cast = await loadCast("./assets/comic");

  // A short, deterministic drive to collect real panels (real pose + emotion +
  // backdrop). We want a base panel with the Hero on stage in a room that has a
  // backdrop; then hold everything constant and vary only the camera preset so
  // the gallery isolates exactly what each SHOTS row does.
  const session = createSession(doc, { seed: 1234 });
  const mapper = createMapper({ guideScript: new Map(), guideCooldown: 3 });
  const panels = [mapper.panel(session.start())];
  for (const c of ["open mailbox", "take leaflet", "read leaflet", "n", "s"]) {
    panels.push(mapper.panel(session.command(c)));
  }
  const base = panels.find((p) => p.hero && backdropFor(p.room)) ?? panels[panels.length - 1];

  // A second base carrying a Guide balloon, for the two-shot (over-shoulder).
  const withGuide = {
    ...base,
    guide: { channel: "guide", balloonClass: "CBWoodringBox", text: "The idol says nothing you would repeat." },
  };

  function cell(container, panel, camera, size) {
    const c = document.createElement("canvas");
    const ratio = window.devicePixelRatio || 1;
    c.width = Math.round(size.w * ratio);
    c.height = Math.round(size.h * ratio);
    c.style.width = size.w + "px";
    c.style.height = size.h + "px";
    c.id = "cv-" + camera + "-" + size.w;
    const ctx = c.getContext("2d");
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    renderPanel(ctx, { ...panel, camera }, cast, size.w, size.h, {
      cycles: new Map(),
      backdrop: backdropFor(panel.room),
    });
    const wrap = document.createElement("div");
    wrap.className = "cell";
    wrap.append(c);
    const l = document.createElement("p");
    l.className = "label";
    l.textContent = camera;
    wrap.append(l);
    container.append(wrap);
  }

  for (const size of SIZES) {
    const rl = document.createElement("p");
    rl.className = "row-label";
    rl.textContent = `${size.tag}  —  room ${base.room}, backdrop ${backdropFor(base.room)}`;
    grid.append(rl);
    for (const preset of PRESETS) {
      cell(grid, preset === "over-shoulder" ? withGuide : base, preset, size);
    }
  }

  status.textContent = `ready — base room ${base.room}, emotion ${base.emotion?.[0]?.name ?? "?"}`;
  document.body.dataset.ready = "1";
} catch (err) {
  status.textContent = "ERROR: " + (err && err.stack ? err.stack : String(err));
}
