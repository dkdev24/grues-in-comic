/**
 * Seeded random number generator.
 *
 * ADR 0002 makes determinism a contract term: same world + same seed + same
 * command sequence ⇒ identical events. Every source of randomness in the game
 * (ZIL `RANDOM`, PICK-ONE, thief movement, combat) must draw from here — never
 * from `Math.random`, which would make golden-transcript replay (stage 4.4)
 * impossible.
 *
 * mulberry32: 32-bit state, no dependencies, and the whole generator round-trips
 * through {@link Rng.state}, so it saves and restores with the rest of the game.
 */
export class Rng {
  private s: number;

  constructor(seed = 0) {
    // Seed 0 is a fixed point for the mixing step, so offset it.
    this.s = (seed ^ 0x9e3779b9) >>> 0;
  }

  /** Serializable generator state (part of {@link SaveState}). */
  get state(): number {
    return this.s;
  }

  set state(value: number) {
    this.s = value >>> 0;
  }

  /** Uniform float in [0, 1). */
  next(): number {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * ZIL `<RANDOM n>`: a uniform integer in 1..n inclusive.
   * Matches the Z-machine's `random` opcode range, not 0-based indexing.
   */
  random(n: number): number {
    if (n < 1) return 0;
    return Math.floor(this.next() * n) + 1;
  }

  /** Uniform element of a non-empty list (ZIL PICK-ONE's selection step). */
  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error("pick: empty list");
    return items[Math.floor(this.next() * items.length)]!;
  }
}
