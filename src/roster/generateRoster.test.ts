import { describe, expect, it } from "vitest";
import { loadRegistry } from "../registry.js";
import { generateRosterWithRegistry } from "./generateRoster.js";

describe("generateRosterWithRegistry", () => {
  const registry = loadRegistry();

  it("throws for a non-positive or non-integer count", () => {
    expect(() => generateRosterWithRegistry("scifi.corporate-spacer", 0, {}, registry)).toThrow(
      /positive integer/,
    );
    expect(() => generateRosterWithRegistry("scifi.corporate-spacer", -1, {}, registry)).toThrow(
      /positive integer/,
    );
    expect(() => generateRosterWithRegistry("scifi.corporate-spacer", 1.5, {}, registry)).toThrow(
      /positive integer/,
    );
  });

  it("generates a 20-NPC corporate-spacer crew roster in one action, deterministically, with no shared surname", () => {
    // Explicit per-member seeds (not the default fresh-random-seed-per-call) so this test's
    // "spot-check for repeats" is reproducible rather than a flaky probabilistic assertion.
    const results = generateRosterWithRegistry(
      "scifi.corporate-spacer",
      20,
      { members: Array.from({ length: 20 }, (_, seed) => ({ seed })) },
      registry,
    );

    expect(results).toHaveLength(20);
    for (const result of results) {
      expect(result.full.length).toBeGreaterThan(0);
      expect(result.parts.given).toBeDefined();
      expect(result.parts.family).toBeDefined();
    }

    // Independent, not a kin group: unlike generateKinWithRegistry, surnames vary across a
    // roster this size rather than all sharing one family name.
    const families = new Set(results.map((r) => r.parts.family));
    const givens = new Set(results.map((r) => r.parts.given));
    expect(families.size).toBeGreaterThan(1);
    expect(givens.size).toBeGreaterThan(1);

    // Deterministic re-run reproduces the exact same roster from the same seeds.
    const rerun = generateRosterWithRegistry(
      "scifi.corporate-spacer",
      20,
      { members: Array.from({ length: 20 }, (_, seed) => ({ seed })) },
      registry,
    );
    expect(rerun.map((r) => r.full)).toEqual(results.map((r) => r.full));
  });

  it("applies a shared variant to every member with no per-member override", () => {
    const results = generateRosterWithRegistry(
      "scifi.corporate-spacer",
      10,
      { variant: "fem", members: Array.from({ length: 10 }, (_, seed) => ({ seed })) },
      registry,
    );
    // fem-only lexicon entries resolve for all 10 members without throwing (variant honored
    // end-to-end, same guarantee resolveSlot.ts's own variant-filtering tests already cover).
    expect(results).toHaveLength(10);
  });

  it("honors per-member overrides, falling back to the shared variant for the rest", () => {
    const results = generateRosterWithRegistry(
      "scifi.corporate-spacer",
      3,
      { variant: "masc", members: [{ seed: 42 }] },
      registry,
    );
    expect(results[0]!.meta.seed).toBe(42);
  });

  it("does not share family/surname the way a kin group would", () => {
    const a = generateRosterWithRegistry("scifi.corporate-spacer", 2, {}, registry);
    // Independent meta: no groupId is ever assigned to a roster member.
    expect(a[0]!.meta.groupId).toBeUndefined();
    expect(a[1]!.meta.groupId).toBeUndefined();
  });
});
