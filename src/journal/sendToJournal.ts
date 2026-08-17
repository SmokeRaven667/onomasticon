import type { Result } from "../types.js";
import { escapeHtml } from "../util/escapeHtml.js";

export interface SendToJournalOptions {
  /** An existing JournalEntry's id to append a new page to, instead of creating a new entry. */
  appendToId?: string;
}

function renderResultsHtml(results: readonly Result[]): string {
  const items = results.map((result) => `<li>${escapeHtml(result.full)}</li>`).join("");
  return `<ol>${items}</ol>`;
}

function pageName(): string {
  return `Onomasticon — ${new Date().toLocaleString()}`;
}

/**
 * Sends a batch of generated results to a journal page — either a fresh `JournalEntry` (the
 * default, per this codestep's key decision: one entry per batch) or a new page appended to
 * an existing entry when `options.appendToId` is supplied.
 */
export async function sendResultsToJournal(
  results: readonly Result[],
  options: SendToJournalOptions = {},
): Promise<JournalEntry.Implementation> {
  const name = pageName();
  const page = {
    name,
    type: "text" as const,
    text: { content: renderResultsHtml(results), format: CONST.JOURNAL_ENTRY_PAGE_FORMATS.HTML },
  };

  if (options.appendToId) {
    // Safe: only ever called from a user-triggered UI action, long after Foundry's "setup"
    // hook (where game.journal becomes available) has fired — same reasoning as this
    // project's other game.* access sites (see step 09/13/17/19's precedent).
    const entry = game.journal!.get(options.appendToId);
    if (!entry) {
      throw new Error(
        `sendResultsToJournal: no journal entry found for id "${options.appendToId}"`,
      );
    }
    await entry.createEmbeddedDocuments("JournalEntryPage", [page]);
    return entry;
  }

  const entry = await JournalEntry.create({ name, pages: [page] });
  if (!entry) {
    throw new Error("sendResultsToJournal: failed to create a new journal entry");
  }
  return entry;
}
