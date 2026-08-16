import { fileURLToPath } from "node:url";
import { loadAllLexicons } from "./data/loadLexicon.js";
import { loadAllPacks } from "./data/loadPack.js";
import type { Lexicon, Pack, Registry } from "./data/types.js";

const PACKS_DIR = fileURLToPath(new URL("../packs", import.meta.url));
const LEXICONS_DIR = fileURLToPath(new URL("../lexicons", import.meta.url));

let cached: Registry | undefined;

/**
 * Loads and validates every bundled pack/lexicon (from the repo's `packs/`/`lexicons/`
 * directories) once, then serves that cached registry. Node-only (built on step 03's
 * `fs`-based loader) — `browser/loadBundledRegistry.ts` is the fetch-based equivalent
 * used inside Foundry.
 *
 * Throws on any invalid bundled file: the repo's own content should always be valid
 * (it's covered by tests), so hitting this means a real bug, not a runtime condition
 * to handle gracefully.
 */
export function loadRegistry(): Registry {
  if (cached) return cached;

  const packResult = loadAllPacks(PACKS_DIR);
  const lexiconResult = loadAllLexicons(LEXICONS_DIR);

  const fileErrors = [
    ...packResult.entries.flatMap((entry) =>
      entry.result.valid
        ? []
        : entry.result.errors.map((error) => `${entry.file}: [${error.code}] ${error.message}`),
    ),
    ...lexiconResult.entries.flatMap((entry) =>
      entry.result.valid
        ? []
        : entry.result.errors.map((error) => `${entry.file}: [${error.code}] ${error.message}`),
    ),
    ...packResult.errors.map((error) => `[${error.code}] ${error.message}`),
    ...lexiconResult.errors.map((error) => `[${error.code}] ${error.message}`),
  ];

  if (fileErrors.length > 0) {
    throw new Error(
      `loadRegistry: bundled packs/lexicons failed validation:\n${fileErrors.join("\n")}`,
    );
  }

  const packs = new Map<string, Pack>();
  for (const entry of packResult.entries) packs.set(entry.result.pack!.id, entry.result.pack!);

  const lexicons = new Map<string, Lexicon>();
  for (const entry of lexiconResult.entries) {
    lexicons.set(entry.result.lexicon!.id, entry.result.lexicon!);
  }

  cached = { packs, lexicons };
  return cached;
}

/** Test-only escape hatch to force the next loadRegistry() call to reload from disk. */
export function resetRegistryCache(): void {
  cached = undefined;
}
