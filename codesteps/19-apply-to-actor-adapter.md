# Step 19 — Apply-to-Actor Adapter

**Status:** ⏳ Not started
**Milestone:** v0.4+ — The fun stuff
**Depends on:** [14](14-public-api-surface.md)

## Goal

Let a generated name get applied to an actor sheet without coupling Onomasticon to any one game system.

## Deliverables

- `src/adapters/actorAdapter.ts`
- Thin per-system adapters keyed on `game.system.id`
- Generic fallback: `actor.update({ name: result.full })`

## Key decisions

- Adapter interface: a single function `(actor, result) -> Promise<void>`.
- System-specific adapters are opt-in additions on top of the generic fallback — never a hard dependency. Coupling to one system halves the audience for no real gain.

## Open questions

- Which systems get a first-class adapter beyond the generic fallback — decide from actual usage/requests, not speculatively.

## Definition of done

- [ ] "Apply to selected token's actor" works against a vanilla actor with no system installed (generic fallback)
- [ ] Doesn't error against dnd5e
