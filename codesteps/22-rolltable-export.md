# Step 22 — RollTable Export

**Status:** ✅ Done — engine/UI/API done and automated-tested; live Foundry verification not separately performed (see DoD)
**Milestone:** v0.4+ — The fun stuff
**Depends on:** [14](14-public-api-surface.md)

## Goal

Let a pack's raw word lists double as a native Foundry `RollTable`, useful independent of the generator UI (e.g. a GM rolling a quick surname at the table).

## Deliverables

- [x] "Export pack as RollTable" action producing a `RollTable` document pre-populated from a pack's lexicon(s) — `src/rolltable/exportPackAsRollTables.ts`

## Key decisions

- Exports raw lexicon entries, not already-combined full names, exactly as scoped — a RollTable of surnames is more broadly useful standalone than one of pre-assembled full names.
- **One `RollTable` per lexicon the pack references**, not one merged table — `pack.lexiconRefs` is keyed by local slot name (e.g. `given`, `family`, `clan`), and each one becomes its own table (`ExportedRollTable { lexiconKey, table }`). Works for any strategy, not just `template`: a markov pack's training corpus is still a lexicon referenced via `lexiconRefs`, so exporting `highfantasy.elven-markov` produces a RollTable of the same raw elven given names the template pack's `given` slot samples from.
- Table naming: `${pack.label ?? pack.id} — ${lexicon.label ?? lexiconKey}` (e.g. "Test Pack — Test Given Names") — disambiguates a lexicon shared across multiple packs, since the export is scoped per-pack, not per-lexicon.
- **Weight fidelity**: each result is created with a placeholder `range: [1,1]` and the source entry's real `weight`, then `table.normalize()` (a real Foundry `RollTable` method) recomputes every result's actual range from those weights in one call — no need to hand-roll cumulative-range math ourselves.
- **UI surface**: a new "Export as RollTable" button next to "Generate" in `GeneratorApp`/`generator.hbs`, acting on whichever pack is currently selected (not a generated result — there may be zero results yet, unlike the per-result buttons).
- **Also exposed via the public API** (`OnomasticonApi.exportPackAsRollTables(packId)`), same reasoning as steps 19-21's capabilities: reachable from both the UI and a macro/other-module caller.
- **Test infrastructure**: `src/test/foundryStubs.ts` gained a real in-memory `RollTableStub` (`create`, `normalize` — the latter assigning each result a range proportional to its weight, close enough to core's real algorithm for tests to assert relative range width) and extended the `CONST` stub with `TABLE_RESULT_TYPES`. Also switched the `CONST` stub's assignment from a (now-fragile, once the object literal grew past one line) `@ts-expect-error` comment to an explicit `as unknown as typeof CONST` cast — `CONST` turned out to already be a real ambient global in fvtt-types (its branded numeric-literal types were the actual source of the original type error, not "not a globalThis property" as the old comment claimed).

## Open questions

- None.

## Definition of done

- [x] Exported `RollTable` rolls correctly and reflects entry weights from the source lexicon — `src/rolltable/exportPackAsRollTables.test.ts` confirms a weight-3 entry's normalized range spans 3x a weight-1 entry's; the UI wiring itself (button click -> notification) is **structurally verified** (same `data-action` pattern the other pack/batch-level buttons already use) but not separately confirmed against a live Foundry instance, same gap class as steps 13/17/19/20/21
- [x] `npm run typecheck && npm run lint && npm test && npm run build && npm run format` all pass (175 tests, up from 170); build output confirmed free of `node:fs`/`node:path`/`node:url`
