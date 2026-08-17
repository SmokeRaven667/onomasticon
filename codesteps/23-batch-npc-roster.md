# Step 23 — Batch NPC Roster Generator

**Status:** ✅ Done — engine/UI/API done and automated-tested; live Foundry verification not separately performed (see DoD)
**Milestone:** v0.4+ — The fun stuff
**Depends on:** [13](13-generate-family-workflow.md), [20](20-journal-entry-output.md)

## Goal

The real-world test case named in the original design conversation: generate a full NPC roster in one action, the way a GM actually needs it before a session.

## Deliverables

- [x] "Generate roster of N NPCs" workflow, output as a journal page (step 20) and/or actors (step 19) — `src/roster/generateRoster.ts`, `src/roster/createRosterActors.ts`

## Key decisions

- **Validated against `scifi.corporate-spacer`** (a real bundled pack, "corporate/spacer-culture characters" — the closest existing stand-in for a Blades-in-the-Dark-style crew roster) rather than synthetic fixture data, exactly as scoped — `generateRoster.test.ts` runs through the real Node `loadRegistry()` against this pack, same precedent as `generateKinWithRegistry.test.ts`.
- **A roster is independent generation, not a kin group.** `generateRosterWithRegistry(packId, count, options, registry)` calls `generateWithRegistry` `count` times with no shared `groupId`/parent context at all — deliberately distinct from step 13's `generateKinWithRegistry`, which shares `shareWithin` slots and derives from a head-of-family. A GM's session roster is a set of unrelated NPCs, not siblings.
- **Journal output is automatic; actor output is a separate opt-in step.** Clicking "Generate Roster" both generates the batch and immediately calls `sendResultsToJournal` (step 20) on it — satisfying "generate a full NPC roster in one action" from the goal's own wording with a durable record every time, at negligible cost. Creating N new `Actor` documents is a bigger, more surprising side effect (new world documents nobody explicitly asked for yet), so that's a separate "Create Actors from Roster" button (`#onCreateRosterActors`) that only appears once a roster exists, operating on `#lastRosterResults` — tracked separately from `#results` (which also accumulates single/kin generations) so this button always targets exactly the most recent roster batch, nothing else.
- **`createRosterActors` never hardcodes an Actor type.** Same "no game-system coupling" non-negotiable step 19's `applyToActor` already had to solve: `game.documentTypes.Actor[0]` reads whichever subtype the active world/system actually registers first, rather than assuming `"npc"`/`"character"`/anything system-specific. Throws clearly if a world has registered none at all, rather than passing an invalid type to `Actor.createDocuments` and letting Foundry produce a less legible error.
- **Node wrapper**: `generateRoster(packId, count, options)` added to `generate.ts` alongside `generate`/`generateKin`, using the bundled `fs`-based registry — same split as every prior registry-agnostic core (`generateRosterWithRegistry`) that `GeneratorApp`/`module/api.ts` each call directly with their own registry source.
- **Test infrastructure**: `src/test/foundryStubs.ts` gained a real `Actor.createDocuments` stub and a `game.documentTypes.Actor` stub (default `["character"]`, settable per test) — nothing under plain Node had either before this step.

## Open questions

- None.

## Definition of done

- [x] Generate a 20-NPC roster in one action; spot-check for repeats or obviously wrong output — `generateRoster.test.ts`'s "generates a 20-NPC corporate-spacer crew roster" test uses 20 explicit per-member seeds (deterministic, not a flaky probabilistic assertion) and confirms every member resolves a non-empty `given`/`family`, surnames vary (not a kin group), and a re-run with the same seeds reproduces the exact same roster; the UI wiring itself (roster-size input -> click -> journal notification, plus the follow-up "Create Actors" button) is **structurally verified** (same `data-action` pattern every other button already uses) but not separately confirmed against a live Foundry instance, same gap class as steps 13/17/19/20/21/22
- [x] `npm run typecheck && npm run lint && npm test && npm run build && npm run format` all pass (183 tests, up from 175); build output confirmed free of `node:fs`/`node:path`/`node:url`
