# Step 22 — RollTable Export

**Status:** ⏳ Not started
**Milestone:** v0.4+ — The fun stuff
**Depends on:** [14](14-public-api-surface.md)

## Goal

Let a pack's raw word lists double as a native Foundry `RollTable`, useful independent of the generator UI (e.g. a GM rolling a quick surname at the table).

## Deliverables

- "Export pack as RollTable" action producing a `RollTable` document pre-populated from a pack's lexicon(s)

## Key decisions

- Exports raw lexicon entries, not already-combined full names — a RollTable of surnames is more broadly useful than one of pre-assembled full names.

## Open questions

- None.

## Definition of done

- [ ] Exported `RollTable` rolls correctly and reflects entry weights from the source lexicon
