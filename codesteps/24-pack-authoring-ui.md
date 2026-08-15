# Step 24 — Pack Authoring UI

**Status:** ⏳ Not started
**Milestone:** v0.4+ — The fun stuff
**Depends on:** [03](03-loader-and-validator.md), [17](17-user-pack-directory.md)

## Goal

Let a pack be built through a form instead of hand-written JSON — the payoff step for the semantic validator's error messages (step 03) being good. If those errors are vague, this step will hurt.

## Deliverables

- In-app form for building a pack (slots, formats, derivations), validated live against the step-03 rules

## Key decisions

- None yet — see open question below, decide at implementation time.

## Open questions

- Scope of the v1 authoring UI: full derivation editor, or slots/formats only with derivations still hand-edited in JSON. Decide based on how painful step 12's derivation objects were to hand-author in practice.

## Definition of done

- [ ] A non-technical user can build and save a working 2-slot template pack entirely through the UI
