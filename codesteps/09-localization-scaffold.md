# Step 09 — Localization Scaffold

**Status:** ✅ Done
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

## Notes

- Foundry's `ApplicationV2` localizes `window.title` automatically (its `title` getter runs the option through `game.i18n.localize()`), so `DEFAULT_OPTIONS.window.title` is just set to the loc key string directly — no code-side `localize()` call needed for the title.
- `generator.hbs` uses Foundry's built-in Handlebars `{{localize "KEY"}}` helper for labels/button/placeholder/title text; the dynamic `{{error}}` content (an underlying `Error#message`, not fixed UI copy) is intentionally left unlocalized.
- `GeneratorApp`'s two `ui.notifications` calls and `launchPoint.ts`'s injected button label route through `game.i18n.format()`/`.localize()`. `fvtt-types` types `game.i18n` as possibly-undefined until Foundry's `"i18nInit"` hook fires; all three call sites only ever run from user interaction on an already-rendered UI (long after that hook), so they use a non-null assertion (`game.i18n!`) rather than inventing a duplicate hardcoded-English fallback string that would itself violate this step's own "no hardcoded UI strings" goal.
- `module.json` gained its first `"languages"` array entry (`{ lang: "en", name: "English", path: "lang/en.json" }`) — same pattern as step 08's first use of `"styles"`.
- Extended `src/test/foundryStubs.ts` with a minimal real (not mocked-away) `game.i18n` stub — `localize` returns the key unresolved (no `lang/en.json` loaded under plain Node) and `format` does a naive `{placeholder}` substitution — consistent with the stub philosophy established in step 08 (real rendering/UI still verified manually in Foundry, not unit-tested).

## Definition of done

- [x] No hardcoded UI strings remain in `GeneratorApp` or `generator.hbs`
- [x] Grep for literal English UI text outside `lang/en.json` turns up nothing (confirmed against `src/apps/GeneratorApp.ts`, `src/module/launchPoint.ts`, `templates/generator.hbs`)
- [x] `npm run typecheck && npm run lint && npm test && npm run build && npm run format` all pass (70 tests)
