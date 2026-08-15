# Onomasticon

A [Foundry VTT](https://foundryvtt.com/) module for generating character and NPC names — fantasy, sci-fi, modern, or anything else expressed as a data pack, including kin groups with real naming conventions (patronymics, clan names, "of House X" constructions) instead of a list of unrelated strings.

> **Status: pre-alpha, in design.** The pack/lexicon schema is defined and validated; the generation engine and Foundry UI don't exist yet. See [`00-mission-control.md`](00-mission-control.md) for the build plan.

## Why this exists

Name generators are easy to prototype and hard to extend, because the first working version usually hardcodes assumptions that later features need to break. Onomasticon is built around two decisions made up front specifically to avoid that:

1. **Genre is data, not code.** A "genre" is a JSON pack, not a branch in a switch statement. Adding Norse, cyberpunk-street, or 1920s-Chicago names is a content task — write a JSON file — not a code change.
2. **Kin groups are a first-class concept, not a bolt-on.** Siblings share a surname. Patronymics derive from a parent's given name. Clan prefixes derive from a parent's family name. These need structured results and a notion of "generate this name in the context of that other name," so the engine is built around that from the start rather than retrofitted later.

## Architecture

Four things are kept deliberately separate, so each can change without the others noticing:

```
┌─────────────────────────────────────────────────────────┐
│  Foundry integration  (ApplicationV2 UI, hooks, actor    │
│  adapters, chat command, RollTable export)               │
├─────────────────────────────────────────────────────────┤
│  Public API  (generate, generateKin, listPacks,          │
│  registerStrategy, registerPack)                         │
├─────────────────────────────────────────────────────────┤
│  Strategy engine  (template strategy today; a registry   │
│  so markov/n-gram or others can plug in later)           │
├─────────────────────────────────────────────────────────┤
│  Data  (packs + lexicons, JSON, loaded and validated      │
│  independently of everything above)                       │
└─────────────────────────────────────────────────────────┘
```

The data layer is what's built so far. It doesn't know Foundry exists — it's plain JSON, validatable and testable with nothing but a JSON Schema tool.

### The result object

Every generation call returns a structured object, never a bare string:

```js
{
  full: "Thalvir Ostreth of Clan Morgane",
  parts: { given: "Thalvir", family: "Ostreth", clan: "Morgane" },
  meta: { packId: "highfantasy.elven", strategyId: "template", seed: 88431, groupId: "kin-a7f" }
}
```

Returning a string throws away exactly the information later features need: rerolling one component, sharing a surname across a family, mapping a name onto specific actor sheet fields, or letting another module build on top of a result.

## Genre packs

A pack declares its own structure — which slots it has, how they combine into full names, and (optionally) how a child's name derives from a parent's. See [`schema/pack.schema.json`](schema/pack.schema.json) for the full spec and [`packs/`](packs/) for working examples.

```json
{
  "schemaVersion": 1,
  "id": "highfantasy.elven",
  "strategy": "template",
  "lexiconRefs": { "given": "elven-given", "family": "elven-family", "clan": "elven-clan" },
  "config": {
    "slots": {
      "given":  { "kind": "lexicon", "lexicon": "given", "variants": ["masc", "fem", "neutral"] },
      "family": { "kind": "lexicon", "lexicon": "family", "shareWithin": "kin" },
      "clan":   { "kind": "lexicon", "lexicon": "clan", "shareWithin": "kin", "optional": true }
    },
    "formats": [
      { "weight": 3, "pattern": "{given} {family}" },
      { "weight": 1, "pattern": "{given} {family} of Clan {clan}", "requires": ["clan"] }
    ]
  }
}
```

A few things worth calling out:

- **Slots have a `kind`**: `lexicon` (sampled from a word list), `procedural` (a token pattern, e.g. a sci-fi registry code like `{L}{L}-{D}{D}{D}`), or `derived` (computed from a parent's name — see below). Keeping these distinct is what lets very different genres share one schema.
- **`shareWithin: "kin"`** means: when generating several names in the same group, this slot inherits its value from the first result instead of rerolling — how siblings end up with the same surname.
- **`requires`** on a format means it's only used once every listed slot actually resolved. This is how a pack expresses "only use the clan-suffixed format if a clan was rolled" without the engine needing genre-specific logic.
- **Lexicons are separate files**, referenced by id, so a word list (`elven-given.json`, `spacer-family.json`, ...) can be shared across packs and loaded lazily rather than all at once at startup.

### Kin groups and derivation rules

Some naming conventions aren't a random pick — they're computed from a relative's name. A Slavic patronymic, an Icelandic `-son`/`-dóttir`, a `Mac-`/`O'-`/`ibn-` clan prefix: all of these take a parent's part and transform it. A pack expresses this with a `derived` slot plus a `derivations` rule:

```json
{
  "produces": "patronymic",
  "source": "given",
  "strip": { "pattern": "[aoeiu]$", "replace": "" },
  "variants": {
    "masc": "{source}ovich",
    "fem": "{source}ovna",
    "*": "{source}ov"
  }
}
```

Generating a name with a parent context whose `given` was `"Ivan"`, for a `fem` child, produces a `patronymic` of `"Ivanovna"`. Generate without a parent context at all, and the pack's formats simply fall back to the version that doesn't need one — see [`packs/modern.slavic-patronymic.json`](packs/modern.slavic-patronymic.json).

## Design principles

These are enforced by convention and by review, not (yet) by tooling — see [`00-mission-control.md`](00-mission-control.md#non-negotiables-apply-to-every-step) for the full list:

- Structured results, never bare strings.
- Genre is data, never a code enum.
- Gender/variant is an open string (`"masc" | "fem" | "neutral" | ...`), never a boolean.
- All randomness goes through a seeded RNG — reproducible results, shareable seeds, real unit tests.
- No dependency on any specific game system; system integration goes behind a thin adapter.
- Every pack and lexicon carries a `schemaVersion`, checked by the loader.

## Repository layout

```
schema/     JSON Schema definitions for packs and lexicons
packs/      Genre pack definitions (the "recipe": slots, formats, derivations)
lexicons/   Word lists referenced by packs, kept separate so they can be shared/lazy-loaded
codesteps/  One markdown file per build step — the detailed plan behind the index below
00-mission-control.md   Running index of build steps and status
```

## Build plan

The full step-by-step plan — what's done, what's next, and the reasoning behind each step — lives in [`00-mission-control.md`](00-mission-control.md), with one detailed markdown file per step under [`codesteps/`](codesteps/). That index is the source of truth for project status; this README describes the architecture, not the schedule.

## Contributing a pack

Because genre is data, adding support for a new setting or culture doesn't require touching the engine at all: write a lexicon, write a pack that references it, and validate both against the schemas in `schema/`. (A loader with proper semantic validation — catching things a JSON Schema can't, like a dangling slot reference — is planned; see [`codesteps/03-loader-and-validator.md`](codesteps/03-loader-and-validator.md).)

## License

Not yet chosen — tracked in [`codesteps/02-project-tooling.md`](codesteps/02-project-tooling.md).
