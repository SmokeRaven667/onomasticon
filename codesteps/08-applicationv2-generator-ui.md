# Step 08 — ApplicationV2 Generator UI

**Status:** ⏳ Not started
**Milestone:** v0.1 — Skeleton
**Depends on:** [07](07-foundry-module-bootstrap.md)

## Goal

Give the engine a face: pick a pack, pick a variant, generate, copy the result. Built on `ApplicationV2` + `HandlebarsApplicationMixin` — the current Foundry pattern, not the deprecated `FormApplication`.

## Deliverables

- `src/apps/GeneratorApp.ts`
- `templates/generator.hbs`
- A launch point (see open question below)

## Key decisions

- Dialog contains: pack picker (grouped by tag), variant selector, generate button, result list with copy-to-clipboard.
- Per-slot reroll is a stretch goal for this step, not a blocker — defer it to a follow-up pass if it complicates the first working version.

## Open questions

- Where the launch button lives: default to a Journal Directory header button plus a documented macro; revisit after using it once in a real session.

## Definition of done

- [ ] Opening Foundry, clicking the launch point, picking each of the three example packs, and generating produces a visible name for all three
- [ ] Copy-to-clipboard verified manually
