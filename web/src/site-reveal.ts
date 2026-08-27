/**
 * Section-level scroll reveal for the landing page (DESIGN.md §5, amended
 * 2026-08-27 to allow it).
 *
 * **Progressive enhancement, not a loading state.** The CSS only hides a
 * section once `js-reveal` is on `<html>` (`site.css`), and that class is
 * added here only after confirming both `IntersectionObserver` support and
 * `prefers-reduced-motion: no-preference`. A script failure, an old browser,
 * or a reduced-motion preference all leave every section visible from first
 * paint — the same standing rule `hof-client.ts` follows for the network.
 */

/** Pure so the decision is testable without a DOM. */
export function shouldAnimate(reducedMotion: boolean, hasIntersectionObserver: boolean): boolean {
  return !reducedMotion && hasIntersectionObserver;
}

function reveal(): void {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!shouldAnimate(reducedMotion, "IntersectionObserver" in window)) return;

  const sections = document.querySelectorAll<HTMLElement>("main > section");
  if (sections.length === 0) return;

  document.documentElement.classList.add("js-reveal");

  const observer = new IntersectionObserver(
    (entries, obs) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-visible");
        obs.unobserve(entry.target);
      }
    },
    // Root shrunk to the viewport's top half, so a section triggers only once
    // its top edge crosses the vertical middle of the screen — mid-screen is
    // where the reveal should actually be seen, not at the bottom edge.
    { threshold: 0, rootMargin: "0px 0px -50% 0px" },
  );

  for (const section of sections) observer.observe(section);
}

// Guarded so the module can be imported without a DOM, same pattern as
// `hof-board.ts` — the pure helper above is what tests exercise.
if (typeof document !== "undefined") reveal();
