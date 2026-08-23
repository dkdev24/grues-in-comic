/**
 * The Hall of Fame board's pure half (ADR 0011, stage 6.8c).
 *
 * Everything here is a pure function of its arguments — no D1, no `Request`, no
 * clock. That is deliberate: the rules this file holds are the ones ADR 0011
 * calls binding, and rules that can only be exercised by deploying them are
 * rules nobody checks. `hof.ts` is the thin shell that supplies a database, a
 * request and a `now`.
 *
 * Two things this file will *not* do, both by decision:
 *
 * - **It does not verify anything.** ADR 0011 §5: the client cannot be trusted,
 *   replaying a ~420-turn run blows the free tier's 10ms CPU budget, and the
 *   board is an arcade cabinet rather than a ledger. The checks below bound the
 *   damage a bad actor can do to the *shape* of the board. They prove nothing
 *   about whether anyone actually played.
 * - **It does not decide `abandoned`.** There is no such state (ADR 0011 §2) —
 *   the third tier is `playing` with a stale `last_seen`, derived here on read.
 */

/** Zork I's max score, and the only score a finished run can carry. */
export const MAX_SCORE = 350;

/** A run whose last heartbeat is younger than this is `PLAYING NOW`. */
export const FRESH_SECONDS = 120;

/** Unfinished rows older than this are swept on read. A `won` row is forever. */
export const SWEEP_SECONDS = 24 * 60 * 60;

/** One accepted write per run per this many seconds (ADR 0011 §5). */
export const RATE_LIMIT_SECONDS = 20;

/**
 * The upper bound on a plausible move count. A won run is ~420 moves; the cap
 * is far above it because an honest wanderer can take as long as they like, and
 * the number exists only to keep a garbage value out of the column.
 */
export const MAX_MOVES = 100_000;

/** Rows the board shows, and how the 20 are split before borrowing (§1). */
export const BOARD_CAP = 20;
export const WON_SLOTS = 10;
export const LIVE_SLOTS = 5;

/** How many rows the query fetches before the cap is applied in TypeScript. */
export const QUERY_LIMIT = 40;

/** The name an untouched field submits. */
export const DEFAULT_NAME = "ANONYMOUS";

/**
 * 3–12 arcade characters. Letters, digits, space, dot and hyphen — enough for
 * `DKM`, `D. KIM` and `GRUE-BAIT`, and nothing that can carry markup.
 */
const NAME_PATTERN = /^[A-Z0-9 .-]{3,12}$/;

/** What the client mints on a new game — `crypto.randomUUID()` shaped. */
const RUN_ID_PATTERN = /^[A-Za-z0-9-]{8,64}$/;

export type RunState = "playing" | "won";

/** A row as the database holds it. */
export interface RunRow {
  run_id: string;
  name: string;
  score: number;
  moves: number;
  state: RunState;
  country: string | null;
  last_seen: number;
}

/** A row as the board renders it. `run_id` never leaves the server. */
export interface BoardRow {
  name: string;
  score: number;
  moves: number;
  country: string | null;
  tier: "won" | "live" | "recent";
  best: boolean;
}

/** A `POST` body, after it has been believed as little as possible. */
export interface Submission {
  runId: string;
  name: string;
  score: number;
  moves: number;
  done: boolean;
}

/**
 * Fold any name into the allowlist, or fall back to `ANONYMOUS`.
 *
 * Checked here — on the way in — and not at render time, because the amendment
 * of 2026-08-23 put the name on a public page from move 0, before anyone has
 * invested 420 turns in behaving (ADR 0011 §5).
 */
export function normalizeName(raw: unknown): string {
  if (typeof raw !== "string") return DEFAULT_NAME;
  const folded = raw.trim().toUpperCase().replace(/\s+/g, " ");
  return NAME_PATTERN.test(folded) ? folded : DEFAULT_NAME;
}

function asInt(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}

/**
 * Read a submission, or say why it is not one.
 *
 * A rejected *win* is not a rejected *write*: `done` with a score that is not
 * exactly 350 is recorded as an ordinary heartbeat, because the run is probably
 * real and only the claim is wrong. Rejecting the whole write would lose a row
 * that belongs on the board.
 */
export function readSubmission(body: unknown): { ok: true; value: Submission } | { ok: false; error: string } {
  if (typeof body !== "object" || body === null) return { ok: false, error: "not an object" };
  const b = body as Record<string, unknown>;

  const runId = typeof b.run_id === "string" ? b.run_id : "";
  if (!RUN_ID_PATTERN.test(runId)) return { ok: false, error: "bad run_id" };

  const score = asInt(b.score);
  if (score === null || score < 0 || score > MAX_SCORE) return { ok: false, error: "bad score" };

  const moves = asInt(b.moves);
  if (moves === null || moves < 0 || moves > MAX_MOVES) return { ok: false, error: "bad moves" };

  return {
    ok: true,
    value: { runId, name: normalizeName(b.name), score, moves, done: b.done === true && score === MAX_SCORE },
  };
}

/**
 * Two-letter code, or `null` for unknown. `T1` (Tor) and `XX` are unknowns
 * rather than countries, and an unknown renders as an explicit blank rather
 * than a wrong flag (ADR 0011 §4).
 */
export function readCountry(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const code = raw.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code) || code === "T1" || code === "XX") return null;
  return code;
}

function tierOf(row: RunRow, now: number): BoardRow["tier"] {
  if (row.state === "won") return "won";
  return now - row.last_seen < FRESH_SECONDS ? "live" : "recent";
}

/**
 * Sort into the three tiers, cap at 20 with slots borrowed upward, and badge
 * `BEST SO FAR` (ADR 0011 §1).
 *
 * The cap is applied here rather than in SQL on purpose: the tier sort is one
 * readable `ORDER BY`, and slot-borrowing is three readable lines of TypeScript
 * over at most 40 rows. Written as SQL it is neither.
 */
export function buildBoard(rows: readonly RunRow[], now: number): BoardRow[] {
  const won = rows.filter((r) => r.state === "won").sort((a, b) => a.moves - b.moves);
  const unfinished = rows.filter((r) => r.state !== "won");
  const live = unfinished.filter((r) => tierOf(r, now) === "live").sort((a, b) => b.last_seen - a.last_seen);
  const recent = unfinished.filter((r) => tierOf(r, now) === "recent").sort((a, b) => b.last_seen - a.last_seen);

  // Slots borrow upward: a tier that cannot fill its share leaves the room to
  // the ones below it, so an empty won tier — today's state — gives the whole
  // board to live and recent runs rather than showing 10 blank rows.
  const chosen = [
    ...won.slice(0, WON_SLOTS),
    ...live.slice(0, LIVE_SLOTS),
    ...recent,
  ].slice(0, BOARD_CAP);

  // `BEST SO FAR` marks the highest-scoring *unfinished* row on the board. It
  // is a badge and never a sort key — the row does not move (ADR 0011 §1).
  let best: RunRow | null = null;
  for (const row of chosen) {
    if (row.state === "won") continue;
    if (best === null || row.score > best.score || (row.score === best.score && row.last_seen > best.last_seen)) {
      best = row;
    }
  }

  return chosen.map((row) => ({
    name: row.name,
    score: row.score,
    moves: row.moves,
    country: row.country,
    tier: tierOf(row, now),
    best: best !== null && row.run_id === best.run_id && row.score > 0,
  }));
}
