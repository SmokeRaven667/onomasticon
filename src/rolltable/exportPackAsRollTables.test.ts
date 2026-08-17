import { afterEach, describe, expect, it } from "vitest";
import type { Lexicon, Pack, Registry } from "../data/types.js";
import { resetRollTableStub } from "../test/foundryStubs.js";
import { exportPackAsRollTables } from "./exportPackAsRollTables.js";

const GIVEN_LEXICON: Lexicon = {
  schemaVersion: 1,
  id: "test-given",
  label: "Test Given Names",
  entries: [
    { value: "Ashan", weight: 1 },
    { value: "Ostreth", weight: 3 },
  ],
};

const FAMILY_LEXICON: Lexicon = {
  schemaVersion: 1,
  id: "test-family",
  entries: [{ value: "Stonebrook" }],
};

const PACK: Pack = {
  schemaVersion: 1,
  id: "test.pack",
  label: "Test Pack",
  strategy: "template",
  lexiconRefs: { given: "test-given", family: "test-family" },
  config: {
    slots: {
      given: { kind: "lexicon", lexicon: "given" },
      family: { kind: "lexicon", lexicon: "family" },
    },
    formats: [{ pattern: "{given} {family}" }],
  },
};

function registry(): Registry {
  return {
    packs: new Map([[PACK.id, PACK]]),
    lexicons: new Map([
      [GIVEN_LEXICON.id, GIVEN_LEXICON],
      [FAMILY_LEXICON.id, FAMILY_LEXICON],
    ]),
  };
}

afterEach(() => {
  resetRollTableStub();
});

describe("exportPackAsRollTables", () => {
  it("creates one RollTable per lexicon the pack references", async () => {
    const exported = await exportPackAsRollTables("test.pack", registry());

    expect(exported).toHaveLength(2);
    expect(exported.map((e) => e.lexiconKey).sort()).toEqual(["family", "given"]);
  });

  it("names each table after the pack and lexicon, and populates every entry as a result", async () => {
    const exported = await exportPackAsRollTables("test.pack", registry());
    const givenTable = exported.find((e) => e.lexiconKey === "given")!.table;

    expect(givenTable.name).toBe("Test Pack — Test Given Names");
    expect(givenTable.results.map((r) => r.text)).toEqual(["Ashan", "Ostreth"]);
  });

  it("reflects source lexicon weights in the normalized ranges (a weight-3 entry covers a wider range than a weight-1 entry)", async () => {
    const exported = await exportPackAsRollTables("test.pack", registry());
    const givenTable = exported.find((e) => e.lexiconKey === "given")!.table;

    const [ashan, ostreth] = givenTable.results;
    const rangeSpan = (range: [number, number]) => range[1] - range[0] + 1;

    expect(rangeSpan(ashan!.range)).toBe(1);
    expect(rangeSpan(ostreth!.range)).toBe(3);
  });

  it("throws for an unknown packId", async () => {
    await expect(exportPackAsRollTables("not-a-real-pack", registry())).rejects.toThrow(
      /no pack registered/,
    );
  });

  it("throws for a pack with no lexiconRefs to export", async () => {
    const noLexiconsPack: Pack = { ...PACK, id: "test.no-lexicons", lexiconRefs: {} };
    const reg: Registry = {
      packs: new Map([[noLexiconsPack.id, noLexiconsPack]]),
      lexicons: new Map(),
    };

    await expect(exportPackAsRollTables("test.no-lexicons", reg)).rejects.toThrow(
      /references no lexicons/,
    );
  });
});
