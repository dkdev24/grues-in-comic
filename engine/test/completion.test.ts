/**
 * Stage 5.5 — the game is completable, as a test rather than a probe.
 *
 * `harness/full-run.ts` is the human-facing front end; this wires the same
 * resilient replay (`runFullGame`) into the suite so completion cannot regress
 * silently. It drives the authored full-game walkthrough to the barrow and
 * asserts the win — score 350 and a `game-over{victory}` — the exit criterion of
 * milestone 5.5.
 *
 * The run is pinned to seed 1234 on purpose. `12-full-game.cmd` is a fixed
 * command list authored against dfrotz seed 1234; under other RNG streams the
 * thief robs a different set mid-game, so which `put <treasure> in case` lines
 * land diverges and the list no longer describes a winning game (scores swing
 * 30–334 across seeds — see HANDOFF). That is a property of the *fixed list*,
 * not the engine, and the engine's determinism contract (ADR 0002) keeps its own
 * PRNG rather than reproducing the Z-machine's. What `runFullGame` adds on top is
 * player-realistic and RNG-agnostic: it repeats combat until the villain falls,
 * and it ferries any treasure the thief scattered into his hideaway back to the
 * trophy case. Neither step hardcodes seed 1234's outcome.
 */
import { describe, expect, it } from "vitest";
import { runFullGame } from "../harness/complete.js";

describe("full-game completion", () => {
  const r = runFullGame({ seed: 1234 });

  it("reaches the maximum score", () => {
    expect(r.score).toBe(350);
  });

  it("surfaces the full score climb as score-changed events", () => {
    // Treasure deposits move SCORE inside extracted routines (SCORE-UPD, the
    // trophy-case M-END recompute), not via addScore — so a host that only
    // listens for score-changed (the web display) would miss the endgame climb
    // unless the engine reconciles those into the event stream. The event score
    // reaching 350 is the proof it does.
    expect(r.eventScore).toBe(350);
  });

  it("wins the game at the barrow", () => {
    expect(r.victory).toBe(true);
    expect(r.over).toBe("victory");
    expect(r.room).toBe("STONE-BARROW");
  });

  it("completes with no crashes, deaths, or missing routines", () => {
    expect([...r.crashes.values()].reduce((a, b) => a + b, 0)).toBe(0);
    expect(r.deaths).toBe(0);
    expect(r.missingRoutines).toEqual([]);
  });

  it("leaves no treasure stranded in the thief's hideaway", () => {
    expect(r.stranded).toEqual([]);
  });
});
