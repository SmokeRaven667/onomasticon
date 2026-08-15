# Step 21 — Chat Command

**Status:** ⏳ Not started
**Milestone:** v0.4+ — The fun stuff
**Depends on:** [14](14-public-api-surface.md)

## Goal

Let a name get generated without opening the dialog at all, for in-the-moment table use.

## Deliverables

- `/name` chat command, parsed via the chat message hook, posts the result to chat (with a whisper option)

## Key decisions

- Syntax: `/name <packId> [variant]`. Keep it minimal — no flag soup.

## Open questions

- None.

## Definition of done

- [ ] Typing `/name highfantasy.elven masc` in chat posts a generated name
