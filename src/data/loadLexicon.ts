import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { validateLexiconData } from "./validateLexicon.js";
import { findDuplicateIds } from "./duplicateIds.js";
import type { LexiconValidationResult, ValidationError } from "./types.js";

export function loadLexiconFile(filePath: string): LexiconValidationResult {
  let data: unknown;
  try {
    data = JSON.parse(readFileSync(filePath, "utf-8"));
  } catch (error) {
    return {
      valid: false,
      errors: [
        {
          code: "invalid-json",
          message: `${filePath}: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
    };
  }
  return validateLexiconData(data);
}

export interface LexiconLoadEntry {
  file: string;
  result: LexiconValidationResult;
}

export interface LoadAllLexiconsResult {
  entries: LexiconLoadEntry[];
  /** Batch-level errors that only make sense across the whole set, e.g. duplicate ids. */
  errors: ValidationError[];
}

export function loadAllLexicons(dirPath: string): LoadAllLexiconsResult {
  const files = readdirSync(dirPath).filter((name) => name.endsWith(".json"));
  const entries: LexiconLoadEntry[] = files.map((name) => ({
    file: name,
    result: loadLexiconFile(join(dirPath, name)),
  }));

  const errors = findDuplicateIds(
    entries.map((entry) => ({ file: entry.file, id: entry.result.lexicon?.id })),
    "duplicate-lexicon-id",
  );

  return { entries, errors };
}
