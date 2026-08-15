import { describe, expect, it } from "vitest";
import { generate } from "./generate.js";
import { loadRegistry } from "./registry.js";

describe("generate", () => {
  it("returns a structured Result, never a bare string", () => {
    const result = generate("highfantasy.elven", { seed: 88431 });
    expect(typeof result.full).toBe("string");
    expect(typeof result.parts).toBe("object");
    expect(result.meta).toEqual({
      packId: "highfantasy.elven",
      strategyId: "template",
      seed: 88431,
      groupId: undefined,
    });
  });

  it("is deterministic: same packId + same seed -> identical Result", () => {
    const a = generate("highfantasy.elven", { seed: 42, variant: "masc" });
    const b = generate("highfantasy.elven", { seed: 42, variant: "masc" });
    expect(a).toEqual(b);
  });

  it("mints and echoes back a seed when none is provided", () => {
    const result = generate("highfantasy.elven");
    expect(Number.isInteger(result.meta.seed)).toBe(true);
    expect(result.meta.seed).toBeGreaterThanOrEqual(0);
  });

  it("throws a clear error for an unknown packId", () => {
    expect(() => generate("does.not.exist")).toThrow(/no pack registered/);
  });

  it("echoes context.groupId into meta.groupId when supplied", () => {
    const result = generate("highfantasy.elven", { seed: 1, context: { groupId: "kin-a7f" } });
    expect(result.meta.groupId).toBe("kin-a7f");
  });

  it("works end-to-end against every bundled pack, callable from plain Node with no Foundry runtime", () => {
    const { packs } = loadRegistry();
    for (const packId of packs.keys()) {
      const result = generate(packId, { seed: 1 });
      expect(result.full.length, packId).toBeGreaterThan(0);
      expect(result.meta.packId, packId).toBe(packId);
    }
  });
});
