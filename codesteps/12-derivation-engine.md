# Step 12 — Derivation Engine

**Status:** ⏳ Not started
**Milestone:** v0.2 — Kin groups
**Depends on:** [11](11-kin-group-context.md)

## Goal

Implement the `derivation` object the schema (step 01) already fully specifies: compute a `derived` slot's value from a parent result's part — patronymics, clan-prefix surnames, generational suffixes.

## Deliverables

- `src/kin/deriveSlot.ts`: source lookup, `strip` regex, `variants` template substitution, weight-based selection when multiple derivations target the same `produces` slot

## Key decisions

- Derivation is only attempted when `context.parent` is present.
- When multiple derivations target the same slot, `weightedChoice` (step 04) picks among them.
- If no derivation fires (no parent, or no variant match and no `"*"` fallback), the slot stays unresolved — `format.requires` (step 05) filters out formats that needed it. No special-case error handling required; this is exactly what `requires` was built for.

## Open questions

- None — this step is "make the engine honor what step 01 already promised," not new design.

## Definition of done

- [ ] Unit test reproduces the schema's own example: parent `given: "Ivan"` (masc) + child variant `fem` → `patronymic: "Ivanovna"` via `modern.slavic-patronymic`
