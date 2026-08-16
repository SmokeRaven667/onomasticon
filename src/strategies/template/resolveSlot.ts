import type { Derivation, Lexicon, Slot } from "../../data/types.js";
import { deriveSlot } from "../../kin/deriveSlot.js";
import { defaultGroupContext, GroupContext } from "../../kin/GroupContext.js";
import type { RNG } from "../../rng/mulberry32.js";
import { pickDigit, pickLowerLetter, pickUpperLetter } from "../../rng/pick.js";
import { weightedChoice } from "../../rng/weightedChoice.js";

const PROCEDURAL_TOKEN = /\{(L|l|D)\}/g;

export interface ResolveSlotOptions {
  variant?: string;
  lexicons: ReadonlyMap<string, Lexicon>;
  lexiconRefs: Readonly<Record<string, string>>;
  rng: RNG;
  /** Kin group this generation belongs to. Required (alongside a slot's `shareWithin`) for sharing to activate. */
  groupId?: string;
  /** Defaults to the process-wide `defaultGroupContext` singleton; inject your own for test isolation. */
  groupContext?: GroupContext;
  /** The parent result's resolved parts. Required (alongside the pack's own derivations) for `derived` slots to resolve. */
  parent?: Readonly<Record<string, string>>;
  /** This pack's `config.derivations`, searched for entries whose `produces` matches a `derived` slot's name. */
  derivations?: readonly Derivation[];
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
 * Resolves one slot to a value, or `undefined` for a `derived` slot that has nothing to
 * derive from — no `parent` context (a standalone `generate()` call, not part of a kin
 * group), or `deriveSlot` itself found no candidate that fires (see deriveSlot.ts).
 *
 * `lexicon`/`procedural` slots always resolve, `optional` or not — the schema gives them no
 * chance/probability field, so whether an optional slot's value shows up in the rendered
 * name is controlled by format selection (weights), not by the slot failing to resolve.
 *
 * A slot with `shareWithin` set only actually shares when a `groupId` is also supplied —
 * with no `groupId` (the common case: a single standalone `generate()` call) it just
 * resolves fresh every time, same as a slot with no `shareWithin` at all. `shareWithin` is
 * not honored on `derived` slots: `deriveSlot` can legitimately return `undefined`, which
 * `GroupContext` has nowhere sane to cache, and no bundled pack asks for it yet.
 */
export function resolveSlot(
  name: string,
  slot: Slot,
  options: ResolveSlotOptions,
): string | undefined {
  if (slot.kind === "derived") {
    if (!options.parent) return undefined;
    return deriveSlot({
      produces: name,
      derivations: options.derivations ?? [],
      parent: options.parent,
      variant: options.variant,
      rng: options.rng,
    });
  }

  const resolveFresh = (): string =>
    slot.kind === "procedural"
      ? resolveProceduralSlot(slot.pattern, options.rng)
      : resolveLexiconSlot(name, slot.lexicon, options);

  if (slot.shareWithin && options.groupId) {
    const groupContext = options.groupContext ?? defaultGroupContext;
    return groupContext.getOrResolve(options.groupId, slot.shareWithin, resolveFresh);
  }

  return resolveFresh();
}
