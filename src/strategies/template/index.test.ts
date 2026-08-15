import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { loadAllLexicons } from "../../data/loadLexicon.js";
import { loadAllPacks, loadPackFile } from "../../data/loadPack.js";
import type { Lexicon, Pack } from "../../data/types.js";
import { mulberry32 } from "../../rng/mulberry32.js";
import { generateWithTemplate } from "./index.js";

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

describe("generateWithTemplate - real example packs", () => {
  const lexicons = loadRealLexicons();

  it("generates deterministically from highfantasy.elven for a fixed seed", () => {
    const pack = loadRealPack("highfantasy.elven.json");
    const runOnce = () =>
      generateWithTemplate({ pack, lexicons, variant: "masc", rng: mulberry32(88431) });
    expect(runOnce()).toEqual(runOnce());
  });

  it("generates a plausible full name from every bundled pack", () => {
    const { entries } = loadAllPacks(PACKS_DIR);
    for (const entry of entries) {
      const pack = entry.result.pack!;
      const result = generateWithTemplate({ pack, lexicons, rng: mulberry32(1) });
      expect(result.full.length, pack.id).toBeGreaterThan(0);
      expect(result.parts.given, pack.id).toBeDefined();
    }
  });

  it("modern.slavic-patronymic falls back to the standalone format with no parent context", () => {
    const pack = loadRealPack("modern.slavic-patronymic.json");
    for (let seed = 0; seed < 30; seed++) {
      const result = generateWithTemplate({ pack, lexicons, rng: mulberry32(seed) });
      expect(result.parts.patronymic).toBeUndefined();
      expect(result.full).toBe(`${result.parts.given} ${result.parts.family}`);
    }
  });

  it("shareWithin has no effect without a group context - independent calls don't share values", () => {
    const pack = loadRealPack("highfantasy.elven.json");
    const families = new Set<string>();
    for (let seed = 0; seed < 30; seed++) {
      const result = generateWithTemplate({ pack, lexicons, rng: mulberry32(seed) });
      families.add(result.parts.family!);
    }
    expect(families.size).toBeGreaterThan(1);
  });
});
