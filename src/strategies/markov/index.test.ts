import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it } from "vitest";
import { loadAllLexicons } from "../../data/loadLexicon.js";
import { loadPackFile } from "../../data/loadPack.js";
import type { Lexicon, Pack } from "../../data/types.js";
import { mulberry32 } from "../../rng/mulberry32.js";
import { generateWithMarkov, resetMarkovModelCache } from "./index.js";

const PACKS_DIR = fileURLToPath(new URL("../../../packs", import.meta.url));
const LEXICONS_DIR = fileURLToPath(new URL("../../../lexicons", import.meta.url));

function loadRealLexicons(): Map<string, Lexicon> {
  const { entries } = loadAllLexicons(LEXICONS_DIR);
  const map = new Map<string, Lexicon>();
  for (const entry of entries) {
    if (entry.result.lexicon) map.set(entry.result.lexicon.id, entry.result.lexicon);
  }
  return map;
}

function loadRealPack(fileName: string): Pack {
  const result = loadPackFile(`${PACKS_DIR}/${fileName}`);
  if (!result.pack) {
    throw new Error(`fixture pack "${fileName}" failed to load: ${JSON.stringify(result.errors)}`);
  }
  return result.pack;
}

describe("generateWithMarkov - real example pack", () => {
  beforeEach(() => {
    resetMarkovModelCache();
  });

  const lexicons = loadRealLexicons();

  it("generates deterministically for a fixed seed", () => {
    const pack = loadRealPack("highfantasy.elven-markov.json");
    const runOnce = () => generateWithMarkov({ pack, lexicons, rng: mulberry32(2024) });
    expect(runOnce()).toEqual(runOnce());
  });

  it("produces a non-empty name honoring the pack's min/max length", () => {
    const pack = loadRealPack("highfantasy.elven-markov.json");
    for (let seed = 0; seed < 20; seed++) {
      const result = generateWithMarkov({ pack, lexicons, rng: mulberry32(seed) });
      expect(result.full.length).toBeGreaterThanOrEqual(4);
      expect(result.full.length).toBeLessThanOrEqual(10);
      expect(result.parts.name).toBe(result.full);
    }
  });

  it("produces novel names not verbatim copied from the training corpus, across enough seeds", () => {
    const pack = loadRealPack("highfantasy.elven-markov.json");
    const corpus = lexicons.get("elven-given")!;
    const trainingWords = new Set(corpus.entries.map((e) => e.value));

    const novel = new Set<string>();
    for (let seed = 0; seed < 50; seed++) {
      const result = generateWithMarkov({ pack, lexicons, rng: mulberry32(seed) });
      if (!trainingWords.has(result.full)) novel.add(result.full);
    }
    expect(novel.size).toBeGreaterThan(0);
  });

  it("throws for a pack that doesn't use the markov strategy", () => {
    const pack = loadRealPack("highfantasy.elven.json");
    expect(() => generateWithMarkov({ pack, lexicons, rng: mulberry32(1) })).toThrow(/strategy/);
  });
});
