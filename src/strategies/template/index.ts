import type { Lexicon, Pack } from "../../data/types.js";
import { GroupContext } from "../../kin/GroupContext.js";
import type { RNG } from "../../rng/mulberry32.js";
import { renderPattern } from "./renderPattern.js";
import { resolveSlot } from "./resolveSlot.js";
import { selectFormat } from "./selectFormat.js";

export const TEMPLATE_STRATEGY_ID = "template";

/** Parent/kin context for derivations — `derived` slots resolve against `parent.parts` (see deriveSlot.ts). */
export interface TemplateContext {
  parent?: Readonly<Record<string, string>>;
}

export interface GenerateWithTemplateInput {
  pack: Pack;
  lexicons: ReadonlyMap<string, Lexicon>;
  variant?: string;
  rng: RNG;
  context?: TemplateContext;
  /** Kin group this call belongs to — see resolveSlot.ts for how this activates `shareWithin`. */
  groupId?: string;
  /** Defaults to resolveSlot's process-wide singleton; inject your own for test isolation. */
  groupContext?: GroupContext;
}

export interface GenerateWithTemplateResult {
  full: string;
  parts: Record<string, string>;
}

export function generateWithTemplate(input: GenerateWithTemplateInput): GenerateWithTemplateResult {
  const { pack, lexicons, variant, rng, context, groupId, groupContext } = input;

  if (pack.strategy !== TEMPLATE_STRATEGY_ID || !pack.config) {
    throw new Error(
      `generateWithTemplate: pack "${pack.id}" does not use the "${TEMPLATE_STRATEGY_ID}" strategy`,
    );
  }

  const { slots, formats, derivations } = pack.config;
  const lexiconRefs = pack.lexiconRefs ?? {};

  const parts: Record<string, string> = {};
  for (const [name, slot] of Object.entries(slots)) {
    const value = resolveSlot(name, slot, {
      variant,
      lexicons,
      lexiconRefs,
      rng,
      groupId,
      groupContext,
      parent: context?.parent,
      derivations,
    });
    if (value !== undefined) parts[name] = value;
  }

  const format = selectFormat(formats, new Set(Object.keys(parts)), rng);
  const full = renderPattern(format.pattern, parts);

  return { full, parts };
}
