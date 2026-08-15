# Step 06 — Result Object & Public `generate()`

**Status:** ⏳ Not started
**Milestone:** v0.1 — Skeleton
**Depends on:** [05](05-template-strategy-engine.md)

## Goal

Wrap the strategy engine in the single function everything else — UI, API, hooks — calls. This is the foundational decision from the original design conversation: return a structured object, never a bare string.

## Deliverables

- `src/generate.ts` — exports `generate(packId, options) -> Result`
- `src/types.ts` — `Result`, `GenerateOptions`

## Key decisions

- `Result` shape:
  ```ts
  {
    full: string,
    parts: Record<string, string>,
    meta: { packId: string, strategyId: string, seed: number, groupId?: string }
  }
  ```
- `GenerateOptions` includes `variant?`, `seed?`, and `context?` (the parent/kin context) — `context` is accepted and typed now even though nothing consumes it until step 11, so the public signature doesn't change shape later.

## Open questions

- None.

## Definition of done

- [ ] `generate()` is callable from a plain Node script with no Foundry runtime present, against the example packs
- [ ] Returns a fully-typed `Result`, not a string, in every code path
