import type { Derivation } from "../data/types.js";
import type { RNG } from "../rng/mulberry32.js";
import { weightedChoice } from "../rng/weightedChoice.js";
import { renderPattern } from "../strategies/template/renderPattern.js";

export interface DeriveSlotOptions {
  /** Name of the `derived` slot being resolved — matched against each derivation's `produces`. */
  produces: string;
  derivations: readonly Derivation[];
  /** The parent result's resolved parts, looked up by each candidate derivation's `source`. */
  parent: Readonly<Record<string, string>>;
  variant?: string;
  rng: RNG;
}

/**
 * Resolves a `derived` slot per the schema's derivation object: pick a candidate derivation
 * (weighted, when more than one targets this slot), strip the parent's source value if a
 * `strip` rule is given, then substitute it into the template for the requested variant (or
 * the `"*"` fallback).
 *
 * Returns `undefined` — not an error — whenever nothing can fire: no derivation targeting
 * this slot has a source value present on `parent` (e.g. a mixed-pack kin group where the
 * parent used a different pack), or the one `weightedChoice` picks has no template for the
 * requested variant and no `"*"` fallback. `format.requires` (step 05) is what filters an
 * ineligible format out downstream — this function never needs to retry another candidate.
 */
export function deriveSlot(options: DeriveSlotOptions): string | undefined {
  const { produces, derivations, parent, variant, rng } = options;

  const candidates = derivations.filter(
    (derivation) => derivation.produces === produces && parent[derivation.source] !== undefined,
  );
  if (candidates.length === 0) return undefined;

  const chosen = weightedChoice(candidates, rng);

  const template =
    (variant !== undefined ? chosen.variants[variant] : undefined) ?? chosen.variants["*"];
  if (template === undefined) return undefined;

  const sourceValue = parent[chosen.source]!;
  const strippedValue = chosen.strip
    ? sourceValue.replace(new RegExp(chosen.strip.pattern), chosen.strip.replace ?? "")
    : sourceValue;

  return renderPattern(template, { source: strippedValue });
}
