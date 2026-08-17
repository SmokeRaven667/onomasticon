import type { Lexicon } from "../../data/types.js";

/** Sentinel marking "before the start of the word" in a context window. Never appears in real corpus text (control character, not typable in a JSON pack file). */
const BOUNDARY = String.fromCharCode(1);
/** Sentinel value meaning "the word ends here" as a transition target. */
export const END = "";

export interface MarkovTransition {
  char: string;
  weight: number;
}

/** Prefix (last `order` characters, or fewer at the start of a word) -> weighted next-character choices. */
export type MarkovModel = ReadonlyMap<string, readonly MarkovTransition[]>;

/**
 * Builds an order-`n` character transition table from a training-word lexicon. Every entry's
 * `value` is walked left-to-right with `order` characters of left-padding (BOUNDARY) so short
 * words and word-starts are represented same as any other context, and a trailing END
 * transition so the walk can choose to stop.
 */
export function buildModel(corpus: Lexicon, order: number): MarkovModel {
  const counts = new Map<string, Map<string, number>>();

  for (const entry of corpus.entries) {
    const chars = Array.from(entry.value);
    let context = BOUNDARY.repeat(order);

    for (const char of [...chars, END]) {
      let transitions = counts.get(context);
      if (!transitions) {
        transitions = new Map();
        counts.set(context, transitions);
      }
      transitions.set(char, (transitions.get(char) ?? 0) + 1);
      context = (context + char).slice(-order);
    }
  }

  const model = new Map<string, MarkovTransition[]>();
  for (const [context, transitions] of counts) {
    model.set(
      context,
      Array.from(transitions, ([char, weight]) => ({ char, weight })),
    );
  }
  return model;
}

export { BOUNDARY };
