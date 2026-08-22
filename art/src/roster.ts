/**
 * The shipped choosable roster (F16).
 *
 * This is the *product* half of casting: ADR 0004 §11 says what a role needs,
 * `docs/casting-roster-survey.md` measures who has it, and this table is the
 * user's pick out of those pools (survey § *The user's proposed roster*,
 * revised 2026-08-22). It is data, not a derivation — gates 3 (legibility) and
 * 4 (register) are judgements made by looking at figures, and nothing in `art/`
 * can assert them (`docs/PITFALLS.md` → Art pipeline). What *is* machine-
 * checkable — complex type, and the inventory each role's markers need — is
 * checked at pack time by `art/tools/rosterpack.ts` and again in
 * `art/test/roster.test.ts`.
 *
 * `pack` matters: four names exist in both directories and the `artpack1` cut
 * is the richer one, so it is named explicitly rather than resolved by search.
 */
export type RosterRole = "hero" | "guide";

export interface RosterEntry {
  id: string;
  /** Which roles this character may be cast in. Pools are disjoint by design. */
  roles: RosterRole[];
  pack: "comicart" | "artpack1";
}

/** Cast when the player has never chosen — and the pixel gate's canonical cast. */
export const DEFAULT_CAST: Record<RosterRole, string> = { hero: "dan", guide: "tiki" };

export const SHIPPED_ROSTER: RosterEntry[] = [
  // Hero pool (8) — every one owns a BORED face; SHRUG torso is a tiebreaker.
  { id: "dan",      roles: ["hero"],  pack: "comicart" },
  { id: "anna",     roles: ["hero"],  pack: "comicart" },
  { id: "bolo",     roles: ["hero"],  pack: "artpack1" },
  { id: "denise",   roles: ["hero"],  pack: "artpack1" },
  { id: "kevin",    roles: ["hero"],  pack: "artpack1" },
  { id: "lynnea",   roles: ["hero"],  pack: "artpack1" },
  { id: "margaret", roles: ["hero"],  pack: "comicart" },
  { id: "rebecca",  roles: ["hero"],  pack: "artpack1" },
  // DM pool (7) — GUIDE_EMOTION is fixed neutral, so the gate here is type,
  // legibility and register, not marker inventory.
  { id: "tiki",     roles: ["guide"], pack: "comicart" },
  { id: "sage",     roles: ["guide"], pack: "artpack1" },
  { id: "kwensa",   roles: ["guide"], pack: "artpack1" },
  { id: "hugh",     roles: ["guide"], pack: "comicart" },
  { id: "maynard",  roles: ["guide"], pack: "artpack1" },
  { id: "scotty",   roles: ["guide"], pack: "artpack1" },
  { id: "tongtyed", roles: ["guide"], pack: "comicart" },
];

/**
 * Inventory a role's §10 markers require of a candidate, as **face** emotions.
 * The Hero's is the amended §11 gate (BORED face; SHRUG torso optional). The
 * Guide draws one fixed neutral emotion, so it requires only NEUTRAL.
 */
export const ROLE_FACE_REQUIREMENTS: Record<RosterRole, string[]> = {
  hero: ["NEUTRAL", "BORED", "ANGRY", "SCARED"],
  guide: ["NEUTRAL"],
};
