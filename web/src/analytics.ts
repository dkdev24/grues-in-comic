/**
 * Umami event tracking. `window.umami` can be `undefined` — an ad blocker, or
 * the deferred script simply hasn't loaded yet — so `track` is a no-op rather
 * than a page-breaking error in that case; nothing here depends on the call
 * actually landing.
 */

export interface UmamiEventData {
  readonly [key: string]: string | number;
}

declare global {
  interface Window {
    umami?: { track(event: string, data?: UmamiEventData): void };
  }
}

export function track(event: string, data?: UmamiEventData): void {
  window.umami?.track(event, data);
}

/** Zork I's max score — the same 350 the extracted `SCORE-UPD` routine checks
 *  against (`engine/src/game-actions.ts`), reached at the trophy case, not at
 *  the Stone Barrow win itself. */
export const MAX_SCORE = 350;

const MILESTONE_FRACTIONS = [0.25, 0.5, 0.75, 1] as const;

/**
 * Which score milestones does `newScore` newly cross that `prevScore` had not
 * already reached? Pure so it's testable without a DOM or a live
 * `window.umami` — `main.ts` folds it over each live turn's status.
 */
export function crossedMilestones(prevScore: number, newScore: number): readonly number[] {
  return MILESTONE_FRACTIONS.map((f) => Math.round(MAX_SCORE * f)).filter(
    (threshold) => prevScore < threshold && newScore >= threshold,
  );
}
