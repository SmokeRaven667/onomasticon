# Step 04 — Seeded RNG

**Status:** ✅ Done
**Milestone:** v0.1 — Skeleton
**Depends on:** [02](02-project-tooling.md)

## Goal

Every random choice in the engine — lexicon entry, format, derivation, procedural token — must be reproducible from a seed. This is what makes "reroll just the surname," shareable seeds, and actual unit tests possible.

## Deliverables

- `src/rng/mulberry32.ts` — small seeded PRNG
- `src/rng/weightedChoice.ts` — weighted selection over `{ weight, ... }[]`
- `src/rng/pick.ts` — thin helpers (letter, digit) for procedural tokens

## Key decisions

- mulberry32 over xorshift or crypto RNG: ~10 lines, good-enough distribution for name generation, fast, trivially seedable from a 32-bit int. `RNG = () => number` (float in `[0, 1)`) is the shared type every other RNG file and, later, the strategy engine builds on.
- `randomSeed()` (in `mulberry32.ts`) mints a fresh 32-bit seed via `crypto.getRandomValues` for an unseeded session — used once to _originate_ a seed, never as a substitute for the seeded RNG in actual generation math, keeping the "no bare `Math.random()`" rule intact. Works identically in Node 18+ and the browser (Foundry), no polyfill needed.
- The seed used for a given `generate()` call will be echoed back in `result.meta.seed` once step 06 exists, so any result is replayable — this step just guarantees the RNG itself is capable of that.
- `weightedChoice` treats a missing `weight` as `1`, matching the JSON Schema's own default, and throws on an empty list rather than silently returning `undefined` — an empty slot/format list is a caller bug the loader (step 03) should already prevent, not a case to paper over here.
- `pick.ts`'s `pickUpperLetter`/`pickLowerLetter`/`pickDigit` map 1:1 to the `{L}`/`{l}`/`{D}` procedural pattern tokens from `schema/pack.schema.json`, each consuming exactly one RNG draw — confirmed by a determinism test — so left-to-right token substitution in step 05 replays exactly from a seed.

## Open questions

- None.

## Definition of done

- [x] Same seed → identical output across repeated runs (unit tests on `mulberry32`, `weightedChoice`, and `pick`)
- [x] `weightedChoice` distribution matches configured weights within tolerance (±10%) over 20,000 trials, using a fixed seed so the test itself is non-flaky
