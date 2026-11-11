import { describe, expect, it } from "vitest";
import { assertSafeKey } from "../src/interpreter.js";

describe("assertSafeKey", () => {
  it("rejects prototype-polluting keys", () => {
    for (const k of ["__proto__", "constructor", "prototype"]) expect(() => assertSafeKey(k)).toThrow();
  });
  it("allows ordinary keys", () => {
    expect(() => assertSafeKey("description")).not.toThrow();
  });
});
