import { describe, expect, it } from "vitest";
import type { Derivation } from "../data/types.js";
import { mulberry32 } from "../rng/mulberry32.js";
import { deriveSlot } from "./deriveSlot.js";

const PATRONYMIC: Derivation = {
  id: "patronymic-from-father",
  produces: "patronymic",
  source: "given",
  strip: { pattern: "[aoeiu]$", replace: "" },
  variants: {
    masc: "{source}ovich",
    fem: "{source}ovna",
    "*": "{source}ov",
  },
};

describe("deriveSlot", () => {
  it("reproduces the schema's own example: Ivan (masc) + fem child -> Ivanovna", () => {
    const value = deriveSlot({
      produces: "patronymic",
      derivations: [PATRONYMIC],
      parent: { given: "Ivan" },
      variant: "fem",
      rng: mulberry32(1),
    });
    expect(value).toBe("Ivanovna");
  });

  it("uses the masc template for a masc variant", () => {
    const value = deriveSlot({
      produces: "patronymic",
      derivations: [PATRONYMIC],
      parent: { given: "Ivan" },
      variant: "masc",
      rng: mulberry32(1),
    });
    expect(value).toBe("Ivanovich");
  });

  it("falls back to the '*' template when the variant has no dedicated entry", () => {
    const value = deriveSlot({
      produces: "patronymic",
      derivations: [PATRONYMIC],
      parent: { given: "Ivan" },
      variant: "neutral",
      rng: mulberry32(1),
    });
    expect(value).toBe("Ivanov");
  });

  it("falls back to the '*' template when no variant is requested at all", () => {
    const value = deriveSlot({
      produces: "patronymic",
      derivations: [PATRONYMIC],
      parent: { given: "Ivan" },
      rng: mulberry32(1),
    });
    expect(value).toBe("Ivanov");
  });

  it("strips a trailing vowel from the source value before templating", () => {
    const value = deriveSlot({
      produces: "patronymic",
      derivations: [PATRONYMIC],
      parent: { given: "Oksana" },
      variant: "fem",
      rng: mulberry32(1),
    });
    expect(value).toBe("Oksanovna");
  });

  it("returns undefined when no derivation targets the requested slot", () => {
    const value = deriveSlot({
      produces: "matronymic",
      derivations: [PATRONYMIC],
      parent: { given: "Ivan" },
      variant: "fem",
      rng: mulberry32(1),
    });
    expect(value).toBeUndefined();
  });

  it("returns undefined when the source value is absent from parent (e.g. a mixed-pack group)", () => {
    const value = deriveSlot({
      produces: "patronymic",
      derivations: [PATRONYMIC],
      parent: { family: "Volkov" },
      variant: "fem",
      rng: mulberry32(1),
    });
    expect(value).toBeUndefined();
  });

  it("returns undefined when the chosen derivation has no template for the variant and no '*' fallback", () => {
    const noFallback: Derivation = {
      id: "masc-only",
      produces: "patronymic",
      source: "given",
      variants: { masc: "{source}ovich" },
    };
    const value = deriveSlot({
      produces: "patronymic",
      derivations: [noFallback],
      parent: { given: "Ivan" },
      variant: "fem",
      rng: mulberry32(1),
    });
    expect(value).toBeUndefined();
  });

  it("weightedChoice picks among multiple derivations targeting the same slot", () => {
    const fromFather: Derivation = {
      id: "from-father",
      produces: "patronymic",
      source: "fatherGiven",
      weight: 1,
      variants: { "*": "{source}ovich" },
    };
    const fromMother: Derivation = {
      id: "from-mother",
      produces: "patronymic",
      source: "motherGiven",
      weight: 1,
      variants: { "*": "{source}ovna" },
    };
    const parent = { fatherGiven: "Ivan", motherGiven: "Irina" };

    const results = new Set<string | undefined>();
    for (let seed = 0; seed < 30; seed++) {
      results.add(
        deriveSlot({
          produces: "patronymic",
          derivations: [fromFather, fromMother],
          parent,
          rng: mulberry32(seed),
        }),
      );
    }
    expect(results).toEqual(new Set(["Ivanovich", "Irinaovna"]));
  });

  it("is deterministic for a given seed", () => {
    const runOnce = () =>
      deriveSlot({
        produces: "patronymic",
        derivations: [PATRONYMIC],
        parent: { given: "Ivan" },
        variant: "fem",
        rng: mulberry32(2024),
      });
    expect(runOnce()).toBe(runOnce());
  });
});
