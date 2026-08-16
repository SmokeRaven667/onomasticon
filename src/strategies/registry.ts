import {
  generateWithTemplate,
  TEMPLATE_STRATEGY_ID,
  type GenerateWithTemplateInput,
  type GenerateWithTemplateResult,
} from "./template/index.js";

/**
 * Everything a strategy implementation needs to produce a name's parts — identical to the
 * `template` strategy's own `generateWithTemplate` input, since that's the one already
 * proven out (lexicon/procedural/derived slots, kin sharing) and there's no second strategy
 * yet to reveal what, if anything, should differ. Reusing the type directly (rather than
 * redeclaring an identical shape) keeps them from drifting apart by accident.
 */
export type StrategyInput = GenerateWithTemplateInput;

/**
 * `{ full, parts }` — the strategy owns turning its pack's config into both. `generate()`
 * only adds `meta` on top; nothing about result *assembly* is pulled out into a
 * strategy-agnostic layer above this seam. See this codestep's key decisions for why that's
 * a deliberate departure from step 16's original (pre-implementation) sketch of the
 * contract as `(pack, context, rng) -> Result["parts"]` alone.
 */
export type StrategyResult = GenerateWithTemplateResult;

export type StrategyImplementation = (input: StrategyInput) => StrategyResult;

const strategies = new Map<string, StrategyImplementation>([
  [TEMPLATE_STRATEGY_ID, generateWithTemplate],
]);

/** Looks up a registered strategy by id (a pack's `strategy` field), or `undefined` if none is registered. */
export function getStrategy(id: string): StrategyImplementation | undefined {
  return strategies.get(id);
}

/**
 * Registers a custom strategy implementation under `id`, so packs with `"strategy": id` can
 * generate through it. Throws rather than silently overriding on either a reserved id
 * (`"template"`) or a re-registration of an id that's already taken — same "reject and warn,
 * never silently override" principle this project already applies to duplicate pack/lexicon
 * ids (step 03) and (per its own open question) user-pack id collisions (step 17).
 */
export function registerStrategy(id: string, implementation: StrategyImplementation): void {
  if (id === TEMPLATE_STRATEGY_ID) {
    throw new Error(`registerStrategy: "${id}" is reserved for the built-in template strategy`);
  }
  if (strategies.has(id)) {
    throw new Error(`registerStrategy: a strategy is already registered under id "${id}"`);
  }
  strategies.set(id, implementation);
}

/** Test-only escape hatch: drops every custom registration, leaving only the built-in "template". */
export function resetStrategyRegistry(): void {
  strategies.clear();
  strategies.set(TEMPLATE_STRATEGY_ID, generateWithTemplate);
}
