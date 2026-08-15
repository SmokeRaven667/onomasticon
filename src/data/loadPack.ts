import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { validatePackData } from "./validatePack.js";
import { findDuplicateIds } from "./duplicateIds.js";
import type { PackValidationResult, ValidationError } from "./types.js";

export function loadPackFile(filePath: string): PackValidationResult {
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
  return validatePackData(data);
}

export interface PackLoadEntry {
  file: string;
  result: PackValidationResult;
}

export interface LoadAllPacksResult {
  entries: PackLoadEntry[];
  /** Batch-level errors that only make sense across the whole set, e.g. duplicate ids. */
  errors: ValidationError[];
}

export function loadAllPacks(dirPath: string): LoadAllPacksResult {
  const files = readdirSync(dirPath).filter((name) => name.endsWith(".json"));
  const entries: PackLoadEntry[] = files.map((name) => ({
    file: name,
    result: loadPackFile(join(dirPath, name)),
  }));

  const errors = findDuplicateIds(
    entries.map((entry) => ({ file: entry.file, id: entry.result.pack?.id })),
    "duplicate-pack-id",
  );

  return { entries, errors };
}
