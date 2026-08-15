import type { ValidationError } from "./types.js";

export interface IdentifiedEntry {
  file: string;
  id: string | undefined;
}

export function findDuplicateIds(entries: IdentifiedEntry[], code: string): ValidationError[] {
  const seenBy = new Map<string, string>();
  const errors: ValidationError[] = [];

  for (const entry of entries) {
    if (!entry.id) continue;
    const existingFile = seenBy.get(entry.id);
    if (existingFile) {
      errors.push({
        code,
        message: `Id "${entry.id}" is used by both "${existingFile}" and "${entry.file}".`,
      });
    } else {
      seenBy.set(entry.id, entry.file);
    }
  }

  return errors;
}
