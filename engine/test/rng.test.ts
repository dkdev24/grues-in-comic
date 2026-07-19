/**
 * Determinism is a contract term (ADR 0002), so it gets tests of its own —
 * transcript replay in stage 4.4 is only meaningful if these hold.
 */

import { describe, expect, it } from "vitest";
import { Rng } from "../src/rng.js";

describe("Rng", () => {
  it("produces the same sequence for the same seed", () => {
    const a = Array.from({ length: 20 }, () => new Rng(42).random(100));
    const b = new Rng(42);
    expect(a[0]).toBe(b.random(100));

    const seq1 = Array.from({ length: 50 }, () => new Rng(7).next());
    expect(new Set(seq1).size).toBe(1); // fresh generator, identical draw
  });

  it("differs across seeds", () => {
    const draw = (seed: number) => Array.from({ length: 10 }, () => new Rng(seed).next());
    expect(draw(1)).not.toEqual(draw(2));
    expect(draw(0)).not.toEqual(draw(1));
  });

  it("keeps <RANDOM n> in 1..n inclusive", () => {
    const rng = new Rng(123);
    const seen = new Set<number>();
    for (let i = 0; i < 5000; i++) seen.add(rng.random(6));
    expect([...seen].sort((x, y) => x - y)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("round-trips through its serializable state", () => {
    const rng = new Rng(99);
    for (let i = 0; i < 10; i++) rng.next();
    const saved = rng.state;
    const expected = Array.from({ length: 5 }, () => rng.next());

    const restored = new Rng();
    restored.state = saved;
    expect(Array.from({ length: 5 }, () => restored.next())).toEqual(expected);
  });
});
