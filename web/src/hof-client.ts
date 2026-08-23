/**
 * The board's client half (ADR 0011 §3, stage 6.8d).
 *
 * Three writes and no more: **start** when the player presses Begin, a
 * **heartbeat** as they play, and a **win** at the Stone Barrow. The endpoint
 * (`functions/api/hof.ts`) treats all three the same way; the difference is only
 * what they carry.
 *
 * Two rules this module exists to keep honest:
 *
 * - **Opting out means nothing is sent.** Not filtered server-side, not sent
 *   with a flag — the request never happens (ADR 0011 §3.3). That is why
 *   `listed` is checked here, in the one place every write goes through.
 * - **A board is never worth a turn.** Every failure is swallowed. The game must
 *   play identically with the network unplugged, the endpoint 500ing, or an ad
 *   blocker eating the request — the same standing rule `analytics.ts` follows.
 */

/** One write per this many moves, at most one per this many ms (ADR 0011 §1). */
export const HEARTBEAT_MOVES = 10;
export const HEARTBEAT_MS = 60_000;

export const ENDPOINT = "/api/hof";

/** What a run needs to identify and describe itself. */
export interface RunIdentity {
  runId: string;
  name: string;
  /** `false` when the player opted out — then nothing is ever sent. */
  listed: boolean;
}

export interface Reporter {
  /** The run exists. Sent once, and the only write that carries the name. */
  start(): void;
  /** Called every turn; sends only when {@link shouldSend} says so. */
  progress(score: number, moves: number): void;
  /** The Stone Barrow. Always sent, whatever the heartbeat clock says. */
  win(score: number, moves: number): void;
}

/**
 * A random run id. `crypto.randomUUID` needs a secure context, which `/play`
 * has and a plain-HTTP dev server may not — so there is a fallback, and it is
 * only ever an anti-collision device. **Nothing about this value identifies a
 * person, and nothing may ever make it do so** (ADR 0011 §2).
 */
export function mintRunId(): string {
  try {
    if (typeof crypto?.randomUUID === "function") return crypto.randomUUID();
  } catch {
    // Fall through — a run id that cannot be minted from crypto is still a run id.
  }
  const bytes = new Uint8Array(16);
  try {
    crypto.getRandomValues(bytes);
  } catch {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Is this turn worth a write?
 *
 * Pure, and tested, because it is the whole of the cost argument: at one write
 * per 10 moves a ~420-move run is ~42 writes to one row, which is what keeps
 * the board inside the free tier (ADR 0011 Context). The time clause exists for
 * the opposite case — a player who thinks for ten minutes between moves should
 * still hold their `PLAYING NOW` badge.
 */
export function shouldSend(
  moves: number, lastMoves: number, nowMs: number, lastMs: number,
): boolean {
  if (moves <= lastMoves) return false;
  return moves - lastMoves >= HEARTBEAT_MOVES || nowMs - lastMs >= HEARTBEAT_MS;
}

interface ReporterOptions {
  /** Injected so tests need no network and no clock. */
  send?: (body: unknown) => void;
  now?: () => number;
}

export function createReporter(identity: RunIdentity, options: ReporterOptions = {}): Reporter {
  const now = options.now ?? (() => Date.now());
  const send = options.send ?? post;

  let lastMoves = 0;
  let lastMs = 0;
  let done = false;

  const write = (score: number, moves: number, extra?: { done: true }): void => {
    // The single gate every write passes through. An opted-out run reaches the
    // network nowhere else, because there is nowhere else.
    if (!identity.listed || done) return;
    lastMoves = moves;
    lastMs = now();
    if (extra) done = true;
    send({ run_id: identity.runId, name: identity.name, score, moves, ...extra });
  };

  return {
    start() {
      write(0, 0);
    },
    progress(score, moves) {
      if (shouldSend(moves, lastMoves, now(), lastMs)) write(score, moves);
    },
    win(score, moves) {
      write(score, moves, { done: true });
    },
  };
}

/**
 * Fire and forget. `keepalive` so a win recorded as the player closes the tab
 * still leaves — the one write where that matters, and the reason this is not
 * a plain `fetch(...).catch()`.
 */
function post(body: unknown): void {
  try {
    void fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // No fetch, no network, no board. The game is unaffected.
  }
}
