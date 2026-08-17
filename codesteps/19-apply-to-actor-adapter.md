# Step 19 — Apply-to-Actor Adapter

**Status:** ✅ Done — engine/UI/API done and automated-tested; structurally verified against a real Foundry instance not separately performed (see DoD)
**Milestone:** v0.4+ — The fun stuff
**Depends on:** [14](14-public-api-surface.md)

## Goal

Let a generated name get applied to an actor sheet without coupling Onomasticon to any one game system.

## Deliverables

- [x] `src/adapters/actorAdapter.ts`
- [x] Thin per-system adapters keyed on `game.system.id` — the lookup mechanism (`systemAdapters` map) ships; zero entries registered in it, see key decisions
- [x] Generic fallback: `actor.update({ name: result.full })`

## Key decisions

- Adapter interface: a single function `(actor, result) -> Promise<void>` (`ActorAdapter`), exactly as scoped — not a class or multi-method interface, since "how do I set the name" is the only thing a system override would ever need to do differently.
- **Zero system-specific adapters shipped, on purpose.** The open question below asks which systems get a first-class adapter; the answer this step lands on is "none yet" — `name` is a core Foundry Document field every system (including dnd5e) already supports via the generic fallback, so there's no concrete system-specific behavior to encode speculatively. The `systemAdapters` map and the `game.system.id` lookup in `applyToActor` are real, tested infrastructure (`registerSystemAdapterForTest`/`resetSystemAdaptersForTest` prove the seam works), just with an empty built-in set — same "prove the seam before the plugin exists" precedent as step 16's strategy registry before Markov.
- **UI surface** (not called out as its own deliverable, but necessary to exercise the DoD's "apply to selected token's actor" at all): a new per-result button in `GeneratorApp` (`data-action="applyToActor"`, `templates/generator.hbs`) alongside the existing copy/delete buttons. Targets `canvas!.tokens?.controlled[0]?.actor` — the first controlled token on the active scene, matching the DoD's "selected token" wording exactly (not a multi-select "apply to all controlled tokens" — no such requirement was scoped). No token selected -> `ONOMASTICON.GeneratorApp.NoTokenSelected` error notification, same pattern `#onGenerate`/`#onGenerateKin` already use for their own error paths.
- **Also exposed via the public API** (`OnomasticonApi.applyToActor`, `src/module/api.ts`) — not explicitly scoped as a deliverable either, but every other capability (`generate`, `generateKin`, `registerPack`, ...) is already reachable both from the UI and from a macro/other-module caller, and gating this one behind the UI button only would be an inconsistent seam for no stated reason.
- `game.system!.id`/`canvas!.tokens` both needed the same `!`-assertion treatment as `game.i18n!`/`game.settings!` before them (confirmed by removing the assertion and re-running `tsc`, which fails with "possibly undefined") — same `AssumeHookRan`-not-configured reasoning as steps 09/13/17, handled locally at each call site rather than project-wide.
- `src/test/foundryStubs.ts` gained a `game.system` stub (`{ id: "" }`) with a `setSystemIdStub()` test-only setter, same shape as the existing `resetSettingsStub()` — nothing under plain Node had a `game.system` to test against before this step.

## Open questions

- Which systems get a first-class adapter beyond the generic fallback — **resolved as "none yet"**; the mechanism (keyed map + lookup) is in place and tested, ready to accept a real entry the moment a specific system's needs (e.g. a system that computes `name` from other fields, or nests it non-standardly) are actually reported, rather than guessed at now.

## Definition of done

- [x] "Apply to selected token's actor" works against a vanilla actor with no system installed (generic fallback) — `src/adapters/actorAdapter.test.ts` proves `applyToActor` calls `actor.update({ name: result.full })` with no system adapter registered; the UI wiring itself (`canvas.tokens.controlled[0]` -> click -> notification) is **structurally verified** (same `data-action`/`data-index` pattern `deleteResult`/`copy` already use, unchanged by anything system-specific) but not separately confirmed against a live Foundry instance
- [x] Doesn't error against dnd5e — the generic fallback only ever touches the core `name` field, which every system (dnd5e included) supports without any system-specific code path; `actorAdapter.test.ts` covers this with `game.system.id` set to `"dnd5e"` and no adapter registered for it, confirming the generic path is still what runs
- [x] `npm run typecheck && npm run lint && npm test && npm run build && npm run format` all pass (160 tests, up from 156); build output confirmed free of `node:fs`/`node:path`/`node:url`
