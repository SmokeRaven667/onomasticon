import type { Registry } from "./data/types.js";
import { mulberry32, randomSeed } from "./rng/mulberry32.js";
import { getStrategy } from "./strategies/registry.js";
import type { GenerateOptions, Result } from "./types.js";

/**
 * The registry-agnostic core: works identically whether `registry` came from Node's
 * `fs`-based `loadRegistry()` (registry.ts) or the browser's fetch-based
 * `loadBundledRegistry()` (browser/loadBundledRegistry.ts). Deliberately has zero Node
 * imports (no `node:fs` et al.) so the browser bundle can import it directly without
 * pulling in anything `fs`-based — see `apps/GeneratorApp.ts`.
 *
 * `Hooks` is guarded with a `typeof` check rather than called bare: this function is also
 * exercised by `generate()` (generate.ts) for genuine standalone-Node use with no Foundry
 * runtime at all, where the global `Hooks` object simply doesn't exist.
 */
export function generateWithRegistry(
  packId: string,
  options: GenerateOptions,
  registry: Registry,
): Result {
  if (typeof Hooks !== "undefined") {
    // Foundry convention: listeners receive `options` and may mutate it in place. Uses
    // Hooks.call (not callAll): callAll always calls every listener and always returns
    // true, ignoring return values entirely — call is the one that stops at the first
    // listener to return false and reports that back, which is what makes this cancelable.
    const proceed = Hooks.call("onomasticon.preGenerate", options);
    if (proceed === false) {
      throw new Error('generate: cancelled by an "onomasticon.preGenerate" hook listener');
    }
  }

  const pack = registry.packs.get(packId);
  if (!pack) {
    throw new Error(`generate: no pack registered with id "${packId}"`);
  }

  const strategy = getStrategy(pack.strategy);
  if (!strategy) {
    throw new Error(
      `generate: pack "${packId}" uses strategy "${pack.strategy}", which has no registered implementation (register one via the public API's registerStrategy)`,
    );
  }

  const seed = options.seed ?? randomSeed();
  const rng = mulberry32(seed);

  const { full, parts } = strategy({
    pack,
    lexicons: registry.lexicons,
    variant: options.variant,
    rng,
    context: options.context,
    groupId: options.context?.groupId,
  });

  const result: Result = {
    full,
    parts,
    meta: {
      packId,
      strategyId: pack.strategy,
      seed,
      groupId: options.context?.groupId,
    },
  };

  if (typeof Hooks !== "undefined") {
    Hooks.callAll("onomasticon.generated", result);
  }

  return result;
}
