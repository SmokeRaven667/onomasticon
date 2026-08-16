import { afterEach, beforeEach, describe, expect, it } from "vitest";
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

const NOOP_PACK: Pack = { schemaVersion: 1, id: "fixture.hooks", strategy: "noop-hooks" };

describe("generateWithRegistry - hooks", () => {
  beforeEach(() => {
    registerStrategy("noop-hooks", ({ variant }) => ({
      full: variant ? `Noop (${variant})` : "Noop",
      parts: { variant: variant ?? "" },
    }));
  });

  it("fires onomasticon.preGenerate before resolution, with the resolved options", () => {
    const received: unknown[] = [];
    Hooks.once("onomasticon.preGenerate", (options) => {
      received.push(options);
    });

    const options = { seed: 1 };
    generateWithRegistry("fixture.hooks", options, registryWithPack(NOOP_PACK));

    expect(received).toEqual([options]);
  });

  it("a preGenerate listener can mutate options in place before generation proceeds", () => {
    Hooks.once("onomasticon.preGenerate", (options: { variant?: string }) => {
      options.variant = "mutated";
    });

    const result = generateWithRegistry("fixture.hooks", { seed: 1 }, registryWithPack(NOOP_PACK));
    expect(result.parts.variant).toBe("mutated");
  });

  it("a preGenerate listener returning false cancels generation - no Result is produced", () => {
    let strategyRan = false;
    registerStrategy("noop-cancel", () => {
      strategyRan = true;
      return { full: "should not happen", parts: {} };
    });
    const pack: Pack = { schemaVersion: 1, id: "fixture.cancel", strategy: "noop-cancel" };

    Hooks.once("onomasticon.preGenerate", () => false);

    expect(() => generateWithRegistry("fixture.cancel", {}, registryWithPack(pack))).toThrow(
      /cancelled/,
    );
    expect(strategyRan).toBe(false);
  });

  it("fires onomasticon.generated after resolution, with the real, final Result", () => {
    const received: unknown[] = [];
    Hooks.once("onomasticon.generated", (result) => {
      received.push(result);
    });

    const result = generateWithRegistry("fixture.hooks", { seed: 1 }, registryWithPack(NOOP_PACK));

    expect(received).toEqual([result]);
  });

  it("does not fire onomasticon.generated when preGenerate cancels generation", () => {
    let generatedFired = false;
    Hooks.once("onomasticon.generated", () => {
      generatedFired = true;
    });
    Hooks.once("onomasticon.preGenerate", () => false);

    expect(() => generateWithRegistry("fixture.hooks", {}, registryWithPack(NOOP_PACK))).toThrow();
    expect(generatedFired).toBe(false);
  });

  it("still generates with no Hooks global at all, for genuine standalone-Node use", () => {
    // fvtt-types declares Hooks as an ambient `const`, not a `globalThis` property (same
    // reason foundryStubs.ts needs @ts-expect-error to assign it in the first place).
    const globalWithHooks = globalThis as unknown as { Hooks?: typeof Hooks };
    const realHooks = globalWithHooks.Hooks;
    delete globalWithHooks.Hooks;
    try {
      const result = generateWithRegistry(
        "fixture.hooks",
        { seed: 1 },
        registryWithPack(NOOP_PACK),
      );
      expect(result.full).toBe("Noop");
    } finally {
      globalWithHooks.Hooks = realHooks;
    }
  });
});
