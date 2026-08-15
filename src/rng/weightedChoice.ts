import type { RNG } from "./mulberry32.js";

export interface Weighted {
  weight?: number;
}

/** Picks one item, weighted by `.weight` (default 1 per schema convention). Consumes exactly one RNG call. */
export function weightedChoice<T extends Weighted>(items: readonly T[], rng: RNG): T {
  if (items.length === 0) {
    throw new Error("weightedChoice: cannot choose from an empty list");
  }

  const totalWeight = items.reduce((sum, item) => sum + (item.weight ?? 1), 0);
  if (totalWeight <= 0) {
    throw new Error("weightedChoice: total weight must be greater than 0");
  }

  let threshold = rng() * totalWeight;
  for (const item of items) {
    threshold -= item.weight ?? 1;
    if (threshold < 0) return item;
  }

  // Floating-point rounding can leave a sliver of threshold unconsumed; the last item covers it.
  return items[items.length - 1]!;
}
