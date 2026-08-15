# Step 06 — Result Object & Public `generate()`

**Status:** ✅ Done
**Milestone:** v0.1 — Skeleton
**Depends on:** [05](05-template-strategy-engine.md)

## Goal

Wrap the strategy engine in the single function everything else — UI, API, hooks — calls. This is the foundational decision from the original design conversation: return a structured object, never a bare string.

## Deliverables

- `src/generate.ts` — exports `generate(packId, options) -> Result`
- `src/types.ts` — `Result`, `ResultMeta`, `GenerateOptions`, `GenerateContext`
- `src/registry.ts` — `loadRegistry()`/`resetRegistryCache()`, not originally listed but needed: `generate()` takes a `packId` string, so something has to resolve that id to an actual `Pack` + its lexicons. Node-only (built on step 03's `fs`-based loader), lazily loads and caches every bundled pack/lexicon on first use. A Foundry/browser-usable registry (fetch-based, not `fs`-based) is step 07's job — `src/index.ts` deliberately does **not** import `generate.ts`/`registry.ts` yet, so the browser bundle stays free of `node:fs`.

## Key decisions

- `Result` shape:
  ```ts
  {
    full: string,
    parts: Record<string, string>,
    meta: { packId: string, strategyId: string, seed: number, groupId?: string }
  }
  ```
- `GenerateOptions` includes `variant?`, `seed?`, and `context?` (`GenerateContext`, which extends the template strategy's `TemplateContext` with `groupId`) — `context` is accepted and typed now even though nothing consumes `.parent` until step 11/12, so the public signature doesn't change shape later. `meta.groupId` already echoes `context.groupId` when supplied, ready for step 13's "generate a family" workflow.
- Seed handling: `options.seed ?? randomSeed()` — omit it to get a fresh seed (minted via step 04's `randomSeed()`), or pass one back in to replay a result exactly. Either way it's echoed in `result.meta.seed`.
- `loadRegistry()` throws if any bundled pack/lexicon fails validation, rather than silently skipping it — the repo's own bundled content should always be valid (it's covered by tests), so hitting this means a real bug, not a runtime condition to handle gracefully.
- `generate()` throws for an unregistered `packId` and for a pack whose `strategy` isn't `"template"` (the only strategy with an implementation until step 16's registry exists) — both are caller/content bugs, not recoverable cases.

## Open questions

- None.

## Definition of done

- [x] `generate()` is callable from a plain Node script with no Foundry runtime present, against every bundled pack (looped test, not just the three original examples)
- [x] Returns a fully-typed `Result`, not a string, in every code path — verified deterministic for a given `packId` + `seed`, and that an omitted seed still gets minted and echoed back
