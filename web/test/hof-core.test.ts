/**
 * The Hall of Fame board's rules (ADR 0011, stage 6.8c).
 *
 * The board is an arcade cabinet and not a ledger, so none of this proves a run
 * happened. What it pins is everything a *player can see go wrong*: a name that
 * should not render, a board that shows blank slots because a tier was empty, a
 * `BEST SO FAR` badge that moved a row, and a live badge that outlived the tab.
 */

import { describe, expect, it } from "vitest";
import {
  buildBoard, normalizeName, readCountry, readSubmission,
  BOARD_CAP, DEFAULT_NAME, FRESH_SECONDS, MAX_SCORE, type RunRow,
} from "../../functions/api/hof-core.js";

const NOW = 1_000_000;

function run(over: Partial<RunRow> & { run_id: string }): RunRow {
  return {
    name: "ANON", score: 0, moves: 0, state: "playing", country: "KR",
    last_seen: NOW, ...over,
  };
}

describe("normalizeName", () => {
  it("folds an ordinary name to the arcade allowlist", () => {
    expect(normalizeName("  dkm ")).toBe("DKM");
    expect(normalizeName("d.  kim")).toBe("D. KIM");
    expect(normalizeName("GRUE-BAIT")).toBe("GRUE-BAIT");
  });

  it("falls back to ANONYMOUS rather than rejecting the run", () => {
    // The untouched field, the too-short, the too-long, and the one that would
    // put markup on a public page. None of these is an error the player sees —
    // the run is still recorded, under the default name.
    for (const bad of ["", "ab", "THIRTEEN CHARS", "<script>x</script>", "  ", 42, null, undefined]) {
      expect(normalizeName(bad)).toBe(DEFAULT_NAME);
    }
  });
});

describe("readSubmission", () => {
  const good = { run_id: "0198e2c1-4d9f-7a11-9f3a-2c9e6b7d1a55", name: "dkm", score: 45, moves: 112 };

  it("reads a heartbeat", () => {
    const parsed = readSubmission(good);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value).toEqual({ runId: good.run_id, name: "DKM", score: 45, moves: 112, done: false });
  });

  it("refuses a body it cannot identify", () => {
    for (const bad of [null, "x", {}, { ...good, run_id: "short" }, { ...good, run_id: "has spaces!" }]) {
      expect(readSubmission(bad).ok).toBe(false);
    }
  });

  it("refuses impossible scores and moves", () => {
    for (const bad of [-1, 351, 1.5, "350"]) {
      expect(readSubmission({ ...good, score: bad }).ok).toBe(false);
    }
    for (const bad of [-1, 1e9, 4.2]) {
      expect(readSubmission({ ...good, moves: bad }).ok).toBe(false);
    }
  });

  it("demotes a claimed win that is not a win, rather than dropping the run", () => {
    // ADR 0011 §5: the run is probably real and only the claim is wrong.
    const parsed = readSubmission({ ...good, done: true, score: 349 });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.done).toBe(false);

    const won = readSubmission({ ...good, done: true, score: MAX_SCORE });
    expect(won.ok && won.value.done).toBe(true);
  });
});

describe("readCountry", () => {
  it("takes a two-letter code and nothing else", () => {
    expect(readCountry("kr")).toBe("KR");
    expect(readCountry("KR")).toBe("KR");
  });

  it("treats Tor, XX and absent as unknown rather than as countries", () => {
    // An unknown must render blank, never as a wrong flag (ADR 0011 §4).
    for (const unknown of ["T1", "XX", "", "KOR", undefined, null, 7]) {
      expect(readCountry(unknown)).toBeNull();
    }
  });
});

describe("buildBoard", () => {
  it("puts winners on top by moves, and sorts the unfinished by recency", () => {
    const board = buildBoard([
      run({ run_id: "slow-win", state: "won", score: MAX_SCORE, moves: 500, last_seen: NOW - 9999 }),
      run({ run_id: "fast-win", state: "won", score: MAX_SCORE, moves: 411, last_seen: NOW - 9999 }),
      run({ run_id: "stale", score: 20, last_seen: NOW - 5000 }),
      run({ run_id: "fresh", score: 5, last_seen: NOW - 10 }),
    ], NOW);

    expect(board.map((r) => r.tier)).toEqual(["won", "won", "live", "recent"]);
    expect(board.map((r) => r.moves)).toEqual([411, 500, 0, 0]);
  });

  it("drops the live badge two minutes after the tab closes", () => {
    const justInside = buildBoard([run({ run_id: "a", last_seen: NOW - (FRESH_SECONDS - 1) })], NOW);
    const justOutside = buildBoard([run({ run_id: "a", last_seen: NOW - (FRESH_SECONDS + 1) })], NOW);
    expect(justInside[0]?.tier).toBe("live");
    expect(justOutside[0]?.tier).toBe("recent");
  });

  it("gives the whole board to the lower tiers when nobody has won — today's state", () => {
    // The reason the board exists in this shape: zero winners must not mean ten
    // blank slots at the top (ADR 0011 §1).
    const rows = Array.from({ length: 25 }, (_, i) => run({ run_id: `r${i}`, last_seen: NOW - 5000 - i }));
    const board = buildBoard(rows, NOW);
    expect(board).toHaveLength(BOARD_CAP);
    expect(board.every((r) => r.tier === "recent")).toBe(true);
  });

  it("never lets the live tier take more than five slots", () => {
    const live = Array.from({ length: 8 }, (_, i) => run({ run_id: `live${i}`, last_seen: NOW - i }));
    const recent = Array.from({ length: 8 }, (_, i) => run({ run_id: `old${i}`, last_seen: NOW - 5000 - i }));
    const board = buildBoard([...live, ...recent], NOW);
    expect(board.filter((r) => r.tier === "live")).toHaveLength(5);
  });

  it("badges the best unfinished run without moving it", () => {
    const board = buildBoard([
      run({ run_id: "recent-poor", score: 5, last_seen: NOW - 10 }),
      run({ run_id: "older-rich", score: 90, last_seen: NOW - 30 }),
    ], NOW);

    expect(board.map((r) => r.score)).toEqual([5, 90]);   // recency still decides the order
    expect(board.map((r) => r.best)).toEqual([false, true]);
  });

  it("badges nothing when every unfinished run is still on zero", () => {
    // A `BEST SO FAR` on a run that has scored nothing is noise.
    const board = buildBoard([run({ run_id: "a" }), run({ run_id: "b" })], NOW);
    expect(board.some((r) => r.best)).toBe(false);
  });

  it("never badges a winner, and never leaks the run id", () => {
    const board = buildBoard([
      run({ run_id: "w", state: "won", score: MAX_SCORE, moves: 411 }),
      run({ run_id: "p", score: 100, last_seen: NOW - 10 }),
    ], NOW);

    expect(board[0]?.best).toBe(false);
    expect(board[1]?.best).toBe(true);
    expect(board.every((r) => !("run_id" in r))).toBe(true);
  });
});
