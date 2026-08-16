# Step 11 — Kin Group Context & `shareWithin`

**Status:** ✅ Done
**Milestone:** v0.2 — Kin groups
**Depends on:** [06](06-result-object-and-generate.md) (v0.1 complete)

## Goal

Make `shareWithin` actually do something: a second `generate()` call in the same group inherits a marked slot's value instead of re-rolling it. This is the constraint that shaped the whole interface, per the original design conversation — validating it here is the real test of whether v0.1's foundation was built right.

## Deliverables

- `src/kin/GroupContext.ts`
- `shareWithin` wired into `resolveSlot` (step 05): a second call in a group reads from the context instead of sampling

## Key decisions

- A group is identified by a `groupId`. `GroupContext` stores resolved parts keyed by `shareWithin` value (e.g. `"kin"`), so multiple slots (family _and_ clan) can independently share within the same group key.
- Mixed-pack groups are allowed (e.g. a child generated from a different pack than a parent). Sharing only applies when the _slot name_ matches between packs; a slot name absent from the second pack is simply not shared — not an error. (Note: this falls out for free from the current design — sharing keys on `shareWithin`'s value, resolved independently per slot in `generateWithTemplate`'s per-slot loop, with no cross-pack coupling at all. Nothing further was needed to support it.)
- `GroupContext` (`src/kin/GroupContext.ts`) is a small keyed store: `groupId -> shareWithin key -> resolved value`, with a `getOrResolve(groupId, shareKey, resolve)` method that only invokes `resolve` (and therefore only consumes RNG) on the first call for a given group/key pair — later calls in the same group just read the cached value back, which is what stops a shared slot from re-rolling.
- `generate()`/`generateWithRegistry()`'s public `GenerateOptions` only carries a `groupId` string, not a `GroupContext` instance — there has to be somewhere for that string to mean something across separate top-level `generate()` calls, so those two use a process-wide `defaultGroupContext` singleton (same pattern as `registry.ts`'s cached `loadRegistry()`). Lower-level callers (`generateWithTemplate()`, `resolveSlot()`, and their unit tests) can inject their own `GroupContext` instance instead, for isolation.
- `resolveSlot` only activates sharing when a slot has `shareWithin` _and_ a `groupId` was supplied — with no `groupId` (the default, single standalone `generate()` call) every slot resolves exactly as before step 11 shipped.
- `TemplateContext` (in `strategies/template/index.ts`) still only carries `parent` (for step 12's derivations); `groupId`/`groupContext` were added to `generateWithTemplate`'s input as siblings of `context`, not folded into `TemplateContext` itself, keeping generate()-level bookkeeping (groupId) separate from strategy-specific data (parent) as the existing comments already called for.

## Open questions

- None — the schema (step 01) already fully specifies `shareWithin`; this step makes the engine honor it.

## Definition of done

- [x] Unit test: generate 3 results in the same kin group from `highfantasy.elven` — `family` and `clan` match across all 3, `given` differs (`src/generate.test.ts`, plus a lower-level equivalent in `src/strategies/template/index.test.ts` and direct `GroupContext`/`resolveSlot` unit tests)
- [x] `npm run typecheck && npm run lint && npm test && npm run build && npm run format` all pass (81 tests, up from 70)
