# Step 07 — Foundry Module Bootstrap

**Status:** ⏳ Not started
**Milestone:** v0.1 — Skeleton
**Depends on:** [02](02-project-tooling.md), [06](06-result-object-and-generate.md)

## Goal

Make Onomasticon an installable, enable-able Foundry module — the first point where the pure-logic engine touches the Foundry runtime.

## Deliverables

- `module.json` (finalized manifest)
- `src/module/init.ts` — `Hooks.once("init", ...)`
- Build entry producing `dist/onomasticon.js`, referenced from `module.json`

## Key decisions

- Target current core (v14): `compatibility.minimum`/`verified` pinned accordingly.
- No `system` dependency in `module.json` — stays system-agnostic per the original design constraint.
- Module id: `onomasticon`.
- Ship as an ESM module (supported since Foundry v13) rather than a bundled IIFE, since v14 is the floor.

## Open questions

- None blocking; revisit ESM-vs-IIFE only if a real compatibility issue shows up in testing.

## Definition of done

- [ ] Module installs and enables in a local Foundry v14 instance with no console errors
- [ ] `game.modules.get("onomasticon").active === true`
