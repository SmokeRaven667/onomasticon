import { describe, expect, it } from "vitest";
import { validatePackData } from "./validatePack.js";
import type { Pack } from "./types.js";

function basePack(overrides: Partial<Pack> = {}): Pack {
  return {
    schemaVersion: 1,
    id: "test.pack",
    strategy: "template",
    lexiconRefs: { given: "some-given" },
    config: {
      slots: {
        given: { kind: "lexicon", lexicon: "given" },
      },
      formats: [{ pattern: "{given}" }],
    },
    ...overrides,
  };
}

describe("validatePackData", () => {
  it("accepts a well-formed pack", () => {
    const result = validatePackData(basePack());
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("rejects a format referencing an undeclared slot (dangling token)", () => {
    const pack = basePack({
      config: {
        slots: { given: { kind: "lexicon", lexicon: "given" } },
        formats: [{ pattern: "{given} {family}" }],
      },
    });
    const result = validatePackData(pack);
    expect(result.valid).toBe(false);
    expect(result.errors.map((e) => e.code)).toContain("unknown-slot-in-format");
  });

  it("rejects a lexicon slot whose lexicon key is missing from lexiconRefs", () => {
    const pack = basePack({
      lexiconRefs: {},
      config: {
        slots: { given: { kind: "lexicon", lexicon: "given" } },
        formats: [{ pattern: "{given}" }],
      },
    });
    const result = validatePackData(pack);
    expect(result.valid).toBe(false);
    expect(result.errors.map((e) => e.code)).toContain("lexicon-ref-not-found");
  });

  it("rejects a derived slot with no derivation targeting it", () => {
    const pack = basePack({
      config: {
        slots: {
          given: { kind: "lexicon", lexicon: "given" },
          patronymic: { kind: "derived" },
        },
        formats: [{ pattern: "{given}" }],
      },
    });
    const result = validatePackData(pack);
    expect(result.valid).toBe(false);
    expect(result.errors.map((e) => e.code)).toContain("derived-slot-without-derivation");
  });

  it("rejects a derivation whose source names an undeclared slot", () => {
    const pack = basePack({
      config: {
        slots: {
          given: { kind: "lexicon", lexicon: "given" },
          patronymic: { kind: "derived" },
        },
        formats: [{ pattern: "{given}" }],
        derivations: [
          {
            id: "bad",
            produces: "patronymic",
            source: "nonexistent",
            variants: { "*": "{source}ov" },
          },
        ],
      },
    });
    const result = validatePackData(pack);
    expect(result.valid).toBe(false);
    expect(result.errors.map((e) => e.code)).toContain("derivation-source-unknown-slot");
  });

  it("rejects a format that references an optional slot without listing it in requires", () => {
    const pack = basePack({
      config: {
        slots: {
          given: { kind: "lexicon", lexicon: "given" },
          clan: { kind: "lexicon", lexicon: "given", optional: true },
        },
        formats: [{ pattern: "{given} of {clan}" }],
      },
    });
    const result = validatePackData(pack);
    expect(result.valid).toBe(false);
    expect(result.errors.map((e) => e.code)).toContain("missing-requires-for-optional-slot");
  });

  it("rejects a pack where every format needs a context that might not be there", () => {
    const pack = basePack({
      config: {
        slots: {
          given: { kind: "lexicon", lexicon: "given" },
          patronymic: { kind: "derived" },
        },
        formats: [{ pattern: "{given} {patronymic}", requires: ["patronymic"] }],
        derivations: [
          {
            id: "d",
            produces: "patronymic",
            source: "given",
            variants: { "*": "{source}ov" },
          },
        ],
      },
    });
    const result = validatePackData(pack);
    expect(result.valid).toBe(false);
    expect(result.errors.map((e) => e.code)).toContain("no-standalone-format");
  });

  it("accepts the real modern.slavic-patronymic derivation shape", () => {
    const pack = basePack({
      config: {
        slots: {
          given: { kind: "lexicon", lexicon: "given" },
          patronymic: { kind: "derived" },
          family: { kind: "lexicon", lexicon: "given" },
        },
        formats: [
          { pattern: "{given} {patronymic} {family}", requires: ["patronymic"] },
          { pattern: "{given} {family}" },
        ],
        derivations: [
          {
            id: "patronymic-from-father",
            produces: "patronymic",
            source: "given",
            strip: { pattern: "[aoeiu]$", replace: "" },
            variants: { masc: "{source}ovich", fem: "{source}ovna", "*": "{source}ov" },
          },
        ],
      },
    });
    const result = validatePackData(pack);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("rejects data that fails structural (JSON Schema) validation", () => {
    const result = validatePackData({ schemaVersion: 1, id: "bad" });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]?.code).toMatch(/^schema:/);
  });
});
