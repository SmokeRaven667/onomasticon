import type { Lexicon, Slot } from "../../data/types.js";
import type { RNG } from "../../rng/mulberry32.js";
import { pickDigit, pickLowerLetter, pickUpperLetter } from "../../rng/pick.js";
import { weightedChoice } from "../../rng/weightedChoice.js";

const PROCEDURAL_TOKEN = /\{(L|l|D)\}/g;

export interface ResolveSlotOptions {
  variant?: string;
  lexicons: ReadonlyMap<string, Lexicon>;
  lexiconRefs: Readonly<Record<string, string>>;
  rng: RNG;
}

function resolveLexiconSlot(name: string, lexiconKey: string, options: ResolveSlotOptions): string {
  const lexiconId = options.lexiconRefs[lexiconKey];
  if (!lexiconId) {
    throw new Error(
      `resolveSlot: slot "${name}" references lexicon key "${lexiconKey}", which has no entry in lexiconRefs`,
    );
  }

  const lexicon = options.lexicons.get(lexiconId);
  if (!lexicon) {
    throw new Error(`resolveSlot: lexicon "${lexiconId}" (for slot "${name}") was not supplied`);
  }

  const variant = options.variant;
  const candidates =
    variant === undefined
      ? lexicon.entries
      : lexicon.entries.filter((entry) => !entry.variants || entry.variants.includes(variant));

  if (candidates.length === 0) {
    throw new Error(
      `resolveSlot: no entries in lexicon "${lexiconId}" match variant "${String(variant)}" for slot "${name}"`,
    );
  }

  return weightedChoice(candidates, options.rng).value;
}

function resolveProceduralSlot(pattern: string, rng: RNG): string {
  return pattern.replace(PROCEDURAL_TOKEN, (_match, token: string) => {
    if (token === "L") return pickUpperLetter(rng);
    if (token === "l") return pickLowerLetter(rng);
    return pickDigit(rng);
  });
}

/**
 * Resolves one slot to a value, or `undefined` for a `derived` slot with no parent context
 * to derive from (kin-group derivation is wired up in step 12; this always returns
 * `undefined` for `derived` slots until then).
 *
 * `lexicon`/`procedural` slots always resolve, `optional` or not — the schema gives them no
 * chance/probability field, so whether an optional slot's value shows up in the rendered
 * name is controlled by format selection (weights), not by the slot failing to resolve.
 */
export function resolveSlot(
  name: string,
  slot: Slot,
  options: ResolveSlotOptions,
): string | undefined {
  if (slot.kind === "derived") return undefined;
  if (slot.kind === "procedural") return resolveProceduralSlot(slot.pattern, options.rng);
  return resolveLexiconSlot(name, slot.lexicon, options);
}
