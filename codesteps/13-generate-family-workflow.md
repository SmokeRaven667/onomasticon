# Step 13 — "Generate a Family of N" Workflow

**Status:** 🔄 In progress — engine/API/UI done and automated-tested; manual in-Foundry verification still needed
**Milestone:** v0.2 — Kin groups
**Depends on:** [12](12-derivation-engine.md), [08](08-applicationv2-generator-ui.md)

## Goal

Surface kin groups and derivations as a usable UI/API feature, not just engine internals.

## Deliverables

- UI affordance in `GeneratorApp` for "generate N linked names"
- API method `generateKin(packId, count, options)`

## Key decisions

- v0.2 scope is flat groups only (all members share one group). Generational chains (grandparent → parent → child patronymics) are a v0.4+ stretch, not required here. Concretely: every member after index 0 generates with index 0's resolved parts as `context.parent` — everyone derives from the same head-of-family, never from the member before them.
- `generateKinWithRegistry(packId, count, options, registry)` (`src/generateKinWithRegistry.ts`) is the registry-agnostic core, same split as `generate.ts`/`generateWithRegistry.ts` — `GeneratorApp` imports it directly (not through `generate.ts`) for the same tree-shaking reason step 08 already ran into. `generate.ts` gets a thin Node wrapper, `generateKin(packId, count, options)`, using the bundled `fs`-based registry.
- `options.members` is an array of per-member `{ variant?, seed? }` overrides, in call order. A `groupId` is minted fresh per call (via the existing `randomSeed()`, same audited randomness source as an unseeded `generate()` call) unless the caller supplies one — nothing new needed here since `generateKin` is just an orchestration layer over the already-existing `generate()`/`shareWithin`/derivation machinery, not new engine internals.
- Resolved the open question: the UI collects each member's variant up front, one row per member, before generating. Concretely, a "Family size" number input + "Set Rows" button renders that many variant text inputs (preserving already-typed values if the count changes), then a separate "Generate Family" button reads all the rows and calls `generateKinWithRegistry` once. All new UI strings route through `game.i18n`/`{{localize}}` under `ONOMASTICON.GeneratorApp.*`, consistent with step 09.

## Open questions

- None remaining — resolved above.

## Definition of done

- [x] Unit tests reproduce "family of 4 from `modern.slavic-patronymic`, consistent surname, correct per-child patronymics" at both the registry-agnostic layer (`src/generateKinWithRegistry.test.ts`) and the public Node API (`generateKin` in `src/generate.test.ts`)
- [x] `npm run typecheck && npm run lint && npm test && npm run build && npm run format` all pass (102 tests, up from 95); build output confirmed free of `node:fs`/`node:path`/`node:url`
- [ ] Manual test in Foundry: generate a family of 4 from `modern.slavic-patronymic` via the new "Family size" / "Set Rows" / "Generate Family" UI, get a consistent family surname and correct per-child patronymics — **not yet performed; needs a real Foundry instance**
