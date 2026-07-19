/**
 * Scope (stage 4.2) — which objects the player can refer to from where they
 * stand.
 *
 * This is the parser's half of the question ("did you mean something that is
 * actually here?") and stage 4.3 consumes the same answer for the syntax rules'
 * search options (HELD / CARRIED / IN-ROOM / ON-GROUND). Keeping one definition
 * matters: a parser that finds an object the action layer then refuses is how
 * IF games end up with two different ideas of "here".
 *
 * ZIL's four sources, all present:
 * 1. what the player carries (recursively, through open containers),
 * 2. what is in the room (likewise),
 * 3. the room's scenery list — objects pooled in LOCAL-GLOBALS,
 * 4. GLOBAL-OBJECTS, in scope everywhere (hands, walls, the grue).
 */

import {
  childrenOf,
  hasFlag,
  here,
  PLAYER_ID,
  type GameState,
  type WorldIndex,
} from "./state.js";

/** Where a scoped object came from — the syntax search options need this. */
export type ScopeOrigin =
  /** Directly carried by the player (ZIL HELD). */
  | "held"
  /** Inside something the player carries (ZIL CARRIED, the wider sense). */
  | "carried"
  /** Loose in the room (ZIL ON-GROUND). */
  | "on-ground"
  /** Inside something in the room (ZIL IN-ROOM, the wider sense). */
  | "in-room"
  /** From the room's scenery pool (LOCAL-GLOBALS). */
  | "scenery"
  /** In scope everywhere (GLOBAL-OBJECTS). */
  | "global";

export interface ScopeEntry {
  id: string;
  origin: ScopeOrigin;
}

/**
 * Can the contents of this container be reached or seen?
 *
 * ZIL's rule, and the one that makes the glass bottle work: an open container
 * yields its contents, a transparent one shows them, and a *surface* (a table,
 * the trophy case's shelf) never hides anything at all.
 */
export function containerIsPermeable(state: GameState, id: string): boolean {
  return (
    hasFlag(state, id, "OPENBIT") ||
    hasFlag(state, id, "TRANSBIT") ||
    hasFlag(state, id, "SURFACEBIT")
  );
}

/**
 * Everything the player can currently refer to.
 *
 * Order is deliberate — held things first, then the room — because it is also
 * the disambiguation preference: "TAKE the lamp" means the one in your hand
 * before the one on the floor.
 */
export function scope(world: WorldIndex, state: GameState): ScopeEntry[] {
  const found: ScopeEntry[] = [];
  const seen = new Set<string>([PLAYER_ID]);

  const add = (id: string, origin: ScopeOrigin): void => {
    if (seen.has(id)) return;
    // INVISIBLE is ZIL's "the parser cannot see this yet" bit, not a rendering
    // hint — it is how the thief stays unmentionable until he appears.
    if (hasFlag(state, id, "INVISIBLE")) return;
    seen.add(id);
    found.push({ id, origin });
  };

  const descend = (container: string, direct: ScopeOrigin, nested: ScopeOrigin): void => {
    for (const child of childrenOf(state, container)) {
      add(child, direct);
      if (containerIsPermeable(state, child)) descend(child, nested, nested);
    }
  };

  descend(PLAYER_ID, "held", "carried");

  const room = here(state);
  descend(room, "on-ground", "in-room");

  for (const id of world.rooms.get(room)?.scenery ?? []) add(id, "scenery");

  for (const meta of world.doc.metaEntities ?? []) {
    if (meta.role === "global-objects") {
      for (const child of childrenOf(state, meta.id)) {
        // LOCAL-GLOBALS nests here but is a pool, not a member: its contents
        // are in scope only for rooms that name them in `scenery`, above.
        if (world.entityKind.get(child) === "meta") continue;
        add(child, "global");
      }
    }
  }

  return found;
}

/** Is this object referable from where the player stands? */
export function inScope(world: WorldIndex, state: GameState, id: string): boolean {
  return scope(world, state).some((e) => e.id === id);
}

/**
 * ZIL's search options mix two unrelated ideas in one list. Only these four say
 * *where to look*; MANY (multiple objects allowed), HAVE ("you aren't holding
 * that") and TAKE (implicit take) constrain what the **action** may do and are
 * stage 4.3's business.
 *
 * The distinction is load-bearing, not tidiness: EXAMINE's only option is MANY,
 * so treating the whole list as a location filter narrows its search to nothing
 * and "EXAMINE MAILBOX" stops working while "TAKE MAILBOX" keeps working.
 */
const LOCATION_OPTIONS = ["HELD", "CARRIED", "ON-GROUND", "IN-ROOM"] as const;

/**
 * Origins that satisfy a syntax rule's search options. Absent options — or
 * options that say nothing about location — accept anything in scope, which is
 * ZIL's default.
 */
export function originAllowed(
  origin: ScopeOrigin,
  options: readonly string[] | undefined,
): boolean {
  if (options === undefined || options.length === 0) return true;

  const locations = options.filter((o) =>
    (LOCATION_OPTIONS as readonly string[]).includes(o),
  );
  if (locations.length === 0) return true;

  for (const option of locations) {
    switch (option) {
      case "HELD":
        if (origin === "held") return true;
        break;
      case "CARRIED":
        if (origin === "held" || origin === "carried") return true;
        break;
      case "ON-GROUND":
        if (origin === "on-ground") return true;
        break;
      case "IN-ROOM":
        // Everything the room offers, scenery and globals included — this is
        // the broad option, and scenery exists precisely to be referred to.
        if (
          origin === "on-ground" ||
          origin === "in-room" ||
          origin === "scenery" ||
          origin === "global"
        ) {
          return true;
        }
        break;
    }
  }
  return false;
}
