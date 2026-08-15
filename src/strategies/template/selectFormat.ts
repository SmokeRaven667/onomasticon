import type { Format } from "../../data/types.js";
import type { RNG } from "../../rng/mulberry32.js";
import { weightedChoice } from "../../rng/weightedChoice.js";

/**
 * Picks one format among those whose `requires` are all satisfied by the resolved slots,
 * weighted by `format.weight`. The step-03 validator guarantees at least one format needs
 * no context at all, so a validated pack always has something eligible here.
 */
export function selectFormat(
  formats: readonly Format[],
  resolvedSlotNames: ReadonlySet<string>,
  rng: RNG,
): Format {
  const eligible = formats.filter((format) =>
    (format.requires ?? []).every((name) => resolvedSlotNames.has(name)),
  );

  if (eligible.length === 0) {
    throw new Error("selectFormat: no format is eligible with the currently resolved slots");
  }

  return weightedChoice(eligible, rng);
}
