# Step 01 — Pack & Lexicon Schema

**Status:** ✅ Done
**Milestone:** v0.1 — Skeleton
**Depends on:** —

## Goal

Define the JSON shape of a genre pack and a lexicon before any engine code exists, so "add a genre" is always a content task, never a code task.

## Deliverables

- `schema/pack.schema.json` — structural validation for pack files (JSON Schema, draft 2020-12)
- `schema/lexicon.schema.json` — structural validation for lexicon files
- Three example packs exercising distinct schema features:
  - `packs/highfantasy.elven.json` — `shareWithin` for kin surnames/clan
  - `packs/modern.slavic-patronymic.json` — `derived` slot + a `derivations` rule (patronymic)
  - `packs/scifi.corporate-spacer.json` — `procedural` slot (registry designation)
- Seven backing lexicons under `lexicons/`

## Key decisions

- **Lexicons live outside packs.** Referenced by id via a pack's `lexiconRefs` map. Lets a lexicon be shared across genres and lazy-loaded independently of pack metadata.
- **Slots have a `kind` discriminator:** `lexicon` (sampled), `procedural` (token pattern, e.g. `{L}{L}-{D}{D}{D}`), or `derived` (only ever filled by a derivation rule against a parent context — never sampled standalone). Keeping these distinct is what let patronymics and clan-prefix surnames fit without new top-level concepts.
- **Formats can `require` slots.** A format is only eligible once every slot it lists in `requires` actually resolved. This is how a pack expresses "use this template only if a patronymic was derived" without the engine needing special-case logic.
- **`strategy` + `config`**, schema-branched with `if`/`then` on `strategy`. `template` is the only strategy in v1; a future `markov` strategy gets its own `config` shape without touching this schema.
- **`schemaVersion` is a `const`, not a range**, on both pack and lexicon files. The loader (step 03) rejects anything that doesn't match, rather than guessing at forward/backward compatibility.
- **Deliberately out of scope for JSON Schema:** cross-field checks (a `{token}` in a format pattern must name a declared slot; a `derived` slot should have a matching `derivations[].produces`; `lexiconRefs` keys must actually be used). JSON Schema can't express these cleanly — they're a second, hand-written validation pass in step 03.

## Definition of done

- [x] All three example packs validate against `schema/pack.schema.json` (`ajv-cli`, draft2020)
- [x] All seven example lexicons validate against `schema/lexicon.schema.json`
- [x] A deliberately malformed pack (unknown slot property) is rejected, confirming the schema isn't trivially permissive
