import type { Lexicon, MarkovConfig } from "../../data/types.js";
import type { GenerateWithTemplateInput, GenerateWithTemplateResult } from "../template/index.js";
import { buildModel, type MarkovModel } from "./buildModel.js";
import { sampleName } from "./sampleName.js";

export const MARKOV_STRATEGY_ID = "markov";

const DEFAULT_MIN_LENGTH = 3;
const DEFAULT_MAX_LENGTH = 12;

/** Built models, keyed by `${corpus lexicon id}::${order}::${variant filter}` — a GM swapping a pack's order or variant is just a different key, no invalidation logic needed. */
const modelCache = new Map<string, MarkovModel>();

function corpusEntries(corpus: Lexicon, variant: string | undefined): Lexicon["entries"] {
  return variant === undefined
    ? corpus.entries
    : corpus.entries.filter((entry) => !entry.variants || entry.variants.includes(variant));
}

function getOrBuildModel(corpus: Lexicon, order: number, variant: string | undefined): MarkovModel {
  const key = `${corpus.id}::${order}::${variant ?? ""}`;
  const cached = modelCache.get(key);
  if (cached) return cached;

  const entries = corpusEntries(corpus, variant);
  if (entries.length === 0) {
    throw new Error(
      `generateWithMarkov: no entries in corpus lexicon "${corpus.id}" match variant "${String(variant)}"`,
    );
  }

  const model = buildModel({ ...corpus, entries }, order);
  modelCache.set(key, model);
  return model;
}

/**
 * `input` reuses the template strategy's shape exactly (see registry.ts's `StrategyInput`) —
 * `context`/`groupId`/`groupContext` are accepted but unused: kin-sharing a markov name isn't
 * part of this step's scope (no bundled pack asks for it), just seeded reproducibility, same
 * guarantee `template` already provides.
 */
export function generateWithMarkov(input: GenerateWithTemplateInput): GenerateWithTemplateResult {
  const { pack, lexicons, variant, rng } = input;

  if (pack.strategy !== MARKOV_STRATEGY_ID || !pack.config) {
    throw new Error(
      `generateWithMarkov: pack "${pack.id}" does not use the "${MARKOV_STRATEGY_ID}" strategy`,
    );
  }

  const config = pack.config as MarkovConfig;
  const corpusId = (pack.lexiconRefs ?? {})[config.corpus];
  if (!corpusId) {
    throw new Error(
      `generateWithMarkov: pack "${pack.id}" config.corpus "${config.corpus}" has no entry in lexiconRefs`,
    );
  }

  const corpus = lexicons.get(corpusId);
  if (!corpus) {
    throw new Error(`generateWithMarkov: corpus lexicon "${corpusId}" was not supplied`);
  }

  const model = getOrBuildModel(corpus, config.order, variant);
  const full = sampleName(
    model,
    {
      order: config.order,
      minLength: config.minLength ?? DEFAULT_MIN_LENGTH,
      maxLength: config.maxLength ?? DEFAULT_MAX_LENGTH,
    },
    rng,
  );

  return { full, parts: { name: full } };
}

/** Test-only escape hatch: drops every cached model, e.g. between tests reusing the same corpus/pack id with different content. */
export function resetMarkovModelCache(): void {
  modelCache.clear();
}
