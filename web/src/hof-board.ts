/**
 * The Hall of Fame board on the landing page (ADR 0011 §1, stage 6.8e).
 *
 * A cabinet-style table of recent runs: finished runs on top by moves, runs
 * with a fresh heartbeat badged `PLAYING NOW`, the rest as recent runs. The
 * server decides the order, the cap and the badges (`functions/api/hof-core.ts`);
 * this file only draws what it is handed.
 *
 * **The empty state is a real state, not a failure.** Before the first visitor
 * there are no rows at all, and today there are no winners — so the board must
 * read as a cabinet waiting for its first player rather than as a broken table.
 * That is also why a failed fetch renders the same quiet line instead of an
 * error: a landing page does not owe a visitor a stack trace.
 */

export interface BoardRow {
  name: string;
  score: number;
  moves: number;
  country: string | null;
  tier: "won" | "live" | "recent";
  best: boolean;
}

const ENDPOINT = "/api/hof";
const EMPTY_LINE = "No runs yet. Be the first name on this board.";

/** Ordinals for the finished tier only — an unfinished run has no rank. */
const ORDINALS = ["1ST", "2ND", "3RD"];

/**
 * A two-letter code as a flag, by offsetting its letters into the regional
 * indicator range. No assets, no lookup table — and no flag at all for an
 * unknown, which the server already resolved to `null` (ADR 0011 §4).
 */
export function flagOf(code: string | null): string {
  if (code === null || !/^[A-Z]{2}$/.test(code)) return "";
  return String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

/**
 * The leftmost column: a rank for a finished run, a badge for a live one, and
 * nothing at all for a run that is merely recent. Pure and exported because it
 * is the one piece of this file worth a test — the DOM around it is not, by the
 * same standing judgement that leaves `main.ts` untested.
 */
export function markFor(tier: BoardRow["tier"], wonIndex: number): string {
  if (tier === "live") return "▸ PLAYING NOW";
  if (tier !== "won") return "";
  return ORDINALS[wonIndex] ?? `${wonIndex + 1}TH`;
}

function cell(className: string, text: string): HTMLElement {
  const span = document.createElement("span");
  span.className = className;
  span.textContent = text;
  return span;
}

/** One row. `won` runs get a rank; unfinished ones get a badge or nothing. */
export function renderRow(row: BoardRow, wonIndex: number): HTMLElement {
  const el = document.createElement("div");
  el.className = `hof-row is-${row.tier}`;

  el.append(
    cell("hof-mark", markFor(row.tier, wonIndex)),
    cell("hof-name", row.name),
    cell("hof-flag", flagOf(row.country)),
    cell("hof-score", String(row.score)),
    cell("hof-moves", `${row.moves} MOVES`),
  );

  // `BEST SO FAR` marks the furthest unfinished run *without moving it* — the
  // row keeps its place in recency order (ADR 0011 §1).
  if (row.best) el.append(cell("hof-best", "BEST SO FAR"));
  return el;
}

export function renderBoard(host: HTMLElement, rows: readonly BoardRow[]): void {
  host.textContent = "";
  if (rows.length === 0) {
    host.append(cell("hof-empty", EMPTY_LINE));
    return;
  }

  let won = 0;
  for (const row of rows) {
    host.append(renderRow(row, won));
    if (row.tier === "won") won += 1;
  }
}

async function load(): Promise<void> {
  const host = document.getElementById("hof-board");
  if (host === null) return;

  try {
    const response = await fetch(ENDPOINT);
    if (!response.ok) throw new Error(String(response.status));
    const body = (await response.json()) as { rows?: BoardRow[] };
    renderBoard(host, body.rows ?? []);
  } catch {
    // Same line as an empty board: from the visitor's side there is no
    // difference between "nobody has played" and "we could not ask".
    renderBoard(host, []);
  }
}

// Guarded so the module can be imported without a DOM — the pure helpers above
// are tested, and a bare `load()` at import time would fire in the test runner.
if (typeof document !== "undefined") void load();
