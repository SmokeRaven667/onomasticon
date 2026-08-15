# Step 11 — Kin Group Context & `shareWithin`

**Status:** ⏳ Not started
**Milestone:** v0.2 — Kin groups
**Depends on:** [06](06-result-object-and-generate.md) (v0.1 complete)

## Goal

Make `shareWithin` actually do something: a second `generate()` call in the same group inherits a marked slot's value instead of re-rolling it. This is the constraint that shaped the whole interface, per the original design conversation — validating it here is the real test of whether v0.1's foundation was built right.

## Deliverables

- `src/kin/GroupContext.ts`
- `shareWithin` wired into `resolveSlot` (step 05): a second call in a group reads from the context instead of sampling

## Key decisions

- A group is identified by a `groupId`. `GroupContext` stores resolved parts keyed by `shareWithin` value (e.g. `"kin"`), so multiple slots (family _and_ clan) can independently share within the same group key.
- Mixed-pack groups are allowed (e.g. a child generated from a different pack than a parent). Sharing only applies when the _slot name_ matches between packs; a slot name absent from the second pack is simply not shared — not an error.

## Open questions

- None — the schema (step 01) already fully specifies `shareWithin`; this step makes the engine honor it.

## Definition of done

- [ ] Unit test: generate 3 results in the same kin group from `highfantasy.elven` — `family` and `clan` match across all 3, `given` differs
