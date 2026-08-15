# Step 05 — Template Strategy Engine

**Status:** ⏳ Not started
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
  - `lexicon`: filter entries by requested variant, then `weightedChoice`.
  - `procedural`: token substitution consuming the RNG stream (step 04).
  - `derived`: resolves to `undefined` in this step — no kin context exists yet (that's step 11/12). The signature accepts an optional context parameter now so those steps are additive, not a rework.
- Format selection: filter to formats whose `requires` are all resolved, then `weightedChoice` among the survivors.
- Slot resolution order: independent slots first; this matters once derived slots (step 12) need other slots' values already resolved.

## Open questions

- None — step 03's "at least one zero-requires format" check guarantees a fallback always exists, so this step doesn't need its own error path for "no eligible formats."

## Definition of done

- [ ] Deterministic generation (fixed seed → fixed output) against all three example packs
- [ ] `shareWithin` is accepted on slots but has no effect yet (no kin context) — confirmed by a test that asserts _no_ sharing happens without a group context
