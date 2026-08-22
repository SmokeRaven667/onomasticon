# Onomasticon

A [Foundry VTT](https://foundryvtt.com/) module for generating character and NPC names — fantasy, sci-fi, modern, or anything else expressed as a data pack, including kin groups with real naming conventions (patronymics, clan names, "of House X" constructions) instead of a list of unrelated strings.

> **Status: v0.4, feature-complete against the current build plan.** The pack/lexicon schema, generation engine, and Foundry UI (generator dialog, actor/journal/RollTable/chat integrations, pack authoring form) are all in place. See [`00-mission-control.md`](00-mission-control.md) for the build plan and what's been verified where.

## Why this exists

Name generators are easy to prototype and hard to extend, because the first working version usually hardcodes assumptions that later features need to break. Onomasticon is built around two decisions made up front specifically to avoid that:

1. **Genre is data, not code.** A "genre" is a JSON pack, not a branch in a switch statement. Adding Norse, cyberpunk-street, or 1920s-Chicago names is a content task — write a JSON file — not a code change.
2. **Kin groups are a first-class concept, not a bolt-on.** Siblings share a surname. Patronymics derive from a parent's given name. Clan prefixes derive from a parent's family name. These need structured results and a notion of "generate this name in the context of that other name," so the engine is built around that from the start rather than retrofitted later.

## Using it in Foundry

### Installing the module

Onomasticon isn't listed in Foundry's in-app package browser yet, but it's installable without cloning or building anything: open Foundry's **Install Module** dialog and paste this manifest URL —

```
https://github.com/SmokeRaven667/onomasticon/releases/latest/download/module.json
```

— and click Install. That always resolves to the latest tagged release; Foundry's own "check for updates" continues to track it afterward. Every push to a `vX.Y.Z` tag runs a [release workflow](.github/workflows/release.yml) that builds the module and publishes it as a [GitHub Release](https://github.com/SmokeRaven667/onomasticon/releases) with a matching `module.json`/`module.zip`, so this URL is always current.

If you're working on Onomasticon itself rather than just using it, build from source instead:

```sh
git clone https://github.com/SmokeRaven667/onomasticon.git
cd onomasticon
npm install
npm run build          # also regenerates data-manifest.json
```

Then copy (or symlink) the whole `onomasticon` folder into your Foundry `Data/modules/` directory, so you end up with `Data/modules/onomasticon/module.json` at that path. Restart Foundry (or reload the setup page) so it picks up the new module.

### Enabling it in a world

In a world, go to **Game Settings → Manage Modules**, check **Onomasticon**, and save. Two new buttons appear in the header of the **Journal** sidebar tab:

- **Onomasticon** — opens the name generator dialog (pick a pack, generate one name, a kin group, or a full roster; apply a result to the selected token's actor; send a batch to a journal page; export a pack's lexicons as RollTables).
- **Onomasticon: Author Pack** — opens the pack authoring form (see below).

Everything is also reachable from a macro via `game.modules.get("onomasticon").api` — `generate`, `generateKin`, `generateRoster`, `listPacks`, `openGenerator`, `openPackAuthor`, and the rest of the public surface.

### Creating or updating a pack

A "pack" is Onomasticon's own term for what you might think of as a name-list/language pack: a genre (elven, corporate-spacer, 1920s-Chicago, whatever) expressed as slots, formats, and the lexicons (word lists) those slots draw from. See [Genre packs](#genre-packs) below for the full JSON shape — this section is about getting one into your world.

**First, set a User Pack Directory.** Packs you create live in a folder you choose, separate from the bundled ones, so updating the module never clobbers your content. Go to **Game Settings → Configure Settings → Onomasticon → User Pack Directory** and enter a path relative to Foundry's `Data` folder (e.g. `onomasticon-packs`) — it'll be created on first save if it doesn't exist. Leave it empty and pack creation/saving has nowhere safe to write to.

**Then build a pack, two ways:**

1. **The authoring form (recommended, no JSON required).** Open it from the Journal sidebar's "Onomasticon: Author Pack" button. Fill in an id (e.g. `homebrew.my-village`), a label, and one or more **slots** — each is either:
   - a **lexicon** slot: pick an existing lexicon from the dropdown (bundled, or one already in your user directory) that supplies the word list, plus optional variant keys (`masc, fem, neutral`) and a share key if this should stay consistent across a kin group;
   - a **procedural** slot: a token pattern like `{L}{L}-{D}{D}{D}` for generated codes/serials, not a word list;
   - a **derived** slot: computed from a parent's name (patronymics, clan prefixes) — the form doesn't build these yet, see below.

   Add one or more **formats** — the template pattern(s) slots get combined into, e.g. `{given} {family}`. The Validation panel updates live against the same rules the loader itself enforces, and **Save** is disabled until the pack is valid. Saving uploads `<id>.json` into your configured User Pack Directory and it's generatable immediately — no reload needed.

   This v1 form covers slots and formats only. If your pack needs a `derived` slot (a patronymic, a clan-name-from-parent), type the `derivations` array as raw JSON into the "Derivations" box at the bottom — same shape as the `config.derivations` field in a hand-written pack file (see [Kin groups and derivation rules](#kin-groups-and-derivation-rules)).

2. **By hand.** Write a pack JSON file (matching [`schema/pack.schema.json`](schema/pack.schema.json)) and, if it needs new words rather than reusing an existing lexicon, a lexicon JSON file (matching [`schema/lexicon.schema.json`](schema/lexicon.schema.json)) referencing it. Drop both into your configured User Pack Directory. A bad or invalid file is skipped with a warning (both in the console and as a UI notification) rather than breaking every other pack — so a typo in one file never takes down the generator.

**Updating an existing pack** means editing (or re-saving) the same `<id>.json` file. The authoring form doesn't currently support loading an existing pack back into the form to edit — it only builds new ones — so for now, revising a pack means either hand-editing its JSON file directly, or rebuilding it from scratch in the form and saving under the same id. Either way: a hand-edited file needs a Foundry reload (F5) before the change is picked up, since the directory is only scanned once per session and cached; a re-save through the form's Save button busts that cache automatically, so it takes effect on the very next time you open the generator or authoring dialog.

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
      "given": { "kind": "lexicon", "lexicon": "given", "variants": ["masc", "fem", "neutral"] },
      "family": { "kind": "lexicon", "lexicon": "family", "shareWithin": "kin" },
      "clan": { "kind": "lexicon", "lexicon": "clan", "shareWithin": "kin", "optional": true }
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

### Synthesizing invented names with opener/closer slots

Not every given name has to come whole out of a lexicon. [`packs/modern.western.json`](packs/modern.western.json) shows a pattern for building one from parts instead: two small `lexicon` slots — a name-opener fragment and a name-closer fragment — sampled independently and concatenated with no separator in the format pattern:

```json
"lexiconRefs": {
  "opener": "western-name-opener",
  "closer": "western-name-closer"
},
"config": {
  "slots": {
    "givenOpener": { "kind": "lexicon", "lexicon": "opener", "optional": true },
    "givenCloser": { "kind": "lexicon", "lexicon": "closer", "optional": true }
  },
  "formats": [
    {
      "weight": 1,
      "pattern": "{givenOpener}{givenCloser} {family}",
      "requires": ["givenOpener", "givenCloser"]
    }
  ]
}
```

[`western-name-opener.json`](lexicons/western-name-opener.json) holds short syllable fragments (`Cal`, `Sil`, `Han`, ...) and [`western-name-closer.json`](lexicons/western-name-closer.json) holds endings (`ander`, `eron`, `iah`, ...); combined they produce names like `Calander` or `Silander` that never appear literally in either lexicon.

There's nothing opener/closer-specific in the engine — a `kind: "lexicon"` slot always just resolves to one weighted-random entry from its lexicon, the same as `given` or `family`. The effect comes entirely from naming two slots so their tokens sit adjacent with no space (`{givenOpener}{givenCloser}`) instead of separated the way `{given} {family}` is. The same trick works with any number of fragment slots, not just two, and under any names you like — it's a general technique for stretching a small lexicon into a much larger space of invented names, worth reaching for whenever a culture's names follow a handful of recurring syllables rather than being drawn whole from a fixed list.

Marking the fragment slots `optional: true` and gating the format with `requires` (as `modern.western.json` does) lets a pack mix this synthesized form in at low weight alongside its normal formats, rather than routing every generated name through it.

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

Because genre is data, adding support for a new setting or culture doesn't require touching the engine at all: write a lexicon, write a pack that references it, and validate both against the schemas in `schema/`. The loader's semantic validator (catching things a JSON Schema can't, like a dangling slot reference) runs on every pack — bundled or not — so a pack you contribute is held to the exact same standard as the ones already in `packs/`; see [`codesteps/03-loader-and-validator.md`](codesteps/03-loader-and-validator.md) for how it works. If you'd rather add a pack to your own world without opening a PR, see [Creating or updating a pack](#creating-or-updating-a-pack) above.

## License

[MIT](LICENSE).
