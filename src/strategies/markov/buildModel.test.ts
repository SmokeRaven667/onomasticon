import { describe, expect, it } from "vitest";
import type { Lexicon } from "../../data/types.js";
import { BOUNDARY, buildModel, END } from "./buildModel.js";

function corpus(values: string[]): Lexicon {
  return {
    schemaVersion: 1,
    id: "test-corpus",
    entries: values.map((value) => ({ value })),
  };
}

describe("buildModel", () => {
  it("counts every character transition, including the boundary and end", () => {
    const model = buildModel(corpus(["ab", "ab"]), 1);

    const boundary = model.get(BOUNDARY)!;
    expect(boundary).toEqual([{ char: "a", weight: 2 }]);

    const afterA = model.get("a")!;
    expect(afterA).toEqual([{ char: "b", weight: 2 }]);

    const afterB = model.get("b")!;
    expect(afterB).toEqual([{ char: END, weight: 2 }]);
  });

  it("distinguishes contexts by order", () => {
    const model = buildModel(corpus(["aab"]), 2);

    // order 2: boundary+boundary -> a, boundary+a -> a, "aa" -> b, "ab" -> END
    expect(model.get(BOUNDARY + BOUNDARY)).toEqual([{ char: "a", weight: 1 }]);
    expect(model.get(BOUNDARY + "a")).toEqual([{ char: "a", weight: 1 }]);
    expect(model.get("aa")).toEqual([{ char: "b", weight: 1 }]);
    expect(model.get("ab")).toEqual([{ char: END, weight: 1 }]);
  });

  it("accumulates weight across corpus entries that share a context", () => {
    const model = buildModel(corpus(["ax", "ay"]), 1);
    const afterA = model.get("a")!;
    expect(afterA).toContainEqual({ char: "x", weight: 1 });
    expect(afterA).toContainEqual({ char: "y", weight: 1 });
  });
});
