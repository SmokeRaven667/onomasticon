import { loadRegistry } from "./registry.js";
import { mulberry32, randomSeed } from "./rng/mulberry32.js";
import { generateWithTemplate, TEMPLATE_STRATEGY_ID } from "./strategies/template/index.js";
import type { GenerateOptions, Result } from "./types.js";

export function generate(packId: string, options: GenerateOptions = {}): Result {
  const { packs, lexicons } = loadRegistry();

  const pack = packs.get(packId);
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
    lexicons,
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
