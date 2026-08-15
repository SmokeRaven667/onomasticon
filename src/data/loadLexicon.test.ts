import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { loadAllLexicons } from "./loadLexicon.js";

const LEXICONS_DIR = fileURLToPath(new URL("../../lexicons", import.meta.url));

describe("loadAllLexicons (real repo lexicons)", () => {
  it("loads every bundled lexicon cleanly, with no batch-level errors", () => {
    const { entries, errors } = loadAllLexicons(LEXICONS_DIR);

    expect(entries.length).toBeGreaterThanOrEqual(7);
    for (const entry of entries) {
      expect(entry.result.errors, `${entry.file}: ${JSON.stringify(entry.result.errors)}`).toEqual(
        [],
      );
      expect(entry.result.valid, entry.file).toBe(true);
    }
    expect(errors).toEqual([]);
  });
});
