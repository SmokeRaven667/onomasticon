# Step 12 — Derivation Engine

**Status:** ✅ Done
**Milestone:** v0.2 — Kin groups
**Depends on:** [11](11-kin-group-context.md)

## Goal

Implement the `derivation` object the schema (step 01) already fully specifies: compute a `derived` slot's value from a parent result's part — patronymics, clan-prefix surnames, generational suffixes.

## Deliverables

- `src/kin/deriveSlot.ts`: source lookup, `strip` regex, `variants` template substitution, weight-based selection when multiple derivations target the same `produces` slot

## Key decisions

- Derivation is only attempted when `context.parent` is present.
- Candidates targeting a `derived` slot are filtered down to derivations whose `source` is actually present on `parent` _before_ `weightedChoice` runs — a derivation with a missing source is never wastefully selected only to fail. This is also what makes step 11's mixed-pack-group note fall out for free: a source slot absent from the parent's pack just yields zero candidates, not an error.
- When multiple derivations target the same slot, `weightedChoice` (step 04) picks among the (source-available) candidates.
- If no derivation fires (no parent, no candidate with an available source, or the chosen candidate has no variant match and no `"*"` fallback), the slot stays unresolved — `format.requires` (step 05) filters out formats that needed it. No special-case error handling required; this is exactly what `requires` was built for. Once `weightedChoice` has committed to a candidate, a variant-match failure does **not** retry a different candidate — it's the single chosen derivation's `variants` map or nothing.
- `{source}` substitution reuses `renderPattern` (step 05) rather than a second templating implementation — a derivation's `variants[key]` template is rendered with `{ source: strippedValue }` as its only part.
- `shareWithin` is intentionally **not** wired up for `derived` slots in this step: `deriveSlot` can legitimately return `undefined`, and `GroupContext` (step 11) has no sane way to cache "no value" — plus no bundled pack asks for it. `resolveSlot` still special-cases `derived` slots before the `shareWithin` branch, same shape as before this step, just with a real `deriveSlot()` call instead of an unconditional `undefined`.

## Open questions

- None — this step is "make the engine honor what step 01 already promised," not new design.

## Definition of done

- [x] Unit test reproduces the schema's own example: parent `given: "Ivan"` (masc) + child variant `fem` → `patronymic: "Ivanovna"` via `modern.slavic-patronymic` (`src/kin/deriveSlot.test.ts`, `src/strategies/template/index.test.ts`, and `src/generate.test.ts` at the public-API level)
- [x] `npm run typecheck && npm run lint && npm test && npm run build && npm run format` all pass (95 tests, up from 81)
