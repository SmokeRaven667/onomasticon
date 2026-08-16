import { afterEach, describe, expect, it } from "vitest";
import { generateWithRegistry } from "./generateWithRegistry.js";
import { registerStrategy, resetStrategyRegistry } from "./strategies/registry.js";
import type { Pack, Registry } from "./data/types.js";

afterEach(() => {
  resetStrategyRegistry();
});

function registryWithPack(pack: Pack): Registry {
  return { packs: new Map([[pack.id, pack]]), lexicons: new Map() };
}

describe("generateWithRegistry - strategy dispatch", () => {
  it("routes a pack through its registered strategy, proving the seam before Markov (step 18) exists", () => {
    registerStrategy("noop-test", () => ({
      full: "Test Testerson",
      parts: { given: "Test", family: "Testerson" },
    }));

    const pack: Pack = { schemaVersion: 1, id: "fixture.noop", strategy: "noop-test" };
    const result = generateWithRegistry("fixture.noop", { seed: 1 }, registryWithPack(pack));

    expect(result.full).toBe("Test Testerson");
    expect(result.parts).toEqual({ given: "Test", family: "Testerson" });
    expect(result.meta.strategyId).toBe("noop-test");
    expect(result.meta.packId).toBe("fixture.noop");
  });

  it("throws a clear error for a pack whose strategy has no registered implementation", () => {
    const pack: Pack = { schemaVersion: 1, id: "fixture.unregistered", strategy: "does-not-exist" };
    expect(() => generateWithRegistry("fixture.unregistered", {}, registryWithPack(pack))).toThrow(
      /no registered implementation/,
    );
  });
});
