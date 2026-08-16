import { generateKinWithRegistry, type GenerateKinOptions } from "./generateKinWithRegistry.js";
import { generateWithRegistry } from "./generateWithRegistry.js";
import { loadRegistry } from "./registry.js";
import type { GenerateOptions, Result } from "./types.js";

/** Node convenience wrapper over `generateWithRegistry`, using the bundled `fs`-based registry. */
export function generate(packId: string, options: GenerateOptions = {}): Result {
  return generateWithRegistry(packId, options, loadRegistry());
}

/** Node convenience wrapper over `generateKinWithRegistry`, using the bundled `fs`-based registry. */
export function generateKin(
  packId: string,
  count: number,
  options: GenerateKinOptions = {},
): Result[] {
  return generateKinWithRegistry(packId, count, options, loadRegistry());
}
