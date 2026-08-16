import { describe, expect, it } from "vitest";
import { generate, generateKin } from "./generate.js";
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

  it("shares family and clan across a kin group while given keeps varying", () => {
    const groupId = "kin-test-11-generate-family";
    const results = [101, 202, 303].map((seed) =>
      generate("highfantasy.elven", { seed, variant: "masc", context: { groupId } }),
    );

    const families = new Set(results.map((r) => r.parts.family));
    const clans = new Set(results.map((r) => r.parts.clan));
    const givens = new Set(results.map((r) => r.parts.given));
    expect(families.size).toBe(1);
    expect(clans.size).toBe(1);
    expect(givens.size).toBeGreaterThan(1);
  });

  it("derives a patronymic from parent context: given Ivan (masc) + fem child -> Ivanovna", () => {
    for (let seed = 0; seed < 30; seed++) {
      const result = generate("modern.slavic-patronymic", {
        seed,
        variant: "fem",
        context: { parent: { given: "Ivan" } },
      });
      expect(result.parts.patronymic).toBe("Ivanovna");
    }
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

describe("generateKin", () => {
  it("generates a family of 4 from modern.slavic-patronymic with a consistent surname and correct per-child patronymics", () => {
    const results = generateKin("modern.slavic-patronymic", 4, {
      members: [
        { variant: "masc", seed: 1 },
        { variant: "masc", seed: 2 },
        { variant: "fem", seed: 3 },
        { variant: "fem", seed: 4 },
      ],
    });

    expect(results).toHaveLength(4);
    expect(new Set(results.map((r) => r.parts.family)).size).toBe(1);

    const strippedFatherGiven = results[0]!.parts.given!.replace(/[aoeiu]$/, "");
    expect(results[1]!.parts.patronymic).toBe(`${strippedFatherGiven}ovich`);
    expect(results[2]!.parts.patronymic).toBe(`${strippedFatherGiven}ovna`);
    expect(results[3]!.parts.patronymic).toBe(`${strippedFatherGiven}ovna`);
  });
});
