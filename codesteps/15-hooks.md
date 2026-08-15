# Step 15 — Hooks (`preGenerate` / `generated`)

**Status:** ⏳ Not started
**Milestone:** v0.3 — Extension points
**Depends on:** [14](14-public-api-surface.md)

## Goal

Let other modules observe and intercept generation without touching the API surface directly — the standard Foundry extension pattern.

## Deliverables

- `Hooks.callAll("onomasticon.preGenerate", options)` before resolution — cancelable by a listener returning `false`
- `Hooks.callAll("onomasticon.generated", result)` after resolution

## Key decisions

- `preGenerate` follows Foundry hook convention: listeners receive the resolved options object and may mutate it in place before generation proceeds.

## Open questions

- None.

## Definition of done

- [ ] A listener on `preGenerate` can veto generation (return `false` → no result produced)
- [ ] A listener on `generated` receives the real, final `Result`
