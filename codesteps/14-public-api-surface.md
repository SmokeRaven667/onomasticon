# Step 14 — Public API Surface

**Status:** ✅ Done
**Milestone:** v0.3 — Extension points
**Depends on:** [06](06-result-object-and-generate.md), [11](11-kin-group-context.md)

## Goal

Make Onomasticon usable as infrastructure by other modules, not just a standalone dialog.

## Deliverables

- `game.modules.get("onomasticon").api = { generate, generateKin, listPacks, registerStrategy, registerPack }`, assigned in the `init` hook

## Key decisions

- The `api` object is the _only_ supported integration surface. No other module should reach into internal exports — nothing else is guaranteed stable across versions.
- **Scope decision made with the user up front**: `registerStrategy` had to actually work, not just store a registration nobody consults. Left as a stub, a caller could register a strategy, then call `generate()` on a pack using it and still hit "no registered implementation" — worse than not offering it at all. So this step pulls forward the real dispatch mechanism step 16 was scoped to build (`src/strategies/registry.ts`, `"template"` as the built-in default, `generateWithRegistry` consulting the registry instead of hardcoding `TEMPLATE_STRATEGY_ID`), same precedent as step 08 pulling forward `generateWithRegistry.ts`/the browser loader rather than shipping something that couldn't actually generate a name. Step 16's own doc is updated to reflect this — see its file for what's left there.
- Departure from step 16's original (pre-implementation) sketch of the strategy contract, `(pack, context, rng) -> Result["parts"]`: the actual `StrategyImplementation` type is `(input) -> { full, parts }` — identical to `generateWithTemplate`'s own existing, already-tested input/output shape (`src/strategies/registry.ts`'s `StrategyInput`/`StrategyResult` are direct aliases of it). Result _assembly_ (turning `parts` into `full`) stays inside each strategy, not hoisted into a shared layer above the strategy boundary — `template`'s format-selection/pattern-rendering is specific to its own `pack.config` shape (`slots`/`formats`), and there's no second strategy yet to prove what, if anything, a shared assembly layer should look like. Revisit if/when step 18 (Markov) reveals a real need for one.
- `registerPack(data)` is a genuinely working runtime primitive now, not deferred to step 17: validates untrusted pack data through the exact same step-03 validator bundled/fetched packs already go through (`validatePackData` — no relaxed rules), then adds it to the shared browser registry (the same singleton `GeneratorApp`/`api.generate` use, via `loadBundledRegistry`'s own caching) so it's immediately generatable and shows up in `listPacks()`. Rejects an id collision rather than silently overriding — same principle `registerStrategy` and step 17's own (open-question) directory-loader design already use. Deliberately doesn't also accept lexicons: a registered pack must reference lexicon ids the registry already has; bundling custom lexicons alongside a pack is step 17's fuller user-content story, not this minimal primitive's job.
- `listPacks()` returns a lightweight summary (`id`, `label`, `description`, `tags`) rather than the full `Pack` object — mirrors what `GeneratorApp`'s own picker already surfaces, not the raw generation config.
- `game.modules.get("onomasticon").api` now has exactly one writer: `src/module/api.ts`'s own `init` hook. Previously `launchPoint.ts` (step 08) wrote a stepping-stone `{ openGenerator }` there directly in its own `init` hook — two separate `Hooks.once("init", ...)` handlers both doing `module.api = {...}` (a full replacement, not a merge) was a latent bug waiting to happen, since whichever handler ran last would silently wipe out the other's contribution. Fixed by having `launchPoint.ts` only register its DOM-injection hook now; `api.ts` imports `openGenerator` from it and folds it into the one real `api` object.
- Since `generate`/`generateKin`/`listPacks`/`registerPack` all resolve against the browser's fetch-based registry (`loadBundledRegistry`), they're `async`/return `Promise`s — a deliberate difference from the synchronous Node-only `generate()`/`generateKin()` in `generate.ts` (which stay fs-based, unseen by other Foundry modules).

## Open questions

- None.

## Definition of done

- [x] A throwaway second test module can call `game.modules.get("onomasticon").api.generate(...)` and get back a valid `Result` — reproduced literally in `src/module/api.test.ts`
- [x] `npm run typecheck && npm run lint && npm test && npm run build && npm run format` all pass (118 tests, up from 102); build output confirmed free of `node:fs`/`node:path`/`node:url`
- [x] Bonus, proving the pulled-forward strategy seam works (step 16's own DoD wording): a hand-written no-op strategy can be registered via `api.registerStrategy` and selected via a pack's `strategy` field, end-to-end through the real public API — `src/module/api.test.ts`, `src/strategies/registry.test.ts`, `src/generateWithRegistry.test.ts`
