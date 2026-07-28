/**
 * The surface labels — ADR 0006 Slice 3.
 *
 * A relabel is the kind of change that reverts by accident: nothing breaks when
 * a label drifts back, no pixel test covers a `figcaption`, and the string lives
 * next to a dozen internal ids that legitimately still say `guide`. So the
 * decision itself is pinned here — the *name* the page shows, and the boundary
 * that keeps it from leaking into the role ids the manifest and mapper use.
 */

import { describe, expect, it } from "vitest";
import { castLabel } from "../src/comic-view.js";
import { GUIDE, HERO } from "../src/comic/mapper.js";

describe("cast labels (ADR 0006 Slice 3)", () => {
  it("calls the DM by a proper name, not by role or by drawing", () => {
    expect(castLabel(GUIDE)).toBe("Dungeon Master");
    // The two labels the ADRs rule out: ADR 0004's standing "never Narrator",
    // and the pre-Slice-3 role label the relabel replaced.
    expect(castLabel(GUIDE)).not.toBe("Narrator");
    expect(castLabel(GUIDE)).not.toBe("Guide");
    // `tiki` is the *drawing* (ADR 0004 §11), never the character.
    expect(castLabel(GUIDE)).not.toBe("Tiki");
  });

  it("leaves the Hero a role label — his identity was not reopened", () => {
    expect(castLabel(HERO)).toBe("Hero");
  });

  it("keeps role ids out of the relabel", () => {
    // The label is presentation only: the ids the manifest, the mapper and the
    // panel stream key on are unchanged, which is what makes this slice
    // reversible and keeps it clear of the parity oracle.
    expect(GUIDE).toBe("guide");
    expect(HERO).toBe("hero");
  });

  it("falls back to a capitalized id for a cast member it has no name for", () => {
    // A mob, once a later slice casts one, must still appear in the bar.
    expect(castLabel("mob-a")).toBe("Mob-a");
  });
});
