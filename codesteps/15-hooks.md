# Step 15 — Hooks (`preGenerate` / `generated`)

**Status:** ✅ Done
**Milestone:** v0.3 — Extension points
**Depends on:** [14](14-public-api-surface.md)

## Goal

Let other modules observe and intercept generation without touching the API surface directly — the standard Foundry extension pattern.

## Deliverables

- `Hooks.call("onomasticon.preGenerate", options)` before resolution — cancelable by a listener returning `false`
- `Hooks.callAll("onomasticon.generated", result)` after resolution
- Both fire from `generateWithRegistry.ts` — the one choke-point every generation call already funnels through (`generate()`, `generateKin()`, `GeneratorApp`, and the public API's `api.generate`/`api.generateKin` all end up here), so hooks fire uniformly everywhere instead of needing to be duplicated at each entry point.

## Key decisions

- **Corrected during implementation**: the deliverable as originally written said `Hooks.callAll` fires `preGenerate` and is "cancelable by a listener returning false." That's not how Foundry's hook API actually works — `Hooks.callAll` always calls every listener and always returns `true`, ignoring return values entirely. `Hooks.call` is the one that stops at the first listener to return `false` and reports that back (`boolean`, not always `true`) — confirmed against `fvtt-types`' own signatures for both. `preGenerate` now uses `Hooks.call`; `generated` (which was never meant to be cancelable) correctly stays on `Hooks.callAll`.
- `preGenerate` follows Foundry hook convention: listeners receive the resolved `options` object and may mutate it in place before generation proceeds — since JS objects are passed by reference, no special plumbing needed beyond continuing to use the same `options` value after the `Hooks.call`.
- A veto (`Hooks.call` returning `false`) throws rather than making `generateWithRegistry`'s return type `Result | undefined` — every caller up the chain (`generateKinWithRegistry`, `GeneratorApp`, `api.ts`) already assumes a `generate()` call either succeeds or throws, and every UI call site already has a `catch` block wired to show an error notification. Throwing routes a veto through that existing path for free instead of rippling an optional return type through the whole call graph.
- Both `Hooks` calls are guarded with `typeof Hooks !== "undefined"`: `generateWithRegistry` is also exercised by `generate()` (`generate.ts`) for genuine standalone-Node use with no Foundry runtime at all, where the global `Hooks` object simply doesn't exist. Verified directly by deleting `globalThis.Hooks` in a test and confirming generation still works.
- Custom hook names need a type declaration to type-check against `fvtt-types`' closed `HookConfig` union: `src/types/foundry-hooks.d.ts` augments `HookConfig` (via `declare module "fvtt-types/configuration"`) with `"onomasticon.preGenerate"`/`"onomasticon.generated"`'s real signatures, the same mechanism any Foundry module uses to type its own custom hooks.
- `src/test/foundryStubs.ts`'s `HooksStub` gained a `call()` method (previously only had `callAll`) — the real semantic difference (`call` stops at the first `false`; `callAll` doesn't) is implemented in the stub too, not just `callAll` renamed.

## Open questions

- None.

## Definition of done

- [x] A listener on `preGenerate` can veto generation (return `false` → no result produced) — `src/generateWithRegistry.test.ts`
- [x] A listener on `generated` receives the real, final `Result` — `src/generateWithRegistry.test.ts`
- [x] `npm run typecheck && npm run lint && npm test && npm run build && npm run format` all pass (124 tests, up from 118); build output confirmed free of `node:fs`/`node:path`/`node:url`
