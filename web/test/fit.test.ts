/**
 * The panelization fit test (ADR 0008 Phase 2b) — the driver seen through
 * `page.ts`'s `FitTest` seam, which is where `AddLine`'s overflow recursion and
 * leftover re-add actually fire.
 *
 * Measurement is the same 7px stand-in the other comic tests use: these pin the
 * *decisions* (does this panel split, what comes back as leftover), not a font.
 */

import { describe, expect, it } from "vitest";
import { createFitTest, stageSlots, type TextCanvas } from "../src/comic/fit.js";
import { BM_ACTION, BM_SAY, createPage, type PageLine, type PanelContext } from "../src/comic/page.js";
import { UNIT } from "../src/comic/layout.js";

const canvas = {
  font: "",
  measureText: (t: string) => ({ width: t.length * 7 }),
} as unknown as TextCanvas;

const CONTEXT: PanelContext = {
  turn: 1, camera: "medium", emphatic: false, room: "WEST-OF-HOUSE",
  focus: null, marker: null, kind: "ambient", roomTitle: null, dark: false,
};

function line(speaker: string, text: string, modes = BM_SAY): PageLine {
  return { speaker, text, modes, emotion: [] };
}

/** Long enough that no single panel's balloon band can hold it. */
const FLOOD = Array.from({ length: 90 }, (_, i) => `word${i}`).join(" ");

describe("stageSlots", () => {
  it("spreads the on-stage bodies evenly across the panel", () => {
    const slots = stageSlots(["guide", "hero"], 400);
    expect(slots.get("guide")).toBe(100);
    expect(slots.get("hero")).toBe(300);
  });

  it("centres a lone body", () => {
    expect(stageSlots(["hero"], 400).get("hero")).toBe(200);
  });
});

describe("createFitTest", () => {
  const fit = createFitTest(canvas);

  it("accepts an ordinary line with no leftover", () => {
    const page = createPage({ fit });
    page.addLine(line("hero", "Open the mailbox."), CONTEXT);
    expect(page.panels).toHaveLength(1);
    expect(page.panels[0]!.speakers[0]!.text).toBe("Open the mailbox.");
  });

  it("splits an overlong line across panels, marking the continuation", () => {
    const page = createPage({ fit });
    page.addLine(line("guide", FLOOD), CONTEXT);

    expect(page.panels.length).toBeGreaterThan(1);
    const texts = page.panels.map((panel) => panel.speakers[0]!.text);
    expect(texts[0]!.endsWith("...")).toBe(true);
    expect(texts[1]!.startsWith("...")).toBe(true);
    // Every word survives the split, in order and exactly once.
    const words = texts.flatMap((t) => t.replaceAll("...", " ").split(/\s+/).filter(Boolean));
    expect(words).toEqual(FLOOD.split(" "));
  });

  it("keeps the panel band inside the native panel, not the viewport", () => {
    // The fit test measures at UNIT and nothing else: a panel that splits here
    // splits identically whatever the window is doing (ADR 0006 determinism).
    const run = () => {
      const page = createPage({ fit: createFitTest(canvas) });
      page.addLine(line("guide", FLOOD), CONTEXT);
      return page.panels.map((panel) => panel.speakers[0]!.text);
    };
    expect(run()).toEqual(run());
    expect(UNIT.width).toBe(400);
  });

  it("gives a caption its own panel and still splits it (`BM_ACTION`, `:1064`)", () => {
    const page = createPage({ fit });
    page.addLine(line("hero", "Look."), CONTEXT);
    page.addLine(line("__caption__", FLOOD, BM_ACTION), CONTEXT);
    expect(page.panels.length).toBeGreaterThan(2);
  });
});
