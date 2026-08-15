import { describe, expect, it } from "vitest";
import { renderPattern } from "./renderPattern.js";

describe("renderPattern", () => {
  it("substitutes tokens with resolved parts", () => {
    expect(renderPattern("{given} {family}", { given: "Thalvir", family: "Ostreth" })).toBe(
      "Thalvir Ostreth",
    );
  });

  it("passes literal text through unchanged", () => {
    expect(renderPattern("{given} of Clan {clan}", { given: "Ashan", clan: "Morgane" })).toBe(
      "Ashan of Clan Morgane",
    );
  });

  it("throws when a token has no resolved value", () => {
    expect(() => renderPattern("{given} {family}", { given: "Ashan" })).toThrow(
      /no resolved value for \{family\}/,
    );
  });
});
