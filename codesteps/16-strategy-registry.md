# Step 16 — Strategy Registry

**Status:** ✅ Done — folded into step 14, ahead of schedule
**Milestone:** v0.3 — Extension points
**Depends on:** [05](05-template-strategy-engine.md), [14](14-public-api-surface.md)

## Goal

Formalize the seam that lets `template` (step 05) coexist with future strategies like Markov (step 18) as plugins, not forks.

## What actually happened

While building step 14's public API, a stub `registerStrategy` (store a registration, but leave `generateWithRegistry` hardcoded to only ever run `template`) would have shipped something actively misleading: a caller registers a strategy, then `generate()` on a pack using it still throws "no registered implementation." Rather than ship that, this step's real deliverable landed as part of step 14's work instead of waiting for its own turn — see [step 14's key decisions](14-public-api-surface.md) for the full reasoning (same precedent as step 08 pulling forward `generateWithRegistry.ts`/the browser loader).

## Deliverables

- [x] `src/strategies/registry.ts` — built in step 14
- [x] `registerStrategy(id, implementation)` exposed on the public API — built in step 14
- [x] `"template"` registered as the built-in default — built in step 14

## Key decisions

- The strategy contract ended up as `(input) -> { full, parts }`, not the `(pack, context, rng) -> Result["parts"]` sketched here before implementation. See step 14's key decisions for why (`template`'s result assembly doesn't cleanly hoist into a strategy-agnostic layer yet, with only one strategy to generalize from).
- Everything else about the registry (`getStrategy`, reject-on-collision, the `resetStrategyRegistry()` test escape hatch) lives in `src/strategies/registry.ts` exactly as this step originally scoped it — only the _timing_ changed, not the design.

## Open questions

- None.

## Definition of done

- [x] A hand-written no-op test strategy can be registered and selected via `pack.strategy`, proving the seam works _before_ Markov (step 18) exists — `src/strategies/registry.test.ts`, `src/generateWithRegistry.test.ts`, and end-to-end through the real public API in `src/module/api.test.ts`
