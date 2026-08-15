# Step 13 — "Generate a Family of N" Workflow

**Status:** ⏳ Not started
**Milestone:** v0.2 — Kin groups
**Depends on:** [12](12-derivation-engine.md), [08](08-applicationv2-generator-ui.md)

## Goal

Surface kin groups and derivations as a usable UI/API feature, not just engine internals.

## Deliverables

- UI affordance in `GeneratorApp` for "generate N linked names"
- API method `generateKin(packId, count, options)`

## Key decisions

- v0.2 scope is flat groups only (all members share one group). Generational chains (grandparent → parent → child patronymics) are a v0.4+ stretch, not required here.

## Open questions

- Whether the UI collects each member's variant up front or one at a time — default to "ask variant per row before generating," revisit after a usability pass.

## Definition of done

- [ ] Manual test in Foundry: generate a family of 4 from `modern.slavic-patronymic`, get a consistent family surname and correct per-child patronymics
