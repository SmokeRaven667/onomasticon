import { beforeEach, describe, expect, it } from "vitest";
import { loadRegistry, resetRegistryCache } from "./registry.js";

beforeEach(() => {
  resetRegistryCache();
});

describe("loadRegistry", () => {
  it("loads every bundled pack and lexicon", () => {
    const { packs, lexicons } = loadRegistry();
    expect(packs.size).toBeGreaterThanOrEqual(3);
    expect(lexicons.size).toBeGreaterThanOrEqual(7);
    expect(packs.has("highfantasy.elven")).toBe(true);
    expect(packs.has("modern.slavic-patronymic")).toBe(true);
    expect(packs.has("scifi.corporate-spacer")).toBe(true);
    expect(lexicons.has("elven-given")).toBe(true);
  });

  it("caches the registry across calls until reset", () => {
    const first = loadRegistry();
    const second = loadRegistry();
    expect(second).toBe(first);

    resetRegistryCache();
    const third = loadRegistry();
    expect(third).not.toBe(first);
    expect(third).toEqual(first);
  });
});
