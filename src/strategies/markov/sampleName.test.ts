import { describe, expect, it } from "vitest";
import type { Lexicon } from "../../data/types.js";
import { mulberry32 } from "../../rng/mulberry32.js";
import { buildModel } from "./buildModel.js";
import { sampleName } from "./sampleName.js";

function corpus(values: string[]): Lexicon {
  return {
    schemaVersion: 1,
    id: "test-corpus",
    entries: values.map((value) => ({ value })),
  };
}

describe("sampleName", () => {
  it("is deterministic for a fixed seed", () => {
    const model = buildModel(corpus(["thalvir", "ondrel", "caelith", "faelar", "threnvir"]), 2);
    const options = { order: 2, minLength: 3, maxLength: 10 };
    const runOnce = () => sampleName(model, options, mulberry32(4242));
    expect(runOnce()).toBe(runOnce());
  });

  it("produces different names across seeds", () => {
    const model = buildModel(corpus(["thalvir", "ondrel", "caelith", "faelar", "threnvir"]), 2);
    const options = { order: 2, minLength: 3, maxLength: 10 };
    const names = new Set(
      Array.from({ length: 20 }, (_, seed) => sampleName(model, options, mulberry32(seed))),
    );
    expect(names.size).toBeGreaterThan(1);
  });

  it("never exceeds maxLength", () => {
    const model = buildModel(corpus(["thalvir", "ondrel", "caelith", "faelar", "threnvir"]), 2);
    const options = { order: 2, minLength: 1, maxLength: 5 };
    for (let seed = 0; seed < 30; seed++) {
      expect(sampleName(model, options, mulberry32(seed)).length).toBeLessThanOrEqual(5);
    }
  });

  it("retries until minLength is met when the corpus allows it", () => {
    const model = buildModel(corpus(["thalvir", "ondrel", "caelith", "faelar", "threnvir"]), 2);
    const options = { order: 2, minLength: 6, maxLength: 10 };
    for (let seed = 0; seed < 30; seed++) {
      expect(sampleName(model, options, mulberry32(seed)).length).toBeGreaterThanOrEqual(6);
    }
  });

  it("terminates via maxAttempts even when minLength is unreachable", () => {
    const model = buildModel(corpus(["ab"]), 1);
    const options = { order: 1, minLength: 100, maxLength: 5, maxAttempts: 5 };
    expect(() => sampleName(model, options, mulberry32(1))).not.toThrow();
  });
});
