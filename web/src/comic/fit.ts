/**
 * The panelization fit test — `page.ts`'s `FitTest` seam, filled in.
 *
 * `CUnitPanelPage::AddLine` (`panel.cpp:1058`) decides whether a line joins the
 * current panel by *trying the layout*: it clones the panel, adds the line, and
 * keeps the clone only if `LayoutBalloons` succeeds (`:1102`). Phase 2 ported
 * that control flow against a stand-in (`ALWAYS_FITS`); this module supplies the
 * real answer by running the Phase 2b driver over the candidate panel.
 *
 * Two things make this our arrangement rather than a transcription:
 *
 * - **The panel is measured at its native size** ({@link UNIT}), never at the
 *   viewport's. ADR 0007 §2 made panels fixed-size and the *pane* reflow, so the
 *   native size is the one Comic Chat had — and it must be, because panelization
 *   that read the live width would make the panel stream a function of the
 *   window, breaking ADR 0006's determinism invariant and `replayPanels` with it.
 * - **Arrow positions are estimated, not laid out.** The original's panel owns
 *   its avatars, so `m_arrowX` is exact at `AddLine` time. Ours would need the
 *   loaded cast (sheet dimensions feed `layoutAvatars`), which is an async asset
 *   the Director must not wait on. We use evenly spaced stage slots in
 *   `orderBodies` order instead — which is what equal-margin layout
 *   (`panel.cpp:807`) approximates anyway — so the fit test can be a little more
 *   or less generous than the final draw. It decides *whether* a panel splits,
 *   never where a balloon lands, and the renderer re-runs the driver with the
 *   real geometry.
 */

import { BALLOON_FONT } from "./balloon.js";
import { canvasMetrics, layoutBalloons, type BalloonInput } from "./balloon-layout.js";
import { UNIT } from "./layout.js";
import { CAPTION, type Panel } from "./mapper.js";
import type { FitResult, FitTest } from "./page.js";
import { balloonRect, isSpeaker, orderBodies } from "./render.js";

/**
 * A canvas the fit test can measure text on. The browser supplies one from an
 * offscreen canvas; tests supply a synthetic measurer. Only `font` and
 * `measureText` are ever touched, which is why this is not a full context.
 */
export type TextCanvas = Pick<CanvasRenderingContext2D, "font" | "measureText">;

/**
 * Where each on-stage body's face sits, estimated: n equal stage slots across
 * the panel, centres taken in {@link orderBodies}'s stable order. See the module
 * note for why this is an estimate and what that costs.
 */
export function stageSlots(speakers: readonly string[], width: number): Map<string, number> {
  const slots = new Map<string, number>();
  const ordered = orderBodies(speakers);
  const span = width / Math.max(1, ordered.length);
  for (const [i, item] of ordered.entries()) slots.set(item.body, span * (i + 0.5));
  return slots;
}

/**
 * Build the {@link FitTest} `createPage`/`createDirector` take. `canvas` is used
 * only to measure text, and its font is set once here.
 */
export function createFitTest(canvas: TextCanvas): FitTest {
  canvas.font = BALLOON_FONT;
  const ctx = canvas as CanvasRenderingContext2D;
  return (panel: Panel): FitResult => {
    // The band, at the panel's native size — and it must be the *same* band the
    // renderer uses, location box included (ADR 0009 §3), or panelization would
    // pass a panel whose balloons the draw then has nowhere to put.
    const free = balloonRect(UNIT.width, UNIT.height, panel.roomTitle !== null);
    // The bodies that earn the stage are `IsSpeaker`'s (`panel.cpp:743`), the
    // same filter `renderPanel` applies before laying figures out.
    const onStage = panel.bodies.filter((body) => isSpeaker(body, panel.speakers))
      .map((body) => body.speaker);
    const slots = stageSlots(onStage, UNIT.width);

    const inputs: BalloonInput[] = panel.speakers.map((balloon) => ({
      speaker: balloon.speaker,
      isBox: balloon.balloonClass === "CBWoodringBox",
      arrowX: balloon.speaker === CAPTION ? null : (slots.get(balloon.speaker) ?? null),
      text: balloon.text,
      metrics: canvasMetrics(ctx, balloon),
    }));

    const laid = layoutBalloons(inputs, { ...free });
    if (!laid.fits) return { fits: false };
    if (laid.leftover == null) return { fits: true };
    // Force-fit split the (lone) balloon: hand back both halves.
    return { fits: true, leftover: laid.leftover, kept: laid.balloons[0]?.input.text ?? null };
  };
}
