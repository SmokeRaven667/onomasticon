# Step 20 — Journal Entry Output

**Status:** ✅ Done — engine/UI/API done and automated-tested; live Foundry verification not separately performed (see DoD)
**Milestone:** v0.4+ — The fun stuff
**Depends on:** [14](14-public-api-surface.md)

## Goal

Give generated batches a durable, shareable home in-world beyond the dialog's own result list.

## Deliverables

- [x] "Send to journal" action creating or appending a `JournalEntry` page listing generated names — `src/journal/sendToJournal.ts`

## Key decisions

- One journal entry per generation batch by default (`sendResultsToJournal(results)` with no `appendToId` always calls `JournalEntry.create`); the caller opts into appending a page to an existing entry instead via `{ appendToId }`, exactly as scoped.
- **Whole-batch action, not per-result.** Unlike copy/delete/applyToActor (which act on one result via `data-index`), "Send to Journal" is a single new button that sends `GeneratorApp`'s entire current `#results` array in one call — matches the DoD's "a batch of 10 generated names," not one name at a time.
- **Page content**: a plain `<ol><li>Name</li>...</ol>`, HTML-escaped per name (`escapeHtml`) — simplest structure that reads correctly in Foundry's journal viewer, no extra metadata (seed, pack, timestamp per name) beyond what "listing generated names" asks for. The page itself is named `Onomasticon — <locale date/time>` so multiple pages appended to the same entry stay distinguishable in its page list.
- **UI surface**: a `<select name="journalTarget">` (empty value = "create new," populated from `game.journal.contents` otherwise) plus a "Send to Journal" button, added near the existing "Clear All" control in `GeneratorApp`/`generator.hbs`. `GeneratorAppContext` gained a `journalEntries: {id, name}[]` field, populated in `_prepareContext` the same way `packGroups` already is.
- **Also exposed via the public API** (`OnomasticonApi.sendResultsToJournal`, `src/module/api.ts`) — same reasoning as step 19's `applyToActor`: every capability already reachable from both the UI and a macro/other-module caller, no stated reason to gate this one behind the button only.
- `game.journal!.get`/`game.journal?.contents` needed the same `!`/`?.`-assertion treatment as prior `game.*` access sites (confirmed by removing the assertion and re-running `tsc`, same as steps 09/13/17/19) — `JournalEntry.create` itself didn't need one (it's a static on the global `JournalEntry` class, not a `game.*` property gated by `AssumeHookRan`).
- **Test infrastructure**: `src/test/foundryStubs.ts` gained a real (not mocked) in-memory `JournalEntryStub` (`create`, `createEmbeddedDocuments`, a `pages` `Map` — deliberately Map-shaped, not a plain array, so it structurally matches enough of the real `EmbeddedCollection` API for test code typed against the real `JournalEntry.Implementation` interface to work against the stub) plus a minimal `CONST.JOURNAL_ENTRY_PAGE_FORMATS` stub (nothing under plain Node had a `JournalEntry` or `CONST` global before this step). `resetJournalStub()` mirrors the project's other reset-between-tests escape hatches.

## Open questions

- None.

## Definition of done

- [x] A batch of 10 generated names lands in a readable journal page with correct formatting — `src/journal/sendToJournal.test.ts` ("lands a batch of 10 names in a single readable page") plus HTML-escaping and append-vs-create coverage; the UI wiring itself (`journalTarget` select -> click -> notification) is **structurally verified** (same `data-action` pattern the other per-batch button, `clearResults`, already uses) but not separately confirmed against a live Foundry instance, same gap class as steps 13/17/19
- [x] `npm run typecheck && npm run lint && npm test && npm run build && npm run format` all pass (165 tests, up from 160); build output confirmed free of `node:fs`/`node:path`/`node:url`
