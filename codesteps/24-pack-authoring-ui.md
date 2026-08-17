# Step 24 — Pack Authoring UI

**Status:** ✅ Done — engine/UI/API done and automated-tested; live Foundry verification not separately performed (see DoD)
**Milestone:** v0.4+ — The fun stuff
**Depends on:** [03](03-loader-and-validator.md), [17](17-user-pack-directory.md)

## Goal

Let a pack be built through a form instead of hand-written JSON — the payoff step for the semantic validator's error messages (step 03) being good. If those errors are vague, this step will hurt.

## Deliverables

- [x] In-app form for building a pack (slots, formats, derivations), validated live against the step-03 rules — `src/apps/PackAuthorApp.ts`, `templates/pack-author.hbs`

## Key decisions

- **Resolved the open question**: slots/formats through the form, derivations still hand-edited as raw JSON in a textarea — the simpler of the two options the codestep left open. Slots and formats are exactly what a first pack needs (this step's own DoD only asks for a 2-slot pack); a full visual derivation editor (nested `strip`/`variants` map editing) is real added complexity for a feature this project hasn't yet gotten field-tested feedback on wanting.
- **Only the `template` strategy is authorable.** A markov pack's config shape (corpus/order/min-max length, step 18) has nothing in common with "slots, formats, derivations" — out of scope for this form entirely.
- **`buildPackFromForm` (`src/authoring/buildPackFromForm.ts`) is a pure function**, form state in, plain `unknown` object out — never typed as `Pack` itself, since it's untrusted hand-assembled data until `validatePackData` says otherwise, same treatment every other pack source (loader, step 17's directory scan, step 14's `registerPack`) already gets.
- **Each lexicon-kind slot uses its own name as its local `lexiconRefs` key** (`slots.given.lexicon === "given"`, `lexiconRefs.given === <picked lexicon id>`). The schema's local-name indirection exists so a pack can rename or share a lexicon reference cleverly, but this v1 form doesn't expose that — an author who wants it can still hand-edit the saved JSON afterward.
- **This UI doesn't author lexicon content** — a lexicon-kind slot picks from lexicon ids _already in the registry_ (bundled, user-directory, or runtime-registered), populated from `registry.lexicons.keys()`. Authoring new word lists is a different, unscoped feature.
- **"Save" persists to disk, not just the runtime registry.** A purely in-memory `registerPack` (step 14) call wouldn't survive a reload, and this step's DoD says "build and _save_... entirely through the UI." `src/authoring/savePack.ts` validates, then uploads the pack JSON (`<id>.json`) into the GM-configured user pack directory (step 17's `userPackPath` setting) via `FilePicker.upload`, and busts `loadUserPacks`'s cache for that path so the very next registry load (step 17's own lazy-scan machinery) picks it straight up off disk — one path to visibility, not a separate in-memory registration that could drift from what's on disk. Throws a clear, actionable error if no directory is configured yet, rather than picking a fallback location on the author's behalf.
- **`FilePicker.upload` is dependency-injected** (`SavePackOptions.uploadImpl`), same pattern `loadUserPacks.ts`'s own `browseImpl` already established — tests supply a fake instead of needing a global `FilePicker` stub.
- **Precomputed `selected`/`checked`/`disabled` attribute strings, not template-side `{{#if}}` blocks.** Prettier's Handlebars parser rejects a block helper straddling an HTML tag's attribute list ("A block may only be used inside an HTML element or another block"), even though Handlebars itself renders it fine — hit for the slot-kind `<select>`, the lexicon `<select>`, the "optional" checkbox, and the Save button's `disabled` state. Fixed the same way `GeneratorApp`'s own pack `<select>` already does it: compute the exact attribute string (`"selected"`/`""`, `"checked"`/`""`, `"disabled"`/`""`) in `_prepareContext`/`#slotView`, template just interpolates it. Simpler than the alternative (a registered `onomasticonEq` Handlebars helper), which was tried first and removed once this pattern proved sufficient.
- **Launch point**: a second Journal Directory header button ("Author Pack," alongside the existing "Onomasticon" one), not a button nested inside `GeneratorApp` — nesting it there would have required `GeneratorApp.ts` to import from `module/launchPoint.ts`, which already imports `GeneratorApp` itself for `openGenerator`, creating a real circular import for no necessary reason. `openPackAuthor()` (a second singleton-instance function in `launchPoint.ts`) is also exposed via the public API (`OnomasticonApi.openPackAuthor`), same as `openGenerator`.
- **Form-row capture**: same "read every field from the DOM before mutating state and re-rendering" lesson step 13's kin-row UI already learned — `#captureFromDom()` runs at the top of every action handler (add/remove slot or format, Validate, Save) before that handler's own mutation, so no in-progress typing in other rows is lost when one row changes.

## Open questions

- None remaining — the derivation-editor scope question is resolved above.

## Definition of done

- [x] A non-technical user can build and save a working 2-slot template pack entirely through the UI — `buildPackFromForm.test.ts`'s "produces a working 2-slot template pack that passes validatePackData (this step's own DoD)" is the automated proof of the _build_ half; `savePack.test.ts` proves the _save_ half (validates, uploads `<id>.json` to the configured directory, busts the cache) end to end with an injected `uploadImpl`. The UI wiring itself (typed fields -> live validation panel -> Save button) is **structurally verified** (same `data-action`/capture-before-mutate pattern every other multi-row form in this project already uses) but not separately confirmed against a live Foundry instance, same gap class as steps 13/17/19/20/21/22/23
- [x] `npm run typecheck && npm run lint && npm test && npm run build && npm run format` all pass (196 tests, up from 183); build output confirmed free of `node:fs`/`node:path`/`node:url`
