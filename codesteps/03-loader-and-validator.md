# Step 03 — Pack/Lexicon Loader + Semantic Validator

**Status:** ⏳ Not started
**Milestone:** v0.1 — Skeleton
**Depends on:** [01](01-pack-and-lexicon-schema.md), [02](02-project-tooling.md)

## Goal

Turn pack/lexicon JSON files into trusted, in-memory data structures — trusted meaning both structurally valid (JSON Schema) and semantically coherent (cross-field checks JSON Schema can't express).

## Deliverables

- `src/data/loadPack.ts`, `src/data/loadLexicon.ts`
- `src/data/validatePack.ts` — the semantic pass, run after JSON Schema validation succeeds

## Key decisions

- Two-stage validation: JSON Schema (structural) first, then a hand-written semantic pass. Semantic checks to implement:
  - Every `{token}` in a `format.pattern` names a slot declared in `config.slots`.
  - Every `slots[x].lexicon` key exists in the pack's `lexiconRefs`.
  - Every `derived` slot has at least one entry in `config.derivations` with matching `produces`.
  - Every `derivation.source` names a real slot in `config.slots`.
  - At least one `format` has no `requires` (or all its `requires` are non-optional/non-derived slots) — otherwise a pack could have zero eligible formats when no parent context is present. Flag this at load time rather than discovering it at generation time in step 05.
  - Pack ids unique across the loaded set; lexicon ids unique across the loaded set.
- Failures are collected (not fail-fast on the first error) so a pack author gets the whole list in one pass.

## Open questions

- How validation errors surface to a third-party pack author — console warn/error for now; a real UI surface is step 24's problem, not this step's.

## Definition of done

- [ ] All three step-01 example packs load cleanly
- [ ] Each known-bad case has a unit test with a specific expected error message: dangling format token, unknown lexicon ref, derived slot with no derivation, duplicate pack id, duplicate lexicon id, no zero-requires format
