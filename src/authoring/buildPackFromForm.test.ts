import { describe, expect, it } from "vitest";
import { validatePackData } from "../data/validatePack.js";
import { buildPackFromForm, type PackFormState } from "./buildPackFromForm.js";

function twoSlotForm(overrides: Partial<PackFormState> = {}): PackFormState {
  return {
    id: "authored.two-slot",
    label: "Authored Two-Slot Pack",
    slots: [
      { name: "given", kind: "lexicon", lexicon: "test-given" },
      { name: "family", kind: "lexicon", lexicon: "test-family" },
    ],
    formats: [{ pattern: "{given} {family}" }],
    ...overrides,
  };
}

describe("buildPackFromForm", () => {
  it("produces a working 2-slot template pack that passes validatePackData (this step's own DoD)", () => {
    const result = validatePackData(buildPackFromForm(twoSlotForm()));
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.pack?.id).toBe("authored.two-slot");
  });

  it("derives lexiconRefs from each lexicon-kind slot's own name", () => {
    const pack = buildPackFromForm(twoSlotForm()) as {
      lexiconRefs: Record<string, string>;
      config: { slots: Record<string, { lexicon: string }> };
    };
    expect(pack.lexiconRefs).toEqual({ given: "test-given", family: "test-family" });
    expect(pack.config.slots.given!.lexicon).toBe("given");
  });

  it("parses comma-separated variants and tags into arrays", () => {
    const pack = buildPackFromForm(
      twoSlotForm({
        tags: "fantasy, homebrew",
        slots: [
          {
            name: "given",
            kind: "lexicon",
            lexicon: "test-given",
            variants: "masc, fem , neutral",
          },
        ],
      }),
    ) as { tags: string[]; config: { slots: Record<string, { variants: string[] }> } };

    expect(pack.tags).toEqual(["fantasy", "homebrew"]);
    expect(pack.config.slots.given!.variants).toEqual(["masc", "fem", "neutral"]);
  });

  it("builds a procedural slot from its pattern field", () => {
    const pack = buildPackFromForm({
      id: "authored.procedural",
      slots: [{ name: "serial", kind: "procedural", pattern: "{L}{L}-{D}{D}{D}" }],
      formats: [{ pattern: "{serial}" }],
    }) as { config: { slots: Record<string, { kind: string; pattern: string }> } };

    expect(pack.config.slots.serial).toEqual({ kind: "procedural", pattern: "{L}{L}-{D}{D}{D}" });
  });

  it("builds a derived slot with no lexicon/pattern fields", () => {
    const pack = buildPackFromForm({
      id: "authored.derived",
      slots: [{ name: "patronymic", kind: "derived" }],
      formats: [{ pattern: "{patronymic}" }],
    }) as { config: { slots: Record<string, unknown> } };

    expect(pack.config.slots.patronymic).toEqual({ kind: "derived" });
  });

  it("skips a slot with a blank name and a format with a blank pattern", () => {
    const pack = buildPackFromForm(
      twoSlotForm({
        slots: [
          { name: "given", kind: "lexicon", lexicon: "test-given" },
          { name: "   ", kind: "lexicon", lexicon: "ignored" },
        ],
        formats: [{ pattern: "{given}" }, { pattern: "   " }],
      }),
    ) as { config: { slots: Record<string, unknown>; formats: unknown[] } };

    expect(Object.keys(pack.config.slots)).toEqual(["given"]);
    expect(pack.config.formats).toHaveLength(1);
  });

  it("parses well-formed derivations JSON into config.derivations", () => {
    const pack = buildPackFromForm(
      twoSlotForm({
        slots: [
          { name: "given", kind: "lexicon", lexicon: "test-given" },
          { name: "patronymic", kind: "derived" },
        ],
        formats: [{ pattern: "{given} {patronymic}", requires: "patronymic" }],
        derivationsJson: JSON.stringify([
          {
            id: "d",
            produces: "patronymic",
            source: "given",
            variants: { "*": "{source}ov" },
          },
        ]),
      }),
    ) as { config: { derivations: unknown[] } };

    expect(pack.config.derivations).toHaveLength(1);
  });

  it("throws a clear error for malformed derivations JSON, rather than producing a silently broken pack", () => {
    expect(() => buildPackFromForm(twoSlotForm({ derivationsJson: "{not valid json" }))).toThrow(
      /derivations JSON is invalid/,
    );
  });

  it("omits config.derivations entirely when derivationsJson is blank", () => {
    const pack = buildPackFromForm(twoSlotForm({ derivationsJson: "   " })) as {
      config: Record<string, unknown>;
    };
    expect("derivations" in pack.config).toBe(false);
  });
});
