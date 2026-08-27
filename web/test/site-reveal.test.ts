/**
 * `shouldAnimate` is the whole decision `site-reveal.ts` makes before it ever
 * touches the DOM (DESIGN.md §5, amended 2026-08-27): a reduced-motion
 * preference or a missing `IntersectionObserver` must both, independently,
 * leave every section visible rather than hidden-forever.
 */

import { describe, expect, it } from "vitest";
import { shouldAnimate } from "../src/site-reveal.js";

describe("shouldAnimate", () => {
  it("animates only with no-preference motion and IntersectionObserver support", () => {
    expect(shouldAnimate(false, true)).toBe(true);
  });

  it("refuses to animate under prefers-reduced-motion, even with support", () => {
    expect(shouldAnimate(true, true)).toBe(false);
  });

  it("refuses to animate without IntersectionObserver, even with no-preference motion", () => {
    expect(shouldAnimate(false, false)).toBe(false);
  });

  it("refuses both at once", () => {
    expect(shouldAnimate(true, false)).toBe(false);
  });
});
