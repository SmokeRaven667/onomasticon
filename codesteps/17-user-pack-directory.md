# Step 17 — User Pack Directory / Custom Pack Loading

**Status:** ⏳ Not started
**Milestone:** v0.3 — Extension points
**Depends on:** [03](03-loader-and-validator.md), [16](16-strategy-registry.md)

## Goal

Let users and other module authors add packs without touching Onomasticon's source — the payoff of making genre a data format in step 01.

## Deliverables

- A configurable data path (world or module setting) the loader scans at init, in addition to bundled packs

## Key decisions

- User-supplied packs go through the *exact same* step-03 validator as bundled packs. No special-casing, no relaxed rules.

## Open questions

- Conflict handling when a user pack id collides with a bundled id — reject and warn; never silently override.

## Definition of done

- [ ] Dropping a hand-written pack JSON into the configured folder makes it appear in the step-08 picker with no code change
