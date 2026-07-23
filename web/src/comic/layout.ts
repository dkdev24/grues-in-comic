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
 * The column ceiling on a wide viewport — a decision, not a fit result.
 *
 * Comic Chat's own default is two (`panel.cpp:56`, `m_panelsPerRow = 2`), but it
 * was laying out a *finished* transcript, where more columns is simply more comic
 * on screen. Ours is a *live* strip: the newest panel is the one the player just
 * caused, so a wider grid trades the thing the reader is looking for against
 * panels they have already read, and it moves the newest panel further from its
 * predecessor.
 *
 * Set to **3 for now** (chosen 2026-07-23): three reads better than two on a wide
 * screen — it shows more of the recent exchange without pushing the newest panel
 * out of a glance, which is the cost the ceiling exists to bound. Higher counts
 * reopen that cost and stay out. This is the `MAX_COLUMNS` ADR 0007 called a
 * "separate, later question"; three is the answer for the MVP.
 */
export const MAX_COLUMNS = 3;

/**
 * Shrink tolerance: the floor a panel may shrink to *in order to earn another
 * column* (ADR 0007 §2).
 *
 * A panel renders at its native size (`UNIT.width`). It never stretches above
 * native — that free stretch is exactly what ADR 0007 reverses in ADR 0004 §4a,
 * because a figure that composes differently at every viewport width is an
 * authoring instability. The one departure from strict-native is downward and
 * bounded: a width that cannot hold two *native* panels but can hold two at
 * ≥ 0.85 native shows the two, rather than marooning one native panel in
 * margin. That is the whole reason columns are fit against 0.85 of the unit
 * rather than the unit itself.
 *
 * This is the *preference* floor — it governs whether a column is worth adding.
 * It is not a floor on a lone panel: a phone too narrow for even one native
 * panel gets a straight fit-down (see {@link layoutStrip}), which can go below
 * 0.85. ADR 0007 offered keeping the old 0.75 as a separate absolute fit floor;
 * a single 0.85 preference floor subsumes it (the old 0.75 fit test only ever
 * decided column count, which is precisely what this now decides), so there is
 * one constant, not two.
 *
 * Replaces the retired `MAX_PANEL_SCALE`: with native as the ceiling there is
 * no strip-level upscale to cap. `render.ts`'s own `MAX_SCALE` (a figure's
 * scale *inside* a panel) is a different cap and is unaffected.
 */
export const MIN_PANEL_SCALE = 0.85;

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
 *
 * The original fits columns against the native unit width. This port fits
 * against `MIN_PANEL_SCALE` of it instead — the smallest a panel may shrink
 * to in order to earn a column (ADR 0007 §2) — so a width that cannot hold two
 * *native* panels but can hold two at ≥ 0.85 native still gets the two-up
 * layout (`layoutStrip` fills in the actual share width, which is between
 * `0.85·UNIT.width` and `UNIT.width`, afterward).
 */
export function columnsFor(available: number, gutter: number, maxColumns = MAX_COLUMNS): number {
  const minWidth = UNIT.width * MIN_PANEL_SCALE;
  const fit = Math.floor((available + gutter) / (minWidth + gutter));
  return Math.max(1, Math.min(fit, maxColumns));
}

/**
 * The strip's geometry at a given container width.
 *
 * ADR 0007 §2 restores Comic Chat's fixed panel: `m_unitWidth` is held
 * constant and the *column count* reflows, not the panel. A panel is never
 * stretched above native — the leftover of a row that cannot be filled with
 * another native panel becomes gutter and centred margin, which is exactly what
 * `PreparePrintDC` does with its own remainder (`panel.cpp:1471`). So the wide
 * viewport lands on the original's behaviour rather than away from it.
 *
 * The panel width is therefore `min(share, UNIT.width)`, which resolves to one
 * of three cases:
 *
 * - **Native.** `share ≥ UNIT.width`: the panel sits at native and the row is
 *   centred in its leftover. The common case at every width above one column's
 *   worth of space.
 * - **Shrink-to-earn-a-column.** `0.85·UNIT.width ≤ share < UNIT.width`: this
 *   only arises because `columnsFor` fit the extra column against
 *   {@link MIN_PANEL_SCALE}; the panels shrink to the share so both fit,
 *   staying inside the `[0.85·native, native]` band §2 tuned §7 and §2a against.
 * - **Fit-down.** One column on a phone narrower than a native panel: `share`
 *   is the whole viewport and below native, so the lone panel scales down to
 *   fit rather than overflow. This is the only case that may drop below 0.85,
 *   and §2 sanctions it ("a straight fit-down on the narrowest phones").
 */
export function layoutStrip(available: number, options: LayoutOptions = {}): StripLayout {
  const gutter = options.gutter ?? 10;
  // A container that has not been measured yet reports 0; fall back to the unit
  // rather than dividing a row into a zero-width panel.
  const width = available > 0 ? available : UNIT.width;
  const columns = columnsFor(width, gutter, options.maxColumns);
  const share = (width - (columns - 1) * gutter) / columns;
  // Native is the ceiling — never a free stretch (ADR 0007 §2). The strip-level
  // upscale (retired `MAX_PANEL_SCALE`) is gone with it.
  const panelWidth = Math.max(1, Math.min(share, UNIT.width));
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
