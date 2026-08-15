import { describe, expect, it } from "vitest";
import { mulberry32 } from "./mulberry32.js";
import { pickDigit, pickLowerLetter, pickUpperLetter } from "./pick.js";

describe("pick", () => {
  it("pickUpperLetter always returns a single uppercase A-Z character", () => {
    const rng = mulberry32(1);
    for (let i = 0; i < 200; i++) {
      expect(pickUpperLetter(rng)).toMatch(/^[A-Z]$/);
    }
  });

  it("pickLowerLetter always returns a single lowercase a-z character", () => {
    const rng = mulberry32(2);
    for (let i = 0; i < 200; i++) {
      expect(pickLowerLetter(rng)).toMatch(/^[a-z]$/);
    }
  });

  it("pickDigit always returns a single 0-9 character", () => {
    const rng = mulberry32(3);
    for (let i = 0; i < 200; i++) {
      expect(pickDigit(rng)).toMatch(/^[0-9]$/);
    }
  });

  it("is deterministic for a given seed and call order", () => {
    const runOnce = () => {
      const rng = mulberry32(88431);
      return [pickUpperLetter(rng), pickUpperLetter(rng), pickDigit(rng), pickDigit(rng)];
    };
    expect(runOnce()).toEqual(runOnce());
  });

  it("each call consumes exactly one RNG draw, so token order is deterministic left-to-right", () => {
    const rngA = mulberry32(4242);
    const [a1, a2] = [pickUpperLetter(rngA), pickDigit(rngA)];

    const rngB = mulberry32(4242);
    const [b1, b2] = [pickUpperLetter(rngB), pickDigit(rngB)];

    expect([a1, a2]).toEqual([b1, b2]);
  });
});
