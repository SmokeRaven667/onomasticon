import { describe, expect, it } from "vitest";
import { mulberry32 } from "./mulberry32.js";
import { weightedChoice, type Weighted } from "./weightedChoice.js";

describe("weightedChoice", () => {
  it("throws on an empty list", () => {
    const rng = mulberry32(1);
    expect(() => weightedChoice([], rng)).toThrow();
  });

  it("always returns the only item in a single-item list", () => {
    const rng = mulberry32(1);
    const only = { weight: 1, name: "solo" };
    for (let i = 0; i < 20; i++) {
      expect(weightedChoice([only], rng)).toBe(only);
    }
  });

  it("defaults missing weight to 1", () => {
    const rng = mulberry32(7);
    const items: (Weighted & { name: string })[] = [{ name: "a" }, { name: "b" }];
    const result = weightedChoice(items, rng);
    expect(items).toContain(result);
  });

  it("is deterministic for a given seed", () => {
    const items = [
      { name: "a", weight: 1 },
      { name: "b", weight: 2 },
      { name: "c", weight: 3 },
    ];
    const runOnce = () => {
      const rng = mulberry32(2024);
      return Array.from({ length: 15 }, () => weightedChoice(items, rng).name);
    };
    expect(runOnce()).toEqual(runOnce());
  });

  it("selection frequency roughly matches configured weights over many trials", () => {
    const items = [
      { name: "a", weight: 1 },
      { name: "b", weight: 2 },
      { name: "c", weight: 3 },
    ];
    const totalWeight = 6;
    const trials = 20_000;
    const rng = mulberry32(555);
    const counts: Record<string, number> = { a: 0, b: 0, c: 0 };

    for (let i = 0; i < trials; i++) {
      counts[weightedChoice(items, rng).name]! += 1;
    }

    for (const item of items) {
      const expected = (item.weight / totalWeight) * trials;
      const observed = counts[item.name]!;
      // Generous tolerance keeps this non-flaky while still catching a badly broken distribution.
      expect(observed).toBeGreaterThan(expected * 0.9);
      expect(observed).toBeLessThan(expected * 1.1);
    }
  });
});
