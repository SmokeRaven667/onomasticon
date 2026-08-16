import { describe, expect, it } from "vitest";
import { generateKinWithRegistry } from "./generateKinWithRegistry.js";
import { loadRegistry } from "./registry.js";

describe("generateKinWithRegistry", () => {
  const registry = loadRegistry();

  it("throws for a non-positive or non-integer count", () => {
    expect(() => generateKinWithRegistry("highfantasy.elven", 0, {}, registry)).toThrow(
      /positive integer/,
    );
    expect(() => generateKinWithRegistry("highfantasy.elven", -1, {}, registry)).toThrow(
      /positive integer/,
    );
    expect(() => generateKinWithRegistry("highfantasy.elven", 1.5, {}, registry)).toThrow(
      /positive integer/,
    );
  });

  it("returns exactly `count` results", () => {
    const results = generateKinWithRegistry("highfantasy.elven", 4, {}, registry);
    expect(results).toHaveLength(4);
  });

  it("shares family and clan across the group while given keeps varying (highfantasy.elven)", () => {
    const results = generateKinWithRegistry(
      "highfantasy.elven",
      5,
      { members: Array.from({ length: 5 }, () => ({ variant: "masc" })) },
      registry,
    );

    const families = new Set(results.map((r) => r.parts.family));
    const clans = new Set(results.map((r) => r.parts.clan));
    const givens = new Set(results.map((r) => r.parts.given));
    expect(families.size).toBe(1);
    expect(clans.size).toBe(1);
    expect(givens.size).toBeGreaterThan(1);
    for (const result of results) expect(result.meta.groupId).toBe(results[0]!.meta.groupId);
  });

  it("generates a family of 4 from modern.slavic-patronymic: consistent surname, correct per-child patronymics", () => {
    const results = generateKinWithRegistry(
      "modern.slavic-patronymic",
      4,
      {
        members: [
          { variant: "masc", seed: 1 }, // father, head of family
          { variant: "masc", seed: 2 },
          { variant: "fem", seed: 3 },
          { variant: "fem", seed: 4 },
        ],
      },
      registry,
    );

    const families = new Set(results.map((r) => r.parts.family));
    expect(families.size).toBe(1);

    const father = results[0]!;
    expect(father.parts.patronymic).toBeUndefined(); // head of family has no parent context

    // Reproduce the pack's own strip rule ("[aoeiu]$" -> "") directly, rather than
    // hardcoding an expected given name that would break if the lexicon changes.
    const strippedFatherGiven = father.parts.given!.replace(/[aoeiu]$/, "");
    expect(results[1]!.parts.patronymic).toBe(`${strippedFatherGiven}ovich`);
    expect(results[2]!.parts.patronymic).toBe(`${strippedFatherGiven}ovna`);
    expect(results[3]!.parts.patronymic).toBe(`${strippedFatherGiven}ovna`);
  });

  it("mints a fresh groupId per call so unrelated calls don't share state", () => {
    const a = generateKinWithRegistry("highfantasy.elven", 2, {}, registry);
    const b = generateKinWithRegistry("highfantasy.elven", 2, {}, registry);
    expect(a[0]!.meta.groupId).not.toBe(b[0]!.meta.groupId);
  });

  it("honors an explicit groupId when supplied", () => {
    const results = generateKinWithRegistry(
      "highfantasy.elven",
      2,
      { groupId: "kin-explicit-test" },
      registry,
    );
    expect(results[0]!.meta.groupId).toBe("kin-explicit-test");
    expect(results[1]!.meta.groupId).toBe("kin-explicit-test");
  });
});
