import { describe, expect, it } from "vitest";
import { findDuplicateIds } from "./duplicateIds.js";

describe("findDuplicateIds", () => {
  it("returns no errors when all ids are unique", () => {
    const errors = findDuplicateIds(
      [
        { file: "a.json", id: "pack.a" },
        { file: "b.json", id: "pack.b" },
      ],
      "duplicate-pack-id",
    );
    expect(errors).toEqual([]);
  });

  it("flags a duplicate id across two files", () => {
    const errors = findDuplicateIds(
      [
        { file: "a.json", id: "pack.same" },
        { file: "b.json", id: "pack.same" },
      ],
      "duplicate-pack-id",
    );
    expect(errors).toHaveLength(1);
    expect(errors[0]?.code).toBe("duplicate-pack-id");
    expect(errors[0]?.message).toContain("a.json");
    expect(errors[0]?.message).toContain("b.json");
  });

  it("ignores entries with no id (e.g. a file that failed to load)", () => {
    const errors = findDuplicateIds(
      [
        { file: "a.json", id: undefined },
        { file: "b.json", id: undefined },
      ],
      "duplicate-pack-id",
    );
    expect(errors).toEqual([]);
  });
});
