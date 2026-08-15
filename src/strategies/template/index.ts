import type { Lexicon, Pack } from "../../data/types.js";
import type { RNG } from "../../rng/mulberry32.js";
import { renderPattern } from "./renderPattern.js";
import { resolveSlot } from "./resolveSlot.js";
import { selectFormat } from "./selectFormat.js";

export const TEMPLATE_STRATEGY_ID = "template";

/**
 * Parent/kin context for derivations. Accepted now so the signature doesn't change shape
 * when step 11 (kin group context) and step 12 (derivation engine) wire it up — until then
 * it's accepted and ignored, and `derived` slots always resolve to `undefined`.
 */
export interface TemplateContext {
  parent?: Readonly<Record<string, string>>;
}

export interface GenerateWithTemplateInput {
  pack: Pack;
  lexicons: ReadonlyMap<string, Lexicon>;
  variant?: string;
  rng: RNG;
  context?: TemplateContext;
}

export interface GenerateWithTemplateResult {
  full: string;
  parts: Record<string, string>;
}

export function generateWithTemplate(input: GenerateWithTemplateInput): GenerateWithTemplateResult {
  const { pack, lexicons, variant, rng } = input;

  if (pack.strategy !== TEMPLATE_STRATEGY_ID || !pack.config) {
    throw new Error(
      `generateWithTemplate: pack "${pack.id}" does not use the "${TEMPLATE_STRATEGY_ID}" strategy`,
    );
  }

  const { slots, formats } = pack.config;
  const lexiconRefs = pack.lexiconRefs ?? {};

  const parts: Record<string, string> = {};
  for (const [name, slot] of Object.entries(slots)) {
    const value = resolveSlot(name, slot, { variant, lexicons, lexiconRefs, rng });
    if (value !== undefined) parts[name] = value;
  }

  const format = selectFormat(formats, new Set(Object.keys(parts)), rng);
  const full = renderPattern(format.pattern, parts);

  return { full, parts };
}
