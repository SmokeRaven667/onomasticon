# Step 03 — Pack/Lexicon Loader + Semantic Validator

**Status:** ✅ Done
**Milestone:** v0.1 — Skeleton
**Depends on:** [01](01-pack-and-lexicon-schema.md), [02](02-project-tooling.md)

## Goal

Turn pack/lexicon JSON files into trusted, in-memory data structures — trusted meaning both structurally valid (JSON Schema) and semantically coherent (cross-field checks JSON Schema can't express).

## Deliverables

- `src/data/types.ts` — `Pack`, `Lexicon`, `Slot`/`Format`/`Derivation`, `ValidationError`, and the two result types
- `src/data/schemas.ts` — compiles `schema/pack.schema.json` / `schema/lexicon.schema.json` via `Ajv2020`
- `src/data/validatePack.ts`, `src/data/validateLexicon.ts` — structural pass (Ajv) then, for packs, the semantic pass
- `src/data/duplicateIds.ts` — pure `findDuplicateIds()` helper, shared by both loaders
- `src/data/loadPack.ts`, `src/data/loadLexicon.ts` — Node `fs`-based file/directory loaders built on the above (dev/test-time loading of the repo's bundled `packs/`/`lexicons/`; Foundry-side runtime loading is step 07/17's concern, not this one)
- Test coverage: `validatePack.test.ts`, `duplicateIds.test.ts`, `loadPack.test.ts`, `loadLexicon.test.ts`

## Key decisions

- Two-stage validation: JSON Schema (structural, via Ajv2020) first — semantic checks only run if structural validation passes, since they assume the shape is already correct. Implemented semantic checks:
  - Every `{token}` in a `format.pattern` names a slot declared in `config.slots` (`unknown-slot-in-format`).
  - Every name in a `format.requires` names a declared slot (`unknown-slot-in-requires`).
  - Any slot referenced in a pattern that isn't guaranteed to resolve standalone (i.e. `derived`) must be listed in that format's `requires` (`missing-requires-for-derived-slot`) — a strengthening of the schema's own `requires` mechanism, catching the exact bug class it exists to prevent.
  - At least one format must be reachable with **no** context at all — i.e. reference only slots that always resolve without a parent context (`no-standalone-format`).
  - Every `slots[x].lexicon` key exists in the pack's `lexiconRefs` (`lexicon-ref-not-found`).
  - Every `derived` slot has ≥1 `derivations[]` entry with matching `produces` (`derived-slot-without-derivation`), and every `derivations[].produces` must itself name a slot of kind `derived` (`derivation-produces-non-derived-slot`) — enforces that `derived` slots are the _only_ thing derivations fill, matching the schema's original intent.
  - Every `derivation.source` names a real slot (`derivation-source-unknown-slot`).
  - Pack ids unique across a loaded set; lexicon ids unique across a loaded set (`duplicate-pack-id` / `duplicate-lexicon-id`, via the shared `findDuplicateIds()`).
- Failures are collected, not fail-fast — a pack author gets the whole list in one pass.
- Each error carries a stable `code` (safe to assert on in tests/tooling) plus a human-readable `message`.
- Ajv needs `Ajv2020` (`ajv/dist/2020.js`) specifically, matching the schemas' `$schema: .../2020-12/schema` — the plain `Ajv` export only understands older drafts.
- Schema JSON files are imported directly (`import ... with { type: "json" }`), not read from disk at runtime — works identically under `tsc`, `esbuild`, and `vitest` with `resolveJsonModule: true`.
- Needed `"types": ["node"]` added explicitly to `tsconfig.json` — without it, `node:fs`/`node:path`/etc. imports failed to typecheck (TS2591) even with `@types/node` installed, under `moduleResolution: "Bundler"`.

**Correction made while building step 05:** `optional` on a `lexicon`/`procedural` slot was originally treated here as "might not resolve," the same as `derived`. Implementing the actual slot-resolution engine surfaced that this was never true — the schema gives lexicon/procedural slots no chance/probability field, so an optional one still resolves every time; only `derived` slots are genuinely uncertain (they need a parent context + a matching derivation). Whether an optional slot's value shows up in the rendered name is controlled entirely by which _format_ gets picked, via format weights — see the elven pack's `clan` slot (weight 3 plain name vs. weight 1 clan-suffixed name), which works exactly as intended under this correction. `resolvesStandalone()` now checks only `slot.kind !== "derived"`, and the renamed `missing-requires-for-derived-slot` check no longer fires for optional lexicon/procedural slots. No example pack needed changes — `requires: ["clan"]` in `highfantasy.elven.json` still validates and still works, it's just a no-op filter now rather than a load-bearing one.

## Open questions

- How validation errors surface to a third-party pack author — console warn/error for now; a real UI surface is step 24's problem, not this step's.

## Definition of done

- [x] All three step-01 example packs (and all seven lexicons) load cleanly — verified against the real files in `packs/`/`lexicons/`, not just inline fixtures
- [x] Each known-bad case has a unit test asserting a specific error `code`: dangling format token, unknown lexicon ref, derived slot with no derivation, duplicate pack id, duplicate lexicon id, no-standalone-format — plus derivation-source-unknown-slot, missing-requires-for-derived-slot, structural-schema failure, and invalid JSON
