# Onomasticon — Mission Control

Running index of the build. This file is the map; `codesteps/NN-*.md` are the territory. Update status here as steps move — this file should always answer "what's next" at a glance.

**Legend:** ⏳ not started · 🔄 in progress · ✅ done · ⏸️ blocked

## Milestone: v0.1 — Skeleton

Seeded RNG, one strategy (template), a loader that trusts nothing, a working Foundry dialog. No kin groups yet, but the context parameter exists in the signature.

| #   | Step                                     | Status | File                                                                                     |
| --- | ---------------------------------------- | ------ | ---------------------------------------------------------------------------------------- |
| 01  | Pack & lexicon schema                    | ✅     | [codesteps/01-pack-and-lexicon-schema.md](codesteps/01-pack-and-lexicon-schema.md)       |
| 02  | Project tooling & repo scaffolding       | ✅     | [codesteps/02-project-tooling.md](codesteps/02-project-tooling.md)                       |
| 03  | Pack/lexicon loader + semantic validator | ✅     | [codesteps/03-loader-and-validator.md](codesteps/03-loader-and-validator.md)             |
| 04  | Seeded RNG                               | ✅     | [codesteps/04-seeded-rng.md](codesteps/04-seeded-rng.md)                                 |
| 05  | Template strategy engine                 | ✅     | [codesteps/05-template-strategy-engine.md](codesteps/05-template-strategy-engine.md)     |
| 06  | Result object & public `generate()`      | ✅     | [codesteps/06-result-object-and-generate.md](codesteps/06-result-object-and-generate.md) |
| 07  | Foundry module bootstrap                 | ✅     | [codesteps/07-foundry-module-bootstrap.md](codesteps/07-foundry-module-bootstrap.md)     |
| 08  | ApplicationV2 generator UI               | ✅     | [codesteps/08-applicationv2-generator-ui.md](codesteps/08-applicationv2-generator-ui.md) |
| 09  | Localization scaffold                    | ✅     | [codesteps/09-localization-scaffold.md](codesteps/09-localization-scaffold.md)           |
| 10  | Starter pack content pass                | ✅     | [codesteps/10-starter-pack-content-pass.md](codesteps/10-starter-pack-content-pass.md)   |

## Milestone: v0.2 — Kin groups

The real design driver. If v0.1's foundation is right, this is additive.

| #   | Step                              | Status | File                                                                                 |
| --- | --------------------------------- | ------ | ------------------------------------------------------------------------------------ |
| 11  | Kin group context & `shareWithin` | ✅     | [codesteps/11-kin-group-context.md](codesteps/11-kin-group-context.md)               |
| 12  | Derivation engine                 | ✅     | [codesteps/12-derivation-engine.md](codesteps/12-derivation-engine.md)               |
| 13  | "Generate a family of N" workflow | 🔄     | [codesteps/13-generate-family-workflow.md](codesteps/13-generate-family-workflow.md) |

## Milestone: v0.3 — Extension points

Now other people can extend this without touching the source.

| #   | Step                                      | Status | File                                                                       |
| --- | ----------------------------------------- | ------ | -------------------------------------------------------------------------- |
| 14  | Public API surface                        | ⏳     | [codesteps/14-public-api-surface.md](codesteps/14-public-api-surface.md)   |
| 15  | Hooks (`preGenerate` / `generated`)       | ⏳     | [codesteps/15-hooks.md](codesteps/15-hooks.md)                             |
| 16  | Strategy registry                         | ⏳     | [codesteps/16-strategy-registry.md](codesteps/16-strategy-registry.md)     |
| 17  | User pack directory / custom pack loading | ⏳     | [codesteps/17-user-pack-directory.md](codesteps/17-user-pack-directory.md) |

## Milestone: v0.4+ — The fun stuff

Each of these is a strategy plugin or an adapter — they slot in cleanly once v0.1–v0.3 hold.

| #   | Step                       | Status | File                                                                             |
| --- | -------------------------- | ------ | -------------------------------------------------------------------------------- |
| 18  | Markov / n-gram strategy   | ⏳     | [codesteps/18-markov-strategy.md](codesteps/18-markov-strategy.md)               |
| 19  | Apply-to-actor adapter     | ⏳     | [codesteps/19-apply-to-actor-adapter.md](codesteps/19-apply-to-actor-adapter.md) |
| 20  | Journal entry output       | ⏳     | [codesteps/20-journal-entry-output.md](codesteps/20-journal-entry-output.md)     |
| 21  | Chat command               | ⏳     | [codesteps/21-chat-command.md](codesteps/21-chat-command.md)                     |
| 22  | RollTable export           | ⏳     | [codesteps/22-rolltable-export.md](codesteps/22-rolltable-export.md)             |
| 23  | Batch NPC roster generator | ⏳     | [codesteps/23-batch-npc-roster.md](codesteps/23-batch-npc-roster.md)             |
| 24  | Pack authoring UI          | ⏳     | [codesteps/24-pack-authoring-ui.md](codesteps/24-pack-authoring-ui.md)           |

## Non-negotiables (apply to every step)

Carried over from the original design conversation — any step that violates one of these gets sent back, not shipped:

- Structured result object, never a bare string.
- Genre is data (JSON packs), never a code enum.
- Gender/variant is an open string, never a boolean.
- Seeded RNG only — no bare `Math.random()`.
- No `import` from a game system; Foundry-system integration goes behind an adapter keyed on `game.system.id`.
- `schemaVersion` on every pack/lexicon file, checked by the loader.
- Lexicons lazy-loaded, not eagerly loaded at init.

## Traps already named (don't rediscover these the hard way)

Genre as an enum · gender as a boolean · returning strings · global `Math.random()` · lexicons in `.js` instead of `.json` · loading everything at init · importing from a game system · post-processing baked into the generator instead of a pipeline.

## How to use this file

- Flip a step's status when work starts/lands. Don't let this drift from reality — it's the first thing to read at the start of a session.
- If a step's scope changes, edit its `codesteps/` file _and_ update the one-line description here if the title no longer fits.
- New steps get appended to the relevant milestone table with the next free number — numbering is chronological-by-discovery, not a fixed spec.
