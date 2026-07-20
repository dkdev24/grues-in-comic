/**
 * Panel sequencing (stage 5.4) — the Layout Manager policy of ADR 0004 §5.
 *
 * The panel stream is the data structure; a *page* is a policy over it. This
 * file is the on-screen policy, and it is a port with a named source site
 * rather than an invention: `CUnitPanelPage` in
 * `original-projects/comic-chat/v2.5-beta-1/panel.cpp` lays panels out as a
 * **uniform grid**. Every panel is exactly `m_unitWidth` wide (`panel.cpp:669`,
 * `:1023`); a panel's cell is `index % panelsPerRow` across and
 * `index / panelsPerRow` down (`panel.cpp:1016`); and the number of columns is
 * derived from the space available rather than stored (`panel.cpp:1456`).
 *
 * **Comic Chat does not vary panel width by shot.** That is worth stating
 * because the obvious "comic-book" instinct — a wide establishing panel, a
 * narrow reaction beat — is exactly what the original does not do, and adopting
 * it would make §7's camera ladder decide layout as well as framing. The rungs
 * stay a framing decision (`render.ts`); this file only flows.
 *
 * Like `render.ts` this is pure and canvas-free: it takes a width in CSS pixels
 * and returns numbers, so the whole sequencing rule is testable in Node.
 */

/** Native panel size — the art is ~400x400, so this is the 1:1 point (§4a). */
export const UNIT = { width: 400, height: 340 };

/**
 * Comic Chat's own default (`panel.cpp:56`, `m_panelsPerRow = 2`), kept as the
 * ceiling rather than as the answer.
 *
 * The original was laying out a finished transcript, where more columns is
 * simply more comic on screen. Here the strip is *live* and the newest panel is
 * the one the player just caused, so a wide grid trades the thing the reader is
 * looking for against panels they have already read. Two is the historical
 * number and it is also the largest number that keeps the newest panel within a
 * glance of the previous one.
 */
export const MAX_COLUMNS = 2;

/**
 * The scale cap from 5.3, unchanged: this art is ~400px native, so the risk on
 * a large viewport is blowing a figure up into its own pixels.
 *
 * Named `MAX_PANEL_SCALE` rather than `MAX_SCALE` because `render.ts` already
 * owns a `MAX_SCALE` and it caps a *different* thing — a figure's scale inside
 * a panel, not a panel's scale inside the strip. They happen to hold the same
 * number for the same reason, and that is exactly why one name for both would
 * eventually get one of them changed on the other's evidence.
 */
export const MAX_PANEL_SCALE = 1.6;

export interface StripLayout {
  /** Panels per row. Always at least 1. */
  columns: number;
  /** CSS-pixel width of one panel. */
  panelWidth: number;
  /** CSS-pixel height of one panel, at the native aspect. */
  panelHeight: number;
}

export interface LayoutOptions {
  /** Space between panels, both axes. */
  gutter?: number;
  /** Ceiling on columns; defaults to {@link MAX_COLUMNS}. */
  maxColumns?: number;
}

/**
 * How many panels fit across `available` pixels.
 *
 * Ported from `panel.cpp:1456`:
 *
 * ```cpp
 * panelsWide = (pageWidth + m_vInterstice) / (m_unitWidth + m_hInterstice);
 * ```
 *
 * derived, as the comment above it says, from
 * `n * unit + (n - 1) * interstice <= page`.
 *
 * **The original mixes its two interstices there** — `m_vInterstice` in the
 * numerator against `m_hInterstice` in the denominator — where the companion
 * `panelsHigh` line one line up uses `m_hInterstice` for both. It is a real bug
 * in the source and it is invisible in Comic Chat because both interstices are
 * set to the same value, so the two expressions agree. It is *not* reproduced
 * here: this is one gutter, and reproducing a typo that never fired would be
 * transcription rather than porting.
 */
export function columnsFor(available: number, gutter: number, maxColumns = MAX_COLUMNS): number {
  const fit = Math.floor((available + gutter) / (UNIT.width + gutter));
  return Math.max(1, Math.min(fit, maxColumns));
}

/**
 * The strip's geometry at a given container width.
 *
 * Two things happen to the leftover space, and which one happens is §4a's
 * ruling rather than a fallback:
 *
 * - Below the cap, panels **stretch** to fill the row. The original held
 *   `m_unitWidth` fixed; §4a is explicit that where responsiveness and retro
 *   fidelity conflict, the constant becomes a parameter, and that is already
 *   what 5.3 did per panel.
 * - At the cap, panels stop growing and the row is **centred**, which is what
 *   `PreparePrintDC` does with its own leftover (`panel.cpp:1471`). So the wide
 *   viewport lands back on the original's behaviour, not away from it.
 */
export function layoutStrip(available: number, options: LayoutOptions = {}): StripLayout {
  const gutter = options.gutter ?? 10;
  // A container that has not been measured yet reports 0; fall back to the unit
  // rather than dividing a row into a zero-width panel.
  const width = available > 0 ? available : UNIT.width;
  const columns = columnsFor(width, gutter, options.maxColumns);
  const share = (width - (columns - 1) * gutter) / columns;
  const panelWidth = Math.max(1, Math.min(share, UNIT.width * MAX_PANEL_SCALE));
  return {
    columns,
    panelWidth,
    panelHeight: Math.round((panelWidth / UNIT.width) * UNIT.height),
  };
}

/**
 * Which cell a panel occupies. `panel.cpp:1016`, kept as its own function
 * because it is the half of the port that says *reading order is row-major* —
 * the strip's DOM order and the grid's flow have to agree with it or a resize
 * would renumber the comic.
 */
export function cellFor(index: number, columns: number): { row: number; column: number } {
  return { row: Math.floor(index / columns), column: index % columns };
}
