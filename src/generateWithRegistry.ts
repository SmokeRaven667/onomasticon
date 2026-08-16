import type { Registry } from "./data/types.js";
import { mulberry32, randomSeed } from "./rng/mulberry32.js";
import { generateWithTemplate, TEMPLATE_STRATEGY_ID } from "./strategies/template/index.js";
import type { GenerateOptions, Result } from "./types.js";

/**
 * The registry-agnostic core: works identically whether `registry` came from Node's
 * `fs`-based `loadRegistry()` (registry.ts) or the browser's fetch-based
 * `loadBundledRegistry()` (browser/loadBundledRegistry.ts). Deliberately has zero Node
 * imports (no `node:fs` et al.) so the browser bundle can import it directly without
 * pulling in anything `fs`-based — see `apps/GeneratorApp.ts`.
 */
export function generateWithRegistry(
  packId: string,
  options: GenerateOptions,
  registry: Registry,
): Result {
  const pack = registry.packs.get(packId);
  if (!pack) {
    throw new Error(`generate: no pack registered with id "${packId}"`);
  }

  if (pack.strategy !== TEMPLATE_STRATEGY_ID) {
    throw new Error(
      `generate: pack "${packId}" uses strategy "${pack.strategy}", which has no registered implementation until step 16's strategy registry exists`,
    );
  }

  const seed = options.seed ?? randomSeed();
  const rng = mulberry32(seed);

  const { full, parts } = generateWithTemplate({
    pack,
    lexicons: registry.lexicons,
    variant: options.variant,
    rng,
    context: options.context,
  });

  return {
    full,
    parts,
    meta: {
      packId,
      strategyId: TEMPLATE_STRATEGY_ID,
      seed,
      groupId: options.context?.groupId,
    },
  };
}
