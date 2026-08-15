# Step 05 — Template Strategy Engine

**Status:** ✅ Done
**Milestone:** v0.1 — Skeleton
**Depends on:** [03](03-loader-and-validator.md), [04](04-seeded-rng.md)

## Goal

Implement the `template` strategy: resolve a pack's slots into values and pick a format to render them into a name. This is the only strategy in v1, but it's built behind the interface step 16 formalizes later.

## Deliverables

- `src/strategies/template/resolveSlot.ts`
- `src/strategies/template/selectFormat.ts`
- `src/strategies/template/renderPattern.ts`
- `src/strategies/template/index.ts` — registers as strategy id `"template"`

## Key decisions

- Slot resolution by kind:
  - `lexicon`: filter entries to those matching the requested variant (an entry with no `variants` array matches any variant), then `weightedChoice`. Throws if zero entries match, or if the slot's `lexicon` key/target lexicon isn't present in what the caller supplied — both indicate a caller bug (an unvalidated pack, or an incomplete lexicon map), not a recoverable runtime case.
  - `procedural`: token substitution consuming the RNG stream (step 04) strictly left-to-right via `pattern.replace` with a global regex, which the tests confirm preserves deterministic replay from a seed.
  - `derived`: resolves to `undefined` in this step — no kin context exists yet (that's step 11/12). `generateWithTemplate`'s `context?: TemplateContext` parameter exists now (with a `parent` field) and is accepted but unused, so those steps are additive, not a rework.
- **`lexicon`/`procedural` slots always resolve, `optional` or not.** Implementing this surfaced that step 03's original validator treated `optional` the same as `derived` ("might not resolve"), which was never actually true — the schema gives lexicon/procedural slots no chance/probability field, so presence in the rendered name is controlled entirely by which _format_ gets chosen (via format weights), not by the slot itself being skipped. Step 03 was corrected in this PR to match — see that file's "Correction made while building step 05" note.
- Format selection: filter to formats whose `requires` are all present among the resolved slot names, then `weightedChoice` among the survivors. Throws if none are eligible, which a validated pack (step 03's `no-standalone-format` check) guarantees never happens.
- Slot resolution order: declared order in `config.slots`, resolving every slot on every call regardless of which format eventually gets chosen. There turned out to be no actual cross-slot dependency to order around — a `derivation.source` reads from the _parent_ result (step 12), never a sibling slot in the same generation — so this is simpler than the original plan anticipated.
- `resolveSlot.ts`/`selectFormat.ts`/`renderPattern.ts` are pure functions with no module-level state; `index.ts`'s `generateWithTemplate()` is the only orchestrator, returning `{ full, parts }` — exactly what step 06's `generate()` needs to fold into the full `Result` with `meta`.
- `index.ts` doesn't register into anything yet (no registry exists — that's step 16); it just exports `generateWithTemplate` and `TEMPLATE_STRATEGY_ID` ready to be plugged in once the registry is built.

## Open questions

- None — step 03's "at least one zero-requires-that-matters format" check guarantees a fallback always exists, so this step doesn't need its own error path for "no eligible formats" beyond a defensive throw.

## Definition of done

- [x] Deterministic generation (fixed seed → fixed output) against all three real example packs, loaded via step 03's loader rather than inline fixtures
- [x] `shareWithin` is accepted on slots but has no effect yet (no kin context) — confirmed by a test generating 30 independent calls from `highfantasy.elven` and asserting more than one distinct `family` value appears, proving no accidental cross-call sharing
