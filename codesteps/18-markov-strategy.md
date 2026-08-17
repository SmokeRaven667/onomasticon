# Step 18 — Markov / N-gram Strategy

**Status:** ✅ Done
**Milestone:** v0.4+ — The fun stuff
**Depends on:** [16](16-strategy-registry.md)

## Goal

Add a second, corpus-trained generation strategy — deliberately deferred until the pack format and strategy registry have survived contact with real use, per the original design conversation.

## Deliverables

- [x] `src/strategies/markov/*` — `buildModel.ts` (pure, builds an order-`n` character transition table), `sampleName.ts` (pure, walks it via seeded RNG), `index.ts` (orchestrator: `generateWithMarkov`, model caching)
- [x] A `pack.strategy: "markov"` config shape (corpus reference, n-gram order, min/max length)
- [x] At least one trained example pack — `packs/highfantasy.elven-markov.json`

## Key decisions

- **Training corpus is stored as a lexicon-like JSON file** (a list of training words), not raw text — so it goes through the same lazy-load path as everything else. Concretely, the example pack's corpus is the _existing_ `elven-given` lexicon (step 01's fixture data), reused as-is via `lexiconRefs: { corpus: "elven-given" }` rather than authoring new fictional content — no new lexicon file needed.
- **`Pack.config` was hardcoded to `TemplateConfig`** before this step (`src/data/types.ts`) — a real gap, not just an extension point. Widened to `TemplateConfig | MarkovConfig`; `generateWithMarkov`/`generateWithTemplate` each narrow via `pack.config as X` after their own `pack.strategy !== ID` guard, same runtime-narrowing pattern both already used for the `strategy` field itself (which stays plain `string`, not a literal union, so TS can't narrow `config` automatically from it).
- **`pack.schema.json`** was already strategy-agnostic on purpose (`config`'s shape only constrained inside an `if strategy === "..."` `allOf` branch) — added a parallel `markov` branch and `$defs/markovConfig` (`corpus`, `order` required; `minLength`/`maxLength` optional, JSON-Schema-enforced as positive integers) without touching the `template` branch.
- **`validatePack.ts`'s `runSemanticChecks`** already no-oped for non-template strategies — added a parallel `checkMarkovConfig` branch (corpus key exists in `lexiconRefs`, `minLength <= maxLength`) rather than restructuring the function.
- **Markov ships as a reserved built-in**, registered in `registry.ts`'s initial `strategies` Map next to `"template"` and protected by the same `RESERVED_STRATEGY_IDS` collision check — not registered through the public `registerStrategy()` API at bootstrap. Decided over the plugin-seam-demonstration alternative because it's first-party functionality shipping in the module itself, same tier as `template`; the seam's third-party viability is already proven by step 16/`registry.test.ts`'s hand-written no-op strategy.
- **Model building/caching**: `buildModel` (pure) turns a corpus lexicon's entries into a prefix -> weighted-next-character table, using a control character (`String.fromCharCode(1)`, not a literal space — a literal space in the source was silently corrupted to a NUL byte somewhere in the write path during development, so the sentinel is now constructed at runtime instead of embedded as a source literal) repeated `order` times as left-padding, so word-start contexts are represented the same as any mid-word context, plus an empty-string END transition so a walk can choose to stop. `index.ts` memoizes the built model per `${corpus lexicon id}::${order}::${variant filter}` (a GM changing a pack's order, or two packs sharing a corpus with different variant filters, are just different cache keys), same "cache per key, no invalidation plumbing" precedent as step 17's `loadUserPacks`. A `resetMarkovModelCache()` test escape hatch mirrors `resetStrategyRegistry()`.
- **`sampleName`** walks the model via `weightedChoice` + the caller's RNG until an END transition or `maxLength`, retrying (still consuming the same deterministic RNG stream — same seed still means same output) up to `maxAttempts` (default 30) if the result lands under `minLength`, then returns the last attempt regardless so it always terminates rather than risking an infinite loop against a sparse/short corpus.
- **Result shape**: `{ full, parts: { name: full } }` — markov has no slot concept, so `parts` gets a single synthetic key (`name`) purely to satisfy `Result.parts: Record<string, string>`, not a meaningful per-part breakdown the way template's `given`/`family`/`clan` are.
- **`context`/`groupId`/`groupContext` accepted but unused**: `generateWithMarkov`'s input type is exactly `GenerateWithTemplateInput` (registry.ts's shared `StrategyInput`/`StrategyResult` aliases), so it takes the same fields template does, but kin-sharing a markov name isn't in this step's scope (no bundled pack asks for it) — only seeded reproducibility, the guarantee template already provides.
- One existing test broke and was updated, not left broken: `template/index.test.ts`'s "generates a plausible full name from every bundled pack" iterated every pack in `packs/` and called `generateWithTemplate` directly, which throws on a non-template pack — filtered to `pack.strategy === "template"`. `registry.test.ts` also had a test asserting `getStrategy("markov")` returns `undefined`, written before markov existed — updated to assert it's now a registered built-in instead.

## Open questions

- Generation-time cost at larger n — not benchmarked; the shipped example uses order 2 against a ~44-word corpus, comfortably fast. Revisit before making markov a default-on option against a large corpus or high order.

## Definition of done

- [x] A Markov pack produces plausible novel names (manual eyeball pass) — `highfantasy.elven-markov` against seeds 0-19 produced names like Caelin, Isolwyn, Sylvarel, Anvarendri, Amarenith, Thraveth — elven-flavored, none copied verbatim from the `elven-given` training corpus
- [x] Seeded reproducibility matches the guarantee the `template` strategy already provides — `src/strategies/markov/sampleName.test.ts`, `src/strategies/markov/index.test.ts`
- [x] `npm run typecheck && npm run lint && npm test && npm run build && npm run format` all pass (156 tests, up from 138); build output confirmed free of `node:fs`/`node:path`/`node:url`; manifest reports 7 packs (up from 6)
