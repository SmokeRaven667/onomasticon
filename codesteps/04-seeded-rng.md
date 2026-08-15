# Step 04 — Seeded RNG

**Status:** ⏳ Not started
**Milestone:** v0.1 — Skeleton
**Depends on:** [02](02-project-tooling.md)

## Goal

Every random choice in the engine — lexicon entry, format, derivation, procedural token — must be reproducible from a seed. This is what makes "reroll just the surname," shareable seeds, and actual unit tests possible.

## Deliverables

- `src/rng/mulberry32.ts` — small seeded PRNG
- `src/rng/weightedChoice.ts` — weighted selection over `{ weight, ... }[]`
- `src/rng/pick.ts` — thin helpers (letter, digit) for procedural tokens

## Key decisions

- mulberry32 over xorshift or crypto RNG: ~10 lines, good-enough distribution for name generation, fast, trivially seedable from a 32-bit int.
- The seed used for a given `generate()` call is echoed back in `result.meta.seed`, so any result is replayable.
- Procedural tokens (`{L}`, `{l}`, `{D}`) consume the RNG stream strictly left-to-right through the pattern, and that order is documented — required for seed replay to be deterministic once step 05 wires this in.

## Open questions

- None.

## Definition of done

- [ ] Same seed → identical output across repeated runs (unit test)
- [ ] `weightedChoice` distribution matches configured weights within tolerance over N=10,000 trials (statistical test)
