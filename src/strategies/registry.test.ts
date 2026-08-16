import { beforeEach, describe, expect, it } from "vitest";
import { mulberry32 } from "../rng/mulberry32.js";
import type { Pack } from "../data/types.js";
import { getStrategy, registerStrategy, resetStrategyRegistry } from "./registry.js";
import { TEMPLATE_STRATEGY_ID } from "./template/index.js";

beforeEach(() => {
  resetStrategyRegistry();
});

describe("getStrategy", () => {
  it("returns the built-in template strategy", () => {
    expect(getStrategy(TEMPLATE_STRATEGY_ID)).toBeTypeOf("function");
  });

  it("returns undefined for an unregistered id", () => {
    expect(getStrategy("markov")).toBeUndefined();
  });
});

describe("registerStrategy", () => {
  it("makes a custom strategy available via getStrategy", () => {
    const noop = () => ({ full: "Noop Name", parts: { given: "Noop", family: "Name" } });
    registerStrategy("noop-test", noop);
    expect(getStrategy("noop-test")).toBe(noop);
  });

  it("a hand-written no-op strategy can be registered and produces a Result-shaped output", () => {
    const noop = () => ({ full: "Test Testerson", parts: { given: "Test", family: "Testerson" } });
    registerStrategy("noop-test", noop);

    const strategy = getStrategy("noop-test")!;
    const result = strategy({
      pack: { schemaVersion: 1, id: "fixture", strategy: "noop-test" } as Pack,
      lexicons: new Map(),
      rng: mulberry32(1),
    });
    expect(result).toEqual({
      full: "Test Testerson",
      parts: { given: "Test", family: "Testerson" },
    });
  });

  it("throws when registering under the reserved 'template' id", () => {
    expect(() => registerStrategy(TEMPLATE_STRATEGY_ID, () => ({ full: "", parts: {} }))).toThrow(
      /reserved/,
    );
  });

  it("throws when re-registering an id that's already taken", () => {
    registerStrategy("noop-test", () => ({ full: "", parts: {} }));
    expect(() => registerStrategy("noop-test", () => ({ full: "", parts: {} }))).toThrow(
      /already registered/,
    );
  });
});

describe("resetStrategyRegistry", () => {
  it("drops custom registrations but keeps the built-in template strategy", () => {
    registerStrategy("noop-test", () => ({ full: "", parts: {} }));
    resetStrategyRegistry();

    expect(getStrategy("noop-test")).toBeUndefined();
    expect(getStrategy(TEMPLATE_STRATEGY_ID)).toBeTypeOf("function");
  });
});
