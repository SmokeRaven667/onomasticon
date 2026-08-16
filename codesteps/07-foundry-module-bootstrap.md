# Step 07 — Foundry Module Bootstrap

**Status:** ✅ Done — manually verified in the user's local Foundry v14 install
**Milestone:** v0.1 — Skeleton
**Depends on:** [02](02-project-tooling.md), [06](06-result-object-and-generate.md)

## Goal

Make Onomasticon an installable, enable-able Foundry module — the first point where the pure-logic engine touches the Foundry runtime.

## Deliverables

- `module.json` (finalized manifest)
- `src/module/init.ts` — `Hooks.once("init", ...)`, wired into `src/index.ts` (the esbuild entry) as a top-level call, matching how a real Foundry module script executes on load
- `fvtt-types` added as a devDependency, `"fvtt-types"` added alongside `"node"` in `tsconfig.json`'s `types` array — no conflicts between the two ambient type sets
- `src/test/foundryStubs.ts` + `vitest.config.ts` (`setupFiles`) — a minimal real (not mocked-away) `Hooks` stub (`on`/`once`/`off`/`callAll`), installed globally for tests. Needed because `index.ts` now calls `Hooks.once(...)` as a module-load side effect (correctly, since that's how Foundry actually loads a module script) — without a stub, importing `index.ts` under plain Node/vitest throws `ReferenceError: Hooks is not defined`. Individual tests can still `vi.spyOn(Hooks, "once")` against the stub for behavioral assertions (see `init.test.ts`).
- Build entry producing `dist/onomasticon.js`, referenced from `module.json` — confirmed to bundle cleanly (no accidental `node:fs`, since `index.ts` still doesn't import `generate.ts`/`registry.ts`)

## Key decisions

- Target current core (v14): `compatibility.minimum: "13"` / `verified: "14"` — matches the actual locally-installed Foundry (generation 14, build 363).
- No `system` dependency in `module.json` — stays system-agnostic per the original design constraint.
- Module id: `onomasticon`.
- Ship as an ESM module (supported since Foundry v13) rather than a bundled IIFE, since v14 is the floor.
- `fvtt-types` (the current/renamed package; `@league-of-foundry-developers/foundry-vtt-types` is stuck on v13) pulls in `showdown` as a dependency, which has known moderate CVEs — not addressed, since `fvtt-types` is a types-only devDependency (ambient `.d.ts` only) never bundled into `dist/onomasticon.js` or executed at runtime.
- `module.json` intentionally omits `"languages"` (that's step 09's job) and `"download"` (no release/packaging pipeline exists yet — worth a future step if this ever needs real distribution, not invented here since nobody's asked for it yet).

## Open questions

- None blocking; revisit ESM-vs-IIFE only if a real compatibility issue shows up in testing.

## Definition of done

- [x] `npm run typecheck && npm run lint && npm test && npm run build && npm run format` all pass; `init.test.ts` confirms `registerInitHook()` registers exactly one `"init"` hook
- [x] Module installs and enables in a local Foundry v14 instance with no console errors — confirmed by the user in their real Foundry v14 install
- [x] `game.modules.get("onomasticon").active === true` — confirmed by the user
