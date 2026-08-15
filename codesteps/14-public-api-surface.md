# Step 14 — Public API Surface

**Status:** ⏳ Not started
**Milestone:** v0.3 — Extension points
**Depends on:** [06](06-result-object-and-generate.md), [11](11-kin-group-context.md)

## Goal

Make Onomasticon usable as infrastructure by other modules, not just a standalone dialog.

## Deliverables

- `game.modules.get("onomasticon").api = { generate, generateKin, listPacks, registerStrategy, registerPack }`, assigned in the `init` hook

## Key decisions

- The `api` object is the *only* supported integration surface. No other module should reach into internal exports — nothing else is guaranteed stable across versions.

## Open questions

- None.

## Definition of done

- [ ] A throwaway second test module can call `game.modules.get("onomasticon").api.generate(...)` and get back a valid `Result`
