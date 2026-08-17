# Step 17 — User Pack Directory / Custom Pack Loading

**Status:** 🔄 In progress — engine/settings done and automated-tested; manual in-Foundry verification still needed
**Milestone:** v0.3 — Extension points
**Depends on:** [03](03-loader-and-validator.md), [16](16-strategy-registry.md)

## Goal

Let users and other module authors add packs without touching Onomasticon's source — the payoff of making genre a data format in step 01.

## Deliverables

- A configurable data path (world or module setting) the loader scans at init, in addition to bundled packs

## Key decisions

- User-supplied packs go through the _exact same_ step-03 validator as bundled packs (`validatePackData` — no special-casing, no relaxed rules).
- **Clarifies the deliverable's "the loader scans at init" wording**: only the _setting_ is registered at `init` (cheap, standard Foundry timing — settings must be registered between `init` and `i18nInit`). The actual directory scan stays lazy, same as bundled packs: nothing is fetched until the registry is first needed (`GeneratorApp` opening, or `api.generate`/`api.listPacks` being called) — matches the "lexicons lazy-loaded, not eagerly loaded at init" non-negotiable, which a literal init-time scan would have violated.
- Setting: world-scope (`game.settings.register("onomasticon", "userPackPath", { scope: "world", type: String, default: "" })`, `src/module/settings.ts`) — a directory path relative to Foundry's Data root, scanned via `foundry.applications.apps.FilePicker.browse("data", path)`. Empty (the default) disables scanning entirely.
- **A bad or colliding user pack file is warned-and-skipped, not thrown**: unlike `loadBundledRegistry` (which throws on any invalid _bundled_ file — the module's own content should always be valid, and a broken bundled file is a real bug), user-authored content is inherently less trustworthy. One typo in a GM's custom pack file shouldn't take down the entire generator for every bundled pack too. Both `loadUserPacks.ts` (per-file: bad JSON, failed validation, duplicate id within the directory) and `loadFullRegistry.ts` (a user pack id colliding with a bundled/runtime-registered one) log via `console.warn` and `ui.notifications?.warn`, then continue.
- `src/browser/loadFullRegistry.ts` is the new single entry point `GeneratorApp` and the public API (step 14) both call instead of `loadBundledRegistry` directly — it merges the bundled registry with user-directory packs and re-merges on every call (cheap) rather than caching its own snapshot, so a `registerPack()` call (step 14, which mutates the shared bundled registry in place) is visible on the very next load without needing separate cache-invalidation plumbing. The expensive I/O underneath (bundled fetch, directory scan) still only happens once, via `loadBundledRegistry`'s and the new `loadUserPacks`'s own caches.
- `loadUserPacks` caches **per path** (not a single slot) — a GM changing the configured directory is just a different cache key, so the next load naturally re-scans without needing an `onChange` setting callback to bust a cache explicitly.
- Custom settings need a type declaration the same way custom hooks did in step 15: `src/types/foundry-settings.d.ts` augments fvtt-types' closed `SettingConfig` union. **Caught during implementation**: a `declare module` augmentation file needs its own top-level `export {}` to actually be treated as a module — without one, TypeScript treats `declare module "fvtt-types/configuration"` as declaring a brand-new (conflicting) ambient module instead of augmenting the real one, which silently broke step 15's _already-working_ `HookConfig` augmentation too until fixed. `foundry-hooks.d.ts` didn't hit this because its own `import type` already made it a real module.
- `game.settings` needed the same `!`-assertion treatment as `game.i18n` did in step 09/13 (fvtt-types tracks which lifecycle hook the caller can assume has already run; without a project-wide `AssumeHookRan` declaration — out of scope for this step — every `game.*` access site handles this locally). Both call sites (`settings.ts`'s registration callback, `loadFullRegistry.ts`'s lazy load) only ever run well after `init`, so this is safe, same reasoning as the existing `game.i18n!` sites.

## Open questions

- Conflict handling when a user pack id collides with a bundled id — reject and warn; never silently override. **Resolved as designed** — see key decisions.

## Definition of done

- [x] User-supplied packs validated through the exact same step-03 validator, with no relaxed rules — `src/browser/loadUserPacks.test.ts`
- [x] `npm run typecheck && npm run lint && npm test && npm run build && npm run format` all pass (138 tests, up from 124); build output confirmed free of `node:fs`/`node:path`/`node:url`
- [ ] Dropping a hand-written pack JSON into the configured folder makes it appear in the step-08 picker with no code change — **structurally true** (`GeneratorApp`'s pack-listing loop already iterates `registry.packs.values()` regardless of where a pack came from, unchanged by this step) and covered by `loadFullRegistry.test.ts`'s merge tests, but **not yet manually confirmed in a real Foundry instance** — needs the user to configure the setting and drop in a test pack file, same as step 08/13's precedent for UI-facing verification
