/**
 * Session persistence (stage 5.4): surviving a page reload.
 *
 * **What is persisted is the turn history, not the rendered output.** A save
 * restores engine state, but `Engine.restore` emits no events by design — so a
 * shell that persisted state alone would come back with a correct world and two
 * empty panes: no transcript, no strip. The obvious fix is to persist what each
 * pane drew, and it is the wrong one, because it invents a second schema for
 * every pane and freezes today's rendering into the save file.
 *
 * Persisting `Turn[]` instead means resume replays the *same* `play()` the live
 * game uses. Both panes rebuild through the code path they already have, and a
 * change to either renderer applies retroactively to saved games rather than
 * conflicting with them. The comic strip reproduces exactly: `Panel`s are a pure
 * function of the turn sequence, and the pose round-robin is deterministic when
 * replayed from the start (HANDOFF: the cycle is frozen per panel, so replaying
 * the whole sequence into a fresh cycle map yields the bodies it drew before).
 *
 * The engine state still rides along: replaying turns *renders* them, it does
 * not re-execute them, so `SaveState` remains the only source of world truth.
 *
 * **A corrupt autosave must not be a brick.** Every failure to read resolves to
 * "no saved game" *and clears the slot* — an autosave that throws on boot would
 * otherwise make the game unstartable, with no in-game way to recover.
 */

import type { SaveState } from "../../engine/src/engine.js";
import type { Turn } from "./session.js";
import type { CastChoice } from "./comic/figure.js";
import { createMixTracker } from "./event-mix.js";

/**
 * Envelope schema version — the *shell's*, distinct from the ADR 0002 contract
 * version inside `save`. It changes when the envelope's own shape changes;
 * the contract version is checked separately by `Session.load`.
 */
export const ENVELOPE_VERSION = 1;

/**
 * A turn as stored: {@link Turn} without `mix`.
 *
 * **`mix` is derived and must not be persisted.** `EventMix.counts` is a `Map`,
 * and `JSON.stringify` renders a `Map` as `{}` — silently, with no error until
 * something calls `.get` on the revived object. Storing it would also mean a
 * saved game carried a *running total* computed by the build that wrote it.
 * Both problems disappear by recomputing: the mix is a fold over `events`, so
 * replaying the events through a fresh tracker reproduces it exactly.
 */
export type PersistedTurn = Omit<Turn, "mix">;

export interface PersistedSession {
  version: number;
  save: SaveState;
  /** Every turn since the opening one, in order, for replay through `play()`. */
  turns: Turn[];
  /**
   * The cast this game was read with (F16), absent for a game saved before
   * casting existed or played with the packed default.
   *
   * It lives in the envelope because a resumed session **re-draws its whole
   * history**: without it, a save made as rebecca comes back as dan, and every
   * panel the player already read silently changes who is in it. It is stored
   * as an optional field rather than as an envelope-version bump precisely so
   * that older saves keep loading — a version mismatch clears the slot, and
   * wiping someone's game to record a cosmetic choice is a bad trade.
   */
  cast?: CastChoice;
}

export interface SessionStore {
  /** The saved session, or `null` when absent, unreadable, or the wrong version. */
  read(): PersistedSession | null;
  /** Persist a session. Throws {@link StorageFullError} when the quota is hit. */
  write(save: SaveState, turns: readonly Turn[], cast?: CastChoice): void;
  clear(): void;
}

/**
 * Storage is full. Distinguished from other write failures because it is the
 * one the player can act on, and because it is *expected* in a long game: the
 * history grows without bound and browser quotas are typically ~5 MB.
 */
export class StorageFullError extends Error {
  constructor(cause: unknown) {
    super("no room left in browser storage");
    this.name = "StorageFullError";
    this.cause = cause;
  }
}

/**
 * A save slot over `Storage`.
 *
 * Takes the storage rather than reaching for `localStorage`, so the failure
 * modes that matter — corrupt payload, full quota, storage disabled entirely —
 * are reachable from tests instead of only from a real browser in a bad state.
 */
export function createSessionStore(key: string, storage: Storage): SessionStore {
  return {
    read() {
      let raw: string | null;
      try {
        raw = storage.getItem(key);
      } catch {
        // Storage can throw on *access* (Safari private mode, blocked cookies).
        // That is not a corrupt save, so there is nothing to clear.
        return null;
      }
      if (raw === null) return null;

      try {
        const parsed = JSON.parse(raw) as {
          version: number; save: SaveState; turns: PersistedTurn[]; cast?: CastChoice;
        };
        if (!isWellFormed(parsed)) throw new Error("malformed envelope");
        // A future version's envelope is not readable by this build. Clearing is
        // still right: the alternative is a slot that fails forever and blocks
        // every new autosave.
        if (parsed.version !== ENVELOPE_VERSION) throw new Error("version mismatch");
        return {
          version: parsed.version, save: parsed.save, turns: rehydrate(parsed.turns),
          ...(parsed.cast ? { cast: parsed.cast } : {}),
        };
      } catch {
        this.clear();
        return null;
      }
    },

    write(save, turns, cast) {
      const envelope = {
        version: ENVELOPE_VERSION,
        save,
        ...(cast && Object.keys(cast).length > 0 ? { cast } : {}),
        // Drop `mix` on the way out; `read` rebuilds it. See {@link PersistedTurn}.
        turns: turns.map(({ command, events, status }): PersistedTurn => ({
          command, events, status,
        })),
      };
      try {
        storage.setItem(key, JSON.stringify(envelope));
      } catch (err) {
        if (isQuotaError(err)) throw new StorageFullError(err);
        throw err;
      }
    },

    clear() {
      try {
        storage.removeItem(key);
      } catch {
        // Nothing useful to do, and failing to clear must not fail a boot.
      }
    },
  };
}

/**
 * Rebuild each turn's `mix` by folding its events through a fresh tracker.
 *
 * Order matters: the mix is cumulative, so this has to run over the whole
 * history from the first turn — the same order `play()` observed them in.
 */
function rehydrate(turns: readonly PersistedTurn[]): Turn[] {
  const tracker = createMixTracker();
  return turns.map((turn) => ({ ...turn, mix: tracker.observe(turn.events) }));
}

/**
 * Shape check before trusting a payload.
 *
 * Deliberately shallow: it separates "this is our envelope" from "this is some
 * other page's key or a truncated write", which is what the recovery path needs
 * to decide. Deep validation of `SaveState` belongs to `Session.load`, which
 * already rejects on contract version and is the component that knows the rules.
 */
function isWellFormed(value: unknown): value is PersistedSession {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Partial<PersistedSession>;
  return (
    typeof v.version === "number" &&
    typeof v.save === "object" && v.save !== null &&
    Array.isArray(v.turns)
  );
}

/** Quota errors are a `DOMException`, but the name differs across browsers. */
function isQuotaError(err: unknown): boolean {
  return (
    err instanceof Error &&
    (err.name === "QuotaExceededError" || err.name === "NS_ERROR_DOM_QUOTA_REACHED")
  );
}
