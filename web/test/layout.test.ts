/**
 * Panel sequencing, checked against the port it claims to be.
 *
 * The standing failure mode in this codebase is a **total function with a wrong
 * answer** — 5.3's backdrop stub always returned *a* backdrop, `scrollIntoView`
 * always scrolled — so nothing here asserts that a layout came back. Every
 * assertion below names the number it expects: the column count at a given
 * width, the panel width that follows from it, the cell a given index lands in.
 *
 * These run in Node with no DOM, which is the point of `layout.ts` being pure.
 */

import { describe, expect, it } from "vitest";
import {
  cellFor, columnsFor, layoutStrip, MAX_COLUMNS, MAX_PANEL_SCALE, UNIT,
} from "../src/comic/layout.js";

const GUTTER = 10;

describe("columnsFor — panel.cpp:1456", () => {
  it("fits n panels when n*unit + (n-1)*gutter fits, and not one pixel sooner", () => {
    // The boundary is the whole content of the ported expression, so test *at*
    // it rather than near it: two columns need 400 + 10 + 400 = 810.
    expect(columnsFor(809, GUTTER)).toBe(1);
    expect(columnsFor(810, GUTTER)).toBe(2);
  });

  it("never returns zero columns, however narrow the pane", () => {
    // A phone in portrait is under one unit wide. Zero columns would be a
    // division by zero in `layoutStrip` and an invisible one: the panel would
    // come back `Infinity` wide and simply not draw.
    expect(columnsFor(320, GUTTER)).toBe(1);
    expect(columnsFor(1, GUTTER)).toBe(1);
    expect(columnsFor(0, GUTTER)).toBe(1);
  });

  it("caps at Comic Chat's own m_panelsPerRow, not at what fits", () => {
    // 4000px fits nine columns. The cap is a decision (`layout.ts`), so pin it
    // to the constant rather than to the literal 2 — a future change to the
    // ceiling should not need this test edited, only re-read.
    expect(columnsFor(4000, GUTTER)).toBe(MAX_COLUMNS);
    expect(columnsFor(4000, GUTTER, 3)).toBe(3);
  });
});

describe("layoutStrip", () => {
  it("stretches panels to fill the row below the cap", () => {
    // One column at 500px: the panel takes the width, larger than native.
    expect(layoutStrip(500, { gutter: GUTTER })).toEqual({
      columns: 1, panelWidth: 500, panelHeight: 425,
    });
  });

  it("divides the row evenly once a second column fits", () => {
    const layout = layoutStrip(810, { gutter: GUTTER });
    expect(layout.columns).toBe(2);
    expect(layout.panelWidth).toBe(400);
    // The row's own arithmetic, restated: the panels plus the gutter are the
    // width. If this drifts, the grid overflows and the strip scrolls sideways.
    expect(layout.panelWidth * 2 + GUTTER).toBe(810);
  });

  it("stops growing at the scale cap and leaves the rest as margin", () => {
    // 2000px over two columns would give 995 each — 2.5x native. The cap holds
    // it at 640, and the leftover becomes centring, which is what
    // `PreparePrintDC` does with its own.
    const layout = layoutStrip(2000, { gutter: GUTTER });
    expect(layout.panelWidth).toBe(UNIT.width * MAX_PANEL_SCALE);
    expect(layout.panelWidth).toBeLessThan((2000 - GUTTER) / 2);
  });

  it("keeps the native aspect at every width", () => {
    for (const width of [320, 500, 810, 1200, 2000]) {
      const layout = layoutStrip(width, { gutter: GUTTER });
      // Panels are square-ish, not letterboxed by the viewport: a panel that
      // took the container's aspect would crop the figures, and the figures are
      // the one thing §4a says must not distort.
      expect(layout.panelHeight / layout.panelWidth).toBeCloseTo(UNIT.height / UNIT.width, 2);
    }
  });

  it("falls back to one native panel when the container has not been measured", () => {
    // A 0-width container is the real first-paint case, not a hypothetical.
    expect(layoutStrip(0, { gutter: GUTTER })).toEqual({
      columns: 1, panelWidth: UNIT.width, panelHeight: UNIT.height,
    });
  });
});

describe("cellFor — panel.cpp:1016", () => {
  it("fills row-major, which is the strip's DOM order", () => {
    const cells = [0, 1, 2, 3, 4].map((i) => cellFor(i, 2));
    expect(cells).toEqual([
      { row: 0, column: 0 }, { row: 0, column: 1 },
      { row: 1, column: 0 }, { row: 1, column: 1 },
      { row: 2, column: 0 },
    ]);
  });

  it("renumbers on a column change without reordering", () => {
    // A resize changes which cell a panel sits in; it must not change which
    // panel comes after which, or the comic would read differently at two
    // window sizes. Reading order is the index, and the index is untouched.
    const wide = [0, 1, 2, 3].map((i) => cellFor(i, 2));
    const narrow = [0, 1, 2, 3].map((i) => cellFor(i, 1));
    expect(wide.map((c) => c.row)).toEqual([0, 0, 1, 1]);
    expect(narrow.map((c) => c.row)).toEqual([0, 1, 2, 3]);
    expect(narrow.every((c) => c.column === 0)).toBe(true);
  });
});
