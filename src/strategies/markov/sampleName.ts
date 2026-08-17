import type { RNG } from "../../rng/mulberry32.js";
import { weightedChoice } from "../../rng/weightedChoice.js";
import { BOUNDARY, END, type MarkovModel } from "./buildModel.js";

export interface SampleNameOptions {
  order: number;
  minLength: number;
  maxLength: number;
  /** Bounds retries when a walk lands under minLength — keeps generation deterministic and terminating rather than looping forever on a sparse model. */
  maxAttempts?: number;
}

function walk(model: MarkovModel, options: SampleNameOptions, rng: RNG): string {
  let context = BOUNDARY.repeat(options.order);
  let result = "";

  while (result.length < options.maxLength) {
    const transitions = model.get(context);
    if (!transitions || transitions.length === 0) break;

    const next = weightedChoice(transitions, rng).char;
    if (next === END) break;

    result += next;
    context = (context + next).slice(-options.order);
  }

  return result;
}

/**
 * Walks the model via seeded RNG until it emits an END transition or hits `maxLength`,
 * retrying (still consuming the same deterministic RNG stream, so still reproducible from a
 * seed) if the result is shorter than `minLength`. After `maxAttempts` the last attempt is
 * returned regardless of length, so this always terminates.
 */
export function sampleName(model: MarkovModel, options: SampleNameOptions, rng: RNG): string {
  const maxAttempts = options.maxAttempts ?? 30;

  let result = "";
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    result = walk(model, options, rng);
    if (result.length >= options.minLength) return result;
  }
  return result;
}
