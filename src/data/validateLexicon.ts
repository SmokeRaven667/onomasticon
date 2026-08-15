import { validateLexiconSchema } from "./schemas.js";
import type { Lexicon, LexiconValidationResult, ValidationError } from "./types.js";

export function validateLexiconData(data: unknown): LexiconValidationResult {
  if (!validateLexiconSchema(data)) {
    const errors: ValidationError[] = (validateLexiconSchema.errors ?? []).map((error) => ({
      code: `schema:${error.keyword}`,
      message: `${error.instancePath || "(root)"} ${error.message ?? "is invalid"}`,
      path: error.instancePath || undefined,
    }));
    return { valid: false, errors };
  }

  return { valid: true, errors: [], lexicon: data as unknown as Lexicon };
}
