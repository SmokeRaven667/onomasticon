const TOKEN_PATTERN = /\{([a-zA-Z0-9_]+)\}/g;

/**
 * Substitutes `{slotName}` tokens with resolved values. Throws if a token has no
 * matching part rather than rendering the literal `{token}` or the string "undefined" —
 * a validated pack (step 03) guarantees every token in the *selected* format is covered,
 * so hitting this means the caller skipped validation or picked an ineligible format.
 */
export function renderPattern(pattern: string, parts: Readonly<Record<string, string>>): string {
  return pattern.replace(TOKEN_PATTERN, (_match, name: string) => {
    const value = parts[name];
    if (value === undefined) {
      throw new Error(`renderPattern: no resolved value for {${name}}`);
    }
    return value;
  });
}
