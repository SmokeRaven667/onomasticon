import { describe, expect, it } from "vitest";
import { mulberry32 } from "../../rng/mulberry32.js";
import { selectFormat } from "./selectFormat.js";

describe("selectFormat", () => {
  it("excludes formats whose requires aren't satisfied by the resolved slots", () => {
    const formats = [
      { pattern: "{given} {patronymic} {family}", requires: ["patronymic"] },
      { pattern: "{given} {family}" },
    ];
    for (let seed = 0; seed < 30; seed++) {
      const chosen = selectFormat(formats, new Set(["given", "family"]), mulberry32(seed));
      expect(chosen.pattern).toBe("{given} {family}");
    }
  });

  it("picks among all formats when every requires is satisfied", () => {
    const formats = [
      { pattern: "{given} {family}", weight: 3 },
      { pattern: "{given} {family} of Clan {clan}", weight: 1, requires: ["clan"] },
    ];
    const seen = new Set<string>();
    for (let seed = 0; seed < 50; seed++) {
      seen.add(
        selectFormat(formats, new Set(["given", "family", "clan"]), mulberry32(seed)).pattern,
      );
    }
    expect(seen.size).toBe(2);
  });

  it("throws when no format is eligible", () => {
    const rng = mulberry32(1);
    const formats = [{ pattern: "{given} {family}", requires: ["family"] }];
    expect(() => selectFormat(formats, new Set(["given"]), rng)).toThrow(/no format is eligible/);
  });

  it("is deterministic for a given seed", () => {
    const formats = [
      { pattern: "a", weight: 1 },
      { pattern: "b", weight: 1 },
      { pattern: "c", weight: 1 },
    ];
    const runOnce = () => selectFormat(formats, new Set(), mulberry32(321)).pattern;
    expect(runOnce()).toBe(runOnce());
  });
});
