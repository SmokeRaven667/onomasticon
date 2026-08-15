# Step 18 — Markov / N-gram Strategy

**Status:** ⏳ Not started
**Milestone:** v0.4+ — The fun stuff
**Depends on:** [16](16-strategy-registry.md)

## Goal

Add a second, corpus-trained generation strategy — deliberately deferred until the pack format and strategy registry have survived contact with real use, per the original design conversation.

## Deliverables

- `src/strategies/markov/*`
- A `pack.strategy: "markov"` config shape (corpus reference, n-gram order, min/max length)
- At least one trained example pack

## Key decisions

- Training corpus is stored as a lexicon-like JSON file (a list of training words), not raw text — so it goes through the same lazy-load path as everything else.

## Open questions

- Generation-time cost at larger n — benchmark before making Markov a default-on option anywhere.

## Definition of done

- [ ] A Markov pack produces plausible novel names (manual eyeball pass)
- [ ] Seeded reproducibility matches the guarantee the `template` strategy already provides
