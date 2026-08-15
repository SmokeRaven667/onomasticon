# Step 16 — Strategy Registry

**Status:** ⏳ Not started
**Milestone:** v0.3 — Extension points
**Depends on:** [05](05-template-strategy-engine.md), [14](14-public-api-surface.md)

## Goal

Formalize the seam that lets `template` (step 05) coexist with future strategies like Markov (step 18) as plugins, not forks.

## Deliverables

- `src/strategies/registry.ts`
- `registerStrategy(id, implementation)` exposed on the public API (step 14)
- `"template"` registered as the built-in default

## Key decisions

- A strategy implementation is a function `(pack, context, rng) -> Result["parts"]`. Everything above that signature (result assembly, hooks, kin context) is strategy-agnostic.

## Open questions

- None.

## Definition of done

- [ ] A hand-written no-op test strategy can be registered and selected via `pack.strategy`, proving the seam works _before_ Markov (step 18) exists
