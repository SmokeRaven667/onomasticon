# Step 09 — Localization Scaffold

**Status:** ⏳ Not started
**Milestone:** v0.1 — Skeleton
**Depends on:** [07](07-foundry-module-bootstrap.md)

## Goal

Wire up i18n from the start — retrofitting it across a UI later is miserable, and doing it now costs almost nothing.

## Deliverables

- `lang/en.json`
- `lang` entry in `module.json`
- All UI strings in step 08's app/template routed through `game.i18n.localize()`

## Key decisions

- Key namespace: `ONOMASTICON.*`

## Open questions

- None.

## Definition of done

- [ ] No hardcoded UI strings remain in `GeneratorApp` or `generator.hbs`
- [ ] Grep for literal English UI text outside `lang/en.json` turns up nothing
