import { describe, expect, it } from "vitest";
import { mulberry32 } from "../../rng/mulberry32.js";
import type { Lexicon } from "../../data/types.js";
import { GroupContext } from "../../kin/GroupContext.js";
import { resolveSlot } from "./resolveSlot.js";

const GIVEN_LEXICON: Lexicon = {
  schemaVersion: 1,
  id: "test-given",
  entries: [
    { value: "Alric", variants: ["masc"] },
    { value: "Bryn", variants: ["fem"] },
    { value: "Quinn" }, // no variants array: matches any requested variant
  ],
};

function lexicons(): Map<string, Lexicon> {
  return new Map([["test-given", GIVEN_LEXICON]]);
}

describe("resolveSlot - lexicon slots", () => {
  it("resolves to one of the lexicon's values", () => {
    const rng = mulberry32(1);
    const value = resolveSlot(
      "given",
      { kind: "lexicon", lexicon: "given" },
      { lexicons: lexicons(), lexiconRefs: { given: "test-given" }, rng },
    );
    expect(GIVEN_LEXICON.entries.map((e) => e.value)).toContain(value);
  });

  it("filters candidates to entries matching the requested variant, including universal entries", () => {
    for (let seed = 0; seed < 30; seed++) {
      const value = resolveSlot(
        "given",
        { kind: "lexicon", lexicon: "given" },
        {
          lexicons: lexicons(),
          lexiconRefs: { given: "test-given" },
          variant: "fem",
          rng: mulberry32(seed),
        },
      );
      expect(["Bryn", "Quinn"]).toContain(value);
      expect(value).not.toBe("Alric");
    }
  });

  it("throws when no entries match the requested variant", () => {
    const rng = mulberry32(1);
    const onlyMasc: Lexicon = {
      schemaVersion: 1,
      id: "masc-only",
      entries: [{ value: "Alric", variants: ["masc"] }],
    };
    expect(() =>
      resolveSlot(
        "given",
        { kind: "lexicon", lexicon: "given" },
        {
          lexicons: new Map([["masc-only", onlyMasc]]),
          lexiconRefs: { given: "masc-only" },
          variant: "fem",
          rng,
        },
      ),
    ).toThrow(/no entries/);
  });

  it("throws when the lexicon key has no entry in lexiconRefs", () => {
    const rng = mulberry32(1);
    expect(() =>
      resolveSlot(
        "given",
        { kind: "lexicon", lexicon: "given" },
        { lexicons: lexicons(), lexiconRefs: {}, rng },
      ),
    ).toThrow(/lexiconRefs/);
  });

  it("throws when the referenced lexicon was not supplied", () => {
    const rng = mulberry32(1);
    expect(() =>
      resolveSlot(
        "given",
        { kind: "lexicon", lexicon: "given" },
        { lexicons: new Map(), lexiconRefs: { given: "test-given" }, rng },
      ),
    ).toThrow(/was not supplied/);
  });

  it("is deterministic for a given seed", () => {
    const runOnce = () =>
      resolveSlot(
        "given",
        { kind: "lexicon", lexicon: "given" },
        { lexicons: lexicons(), lexiconRefs: { given: "test-given" }, rng: mulberry32(2024) },
      );
    expect(runOnce()).toBe(runOnce());
  });
});

describe("resolveSlot - procedural slots", () => {
  it("substitutes {L}, {l}, and {D} with the right character classes", () => {
    const rng = mulberry32(1);
    const value = resolveSlot(
      "designation",
      { kind: "procedural", pattern: "{L}{L}-{D}{D}{D}-{l}" },
      { lexicons: new Map(), lexiconRefs: {}, rng },
    );
    expect(value).toMatch(/^[A-Z]{2}-\d{3}-[a-z]$/);
  });

  it("passes literal characters through unchanged", () => {
    const rng = mulberry32(1);
    const value = resolveSlot(
      "designation",
      { kind: "procedural", pattern: "REG-{D}{D}" },
      { lexicons: new Map(), lexiconRefs: {}, rng },
    );
    expect(value).toMatch(/^REG-\d{2}$/);
  });

  it("is deterministic for a given seed (left-to-right token consumption)", () => {
    const runOnce = () =>
      resolveSlot(
        "designation",
        { kind: "procedural", pattern: "{L}{L}-{D}{D}{D}" },
        { lexicons: new Map(), lexiconRefs: {}, rng: mulberry32(88431) },
      );
    expect(runOnce()).toBe(runOnce());
  });
});

describe("resolveSlot - shareWithin", () => {
  it("ignores shareWithin without a groupId - resolves fresh from the lexicon every call", () => {
    const rng = mulberry32(1);
    const value = resolveSlot(
      "family",
      { kind: "lexicon", lexicon: "given", shareWithin: "kin" },
      { lexicons: lexicons(), lexiconRefs: { given: "test-given" }, rng },
    );
    expect(GIVEN_LEXICON.entries.map((e) => e.value)).toContain(value);
  });

  it("shares the resolved value across calls in the same group under the same groupContext", () => {
    const groupContext = new GroupContext();
    const first = resolveSlot(
      "family",
      { kind: "lexicon", lexicon: "given", shareWithin: "kin" },
      {
        lexicons: lexicons(),
        lexiconRefs: { given: "test-given" },
        rng: mulberry32(1),
        groupId: "kin-a7f",
        groupContext,
      },
    );

    for (let seed = 2; seed < 10; seed++) {
      const value = resolveSlot(
        "family",
        { kind: "lexicon", lexicon: "given", shareWithin: "kin" },
        {
          lexicons: lexicons(),
          lexiconRefs: { given: "test-given" },
          rng: mulberry32(seed),
          groupId: "kin-a7f",
          groupContext,
        },
      );
      expect(value).toBe(first);
    }
  });

  it("keeps groups independent - a different groupId resolves its own fresh value", () => {
    const groupContext = new GroupContext();
    groupContext.getOrResolve("kin-a", "kin", () => "Alric");

    const value = resolveSlot(
      "family",
      { kind: "lexicon", lexicon: "given", shareWithin: "kin" },
      {
        lexicons: lexicons(),
        lexiconRefs: { given: "test-given" },
        rng: mulberry32(1),
        groupId: "kin-b",
        groupContext,
      },
    );
    expect(groupContext.get("kin-b", "kin")).toBe(value);
    expect(groupContext.get("kin-a", "kin")).toBe("Alric");
  });
});

describe("resolveSlot - derived slots", () => {
  it("resolves to undefined with no parent context", () => {
    const rng = mulberry32(1);
    const value = resolveSlot(
      "patronymic",
      { kind: "derived" },
      { lexicons: new Map(), lexiconRefs: {}, rng },
    );
    expect(value).toBeUndefined();
  });

  it("resolves to undefined when a parent is given but no derivations target this slot", () => {
    const rng = mulberry32(1);
    const value = resolveSlot(
      "patronymic",
      { kind: "derived" },
      { lexicons: new Map(), lexiconRefs: {}, rng, parent: { given: "Ivan" } },
    );
    expect(value).toBeUndefined();
  });

  it("derives a value via deriveSlot when a parent and matching derivation are both present", () => {
    const rng = mulberry32(1);
    const value = resolveSlot(
      "patronymic",
      { kind: "derived" },
      {
        lexicons: new Map(),
        lexiconRefs: {},
        rng,
        parent: { given: "Ivan" },
        variant: "fem",
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
    );
    expect(value).toBe("Ivanovna");
  });
});
