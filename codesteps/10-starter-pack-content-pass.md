# Step 10 — Starter Pack Content Pass

**Status:** ✅ Done
**Milestone:** v0.1 — Skeleton
**Depends on:** [06](06-result-object-and-generate.md) (content work, doesn't need the UI)

## Goal

Grow the three demo-sized example packs into genuinely usable ones, and make sure each of the three original target genres (fantasy, sci-fi, modern) has more than a single pack.

## Deliverables

- Expand `highfantasy.elven`, `modern.slavic-patronymic`, `scifi.corporate-spacer` lexicons from ~5–8 entries to ~40–60 given names and ~25+ family names each
- Add at least one additional pack per genre bucket, so fantasy/sci-fi/modern each have ≥2 packs (matches the original v0.1 scope note)

## Key decisions

- This is a content task, not a design task — the 3 new packs (`highfantasy.dwarven`, `modern.latin-american`, `scifi.void-nomad`) reuse only mechanics already demonstrated by the original three (plain lexicon slots, `shareWithin: "kin"` on family, a single weighted format). No new slot kinds, derivations, or schema changes.
- Every given lexicon landed at 45 entries, every family lexicon at 28 — comfortably clears the 40/25 floor with room to spare, and keeps all six packs the same shape rather than some skating the minimum.
- `highfantasy.dwarven` invents names in the harsh-consonant/Norse-flavored register conventional for fantasy dwarves (not tied to any single living culture — same approach as the existing `highfantasy.elven` pack).
- `modern.latin-american` and the expanded `modern.slavic-patronymic` use real, common personal names/surnames (facts, not copyrightable — no attribution needed beyond noting the sourcing in `description`).
- `scifi.void-nomad` invents names deliberately distinct in feel from `scifi.corporate-spacer` (rougher/nomadic vs. polished/corporate) rather than just reskinning the same phonetic pattern, so the two sci-fi packs read as genuinely different options in the picker.
- New pack ids/lexicon ids follow the existing dotted-namespace / short-slug conventions; `packs/` and `lexicons/` are directory-scanned by both the Node loader (`registry.ts`) and `scripts/generateManifest.mjs`, so adding new files required no registration elsewhere.

## Open questions

- None — resolved by the key decisions above (invented-culture names for the two fantasy/one sci-fi pack side-step the sourcing question; the two modern packs use common real names, which don't need attribution).

## Definition of done

- [x] 6 packs total, all passing steps 01 + 03 validation (`registry.test.ts`'s `loadRegistry()` — which throws on any invalid bundled file — and `generate.test.ts`'s end-to-end loop over every bundled pack both pass)
- [x] Each pack has ≥40 given-name entries and ≥25 family-name entries where applicable (all six sit at 45/28; the optional `elven-clan` lexicon is exempt as neither a given nor family slot)
- [x] `npm run typecheck && npm run lint && npm test && npm run build && npm run format` all pass (70 tests; manifest regenerated to 6 packs / 13 lexicons)
