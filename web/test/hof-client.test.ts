/**
 * The board's client half (ADR 0011 §3, stage 6.8d).
 *
 * The two properties worth pinning are the ones nobody can see go wrong by
 * looking at the screen: **an opted-out run sends nothing at all**, and the
 * heartbeat costs ~42 writes over a winning run rather than one per turn. The
 * first is a promise made to a stranger; the second is the whole free-tier
 * argument.
 */

import { describe, expect, it } from "vitest";
import {
  createReporter, mintRunId, shouldSend,
  HEARTBEAT_MOVES, HEARTBEAT_MS, type RunIdentity,
} from "../src/hof-client.js";

const LISTED: RunIdentity = { runId: "run-abcdef12", name: "DKM", listed: true };

function recorder(identity: RunIdentity = LISTED, clock = { ms: 0 }) {
  const sent: Record<string, unknown>[] = [];
  const reporter = createReporter(identity, {
    send: (body) => void sent.push(body as Record<string, unknown>),
    now: () => clock.ms,
  });
  return { reporter, sent, clock };
}

describe("mintRunId", () => {
  it("mints something long, unique and opaque", () => {
    const ids = new Set(Array.from({ length: 100 }, mintRunId));
    expect(ids.size).toBe(100);
    for (const id of ids) expect(id).toMatch(/^[A-Za-z0-9-]{8,64}$/);
  });
});

describe("shouldSend", () => {
  it("writes once every ten moves", () => {
    expect(shouldSend(9, 0, 0, 0)).toBe(false);
    expect(shouldSend(HEARTBEAT_MOVES, 0, 0, 0)).toBe(true);
  });

  it("writes for a player who is thinking, so the live badge survives", () => {
    expect(shouldSend(1, 0, HEARTBEAT_MS, 0)).toBe(true);
  });

  it("never writes for a turn that did not move the clock", () => {
    // `moves` does not advance on a parser miss, and a board write for `xyzzy`
    // typed forty times is forty writes for nothing.
    expect(shouldSend(40, 40, HEARTBEAT_MS * 10, 0)).toBe(false);
  });

  it("costs about 42 writes over a winning run", () => {
    let last = 0;
    let writes = 0;
    for (let moves = 1; moves <= 420; moves += 1) {
      if (shouldSend(moves, last, 0, 0)) { last = moves; writes += 1; }
    }
    expect(writes).toBe(42);
  });
});

describe("createReporter", () => {
  it("announces the run once, carrying the name", () => {
    const { reporter, sent } = recorder();
    reporter.start();
    expect(sent).toEqual([{ run_id: "run-abcdef12", name: "DKM", score: 0, moves: 0 }]);
  });

  it("sends nothing whatsoever when the player opted out", () => {
    // The promise ADR 0011 §3.3 makes: not filtered server-side, not sent with a
    // flag — the request never happens.
    const { reporter, sent } = recorder({ ...LISTED, listed: false });
    reporter.start();
    for (let m = 1; m <= 500; m += 1) reporter.progress(m, m);
    reporter.win(350, 411);
    expect(sent).toEqual([]);
  });

  it("throttles heartbeats to the ten-move cadence", () => {
    const { reporter, sent } = recorder();
    reporter.start();
    for (let m = 1; m <= 30; m += 1) reporter.progress(m, m);
    expect(sent).toHaveLength(4); // start + moves 10, 20, 30
    expect(sent.at(-1)).toMatchObject({ moves: 30, score: 30 });
  });

  it("sends a win immediately, whatever the heartbeat clock says", () => {
    const { reporter, sent } = recorder();
    reporter.start();
    reporter.progress(345, 405);      // a heartbeat, and it resets the cadence
    reporter.progress(348, 409);      // four moves later: too soon to send
    reporter.win(350, 411);           // two moves after that: sent anyway
    expect(sent).toHaveLength(3);
    expect(sent.at(-1)).toEqual({ run_id: "run-abcdef12", name: "DKM", score: 350, moves: 411, done: true });
  });

  it("stops after the win, so a wandering post-victory session cannot overwrite it", () => {
    const { reporter, sent } = recorder();
    reporter.win(350, 411);
    for (let m = 412; m <= 500; m += 1) reporter.progress(350, m);
    reporter.win(350, 900);
    expect(sent).toHaveLength(1);
  });
});
