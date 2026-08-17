import { afterEach, describe, expect, it } from "vitest";
import { resetJournalStub } from "../test/foundryStubs.js";
import type { Result } from "../types.js";
import { sendResultsToJournal } from "./sendToJournal.js";

function fixtureResults(names: string[]): Result[] {
  return names.map((full) => ({
    full,
    parts: { full },
    meta: { packId: "test.pack", strategyId: "template", seed: 1 },
  }));
}

afterEach(() => {
  resetJournalStub();
});

describe("sendResultsToJournal", () => {
  it("creates a new journal entry with one page listing every result, by default", async () => {
    const results = fixtureResults(["Thalvir Stonebrook", "Caelith Ashan", "Isolwyn"]);
    const entry = await sendResultsToJournal(results);

    expect(entry.pages.size).toBe(1);
    const [page] = [...entry.pages.values()];
    expect(page!.text?.content).toBe(
      "<ol><li>Thalvir Stonebrook</li><li>Caelith Ashan</li><li>Isolwyn</li></ol>",
    );
  });

  it("lands a batch of 10 names in a single readable page", async () => {
    const names = Array.from({ length: 10 }, (_, i) => `Name ${i + 1}`);
    const entry = await sendResultsToJournal(fixtureResults(names));

    const [page] = [...entry.pages.values()];
    for (const name of names) {
      expect(page!.text?.content).toContain(`<li>${name}</li>`);
    }
  });

  it("escapes HTML-significant characters in a generated name", async () => {
    const entry = await sendResultsToJournal(fixtureResults(['Bran & "The Fox" <III>']));
    const [page] = [...entry.pages.values()];
    expect(page!.text?.content).toBe(
      "<ol><li>Bran &amp; &quot;The Fox&quot; &lt;III&gt;</li></ol>",
    );
  });

  it("appends a new page to an existing entry instead of creating one, when appendToId is given", async () => {
    const first = await sendResultsToJournal(fixtureResults(["First Batch"]));
    const second = await sendResultsToJournal(fixtureResults(["Second Batch"]), {
      appendToId: first.id!,
    });

    expect(second.id).toBe(first.id);
    expect(second.pages.size).toBe(2);
    const pages = [...second.pages.values()];
    expect(pages[1]!.text?.content).toContain("Second Batch");
  });

  it("throws for an appendToId that doesn't match any existing entry", async () => {
    await expect(
      sendResultsToJournal(fixtureResults(["X"]), { appendToId: "not-a-real-id" }),
    ).rejects.toThrow(/no journal entry found/);
  });
});
